import {evaluate,RULE_VERSION} from './rules.js';
export const TEMPLATE_VERSION='draft-2026-11-18.1';
export function drafts(s) {
 const r=evaluate(s);if(!r.canDraft)return null;
 const header=`【下書き・提出不可／専門家レビュー未実施】\nテンプレート ${TEMPLATE_VERSION}・ルール ${RULE_VERSION}\n公式の個別PDF全項目との照合は未完了。管轄法務局等で確認し、公式様式へ転記・補完してください。`;
 const recipients=s.method==='agreement'?s.heirs.filter(h=>h.id===s.recipientId):s.heirs;
 const people=recipients.map(h=>`住所 ${h.address}\n氏名 ${h.name}${s.method==='statutory'?`　参考持分 ${r.shares.find(x=>x.id===h.id).fraction}`:''}`).join('\n\n');
 const property=s.properties.map((p,i)=>`${i+1}. ${p.kind==='land'?'土地':'建物'}\n${p.description}`).join('\n\n');
 const search=recipients.map(h=>`氏名 ${h.name}\n振り仮名 ${h.kana}\n住所 ${h.address}\n生年月日 ${h.birth}\nメールアドレス ${h.noEmail?'なし':h.email}\n国籍等 ${h.nationality||'【要確認】'}\n国籍等を証する情報 ${h.nationalityEvidence||'【要確認】'}`).join('\n\n');
 const application=`${header}\n\n登記申請書（転記用メモ）\n\n登記の目的　所有権移転\n原因　${s.deceased.death} 相続\n被相続人　${s.deceased.name}\n被相続人の最後の住所　${s.deceased.address}\n\n相続人・申請人候補（本下書きでは取得者全員を申請人候補として列挙）\n${people}\n\n連絡先 ${s.phone}\n\n添付情報（実際の資料と照合・補完）\n登記原因証明情報／住所証明情報／国籍等を証する情報${s.method==='agreement'?'／遺産分割協議書／印鑑証明書':''}\n検索用情報を証する情報の要否・援用、代理権限証明情報の要否は個別確認\n\n申請予定日 ${s.applicationDate}\n${s.office} 御中\n\n課税価格　【未確定・年度・申請単位・端数等を確認】\n登録免許税　【未確定・免税根拠と適用期限・端数等を確認】\n\n不動産の表示\n${property}\n\n検索用情報（名義人ごとの確認メモ／公式様式に従い申出）\n${search}\n\n申請人の表示、国籍等の証明情報・添付情報・税額欄は要監修。申請先の管轄確認が必要です。`;
 const agreement=s.method==='agreement'?`${header}\n\n遺産分割協議書（対象不動産のみ・下書き）\n\n被相続人 ${s.deceased.name}（最後の住所 ${s.deceased.address}、${s.deceased.death}死亡）の相続について、相続人全員は次のとおり協議した。\n\n次の不動産を ${recipients[0].name} が単独で取得する。\n\n${property}\n\n本書は上記不動産のみを対象とする。その他の財産・債務等についての合意を自動的に含めない。\n協議内容と全相続人の範囲を確認した上で、相続人全員が署名・実印押印するための下書き。\n\n協議日 ${s.agreementDate}\n\n${s.heirs.map(h=>`住所 ${h.address}\n氏名 ${h.name}　【署名・実印欄】`).join('\n\n')}\n\n印鑑証明書等との一致を要確認。未成年・代理・国外関係・争い等は対象外。`:'';
 return {application,agreement};
}
export function checklist(s) {
 const items=[
 ['family','出生から死亡までの戸籍・除籍・改製原戸籍等','本籍地の市区町村。転籍・改製をたどり連続性を確認。広域交付の対象・請求資格は窓口に確認。'],
 ['address','被相続人の住所のつながりを示す資料','最後の住所地・本籍地の市区町村で住民票の除票・戸籍の附票等を確認。登記簿の住所との連続性を確認。'],
 ['heirs','相続人の戸籍・取得者の住民票等','本籍地・住所地の市区町村へ請求。全相続人の確定と登記名義人となる方の住所の証明を確認。マイナンバーの記載は不要。'],
 ['registry','登記事項証明書','法務局等で取得。所在地は住居表示と地番・家屋番号が異なる場合あり。名義人・所有権・物件表示を確認。'],
 ['valuation','当該年度の固定資産評価額が分かる資料','不動産所在地の市区町村等へ評価証明書などを請求。登記用資料の要否を管轄法務局に確認。'],
 ['nationality','検索用情報・国籍等の証明資料','2026年10月5日以降は国籍等も確認。日本国籍なら本籍地記載の住民票の写し等。証明資料の援用・必要範囲は公式案内と照合。']
 ];
 if(s.method==='agreement')items.push(['agreement','相続人全員の遺産分割協議書','全員の合意・対象不動産・取得者を確認し、署名・実印押印。下書きだけでは合意・書類完成となりません。'],['seals','相続人全員の印鑑証明書','印鑑登録のある市区町村。協議書の印影・本人情報と照合。']);
 return items.map(([id,title,guide])=>({id,title,guide}));
}
