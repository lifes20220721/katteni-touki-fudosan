import {JURISDICTIONS} from '../data/jurisdictions.js';
export const NATIONAL_JURISDICTION_URL='https://houmukyoku.moj.go.jp/homu/static/kankatsu_index.html';
export function normalizeAddress(address){return String(address??'').normalize('NFKC').replace(/[\s\u3000]/g,'').replace(/^〒?\d{3}-?\d{4}/,'');}
export function lookupJurisdiction(address){
 const input=normalizeAddress(address);
 const prefectures=[...new Set(JURISDICTIONS.sources.map(s=>s.prefecture))];
 const prefecture=prefectures.find(p=>input.startsWith(p));
 if(!prefecture)return {status:input?'incomplete':'empty',office:'',message:'不動産の所在地を都道府県名から入力してください。被相続人の最後の住所からは判定しません。',sources:[]};
 const sources=JURISDICTIONS.sources.filter(s=>s.prefecture===prefecture);
 const matches=JURISDICTIONS.entries.flatMap(entry=>entry.prefixes.filter(p=>input.startsWith(normalizeAddress(p))).map(prefix=>({entry,length:normalizeAddress(prefix).length})));
 if(!matches.length)return {status:'unmatched',office:'',message:'市区町村まで入力してください。一致しない場合は公式管轄表で確認し、手入力できます。',sources};
 const longest=Math.max(...matches.map(x=>x.length));
 const best=matches.filter(x=>x.length===longest).map(x=>x.entry);
 const offices=[...new Set(best.map(e=>e.office))];
 const knownSources=[...new Set(best.map(e=>e.source))].map(i=>JURISDICTIONS.sources[i]);
 if(offices.length!==1||best.some(e=>!e.automatic))return {status:'review',office:'',message:'この地域は町域等で管轄が分かれる可能性があります。公式の不動産登記管轄表で確認して手入力してください。',sources:knownSources};
 return {status:'matched',office:offices[0],message:`${offices[0]}を自動入力しました。番地・町域の例外や最新の管轄は、公式表で最終確認してください。`,sources:knownSources};
}
export function caseJurisdiction(properties){
 const results=properties.map(p=>lookupJurisdiction(p.location||''));
 const sources=[...new Map(results.flatMap(r=>r.sources).map(s=>[s.url,s])).values()];
 const offices=[...new Set(results.filter(r=>r.status==='matched').map(r=>r.office))];
 if(offices.length>1)return {status:'multiple',office:'',message:'不動産ごとに管轄が異なります。申請先ごとに案件を分けてください。',sources};
 if(results.some(r=>r.status!=='matched'))return {status:'review',office:'',message:results.find(r=>r.status!=='matched').message,sources};
 return {status:'matched',office:offices[0],message:results[0].message,sources};
}
// The caller revokes evidence confirmations and clears previews after a location change.
export function updateCaseOffice(state){
 const result=caseJurisdiction(state.properties);
 state.office=state.officeManual?'':result.office;
 return result;
}
