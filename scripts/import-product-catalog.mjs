import { createClient } from '@supabase/supabase-js';
import { createReadStream } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';

const args = process.argv.slice(2);
const has = (x) => args.includes(x);
const val = (x, d='') => { const i=args.indexOf(x); return i<0?d:args[i+1]; };
const limit = Number(val('--limit','0')) || 0;
const dry = has('--dry-run');
const includeGlobal = has('--include-global');
const offPath = val('--off-jsonl');
const doOpenMrp = has('--openmrp');
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_PRODUCT_IMAGE_BUCKET || 'product-images';
if (!url || !key || (!doOpenMrp && !offPath)) {
  console.error('Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY; choose --openmrp and/or --off-jsonl <file>.');
  process.exit(1);
}
const db = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const stats={read:0,indiaSkipped:0,noImage:0,created:0,uploaded:0,existing:0,failed:0};
const s=v=>String(v??'').trim();
const slug=v=>s(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);
const imageOfOff=p=>{
  const imgs=p.selected_images?.front?.display||p.selected_images?.front?.small||{};
  const chosen=imgs.en||imgs.hi||Object.values(imgs)[0];
  return /^https:\/\//i.test(s(chosen))?s(chosen):s(p.image_front_url||p.image_url);
};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

async function getProduct({name,brand,barcode,weight,unit,manufacturer,description}) {
  let q=db.from('universal_products').select('id,image_url').limit(2);
  q=barcode?q.eq('barcode',barcode):q.ilike('name',name).eq('brand',brand||'').eq('weight',weight||'');
  const {data,error}=await q;
  if(error) throw error;
  if(data?.length>1) throw new Error('Ambiguous existing canonical product');
  if(data?.length===1) return data[0];
  if(dry) return null;
  const {data:row,error:e}=await db.from('universal_products').insert({
    name,brand:brand||null,barcode:barcode||null,weight:weight||null,unit:unit||null,
    manufacturer:manufacturer||brand||null,description:description||null
  }).select('id,image_url').single();
  if(e) throw e;
  stats.created++;
  return row;
}
async function ingest(r) {
  stats.read++;
  const name=s(r.name||r.product_name||r.product_name_en);
  const brand=s(r.brand||r.brands).split(',')[0].trim();
  const barcode=s(r.barcode||r.code||r.gtin);
  const weight=s(r.weight||r.quantity||r.pack_size||r.label);
  const image=s(r.image_url||r.image_front_url);
  if(!name||(!barcode&&!brand)) return;
  if(!/^https:\/\//i.test(image)){stats.noImage++;return;}
  const product=await getProduct({name,brand,barcode,weight,unit:s(r.unit),manufacturer:s(r.manufacturer||brand),description:s(r.description||r.generic_name)});
  if(!product) return;
  const {data:gallery,error:ge}=await db.from('universal_product_images').select('id,image_url,is_primary').eq('universal_product_id',product.id).limit(100);
  if(ge) throw ge;
  if(product.image_url||gallery?.some(x=>x.is_primary)||gallery?.some(x=>x.image_url===image)){stats.existing++;return;}
  if(dry){stats.uploaded++;return;}
  const response=await fetch(image,{headers:{'user-agent':'RivoCity-Catalog-Importer/1.0'}});
  if(!response.ok) throw new Error('Image download HTTP '+response.status);
  const type=(response.headers.get('content-type')||'image/jpeg').split(';')[0];
  if(!type.startsWith('image/')) throw new Error('Source response is not an image');
  const bytes=Buffer.from(await response.arrayBuffer());
  if(!bytes.length||bytes.length>8*1024*1024) throw new Error('Image is empty or exceeds 8 MB');
  const ext=type.includes('png')?'png':type.includes('webp')?'webp':'jpg';
  const source=r._source||'openfoodfacts';
  const path='catalogue/'+source+'/'+slug(barcode||product.id)+'.'+ext;
  const {error:up}=await db.storage.from(bucket).upload(path,bytes,{contentType:type,upsert:true,cacheControl:'31536000'});
  if(up) throw up;
  const publicUrl=db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  const attribution={
    source:source==='openmrp'?'OpenMRP':'Open Food Facts',
    source_product_url:r._source_url||'',
    original_image_url:image,
    image_contributor:r._contributor||'',
    database_license:source==='openmrp'?'ODbL-1.0':'ODbL-1.0',
    image_license:source==='openmrp'?'CC-BY-SA-4.0':'CC-BY-SA-3.0',
    license_reference:source==='openmrp'?'https://github.com/openmrp-in/openmrp':'https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/license-be-on-the-legal-side/',
    stored_image_path:path,
    retrieved_at:new Date().toISOString()
  };
  const attrPath='catalogue-attribution/'+source+'/'+slug(barcode||product.id)+'.json';
  const {error:ae}=await db.storage.from(bucket).upload(attrPath,Buffer.from(JSON.stringify(attribution,null,2)),{contentType:'application/json',upsert:true});
  if(ae) throw ae;
  const primary=!product.image_url&&!gallery?.some(x=>x.is_primary);
  const {error:ie}=await db.from('universal_product_images').insert({universal_product_id:product.id,image_url:publicUrl,is_primary:primary,source:'system'});
  if(ie) throw ie;
  if(primary){const {error:ue}=await db.from('universal_products').update({image_url:publicUrl}).eq('id',product.id);if(ue)throw ue;}
  stats.uploaded++;
}
async function openMrp(){
  const base='https://api.openmrp.in/v1/dump/file/';
  const [products,variants,brands]=await Promise.all(['products.json','variants.json','brands.json'].map(async f=>{
    const res=await fetch(base+f);if(!res.ok)throw new Error('OpenMRP dump '+f+' HTTP '+res.status);return res.json();
  }));
  const pm=new Map(products.map(p=>[p.id,p]));
  const bm=new Map(brands.map(b=>[b.id,b]));
  let n=0;
  for(const v of variants){
    if(limit&&n>=limit)break;
    const p=pm.get(v.product_id);if(!p)continue;
    const b=bm.get(p.brand_id);const barcode=s(v.barcode);
    const r={name:p.name,brand:b?.name||'',barcode,weight:s(v.label||(v.pack_size?String(v.pack_size)+' '+(v.unit||''):'')),unit:s(v.unit),manufacturer:b?.manufacturer||'',description:p.description||'',image_url:p.image_url,_source:'openmrp',_source_url:barcode?'https://openmrp.in/product/'+barcode:'https://openmrp.in/downloads'};
    try{await ingest(r);}catch(e){stats.failed++;console.error('OpenMRP',barcode,e.message);}
    n++;if(n%100===0)console.log('OpenMRP',n,stats);await wait(25);
  }
}
async function openFoodFacts(){
  const input=createReadStream(offPath);
  const stream=offPath.endsWith('.gz')?input.pipe(createGunzip()):input;
  const lines=createInterface({input:stream,crlfDelay:Infinity});let n=0;
  for await(const line of lines){
    if(!line.trim())continue;
    let p;try{p=JSON.parse(line);}catch{continue;}
    if(!includeGlobal&&!/india|en:india|in:india/i.test([p.countries,...(p.countries_tags||[])].join(' '))){stats.indiaSkipped++;continue;}
    if(limit&&n>=limit)break;
    const image=imageOfOff(p);
    const r={code:p.code||p._id,product_name:p.product_name||p.product_name_en,brands:p.brands,quantity:p.quantity,image_url:image,generic_name:p.generic_name,_source:'openfoodfacts',_source_url:p.url||'https://world.openfoodfacts.org/product/'+(p.code||p._id),_contributor:p.image_uploader||p.creator||''};
    try{await ingest(r);}catch(e){stats.failed++;console.error('Open Food Facts',r.code,e.message);}
    n++;if(n%100===0)console.log('Open Food Facts',n,stats);await wait(25);
  }
}
console.log(dry?'DRY RUN — no writes':'LIVE IMPORT — writing to Supabase');
try{if(doOpenMrp)await openMrp();if(offPath)await openFoodFacts();console.log('Finished',stats);}
catch(e){console.error(e);process.exitCode=1;}
