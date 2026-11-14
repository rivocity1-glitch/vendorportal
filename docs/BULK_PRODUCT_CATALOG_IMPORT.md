# RivoCity bulk catalogue image import

This importer runs locally with a Supabase service-role key. Never put that key in Vite client variables or commit it.

## Sources and licensing

- OpenMRP publishes a public weekly dump (products, variants, brands) without an API key. Its product database is ODbL-1.0; contributed media is CC-BY-SA-4.0.
- Open Food Facts asks bulk users to download the product CSV/JSONL export and use its AWS image dataset for large image volumes. Product data is ODbL; images are CC-BY-SA. This initial importer reads the local JSONL/JSONL.GZ export and downloads the selected front image URL carried by each record.
- The importer writes image files to the existing product-images Storage bucket and registers rows in the existing universal_products and universal_product_images tables. It stores a per-image attribution JSON file in product-images/catalogue-attribution/.

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

By default OFF rows are filtered to India. Use --include-global to import all countries. --limit is a per-source cap.

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