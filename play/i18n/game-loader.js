(function(root){
 'use strict';
 const contract=root.KanjimonRegionalContract;
 const loaded=new Set(),pending=new Map();let manifest=null,bundle=null;
 const fields=s=>JSON.stringify([...s.matchAll(/\{[pcw]\d+\}/g)].map(m=>m[0]).sort());
 const sameKeys=(object,keys)=>object&&typeof object==='object'&&!Array.isArray(object)&&JSON.stringify(Object.keys(object).sort())===JSON.stringify([...keys].sort());
 function grade(zone){return Number.isInteger(zone)&&zone>=1&&zone<=102?contract.regions.findIndex(n=>zone<=n)+1:0;}
 async function fetchPack(row){
  if(!manifest||!contract||contract.schema!==1)throw Error('Language setup unavailable');
  const entry=manifest.files.find(f=>f.path===row.path);
  if(!entry||entry.bytes!==row.bytes||entry.sha256!==row.sha256||entry.group!==(row.region?'locale-en-region-'+row.region:'locale-en'))throw Error('Language release mismatch');
  const response=await fetch(new URL(row.path,document.baseURI),{cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('Language download failed');
  const body=await response.arrayBuffer();if(body.byteLength!==row.bytes)throw Error('Language size mismatch');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',body)),x=>x.toString(16).padStart(2,'0')).join('');
  if(hash!==row.sha256)throw Error('Language integrity mismatch');
  const pack=JSON.parse(new TextDecoder().decode(body));
  if(pack.schema!==1||pack.locale!=='en'||pack.revision!==contract.revision||pack.region!==row.region)throw Error('Language version mismatch');
  if(!sameKeys(pack,['schema','locale','region','revision',...Object.keys(row.keys)]))throw Error('Language fields mismatch');
  for(const [field,keys]of Object.entries(row.keys)){
   if(!sameKeys(pack[field],keys))throw Error('Incomplete language pack');
   for(const key of keys){
    const value=pack[field][key];
    if(field==='learning'){
     if(!sameKeys(value,value.source===undefined?['meaning','note']:['meaning','note','source'])||[value.meaning,value.note,value.source||'source'].some(v=>typeof v!=='string'||!v.trim()))throw Error('Invalid learning guide');
    }else if(typeof value!=='string'||!value.trim()||/[<>]/.test(value))throw Error('Invalid language text');
    if(field==='messages'&&fields(value)!==fields(contract.sources[key]))throw Error('Translation fields mismatch');
    if(['writingById','compounds'].includes(field)&&/[ぁ-ヶ一-鿿]/.test(value))throw Error('Exposed writing answer');
   }
  }
  return pack;
 }
 async function load(region){
  if(loaded.has(region))return null;
  if(!pending.has(region))pending.set(region,fetchPack(contract.packs.find(p=>p.region===region)).finally(()=>pending.delete(region)));
  return pending.get(region);
 }
 async function ensure(zones){
  const high=Math.max(1,...(Array.isArray(zones)?zones:[zones]).map(z=>grade(Number(z))));
  const requested=Array.from({length:high+1},(_,i)=>i),packs=await Promise.all(requested.map(load));
  // Commit only once every requested pack is verified.
  if(!bundle)bundle={schema:1,locale:'en',messages:Object.create(null),learning:{},writing:{},writingById:{},compounds:{},regions:[],ensure,ready};
  for(const pack of packs)if(pack&&!loaded.has(pack.region)){
   for(const [key,value]of Object.entries(pack.messages))bundle.messages[contract.sources[key]]=value;
   for(const field of ['learning','writing','writingById','compounds'])Object.assign(bundle[field],pack[field]||{});
   loaded.add(pack.region);
  }
  bundle.regions=[...loaded].filter(Boolean);return bundle;
 }
 function ready(zones){const high=Math.max(1,...(Array.isArray(zones)?zones:[zones]).map(z=>grade(Number(z))));return Array.from({length:high+1},(_,i)=>i).every(n=>loaded.has(n));}
 root.KanjimonGamePacks={connect(info){manifest=info;},ensure,ready,get bundle(){return bundle;},get groups(){return [...loaded].map(n=>n?'locale-en-region-'+n:'locale-en');}};
})(window);
