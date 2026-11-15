# RivoCity bulk catalogue image import

This importer runs locally with a Supabase service-role key for database access. Never put that key in Vite client variables or commit it. Product image files can be stored in Supabase Storage (default) or Cloudflare R2; only public image URLs are stored in the catalogue database.

## Sources and licensing

- OpenMRP publishes a public weekly dump (products, variants, brands) without an API key. Its product database is ODbL-1.0; contributed media is CC-BY-SA-4.0.
- Open Food Facts asks bulk users to download the product CSV/JSONL export and use its AWS image dataset for large image volumes. Product data is ODbL; images are CC-BY-SA. This importer reads the local JSONL/JSONL.GZ export. For current exports, it builds the selected front image URL from images.selected.front language metadata and its revision; it also supports older exports containing direct image URLs.
- The importer registers rows in the existing universal_products and universal_product_images tables and stores a per-image attribution JSON object alongside each image. Supabase Storage is the default. With Cloudflare R2, the same object paths are uploaded to an R2 bucket and the configured public URL is saved in universal_products.image_url / universal_product_images.image_url. The database stores URLs, not image binaries.

## PowerShell setup

Set these only in the current terminal:

```powershell
$env:SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
```

Start with a small OpenMRP dry run:

```powershell
npm run catalog:import -- --openmrp --dry-run --limit 100
npm run catalog:import -- --openmrp --limit 100
```

For Open Food Facts, download its JSONL product export from https://world.openfoodfacts.org/data and pass the local file:

```powershell
npm run catalog:import -- --off-jsonl "D:\data\openfoodfacts-products.jsonl.gz" --dry-run --limit 100
npm run catalog:import -- --off-jsonl "D:\data\openfoodfacts-products.jsonl.gz" --limit 1000
```

By default OFF rows are first filtered to products tagged as sold in India. **A second strict filter now requires an exact brand match in the importer’s curated Indian-owned brand allowlist.** Unknown, blank, and foreign-owned brands are skipped; manufacturing or sale in India alone does not qualify. The allowlist is intentionally conservative: add a brand only after verifying its controlling company is Indian-owned. The summary reports `nonIndianBrandSkipped`. Do not use --include-global for the launch catalogue. Use --limit as a per-source cap. During OFF scans, progress is printed every 100,000 records with India counts, image-bearing India records, and scan speed.

Before any live import, validate real image downloads without writing to Supabase:

```powershell
npm run catalog:import -- --off-jsonl "D:\data\openfoodfacts-products.jsonl.gz" --dry-run --image-only --validate-images --limit 10
```

The validation mode requires both --dry-run and --image-only. It downloads each selected candidate, checks HTTP status, image content type, file signature, and the 8 MB size limit, then reports imagesValidated, imageDownloadFailed, and imageBytesValidated. It does not upload files or modify database rows.

## Safety

- Back up Supabase and test with --dry-run and a small live limit first.
- Existing canonical primary images are never overwritten.
- No vendor products, prices, stock, orders, or rider data are changed.
- The source value written to universal_product_images is system (allowed by the current database constraint).
- The CLI requires Node with native fetch and the existing @supabase/supabase-js dependency.
- The Open Food Facts AWS image dump is the recommended route for very large image volumes; this first version uses image URLs from product JSONL records and is a cautious initial loader, not a full mirror of every image in the AWS bucket.

Official references:
https://github.com/openmrp-in/openmrp
https://world.openfoodfacts.org/data
https://github.com/openfoodfacts/openfoodfacts-server/blob/main/docs/api/how-to-download-images.md
https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/license-be-on-the-legal-side/
## Optional Cloudflare R2 storage

R2 is an alternative object store and CDN origin. Create an R2 bucket, create an S3 API token with Object Read & Write for that bucket, and attach a public custom domain to the bucket. Keep Supabase as the database; do not store image binaries in Postgres.

After pulling the branch, install dependencies:

```powershell
npm install
```

Set these variables in the current PowerShell session (never commit them):

```powershell
$env:RIVO_STORAGE_PROVIDER="r2"
$env:R2_ACCOUNT_ID="YOUR_CLOUDFLARE_ACCOUNT_ID"
$env:R2_ACCESS_KEY_ID="YOUR_R2_ACCESS_KEY_ID"
$env:R2_SECRET_ACCESS_KEY="YOUR_R2_SECRET_ACCESS_KEY"
$env:R2_BUCKET_NAME="YOUR_R2_BUCKET_NAME"
$env:RIVO_STORAGE_PUBLIC_URL="https://images.yourdomain.com"
```

For Supabase Storage, leave RIVO_STORAGE_PROVIDER unset or set it to supabase. RIVO_STORAGE_PUBLIC_URL must be the public base URL attached to the R2 bucket, without a trailing slash. The S3 API endpoint is for uploads, not the public image URL.

The app continues reading ordinary HTTPS image URLs from the existing catalogue tables, so it does not need to know which provider hosts the file. Changing providers later requires migrating objects and updating their URLs, not redesigning the product schema.
