export const FLAGS = {will:'遺言あり・有無が未確認',renunciation:'相続放棄あり・確認が必要',representation:'代襲相続の可能性',successive:'数次相続の可能性',minor:'未成年者が関係',overseas:'国外居住・外国法が関係',shared:'被相続人の持分のみを相続',other:'その他の不明点・争い・特別な事情'};
export function today() {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function heir(id=crypto.randomUUID()) {return {id,relation:'child',name:'',address:'',kana:'',birth:'',nationality:'',nationalityEvidence:'',email:'',noEmail:false};}
export function property(id=crypto.randomUUID()) {return {id,kind:'land',location:'',description:'',value:'',fullOwnership:false};}
export function blank() {return {schemaVersion:1,deceased:{name:'',address:'',death:''},knownDate:'',applicationDate:today(),office:'',officeManual:false,phone:'',method:'statutory',recipientId:'',agreementDate:'',heirs:[heir()],properties:[property()],expectedSpouses:'',expectedChildren:'',checks:{family:false,registry:false,scope:false,agreement:false,search:false},flags:Object.fromEntries(Object.keys(FLAGS).map(k=>[k,false])),documents:{}};}
export function isDate(s) {return typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && s>='1800-01-01' && s<='2199-12-31' && !Number.isNaN(Date.parse(s)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0,10)===s;}
const fail=()=>{throw new Error('このアプリの保存形式ではないか、入力が不正です。元の入力は変更していません。');};
function text(v,max=1000) {if(typeof v!=='string'||v.length>max||/[\u0000-\u001f\u007f]/.test(v))fail();return v;}
function bool(v) {if(typeof v!=='boolean')fail();return v;}
function keys(o,allowed) {if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).some(k=>!allowed.includes(k)))fail();}
function record(o,fields) {keys(o,Object.keys(fields));return Object.fromEntries(Object.entries(fields).map(([k,f])=>[k,f(o[k])]));}
function date(v) {text(v,10);if(v&&!isDate(v))fail();return v;}
function choice(choices) {return v=>{if(!choices.includes(v))fail();return v;};}
export function parseState(raw) {
 if(typeof raw!=='string'||raw.length>1000000)fail();
 const d=JSON.parse(raw);
 keys(d,['schemaVersion','deceased','knownDate','applicationDate','office','officeManual','phone','method','recipientId','agreementDate','heirs','properties','expectedSpouses','expectedChildren','checks','flags','documents']);
 if(d.schemaVersion!==1||!Array.isArray(d.heirs)||!d.heirs.length||d.heirs.length>100||!Array.isArray(d.properties)||!d.properties.length||d.properties.length>100)fail();
 const out={schemaVersion:1,deceased:record(d.deceased,{name:text,address:text,death:date}),knownDate:date(d.knownDate),applicationDate:date(d.applicationDate),office:text(d.office),officeManual:d.officeManual===undefined?!!d.office:bool(d.officeManual),phone:text(d.phone),method:choice(['statutory','agreement'])(d.method),recipientId:text(d.recipientId),agreementDate:date(d.agreementDate),heirs:d.heirs.map(h=>record(h,{id:v=>text(v,100),relation:choice(['spouse','child','parent','sibling','other']),name:text,address:text,kana:text,birth:date,nationality:text,nationalityEvidence:text,email:text,noEmail:bool})),properties:d.properties.map(p=>record(p,{id:v=>text(v,100),kind:choice(['land','building','other']),location:v=>v===undefined?'':text(v),description:text,value:v=>text(v,16),fullOwnership:bool})),expectedSpouses:text(d.expectedSpouses),expectedChildren:text(d.expectedChildren),checks:record(d.checks,Object.fromEntries(['family','registry','scope','agreement','search'].map(k=>[k,bool]))),flags:record(d.flags,Object.fromEntries(Object.keys(FLAGS).map(k=>[k,bool]))),documents:{}};
 for(const list of [out.heirs,out.properties])if(list.some(x=>!x.id)||new Set(list.map(x=>x.id)).size!==list.length)fail();
 keys(d.documents,['family','address','heirs','registry','valuation','nationality','agreement','seals']);
 for(const [k,v] of Object.entries(d.documents))out.documents[k]=bool(v);
 return out;
}
export function serialize(s) {return JSON.stringify(parseState(JSON.stringify(s)),null,2);}
// Any case-changing input revokes evidence confirmations. Imported attestations are also revoked.
export function invalidate(s) {for(const k of Object.keys(s.checks))s.checks[k]=false;return s;}
