"""Build conservative lookup data from fetched official markdown tables.
Usage: python scripts/build-jurisdictions.py /tmp/jurisdiction-pages-*.json
Inputs contain public official pages only; never supply user addresses.
"""
import json,re,sys
from pathlib import Path
PREFS={}
for group in ['北海道:sapporo,hakodate,asahikawa,kushiro','宮城県:sendai','福島県:fukushima','山形県:yamagata','岩手県:morioka','秋田県:akita','青森県:aomori','東京都:tokyo','神奈川県:yokohama','埼玉県:saitama','千葉県:chiba','茨城県:mito','栃木県:utsunomiya','群馬県:maebashi','静岡県:shizuoka','山梨県:kofu','長野県:nagano','新潟県:niigata','愛知県:nagoya','三重県:tsu','岐阜県:gifu','福井県:fukui','石川県:kanazawa','富山県:toyama','大阪府:osaka','京都府:kyoto','兵庫県:kobe','奈良県:nara','滋賀県:otsu','和歌山県:wakayama','広島県:hiroshima','山口県:yamaguchi','岡山県:okayama','鳥取県:tottori','島根県:matsue','香川県:takamatsu','徳島県:tokushima','高知県:kochi','愛媛県:matsuyama','福岡県:fukuoka','佐賀県:saga','長崎県:nagasaki','大分県:oita','熊本県:kumamoto','鹿児島県:kagoshima','宮崎県:miyazaki','沖縄県:naha']:
 pref,slugs=group.split(':')
 for slug in slugs.split(','):PREFS[slug]=pref
pages=[p for f in sys.argv[1:] for p in json.loads(Path(f).read_text())]
assert len(pages)==50 and len(set(p['url'] for p in pages))==50
rows=[];sources=[]
for page in pages:
 slug=page['url'].split('/')[3];pref=PREFS[slug]
 bureau=re.search(r'# (.+?法務局)',page['text']).group(1)
 source=len(sources);sources.append({'prefecture':pref,'bureau':bureau,'url':page['url'],'checkedAt':'2026-11-18','pageUpdatedAt':re.search(r'更新日：([^\n]+)',page['text']).group(1)})
 for line in page['text'].splitlines():
  if not line.startswith('|'):continue
  cells=[s.strip() for s in line.split('|')[1:-1]]
  if len(cells)!=3 or cells[0]=='庁名' or cells[0].startswith('---'):continue
  scope=cells[1]
  if not scope or re.search(r'取扱[いは]|取り扱|ありません|－－|^[-ー－]+$',scope):continue
  office=re.split(r'\s*[（(][ぁ-ゖ]|\s*案内図',cells[0])[0].strip()
  if '法務局' not in office:office=bureau+' '+('（本局）' if '本局' in office else office)
  if not re.search(r'法務局|支局|出張所',office):continue
  original=scope
  scope=scope.split('※')[0]
  # Tokyo's expressly listed municipalities precede a separate uninhabited-island exception.
  if slug=='tokyo' and office==bureau:scope=scope.split('八丈支庁')[0]
  # Positive historical descriptions do not change the currently named city.
  scope=re.sub(r'[（(]旧[^（）()]*[含む][^（）()]*[）)]',' ',scope)
  unsafe=bool(re.search(r'除|一部|旧|地番|番地|のうち|に限|地域|地区|属する|合併',scope))
  scope=re.sub(r'[（(]注[:：][^）)]*[）)]',' ',scope)
  tokens=re.split(r'[\s、，,・/／（）()]+',scope)
  prefixes=[];city='';county='';city_wards=set();cities=[];counties=[];county_towns=set()
  for token in tokens:
   token=token.replace('の内','').removeprefix('同郡') if token.startswith('同郡') else token.replace('の内','')
   if not token:continue
   if '郡' in token:
    county,token=token.split('郡',1);county+='郡';city='';counties.append(county)
    if not token:continue
   m=re.fullmatch(r'([^0-9０-９]+市)([^0-9０-９]+区)',token)
   if m:
    city,ward=m.groups();cities.append(city);city_wards.add(city);prefixes.append(city+ward);county='';continue
   if re.fullmatch(r'[一-龯ぁ-ゖァ-ヺヶケ々ー]+市',token):
    city=token;county='';cities.append(city);continue
   if re.fullmatch(r'[一-龯ぁ-ゖァ-ヺヶケ々ー]+区',token):
    if city:city_wards.add(city)
    prefixes.append(city+token);continue
   if re.fullmatch(r'[一-龯ぁ-ゖァ-ヺヶケ々ー]+[町村]',token):
    city='';prefixes.append(county+token);prefixes.append(token)
    if county:county_towns.add(county)
  prefixes.extend(c for c in cities if c not in city_wards)
  prefixes.extend(c for c in counties if c not in county_towns)
  prefixes=list(dict.fromkeys(pref+p for p in prefixes))
  if prefixes:rows.append({'source':source,'office':office,'prefixes':prefixes,'automatic':not unsafe,'scope':original})
assert len(rows)>300
out={'version':'2026-11-18.1','sources':sources,'entries':rows}
Path('data/jurisdictions.js').write_text('// Generated from official real-estate jurisdiction columns. See scripts/build-jurisdictions.py.\nexport const JURISDICTIONS = '+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n')
Path('data/jurisdiction-sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2)+'\n')
print('Sources:',len(sources),'Offices:',len(rows),'Prefixes:',sum(len(r['prefixes']) for r in rows),'Review-only offices:',sum(not r['automatic'] for r in rows))
