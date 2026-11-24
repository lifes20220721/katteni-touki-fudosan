// P0-2 expectations fixed before implementation, 2026-11-24.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {simpleCase} from './fixtures/case.js';
import {evaluate, taxEstimate, deadline, RULE_VERSION} from '../src/rules.js';
import {drafts} from '../src/documents.js';

for (const field of ['name','address','kana','birth','nationality','nationalityEvidence']) {
  test(`改正日以降：検索用情報 ${field} 欠落は警告して生成停止`, () => {
    const s = simpleCase(); s.applicationDate = '2026-10-05'; s.heirs[0][field] = '';
    assert.equal(evaluate(s).canDraft, false);
    assert.ok(evaluate(s).errors.length > 0);
    assert.equal(drafts(s), null);
  });
}
test('改正日以降：本人メールまたは「なし」の申出・検索資料の照合が必須', () => {
  for (const change of [s => {s.heirs[0].noEmail=false; s.heirs[0].email='';}, s => s.checks.search=false]) {
    const s=simpleCase(); s.applicationDate='2026-10-05'; change(s);
    assert.equal(drafts(s), null); assert.ok(evaluate(s).errors.length > 0);
  }
});
for (const value of ['1','999999','1000000']) {
  test(`土地${value}円：概算と下書きの両方を停止`, () => {
    const s=simpleCase(); s.properties[0].kind='land'; s.properties[0].value=value;
    assert.equal(taxEstimate(s).amount, null);
    assert.match(evaluate(s).errors.join(''), /免税/);
    assert.equal(drafts(s), null);
  });
}
test('小額土地と建物の混在も合計で100万円判定せず停止', () => {
  const s=simpleCase(); s.properties.push({...s.properties[0],id:'small-land',kind:'land',value:'1000000'});
  assert.equal(taxEstimate(s).amount,null); assert.equal(drafts(s),null);
});
test('免税案内期限の前後でも小額土地の自動判定・生成を再開しない', () => {
  for (const date of ['2027-03-31','2027-04-01']) {
    const s=simpleCase(); s.applicationDate=date; s.properties[0].kind='land'; s.properties[0].value='1000000';
    assert.equal(taxEstimate(s).amount,null); assert.equal(drafts(s),null);
    assert.match(taxEstimate(s).reason,/個別確認/);
  }
});
test('共有・持分未確認：確定額なし、下書き停止', () => {
  for (const change of [s=>s.properties[0].fullOwnership=false,s=>s.flags.shared=true]) {
    const s=simpleCase(); change(s);
    assert.equal(taxEstimate(s).amount,null); assert.equal(drafts(s),null);
    assert.match(evaluate(s).errors.join(''), /持分|共有|単独所有/);
  }
});
test('経過措置は2027年3月31日の一般案内であり個別の期限確定ではない', () => {
  const s=simpleCase(); s.knownDate='2024-03-31';
  assert.match(deadline(s), /経過措置/); assert.match(deadline(s), /2027年3月31日/);
  assert.match(deadline(s), /個別確認/); assert.match(deadline(s), /確定しません/);
  s.knownDate='2024-04-01'; assert.doesNotMatch(deadline(s), /経過措置/);
});
test('単純参考額は法定相続の参考持分を再度掛けず、税欄へ転記しない', () => {
  const s=simpleCase(); assert.equal(taxEstimate(s).amount,20000);
  const d=drafts(s); assert.ok(d); assert.match(d.application,/課税価格　【未確定/);
  assert.match(d.application,/登録免許税　【未確定/);
  assert.doesNotMatch(d.application,/登録免許税[^\n]*(?:20,?000|０円|0円)/);
});
test('画面と両文書に未監修表示を保持、ルール版は固定', () => {
  const s=simpleCase(); s.method='agreement'; s.recipientId='child-b'; s.agreementDate='2026-10-01';
  const d=drafts(s); assert.ok(d);
  for (const text of [d.application,d.agreement,readFileSync(new URL('../index.html',import.meta.url),'utf8')]) assert.match(text,/専門家レビュー未実施/);
  assert.equal(RULE_VERSION,'2026-11-18.2');
});
test('申請人想定・添付資料の兼用・未選択事項を転記メモで区別する', () => {
  const d=drafts(simpleCase());
  assert.match(d.application,/取得者全員が申請する想定/);
  assert.match(d.application,/氏名の振り仮名・生年月日・国籍等を証する情報/);
  assert.match(d.application,/重ねて提出/);
  assert.match(d.application,/登記識別情報の通知.*未選択/);
});
