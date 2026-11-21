import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCaseStore} from '../src/state.js';
import {inspectHeirs} from '../src/heirs.js';
import {evaluate} from '../src/rules.js';
import {simpleCase} from './fixtures/case.js';

function confirmAll(store) {
  for (const field of Object.keys(store.getSnapshot().checks)) {
    store.dispatch({type: 'check.update', field, value: true});
  }
}
const edits = [
  ['被相続人氏名', {type: 'case.update', path: 'deceased.name', value: '架空 変更後'}],
  ['被相続人住所', {type: 'case.update', path: 'deceased.address', value: '架空県別の市'}],
  ['相続人人数', {type: 'case.update', path: 'expectedChildren', value: '3'}],
  ['相続人氏名', {type: 'heir.update', id: 'child-a', field: 'name', value: '架空 子の変更'}],
  ['相続人住所', {type: 'heir.update', id: 'child-a', field: 'address', value: '架空県別住所'}],
  ['相続人追加', {type: 'heir.add'}],
  ['相続人削除', {type: 'heir.remove', id: 'child-a'}],
  ['承継方法', {type: 'case.update', path: 'method', value: 'agreement'}],
  ['不動産評価額', {type: 'property.update', id: 'property-a', field: 'value', value: '6000000'}],
  ['不動産表示', {type: 'property.update', id: 'property-a', field: 'description', value: '架空の表示変更'}],
  ['基本情報の所在地', {type: 'case.update', path: 'properties.0.location', value: '東京都新宿区'}],
  ['不動産追加', {type: 'property.add'}],
  ['対象外フラグ', {type: 'flag.update', field: 'will', value: true}],
];
for (const [title, action] of edits) test(`${title}の変更でプレビューと確認を無効化`, () => {
  const store = createCaseStore(simpleCase());
  assert.ok(store.generatePreview());
  const previousRevision = store.getRevision();
  store.dispatch(action);
  assert.equal(store.getPreview(), null);
  assert.ok(store.getRevision() > previousRevision);
  assert.ok(Object.values(store.getSnapshot().checks).every(value => value === false));
});
test('相続人の追加・削除で、手入力の管轄を消去しない', () => {
  const store = createCaseStore(simpleCase());
  store.dispatch({type: 'heir.add'});
  assert.equal(store.getSnapshot().office, '東京法務局');
  store.dispatch({type: 'heir.remove', id: 'child-a'});
  assert.equal(store.getSnapshot().office, '東京法務局');
});
test('人数照合：入力した子を一名消すと入力漏れを警告する', () => {
  const store = createCaseStore(simpleCase());
  store.dispatch({type: 'heir.remove', id: 'child-a'});
  confirmAll(store);
  assert.equal(inspectHeirs(store.getSnapshot()).countsMatch, false);
  assert.match(evaluate(store.getSnapshot()).errors.join(''), /人数/);
  assert.equal(store.generatePreview(), null);
});
test('遺産分割の取得者を削除すると選択も解除する', () => {
  const state = simpleCase();
  state.method = 'agreement'; state.recipientId = 'child-b'; state.agreementDate = '2026-10-01';
  const store = createCaseStore(state);
  assert.ok(store.generatePreview());
  store.dispatch({type: 'heir.remove', id: 'child-b'});
  assert.equal(store.getSnapshot().recipientId, '');
  assert.equal(store.getPreview(), null);
});
test('確認チェックの変更でもプレビューを消去し、他の確認は保持する', () => {
  const store = createCaseStore(simpleCase());
  store.generatePreview();
  store.dispatch({type: 'check.update', field: 'registry', value: false});
  assert.equal(store.getPreview(), null);
  assert.equal(store.getSnapshot().checks.family, true);
  assert.equal(store.getSnapshot().checks.registry, false);
});
test('資料収集チェックの変更も古いプレビューを残さない', () => {
  const store = createCaseStore(simpleCase());
  store.generatePreview();
  store.dispatch({type: 'document.update', field: 'family', value: true});
  assert.equal(store.getPreview(), null);
  assert.equal(store.getSnapshot().documents.family, true);
});
test('変更後は再照合して生成した文書だけが新しい内容を含む', () => {
  const store = createCaseStore(simpleCase());
  const previous = store.generatePreview();
  store.dispatch({type: 'heir.update', id: 'child-a', field: 'name', value: '架空 新しい氏名'});
  assert.equal(store.generatePreview(), null);
  confirmAll(store);
  const current = store.generatePreview();
  assert.ok(current.application.includes('架空 新しい氏名'));
  assert.ok(!previous.application.includes('架空 新しい氏名'));
});
test('保存JSONの読み込みで入力を復元し、確認・文書は解除する', () => {
  const store = createCaseStore(simpleCase());
  const json = store.exportJSON();
  store.generatePreview();
  store.dispatch({type: 'case.update', path: 'deceased.name', value: '架空 変更'});
  store.importJSON(json);
  assert.deepEqual(store.getSnapshot().heirs, simpleCase().heirs);
  assert.equal(store.getSnapshot().deceased.name, '架空 被相続人');
  assert.equal(store.getPreview(), null);
  assert.ok(Object.values(store.getSnapshot().checks).every(value => !value));
});
test('不正なJSON・操作は入力と既存プレビューを壊さない', () => {
  const store = createCaseStore(simpleCase());
  store.generatePreview();
  const before = store.getSnapshot();
  for (const operation of [
    () => store.importJSON('{"__proto__":{"polluted":true}}'),
    () => store.dispatch({type: 'case.update', path: '__proto__.polluted', value: true}),
    () => store.dispatch({type: 'heir.update', id: 'child-a', field: 'id', value: 'spouse'}),
    () => store.dispatch({type: 'heir.update', id: 'child-a', field: 'name', value: {}}),
    () => store.dispatch({type: 'heir.update', id: 'missing', field: 'name', value: '架空'}),
  ]) {
    assert.throws(operation);
    assert.deepEqual(store.getSnapshot(), before);
    assert.ok(store.getPreview());
  }
  assert.equal({}.polluted, undefined);
});
test('状態とプレビューはコピーで公開し、外からの変更を取り込まない', () => {
  const store = createCaseStore(simpleCase());
  const snapshot = store.getSnapshot();
  snapshot.heirs[0].name = '外部からの変更';
  assert.equal(store.getSnapshot().heirs[0].name, '架空 相続人0');
  store.generatePreview();
  const preview = store.getPreview(); preview.application = '改変';
  assert.notEqual(store.getPreview().application, '改変');
});
test('HTMLを含む氏名・住所を文字列として保持し、文書は未監修の下書き', () => {
  const store = createCaseStore(simpleCase());
  const name = '<img src=x onerror="alert(1)">';
  store.dispatch({type: 'heir.update', id: 'child-a', field: 'name', value: name});
  store.dispatch({type: 'heir.update', id: 'child-a', field: 'address', value: '<script>alert(1)</script>'});
  confirmAll(store);
  assert.ok(store.generatePreview().application.includes(name));
  assert.match(store.getPreview().application, /提出不可.*専門家レビュー未実施/);
  for (const file of ['state.js', 'view.js', 'heirs.js']) {
    const source = fs.readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /innerHTML|outerHTML|insertAdjacentHTML|eval\(|new Function|fetch\(|XMLHttpRequest|sendBeacon|localStorage|indexedDB/);
  }
});
test('最後の相続人・不動産を削除する操作を拒否する', () => {
  const state = simpleCase(); state.heirs = state.heirs.slice(0, 1);
  const store = createCaseStore(state);
  assert.throws(() => store.dispatch({type: 'heir.remove', id: 'spouse'}));
  assert.throws(() => store.dispatch({type: 'property.remove', id: 'property-a'}));
});
test('入力構造の検査は親子混在・配偶者のみを単純ケースに変換しない', () => {
  const mixed = simpleCase(); mixed.heirs[0].relation = 'parent';
  assert.equal(inspectHeirs(mixed).hasOtherRelations, true);
  assert.equal(createCaseStore(mixed).generatePreview(), null);
  const spouseOnly = simpleCase(); spouseOnly.heirs = spouseOnly.heirs.slice(0, 1);
  spouseOnly.expectedChildren = '0';
  assert.equal(inspectHeirs(spouseOnly).children.length, 0);
  assert.equal(createCaseStore(spouseOnly).generatePreview(), null);
});
