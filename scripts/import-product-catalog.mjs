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
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const stats = {
  recordsScanned: 0, indiaSkipped: 0, eligible: 0, missingName: 0,
  missingBarcodeAndBrand: 0, noImage: 0, invalidImageUrl: 0,
  matchedExisting: 0, wouldCreate: 0, created: 0, wouldUpload: 0,
  uploaded: 0, existingImage: 0, failed: 0
};
const samples = { missingIdentity: [], noImage: [], invalidImage: [] };
const s = v => String(v ?? '').trim();
const slug = v => s(v).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'product';
const wait = ms => new Promise(r => setTimeout(r, ms));

function imageOfOff(p) {
  const front = p.selected_images?.front || {};
  for (const candidate of [front.display, front.small, front.thumb]) {
    if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate)) return candidate;
    if (candidate && typeof candidate === 'object') {
      const value = candidate.en || candidate.hi || Object.values(candidate).find(v => typeof v === 'string' && /^https?:\/\//i.test(v));
      if (typeof value === 'string' && /^https?:\/\//i.test(value)) return value;
    }
  }
  return s(p.image_front_url || p.image_url || p.image_url_display);
}

async function findProduct({ name, brand, barcode, weight }) {
  if (barcode) {
    const { data, error } = await db.from('universal_products').select('id,image_url').eq('barcode', barcode).limit(2);
    if (error) throw error;
    if (data?.length > 1) throw new Error('Barcode matches multiple universal products');
    if (data?.length === 1) return data[0];
  }
  // Exact name fallback. Use IS NULL for nullable fields; eq('',) does not match SQL NULL.
  let q = db.from('universal_products').select('id,image_url').ilike('name', name).limit(3);
  q = brand ? q.ilike('brand', brand) : q.is('brand', null);
  q = weight ? q.ilike('weight', weight) : q.is('weight', null);
  const { data, error } = await q;
  if (error) throw error;
  if (data?.length > 1) throw new Error('Ambiguous name/brand/weight match; skipped to avoid duplicate linkage');
  return data?.[0] || null;
}

async function ingest(r) {
  const name = s(r.name || r.product_name || r.product_name_en);
  const brand = s(r.brand || r.brands).split(',')[0].trim();
  const barcode = s(r.barcode || r.code || r.gtin);
  const weight = s(r.weight || r.quantity || r.pack_size || r.label);
  const image = s(r.image_url || r.image_front_url);

  if (!name) { stats.missingName++; return; }
  if (!barcode && !brand) {
    stats.missingBarcodeAndBrand++;
    if (samples.missingIdentity.length < 5) samples.missingIdentity.push({ name, weight, code: r.code || '' });
    // Name-only products are not imported automatically: matching them safely is ambiguous.
    return;
  }
  if (!image) {
    stats.noImage++;
    if (samples.noImage.length < 5) samples.noImage.push({ name, barcode });
    return;
  }
  if (!/^https?:\/\//i.test(image)) {
    stats.invalidImageUrl++;
    if (samples.invalidImage.length < 5) samples.invalidImage.push({ name, image });
    return;
  }

  let product = await findProduct({ name, brand, barcode, weight });
  if (product) {
    stats.matchedExisting++;
  } else if (dry) {
    stats.wouldCreate++;
    stats.wouldUpload++;
    return;
  } else {
    const { data, error } = await db.from('universal_products').insert({
      name, brand: brand || null, barcode: barcode || null, weight: weight || null,
      unit: s(r.unit) || null, manufacturer: s(r.manufacturer || brand) || null,
      description: s(r.description || r.generic_name) || null
    }).select('id,image_url').single();
    if (error) throw error;
    product = data;
    stats.created++;
  }

  const { data: gallery, error: galleryError } = await db.from('universal_product_images')
    .select('id,image_url,is_primary')
    .eq('universal_product_id', product.id)
    .limit(100);
  if (galleryError) throw galleryError;

  if (product.image_url || gallery?.some(x => x.is_primary) || gallery?.some(x => x.image_url === image)) {
    stats.existingImage++;
    return;
  }
  if (dry) {
    stats.wouldUpload++;
    return;
  }

  const response = await fetch(image, { headers: { 'user-agent': 'RivoCity-Catalog-Importer/1.0' } });
  if (!response.ok) throw new Error('Image download HTTP ' + response.status);
  const type = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
  if (!type.startsWith('image/')) throw new Error('Source response is not an image (' + (type || 'unknown content type') + ')');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw new Error('Image is empty or exceeds 8 MB');
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('gif') ? 'gif' : 'jpg';
  const source = r._source || 'openfoodfacts';
  const objectName = slug(barcode || product.id);
  const path = 'catalogue/' + source + '/' + objectName + '.' + ext;
  const { error: uploadError } = await db.storage.from(bucket).upload(path, bytes, {
    contentType: type, upsert: true, cacheControl: '31536000'
  });
  if (uploadError) throw uploadError;
  const publicUrl = db.storage.from(bucket).getPublicUrl(path).data.publicUrl;

  const attribution = {
    source: source === 'openmrp' ? 'OpenMRP' : 'Open Food Facts',
    source_product_url: r._source_url || '',
    original_image_url: image,
    image_contributor: r._contributor || '',
    database_license: 'ODbL-1.0',
    image_license: source === 'openmrp' ? 'CC-BY-SA-4.0' : 'CC-BY-SA-3.0',
    license_reference: source === 'openmrp'
      ? 'https://github.com/openmrp-in/openmrp'
      : 'https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/license-be-on-the-legal-side/',
    stored_image_path: path,
    retrieved_at: new Date().toISOString()
  };
  const attributionPath = 'catalogue-attribution/' + source + '/' + objectName + '.json';
  const { error: attributionError } = await db.storage.from(bucket).upload(
    attributionPath, Buffer.from(JSON.stringify(attribution, null, 2)),
    { contentType: 'application/json', upsert: true }
  );
  if (attributionError) throw attributionError;

  const primary = !product.image_url && !gallery?.some(x => x.is_primary);
  const { error: imageRowError } = await db.from('universal_product_images').insert({
    universal_product_id: product.id, image_url: publicUrl, is_primary: primary, source: 'system'
  });
  if (imageRowError) throw imageRowError;
  if (primary) {
    const { error: updateError } = await db.from('universal_products')
      .update({ image_url: publicUrl }).eq('id', product.id);
    if (updateError) throw updateError;
  }
  stats.uploaded++;
}

async function openMrp() {
  const base = 'https://api.openmrp.in/v1/dump/file/';
  const [products, variants, brands] = await Promise.all(['products.json', 'variants.json', 'brands.json'].map(async file => {
    const response = await fetch(base + file);
    if (!response.ok) throw new Error('OpenMRP dump ' + file + ' HTTP ' + response.status);
    return response.json();
  }));
  const productMap = new Map(products.map(p => [p.id, p]));
  const brandMap = new Map(brands.map(b => [b.id, b]));
  let processed = 0;
  for (const variant of variants) {
    if (limit && processed >= limit) break;
    const product = productMap.get(variant.product_id);
    if (!product) continue;
    const brand = brandMap.get(product.brand_id);
    const barcode = s(variant.barcode);
    const record = {
      name: product.name, brand: brand?.name || '', barcode,
      weight: s(variant.label || (variant.pack_size ? String(variant.pack_size) + ' ' + (variant.unit || '') : '')),
      unit: s(variant.unit), manufacturer: brand?.manufacturer || '',
      description: product.description || '', image_url: product.image_url,
      _source: 'openmrp',
      _source_url: barcode ? 'https://openmrp.in/product/' + barcode : 'https://openmrp.in/downloads'
    };
    try { await ingest(record); } catch (error) { stats.failed++; console.error('OpenMRP', barcode, error.message); }
    processed++;
    stats.eligible++;
    if (processed % 100 === 0) console.log('OpenMRP', processed, stats);
    await wait(25);
  }
}

async function openFoodFacts() {
  const input = createReadStream(offPath);
  const stream = offPath.endsWith('.gz') ? input.pipe(createGunzip()) : input;
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  let eligible = 0;
  for await (const line of lines) {
    if (!line.trim()) continue;
    stats.recordsScanned++;
    let product;
    try { product = JSON.parse(line); } catch { continue; }
    if (!includeGlobal && !/india|en:india|in:india/i.test([product.countries, ...(product.countries_tags || [])].join(' '))) {
      stats.indiaSkipped++;
      continue;
    }
    if (limit && eligible >= limit) break;
    eligible++;
    stats.eligible++;
    const barcode = s(product.code || product._id);
    const record = {
      code: barcode,
      product_name: product.product_name || product.product_name_en,
      brands: product.brands,
      quantity: product.quantity,
      image_url: imageOfOff(product),
      generic_name: product.generic_name,
      _source: 'openfoodfacts',
      _source_url: product.url || 'https://world.openfoodfacts.org/product/' + barcode,
      _contributor: product.image_uploader || product.creator || ''
    };
    try { await ingest(record); }
    catch (error) { stats.failed++; console.error('Open Food Facts', barcode, error.message); }
    if (eligible % 100 === 0) console.log('Open Food Facts', eligible, stats);
    await wait(25);
  }
}

console.log(dry ? 'DRY RUN — no writes (database reads only)' : 'LIVE IMPORT — writing to Supabase');
try {
  if (doOpenMrp) await openMrp();
  if (offPath) await openFoodFacts();
  console.log('Finished', stats);
  console.log('Skipped samples:', JSON.stringify(samples, null, 2));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
