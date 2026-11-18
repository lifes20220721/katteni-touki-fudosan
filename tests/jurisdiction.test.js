import test from 'node:test';
import assert from 'node:assert/strict';
import {blank,property,parseState,serialize} from '../src/model.js';
import {JURISDICTIONS} from '../data/jurisdictions.js';
import {lookupJurisdiction,caseJurisdiction,updateCaseOffice} from '../src/jurisdiction.js';
import {evaluate} from '../src/rules.js';
const cases=[
 ['東京都新宿区西新宿1丁目','東京法務局 新宿出張所'],
 ['東京都千代田区九段南1丁目','東京法務局'],
 ['東京都港区','東京法務局 港出張所'],
 ['東京都八王子市','東京法務局 八王子支局'],
 ['東京都西多摩郡瑞穂町','東京法務局 西多摩支局'],
 ['大阪府大阪市北区','大阪法務局 北出張所'],
 ['大阪府大阪市中央区','大阪法務局（本局）'],
 ['大阪府大阪市天王寺区','大阪法務局 天王寺出張所'],
 ['大阪府吹田市','大阪法務局 北大阪支局'],
 ['神奈川県横浜市西区','横浜地方法務局（本局）'],
 ['神奈川県横浜市港北区','横浜地方法務局 港北出張所'],
 ['神奈川県川崎市高津区','横浜地方法務局 麻生出張所'],
 ['神奈川県相模原市中央区','横浜地方法務局 相模原支局'],
 ['北海道札幌市北区','札幌法務局 北出張所'],
 ['三重県四日市市','津地方法務局 四日市支局'],
 ['京都府京都市伏見区','京都地方法務局 伏見出張所'],
 ['兵庫県神戸市西区','神戸地方法務局 明石支局']
];
for(const [address,office] of cases)test(`不動産管轄：${address}`,()=>{const r=lookupJurisdiction(address);assert.equal(r.status,'matched');assert.equal(r.office,office);assert.match(r.sources[0].url,/^https:\/\/houmukyoku\.moj\.go\.jp\//);});
test('全国47都道府県50法務局の根拠と確認日を保持',()=>{assert.equal(JURISDICTIONS.sources.length,50);assert.equal(new Set(JURISDICTIONS.sources.map(s=>s.prefecture)).size,47);for(const s of JURISDICTIONS.sources)assert.equal(s.checkedAt,'2026-11-18');assert.ok(JURISDICTIONS.entries.length>400);});
test('都道府県省略・市区町村未完了・未知住所・HTMLでは申請先を決めない',()=>{for(const address of ['', '新宿区', '東京都', '大阪府大阪市', '東京都存在しない市','<script>alert(1)</script>'])assert.notEqual(lookupJurisdiction(address).status,'matched',address);});
test('全角と空白、郵便番号を正規化',()=>{assert.equal(lookupJurisdiction('〒１６０－００２３　東京都　新宿区 西新宿１丁目').office,'東京法務局 新宿出張所');});
test('町域で管轄が分かれる市は推測で確定しない',()=>{for(const address of ['千葉県成田市','新潟県新潟市北区','愛媛県松山市','岐阜県下呂市']){const r=lookupJurisdiction(address);assert.equal(r.status,'review',address);assert.equal(r.office,'');assert.ok(r.sources.length);}});
test('住所変更と削除で古い自動入力を消す',()=>{const s=blank();s.properties[0].location='東京都新宿区';updateCaseOffice(s);assert.equal(s.office,'東京法務局 新宿出張所');s.properties[0].location='東京都';updateCaseOffice(s);assert.equal(s.office,'');s.properties[0].location='';updateCaseOffice(s);assert.equal(s.office,'');});
test('被相続人の最後の住所を管轄判定に使わない',()=>{const s=blank();s.deceased.address='東京都新宿区';assert.notEqual(caseJurisdiction(s.properties).status,'matched');s.properties[0].location='大阪府大阪市北区';updateCaseOffice(s);assert.equal(s.office,'大阪法務局 北出張所');});
test('複数不動産：同じ管轄はまとめ、異なる管轄は自動入力と生成を停止',()=>{const s=blank();s.properties=[{...property('a'),location:'東京都新宿区'},{...property('b'),location:'東京都新宿区'}];assert.equal(caseJurisdiction(s.properties).status,'matched');s.properties[1].location='大阪府大阪市北区';assert.equal(caseJurisdiction(s.properties).status,'multiple');s.officeManual=true;assert.match(evaluate(s).errors.join(''),/案件を分けて/);});
test('手入力済みでも所在地変更時は古い申請先を消去',()=>{const s=blank();s.officeManual=true;s.office='手入力した局';s.properties[0].location='東京都新宿区';updateCaseOffice(s);assert.equal(s.office,'');});
test('新しい所在地と手入力モードをJSONで復元',()=>{const s=blank();s.properties[0].location='東京都新宿区';s.officeManual=true;s.office='東京法務局 新宿出張所';assert.deepEqual(parseState(serialize(s)),s);});
test('旧v1のJSONには空の所在地と手入力モードを補完し、他項目を保持',()=>{const s=blank();delete s.officeManual;delete s.properties[0].location;s.office='旧ファイルの申請先';s.deceased.name='架空 旧ファイル';const r=parseState(JSON.stringify(s));assert.equal(r.office,s.office);assert.equal(r.officeManual,true);assert.equal(r.properties[0].location,'');assert.equal(r.deceased.name,s.deceased.name);});
test('所在地・手入力モードの不正な型は拒否',()=>{const s=blank();s.properties[0].location={};assert.throws(()=>parseState(JSON.stringify(s)));s.properties[0].location='東京都';s.officeManual='false';assert.throws(()=>parseState(JSON.stringify(s)));});
test('未判定物件が混在しても、既知の複数管轄を見逃さない',()=>{const properties=[{location:'千葉県成田市'},{location:'東京都新宿区'},{location:'大阪府大阪市北区'}];assert.equal(caseJurisdiction(properties).status,'multiple');});
