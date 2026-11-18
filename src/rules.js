import {caseJurisdiction} from './jurisdiction.js';
import {FLAGS,isDate,today} from './model.js';
export const RULE_VERSION='2026-11-18.2';
export const SOURCES=[
 {id:'jurisdiction',title:'不動産登記の管轄案内（所在地別・各局の公式表は入力欄に表示）',url:'https://houmukyoku.moj.go.jp/homu/static/kankatsu_index.html',checkedAt:'2026-11-18',status:'全国50局の不動産登記管轄列を確認・同梱。町域の例外・変更は要最終確認'},
 {id:'forms',title:'不動産登記の申請書様式（2026年10月5日以降の欄）',url:'https://houmukyoku.moj.go.jp/homu/minji79.html',checkedAt:'2026-11-18',status:'一覧本文確認。個別PDF・全項目照合は未実施'},
 {id:'guide',title:'相続登記手続ハンドブック',url:'https://houmukyoku.moj.go.jp/homu/page7_000001_00014.html',checkedAt:'2026-11-18',status:'案内本文確認。個別案件への適用は未監修'},
 {id:'deadline',title:'相続登記の申請義務化',url:'https://www.moj.go.jp/MINJI/minji05_00599.html',checkedAt:'2026-11-18',status:'経過措置・免税期間の本文確認'},
 {id:'search',title:'検索用情報の申出',url:'https://www.moj.go.jp/MINJI/minji05_00678.html',checkedAt:'2026-11-18',status:'氏名・振り仮名・住所・生年月日・メール・国籍等と証明情報の本文確認'},
 {id:'shares',title:'民法（第887条・第890条・第900条等）',url:'https://laws.e-gov.go.jp/law/129AC0000000089',checkedAt:null,status:'本セッションで原文未取得。単純ケースの実装、要監修'},
 {id:'tax',title:'登録免許税（参考資料）',url:'https://www.moj.go.jp/content/001291200.pdf',checkedAt:null,status:'PDF未照合。0.4%の単純参考額のみ。端数・免税判定は未実装'}
];
export function deadline(s) {
 if(!isDate(s.knownDate))return '不動産を相続で取得したと知った日を確認してください。原則として、その日から3年以内の申請が必要です。';
 if(s.knownDate<'2024-04-01')return '経過措置：原則2027年3月31日まで。遺産分割成立後の義務など、個別の期限を管轄法務局等に確認してください。';
 return `${s.knownDate}に取得を知った場合、原則その日から3年以内。遺産分割成立後の義務も別途確認してください。正確な期限日は個別に確認が必要です。`;
}
export function referenceShares(s) {
 const spouse=s.heirs.filter(h=>h.relation==='spouse'), children=s.heirs.filter(h=>h.relation==='child');
 if(spouse.length>1||!children.length||s.heirs.some(h=>!['spouse','child'].includes(h.relation))||Object.values(s.flags).some(Boolean)||!s.checks.family||!s.checks.scope||s.expectedSpouses!==String(spouse.length)||s.expectedChildren!==String(children.length))return [];
 return s.heirs.map(h=>({id:h.id,name:h.name,fraction:h.relation==='spouse'?'1/2':`1/${children.length*(spouse.length?2:1)}`}));
}
export function taxEstimate(s) {
 if(s.properties.some(p=>p.kind==='other'||!p.fullOwnership)||s.flags.shared)return {amount:null,reason:'共有持分・未確認の所有権・対象外物件では概算を停止します。持分を乗じた課税価格や端数処理は要確認です。'};
 if(s.properties.some(p=>!/^\d+$/.test(p.value)||Number(p.value)<=0||!Number.isSafeInteger(Number(p.value))))return {amount:null,reason:'各物件の当該年度の固定資産評価額を正の整数（円）で入力してください。'};
 if(s.properties.some(p=>p.kind==='land'&&Number(p.value)<=1000000))return {amount:null,reason:'100万円以下の土地は免税対象になり得ます。租税特別措置法第84条の2の3第2項等の条件と適用期限（公式案内では2027年3月31日まで）を確認してください。免税・税額は自動確定しません。'};
 const sum=s.properties.reduce((n,p)=>n+Number(p.value),0);
 if(!Number.isSafeInteger(sum))return {amount:null,reason:'評価額合計が計算可能範囲を超えています。'};
 return {amount:sum*0.004,reason:'評価額合計×0.4%の単純参考額。課税価格・税額の端数処理、最低税額、非課税・免税、申請単位は反映していません。申請書の税額欄には転記しません。'};
}
export function evaluate(s) {
 const errors=[],warnings=['専門家レビュー未実施。表示は一般的案内と下書きであり、提出可能・手続完成とは判定しません。'];
 const add=(condition,message)=>{if(condition)errors.push(message);};
 add(!s.deceased.name.trim()||!s.deceased.address.trim(),'被相続人の氏名・最後の住所を入力してください。');
 add(!isDate(s.deceased.death),'死亡日を入力してください。');
 add(isDate(s.deceased.death)&&s.deceased.death<'2013-09-05','古い相続の経過法・当時の相続分の確認が必要です。2013年9月5日より前に開始した相続は試作版の対象外です。');
 add(!isDate(s.applicationDate),'申請予定日を入力してください。');
 add(s.deceased.death>today(),'死亡日が未来になっています。');
 add(isDate(s.deceased.death)&&isDate(s.applicationDate)&&s.applicationDate<s.deceased.death,'申請予定日は死亡日以降にしてください。');
 add(!isDate(s.knownDate),'不動産を相続で取得したと知った日を入力してください。');
 add(isDate(s.knownDate)&&(s.knownDate<s.deceased.death||s.knownDate>today()),'取得を知った日と死亡日の前後関係を確認してください。');
 add(!s.office.trim()||!s.phone.trim(),'申請先の管轄法務局と連絡先を入力してください。');
 const jurisdiction=caseJurisdiction(s.properties);
 add(s.properties.some(p=>!p.location?.trim()),'各不動産の所在地を都道府県名から入力してください。被相続人の住所とは別に確認します。');
 add(jurisdiction.status==='multiple','不動産ごとに管轄が異なります。申請先ごとに案件を分けてください。');
 add(!s.officeManual&&(jurisdiction.status!=='matched'||s.office!==jurisdiction.office),'不動産所在地から管轄を確認してください。判定できない場合は公式表を確認して手入力してください。');
 add(s.officeManual&&jurisdiction.status==='matched'&&s.office!==jurisdiction.office,'手入力の申請先が所在地からの候補と異なります。公式管轄表で確認してください。');
 const spouse=s.heirs.filter(h=>h.relation==='spouse'),child=s.heirs.filter(h=>h.relation==='child');
 add(spouse.length>1,'配偶者が複数入力されています。戸籍と照合してください。');
 add(s.heirs.some(h=>!['spouse','child'].includes(h.relation)),'親・兄弟姉妹等を含む入力、または子との混在は対象範囲外です。自動確定を停止します。');
 add(!child.length,'配偶者のみ・子がいないケースは他順位の不存在確認が必要です。現在の試作版では自動確定を停止します。');
 add(s.expectedSpouses!==String(spouse.length)||s.expectedChildren!==String(child.length),'戸籍から確認した配偶者・子の人数と入力人数を照合してください（未入力を含む）。');
 for(const [k,label] of Object.entries(FLAGS))add(s.flags[k],`${label}：専門家確認が必要です。下書き生成を停止します。`);
 for(const [i,h] of s.heirs.entries()) {
  const prefix=`相続人${i+1}：`;
  add(!h.name.trim()||!h.address.trim(),prefix+'氏名と住所を入力してください。');
  add(!isDate(h.birth),prefix+'生年月日を入力してください。');
  add(isDate(h.birth)&&h.birth>s.deceased.death,prefix+'出生が死亡後のケースは個別確認が必要です。');
  const adult=isDate(h.birth)?`${Number(h.birth.slice(0,4))+18}${h.birth.slice(4)}`:'';
  const actingDate=s.method==='agreement'?s.agreementDate:s.applicationDate;
  add(adult&&isDate(actingDate)&&adult>actingDate,prefix+'未成年者の関係する手続は対象外です。');
  add(!h.kana.trim(),prefix+'氏名の振り仮名を入力してください。');
  add(!h.noEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(h.email),prefix+'本人のメールアドレスまたは「なし」を選択してください。');
  add(h.noEmail&&!!h.email.trim(),prefix+'メールアドレスと「なし」が同時に指定されています。');
  if(s.applicationDate>='2026-10-05') {
   add(!h.nationality.trim()||!h.nationalityEvidence.trim(),prefix+'2026年10月5日以降は国籍等とそれを証する情報の入力・照合が必要です。');
   add(h.nationality.trim()!==''&&h.nationality.trim()!=='日本',prefix+'外国籍の適用法・ローマ字氏名等は要専門家確認です。');
  }
 }
 add(s.heirs.some((h,i)=>s.heirs.slice(0,i).some(x=>x.name.trim()===h.name.trim()&&x.birth===h.birth)), '同じ氏名・生年月日の重複を確認してください。');
 add(!s.checks.family,'被相続人の出生から死亡までの戸籍等と、相続人全員の関係を確認してください。');
 add(!s.checks.registry,'登記事項証明書で名義人・物件表示・所有持分を照合してください。');
 add(!s.checks.scope,'対象範囲と未対応事項を確認してください。');
 add(!s.checks.search,'検索用情報と証明資料を名義人ごとに照合してください。');
 add(s.properties.some(p=>!p.description.trim()),'不動産の表示を登記事項証明書どおり入力してください。');
 const tax=taxEstimate(s);warnings.push(tax.reason);
 add(s.properties.some(p=>!p.fullOwnership||p.kind==='other'),'被相続人の単独所有以外・未確認・区分建物等の複雑な物件は対象外です。');
 if(s.method==='agreement') {
  add(!s.heirs.some(h=>h.id===s.recipientId),'全不動産を取得する相続人を選択してください。');
  add(!s.checks.agreement,'相続人全員の協議内容・合意を確認してください。');
  add(!isDate(s.agreementDate)||s.agreementDate<s.deceased.death||s.agreementDate>s.applicationDate||s.agreementDate>today(),'協議日と死亡日・申請予定日の前後関係を確認してください。');
 }
 return {errors,warnings,shares:referenceShares(s),tax,deadline:deadline(s),canDraft:errors.length===0,needsExpertReview:true,ruleVersion:RULE_VERSION};
}
