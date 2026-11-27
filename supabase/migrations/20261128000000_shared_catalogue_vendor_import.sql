-- RivoCity shared catalogue + vendor listing workflow
-- Apply in Supabase SQL Editor. This migration does NOT publish catalogue rows
-- to customers; only rows in public.products are vendor listings.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand text;

ALTER TABLE public.universal_products
  ADD COLUMN IF NOT EXISTS mrp numeric,
  ADD COLUMN IF NOT EXISTS product_variant text,
  ADD COLUMN IF NOT EXISTS pack_size text,
  ADD COLUMN IF NOT EXISTS parent_company text,
  ADD COLUMN IF NOT EXISTS marketer text,
  ADD COLUMN IF NOT EXISTS product_type text,
  ADD COLUMN IF NOT EXISTS country_of_origin text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS image_source text,
  ADD COLUMN IF NOT EXISTS image_license text,
  ADD COLUMN IF NOT EXISTS image_attribution text,
  ADD COLUMN IF NOT EXISTS verification_status text,
  ADD COLUMN IF NOT EXISTS data_review_status text,
  ADD COLUMN IF NOT EXISTS data_review_note text,
  ADD COLUMN IF NOT EXISTS source_catalogue_id text,
  ADD COLUMN IF NOT EXISTS candidate_image_url text;

CREATE INDEX IF NOT EXISTS idx_universal_products_barcode
  ON public.universal_products (barcode) WHERE barcode IS NOT NULL AND barcode <> '';
CREATE INDEX IF NOT EXISTS idx_products_vendor_barcode
  ON public.products (vendor_id, barcode) WHERE barcode IS NOT NULL AND barcode <> '';
CREATE INDEX IF NOT EXISTS idx_products_vendor_universal
  ON public.products (vendor_id, universal_product_id);

-- CSV staging table: column names match RIVOCITY_BRANDED_CATALOGUE_CLEAN_v2.csv.
CREATE TABLE IF NOT EXISTS public.rivocity_catalogue_staging (
  product_id text PRIMARY KEY,
  product_name text,
  brand text,
  category text,
  subcategory text,
  product_variant text,
  pack_size text,
  pack_quantity text,
  unit text,
  manufacturer text,
  parent_company text,
  marketer text,
  barcode text,
  "MRP" text,
  product_description text,
  country_of_origin text,
  manufacturing_location text,
  product_type text,
  is_branded text,
  is_loose_product text,
  source_url text,
  image_url text,
  image_local_path text,
  image_source text,
  image_license text,
  image_attribution text,
  image_download_status text,
  verification_status text,
  source_category text,
  category_correction_note text,
  data_review_status text,
  data_review_note text,
  imported_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  universal_product_id uuid
);

ALTER TABLE public.rivocity_catalogue_staging ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rivocity_catalogue_staging_admin_access ON public.rivocity_catalogue_staging;
CREATE POLICY rivocity_catalogue_staging_admin_access
  ON public.rivocity_catalogue_staging
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.auth_user_id = auth.uid()));

-- Map the 32 catalogue labels to the existing 14-category master.
-- Keep this mapping centralized so CSV and vendor imports use the same category IDs.
CREATE OR REPLACE FUNCTION public.rivocity_catalogue_category_id(p_category text)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT c.id
  FROM public.product_categories c
  WHERE c.name = CASE
    WHEN lower(trim(coalesce(p_category,''))) IN ('dairy & milk') THEN 'Dairy'
    WHEN lower(trim(coalesce(p_category,''))) IN ('beverages') THEN 'Beverages'
    WHEN lower(trim(coalesce(p_category,''))) IN ('bakery & biscuits') THEN 'Bakery'
    WHEN lower(trim(coalesce(p_category,''))) IN (
      'bath & body','hair care','skincare & cosmetics','oral care & grooming','baby care'
    ) THEN 'Personal Care'
    WHEN lower(trim(coalesce(p_category,''))) IN ('hygiene & first aid') THEN 'Medical'
    WHEN lower(trim(coalesce(p_category,''))) IN ('electrical appliances') THEN 'Electronics'
    WHEN lower(trim(coalesce(p_category,''))) IN ('stationery & office') THEN 'Stationery'
    WHEN lower(trim(coalesce(p_category,''))) IN ('pet supplies') THEN 'Pet Food'
    WHEN lower(trim(coalesce(p_category,''))) IN (
      'kitchen dishwash & cleaning','laundry','household cleaners','cleaning tools',
      'kitchenware & cookware','storage & bottles','crockery & dining',
      'plastic household','home furnishing','home decor & lighting'
    ) THEN 'Home & Kitchen'
    WHEN lower(trim(coalesce(p_category,''))) IN (
      'pooja & religious','toys & games','gardening & outdoor','bags, travel & gifts'
    ) THEN 'Other'
    ELSE 'Grocery'
  END
  LIMIT 1;
$$;

-- Import the uploaded 4,836-row master CSV after importing it into the staging table.
-- Existing universal products are reused by barcode, then exact normalized name+brand.
-- Existing canonical images are never overwritten by a blank or unverified URL.
CREATE OR REPLACE FUNCTION public.import_rivocity_catalogue_staging()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.rivocity_catalogue_staging%ROWTYPE;
  v_id uuid;
  v_category_id uuid;
  v_inserted integer := 0;
  v_updated integer := 0;
  v_skipped integer := 0;
  v_unmatched_category integer := 0;
  v_image_count integer := 0;
  v_mrp numeric;
BEGIN
  IF auth.uid() IS NOT NULL AND coalesce(auth.role(),'') <> 'service_role' AND NOT EXISTS (
    SELECT 1 FROM public.admin_users au WHERE au.auth_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only an authorized administrator can import the master catalogue';
  END IF;

  FOR r IN
    SELECT * FROM public.rivocity_catalogue_staging
    WHERE processed_at IS NULL
    ORDER BY product_id
  LOOP
    IF nullif(trim(r.product_name), '') IS NULL THEN
      v_skipped := v_skipped + 1;
      UPDATE public.rivocity_catalogue_staging
      SET processed_at = now()
      WHERE product_id = r.product_id;
      CONTINUE;
    END IF;

    v_category_id := public.rivocity_catalogue_category_id(r.category);
    IF v_category_id IS NULL THEN
      v_unmatched_category := v_unmatched_category + 1;
    END IF;

    v_mrp := NULLIF(regexp_replace(coalesce(r."MRP",''), '[^0-9.]', '', 'g'), '')::numeric;

    -- Serialize same-key imports to reduce concurrent duplicate creation.
    PERFORM pg_advisory_xact_lock(
      hashtextextended(
        coalesce(
          nullif(trim(r.barcode), ''),
          lower(trim(r.product_name)) || '|' || lower(trim(coalesce(r.brand, '')))
        ),
        0
      )
    );

    v_id := NULL;
    IF nullif(trim(r.barcode),'') IS NOT NULL THEN
      SELECT id INTO v_id FROM public.universal_products
      WHERE barcode = trim(r.barcode)
      ORDER BY created_at
      LIMIT 1;
    END IF;

    IF v_id IS NULL THEN
      SELECT id INTO v_id FROM public.universal_products
      WHERE lower(trim(name)) = lower(trim(r.product_name))
        AND lower(trim(coalesce(brand,''))) = lower(trim(coalesce(r.brand,'')))
      ORDER BY created_at
      LIMIT 1;
    END IF;

    IF v_id IS NULL THEN
      INSERT INTO public.universal_products (
        name, brand, description, category_id, barcode, manufacturer, unit, weight,
        image_url, candidate_image_url, mrp, status, product_variant, pack_size, parent_company, marketer,
        product_type, country_of_origin, source_url, image_source, image_license,
        image_attribution, verification_status, data_review_status, data_review_note,
        source_catalogue_id, created_at, updated_at
      ) VALUES (
        trim(r.product_name), nullif(trim(r.brand),''), nullif(trim(r.product_description),''),
        v_category_id, nullif(trim(r.barcode),''), nullif(trim(r.manufacturer),''),
        nullif(trim(r.unit),''), coalesce(nullif(trim(r.pack_size),''), nullif(trim(r.pack_quantity),'') || ' ' || nullif(trim(r.unit),'')),
        NULL,
        CASE WHEN r.image_url ~* '^https?://' THEN r.image_url ELSE NULL END,
        v_mrp,
        'active', nullif(trim(r.product_variant),''), nullif(trim(r.pack_size),''),
        nullif(trim(r.parent_company),''), nullif(trim(r.marketer),''), nullif(trim(r.product_type),''),
        nullif(trim(r.country_of_origin),''), nullif(trim(r.source_url),''), nullif(trim(r.image_source),''),
        nullif(trim(r.image_license),''), nullif(trim(r.image_attribution),''),
        nullif(trim(r.verification_status),''), nullif(trim(r.data_review_status),''),
        nullif(trim(r.data_review_note),''), r.product_id, now(), now()
      )
      RETURNING id INTO v_id;
      v_inserted := v_inserted + 1;
    ELSE
      UPDATE public.universal_products
      SET
        brand = coalesce(nullif(trim(brand),''), nullif(trim(r.brand),'')),
        mrp = coalesce(mrp, v_mrp),
        description = coalesce(nullif(trim(description),''), nullif(trim(r.product_description),'')),
        category_id = coalesce(category_id, v_category_id),
        manufacturer = coalesce(nullif(trim(manufacturer),''), nullif(trim(r.manufacturer),'')),
        unit = coalesce(nullif(trim(unit),''), nullif(trim(r.unit),'')),
        weight = coalesce(nullif(trim(weight),''), nullif(trim(r.pack_size),'')),
        candidate_image_url = coalesce(nullif(trim(candidate_image_url),''), CASE WHEN r.image_url ~* '^https?://' THEN r.image_url END),
        product_variant = coalesce(nullif(trim(product_variant),''), nullif(trim(r.product_variant),'')),
        pack_size = coalesce(nullif(trim(pack_size),''), nullif(trim(r.pack_size),'')),
        parent_company = coalesce(nullif(trim(parent_company),''), nullif(trim(r.parent_company),'')),
        marketer = coalesce(nullif(trim(marketer),''), nullif(trim(r.marketer),'')),
        product_type = coalesce(nullif(trim(product_type),''), nullif(trim(r.product_type),'')),
        country_of_origin = coalesce(nullif(trim(country_of_origin),''), nullif(trim(r.country_of_origin),'')),
        source_url = coalesce(nullif(trim(source_url),''), nullif(trim(r.source_url),'')),
        image_source = coalesce(nullif(trim(image_source),''), nullif(trim(r.image_source),'')),
        image_license = coalesce(nullif(trim(image_license),''), nullif(trim(r.image_license),'')),
        image_attribution = coalesce(nullif(trim(image_attribution),''), nullif(trim(r.image_attribution),'')),
        verification_status = coalesce(nullif(trim(verification_status),''), nullif(trim(r.verification_status),'')),
        data_review_status = coalesce(nullif(trim(data_review_status),''), nullif(trim(r.data_review_status),'')),
        data_review_note = coalesce(nullif(trim(data_review_note),''), nullif(trim(r.data_review_note),'')),
        source_catalogue_id = coalesce(source_catalogue_id, r.product_id),
        updated_at = now()
      WHERE id = v_id;
      v_updated := v_updated + 1;
    END IF;

    -- Source image URLs are candidates only. The CSV marks them review-required;
    -- do not publish them as shared canonical images until licensing/quality review.


    UPDATE public.rivocity_catalogue_staging
    SET processed_at = now(), universal_product_id = v_id
    WHERE product_id = r.product_id;
  END LOOP;

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'matched_or_enriched', v_updated,
    'skipped', v_skipped,
    'unmapped_category_rows', v_unmatched_category,
    'images_added', v_image_count
  );
END;
$$;

-- Vendor import RPC: only the authenticated vendor can create their own listing.
-- MRP is NOT used as a substitute for a vendor selling price. Missing price or
-- zero stock creates an inactive listing, so it cannot appear in the customer app.
CREATE OR REPLACE FUNCTION public.import_vendor_product(p_product jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor_id uuid;
  v_universal_id uuid;
  v_catalogue_id uuid;
  v_product_id uuid;
  v_category_id uuid;
  v_name text;
  v_brand text;
  v_barcode text;
  v_sku text;
  v_price numeric;
  v_stock numeric;
  v_mrp numeric;
  v_image text;
  v_status text;
  v_existing public.products%ROWTYPE;
  v_created_catalogue boolean := false;
  v_created_listing boolean := false;
BEGIN
  SELECT id INTO v_vendor_id
  FROM public.vendors
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  IF v_vendor_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is not linked to a vendor';
  END IF;

  v_name := nullif(trim(p_product->>'name'),'');
  IF v_name IS NULL THEN RAISE EXCEPTION 'Product name is required'; END IF;
  v_brand := nullif(trim(p_product->>'brand'),'');
  v_barcode := nullif(trim(p_product->>'barcode'),'');
  IF coalesce(p_product->>'catalogProductId','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
  v_sku := nullif(trim(p_product->>'sku'),'');
  v_price := nullif(p_product->>'sellingPrice','')::numeric;
  v_stock := coalesce(nullif(p_product->>'stock','')::numeric, 0);
  v_mrp := nullif(p_product->>'mrp','')::numeric;
  v_image := CASE WHEN coalesce(p_product->>'imageUrl','') ~* '^https?://' THEN p_product->>'imageUrl' ELSE NULL END;

  v_category_id := null;
  IF coalesce(p_product->>'categoryId','') ~* '^[0-9a-f-]{36}$' THEN
    SELECT id INTO v_category_id FROM public.product_categories
    WHERE id = (p_product->>'categoryId')::uuid;
  END IF;

  -- Match by barcode first, then exact normalized name + brand.
  PERFORM pg_advisory_xact_lock(hashtextextended(
    coalesce(v_barcode, lower(v_name) || '|' || lower(coalesce(v_brand,''))), 0
  ));
  IF v_catalogue_id IS NOT NULL THEN
    v_universal_id := v_catalogue_id;
  END IF;
  IF v_universal_id IS NULL AND v_barcode IS NOT NULL THEN
    SELECT id INTO v_universal_id FROM public.universal_products
    WHERE barcode = v_barcode ORDER BY created_at LIMIT 1;
  END IF;
  IF v_universal_id IS NULL THEN
    SELECT id INTO v_universal_id FROM public.universal_products
    WHERE lower(trim(name)) = lower(v_name)
      AND lower(trim(coalesce(brand,''))) = lower(coalesce(v_brand,''))
    ORDER BY created_at LIMIT 1;
  END IF;

  IF v_universal_id IS NULL THEN
    INSERT INTO public.universal_products (
      name, brand, description, category_id, barcode, manufacturer, unit,
      weight, image_url, candidate_image_url, status, product_variant, pack_size, source_catalogue_id
    ) VALUES (
      v_name, v_brand, nullif(trim(p_product->>'description'),''), v_category_id,
      v_barcode, nullif(trim(p_product->>'manufacturer'),''), nullif(trim(p_product->>'unit'),''),
      nullif(trim(p_product->>'weight'),''), NULL, v_image, 'active',
      nullif(trim(p_product->>'productVariant'),''), nullif(trim(p_product->>'packSize'),''),
      'RC-P' || lpad(nextval('public.rivocity_product_code_seq')::text, 5, '0')
    ) RETURNING id INTO v_universal_id;
    v_created_catalogue := true;
  ELSE
    UPDATE public.universal_products
    SET
      category_id = coalesce(category_id, v_category_id),
      manufacturer = coalesce(nullif(trim(manufacturer),''), nullif(trim(p_product->>'manufacturer'),'')),
      description = coalesce(nullif(trim(description),''), nullif(trim(p_product->>'description'),'')),
      candidate_image_url = coalesce(nullif(trim(candidate_image_url),''), v_image),
      product_variant = coalesce(nullif(trim(product_variant),''), nullif(trim(p_product->>'productVariant'),'')),
      pack_size = coalesce(nullif(trim(pack_size),''), nullif(trim(p_product->>'packSize'),'')),
      updated_at = now()
    WHERE id = v_universal_id;
  END IF;

  -- Vendor-supplied image remains on the vendor listing. It is not promoted
  -- into the shared image gallery without catalogue image review.


  -- Find this vendor's existing offer to make repeat imports idempotent.
  SELECT * INTO v_existing FROM public.products
  WHERE vendor_id = v_vendor_id
    AND (
      (v_barcode IS NOT NULL AND barcode = v_barcode)
      OR (v_sku IS NOT NULL AND sku = v_sku)
      OR (lower(trim(name)) = lower(v_name)
          AND lower(trim(coalesce(brand,''))) = lower(coalesce(v_brand,'')))
    )
  ORDER BY created_at
  LIMIT 1;

  v_status := CASE
    WHEN coalesce(v_price, v_existing.price) IS NOT NULL
      AND coalesce(v_price, v_existing.price) > 0
      AND v_stock > 0 THEN 'active'
    ELSE 'inactive'
  END;

  IF v_existing.id IS NULL THEN
    INSERT INTO public.products (
      vendor_id, universal_product_id, name, brand, description, category_id,
      price, cost_price, mrp, stock, image_url, status, barcode, sku,
      manufacturer, weight, unit, purchase_rate, selling_rate, low_stock_threshold
    ) VALUES (
      v_vendor_id, v_universal_id, v_name, v_brand,
      nullif(trim(p_product->>'description'),''), v_category_id,
      v_price, nullif(p_product->>'costPrice','')::numeric, v_mrp, v_stock,
      (SELECT image_url FROM public.universal_products WHERE id = v_universal_id),
      v_status, v_barcode, v_sku, nullif(trim(p_product->>'manufacturer'),''),
      nullif(trim(p_product->>'weight'),''), nullif(trim(p_product->>'unit'),''),
      nullif(p_product->>'purchaseRate','')::numeric, v_price,
      coalesce(nullif(p_product->>'lowStockThreshold','')::integer,5)
    ) RETURNING id INTO v_product_id;
    v_created_listing := true;
  ELSE
    UPDATE public.products
    SET universal_product_id = v_universal_id,
        name = v_name,
        brand = coalesce(v_brand, brand),
        description = coalesce(nullif(trim(p_product->>'description'),''), description),
        category_id = coalesce(v_category_id, category_id),
        price = coalesce(v_price, price),
        cost_price = coalesce(nullif(p_product->>'costPrice','')::numeric, cost_price),
        mrp = coalesce(v_mrp, mrp),
        stock = v_stock,
        image_url = coalesce(image_url, (SELECT image_url FROM public.universal_products WHERE id = v_universal_id)),
        status = v_status,
        barcode = coalesce(v_barcode, barcode),
        sku = coalesce(v_sku, sku),
        manufacturer = coalesce(nullif(trim(p_product->>'manufacturer'),''), manufacturer),
        updated_at = now()
    WHERE id = v_existing.id AND vendor_id = v_vendor_id
    RETURNING id INTO v_product_id;
  END IF;

  RETURN jsonb_build_object(
    'product_id', v_product_id,
    'universal_product_id', v_universal_id,
    'created_catalogue_product', v_created_catalogue,
    'created_vendor_listing', v_created_listing,
    'status', v_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_vendor_product(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_vendor_product(jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.import_rivocity_catalogue_staging() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_rivocity_catalogue_staging() TO authenticated, service_role;



-- Batch wrapper keeps large vendor imports efficient while isolating bad rows.
-- The UI sends at most 100 records per RPC call.
CREATE OR REPLACE FUNCTION public.import_vendor_products_batch(p_products jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_result jsonb;
  v_added integer := 0;
  v_updated integer := 0;
  v_catalogue_created integer := 0;
  v_inactive integer := 0;
  v_failed integer := 0;
  v_errors jsonb := '[]'::jsonb;
BEGIN
  IF jsonb_typeof(p_products) <> 'array' THEN
    RAISE EXCEPTION 'p_products must be a JSON array';
  END IF;
  IF jsonb_array_length(p_products) > 100 THEN
    RAISE EXCEPTION 'Maximum 100 products per batch';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_products)
  LOOP
    BEGIN
      v_result := public.import_vendor_product(v_item);
      IF (v_result->>'created_vendor_listing')::boolean THEN
        v_added := v_added + 1;
      ELSE
        v_updated := v_updated + 1;
      END IF;
      IF (v_result->>'created_catalogue_product')::boolean THEN
        v_catalogue_created := v_catalogue_created + 1;
      END IF;
      IF v_result->>'status' <> 'active' THEN
        v_inactive := v_inactive + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'name', v_item->>'name',
        'error', SQLERRM
      ));
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'added_vendor_listings', v_added,
    'updated_vendor_listings', v_updated,
    'new_shared_catalogue_products', v_catalogue_created,
    'inactive_vendor_listings', v_inactive,
    'failed', v_failed,
    'errors', v_errors
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_vendor_products_batch(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_vendor_products_batch(jsonb) TO authenticated;
 THEN
    v_catalogue_id := (p_product->>'catalogProductId')::uuid;
    IF NOT EXISTS (SELECT 1 FROM public.universal_products WHERE id = v_catalogue_id) THEN
      RAISE EXCEPTION 'Selected shared catalogue product does not exist';
    END IF;
  END IF;
  v_sku := nullif(trim(p_product->>'sku'),'');
  v_price := nullif(p_product->>'sellingPrice','')::numeric;
  v_stock := coalesce(nullif(p_product->>'stock','')::numeric, 0);
  v_mrp := nullif(p_product->>'mrp','')::numeric;
  v_image := CASE WHEN coalesce(p_product->>'imageUrl','') ~* '^https?://' THEN p_product->>'imageUrl' ELSE NULL END;

  v_category_id := null;
  IF coalesce(p_product->>'categoryId','') ~* '^[0-9a-f-]{36}$' THEN
    SELECT id INTO v_category_id FROM public.product_categories
    WHERE id = (p_product->>'categoryId')::uuid;
  END IF;

  -- Match by barcode first, then exact normalized name + brand.
  PERFORM pg_advisory_xact_lock(hashtextextended(
    coalesce(v_barcode, lower(v_name) || '|' || lower(coalesce(v_brand,''))), 0
  ));
  IF v_barcode IS NOT NULL THEN
    SELECT id INTO v_universal_id FROM public.universal_products
    WHERE barcode = v_barcode ORDER BY created_at LIMIT 1;
  END IF;
  IF v_universal_id IS NULL THEN
    SELECT id INTO v_universal_id FROM public.universal_products
    WHERE lower(trim(name)) = lower(v_name)
      AND lower(trim(coalesce(brand,''))) = lower(coalesce(v_brand,''))
    ORDER BY created_at LIMIT 1;
  END IF;

  IF v_universal_id IS NULL THEN
    INSERT INTO public.universal_products (
      name, brand, description, category_id, barcode, manufacturer, unit,
      weight, image_url, candidate_image_url, status, product_variant, pack_size
    ) VALUES (
      v_name, v_brand, nullif(trim(p_product->>'description'),''), v_category_id,
      v_barcode, nullif(trim(p_product->>'manufacturer'),''), nullif(trim(p_product->>'unit'),''),
      nullif(trim(p_product->>'weight'),''), NULL, v_image, 'active',
      nullif(trim(p_product->>'productVariant'),''), nullif(trim(p_product->>'packSize'),'')
    ) RETURNING id INTO v_universal_id;
    v_created_catalogue := true;
  ELSE
    UPDATE public.universal_products
    SET
      category_id = coalesce(category_id, v_category_id),
      manufacturer = coalesce(nullif(trim(manufacturer),''), nullif(trim(p_product->>'manufacturer'),'')),
      description = coalesce(nullif(trim(description),''), nullif(trim(p_product->>'description'),'')),
      candidate_image_url = coalesce(nullif(trim(candidate_image_url),''), v_image),
      product_variant = coalesce(nullif(trim(product_variant),''), nullif(trim(p_product->>'productVariant'),'')),
      pack_size = coalesce(nullif(trim(pack_size),''), nullif(trim(p_product->>'packSize'),'')),
      updated_at = now()
    WHERE id = v_universal_id;
  END IF;

  -- Vendor-supplied image remains on the vendor listing. It is not promoted
  -- into the shared image gallery without catalogue image review.


  -- Find this vendor's existing offer to make repeat imports idempotent.
  SELECT * INTO v_existing FROM public.products
  WHERE vendor_id = v_vendor_id
    AND (
      (v_barcode IS NOT NULL AND barcode = v_barcode)
      OR (v_sku IS NOT NULL AND sku = v_sku)
      OR (lower(trim(name)) = lower(v_name)
          AND lower(trim(coalesce(brand,''))) = lower(coalesce(v_brand,'')))
    )
  ORDER BY created_at
  LIMIT 1;

  v_status := CASE
    WHEN coalesce(v_price, v_existing.price) IS NOT NULL
      AND coalesce(v_price, v_existing.price) > 0
      AND v_stock > 0 THEN 'active'
    ELSE 'inactive'
  END;

  IF v_existing.id IS NULL THEN
    INSERT INTO public.products (
      vendor_id, universal_product_id, name, brand, description, category_id,
      price, cost_price, mrp, stock, image_url, status, barcode, sku,
      manufacturer, weight, unit, purchase_rate, selling_rate, low_stock_threshold
    ) VALUES (
      v_vendor_id, v_universal_id, v_name, v_brand,
      nullif(trim(p_product->>'description'),''), v_category_id,
      v_price, nullif(p_product->>'costPrice','')::numeric, v_mrp, v_stock,
      (SELECT image_url FROM public.universal_products WHERE id = v_universal_id),
      v_status, v_barcode, v_sku, nullif(trim(p_product->>'manufacturer'),''),
      nullif(trim(p_product->>'weight'),''), nullif(trim(p_product->>'unit'),''),
      nullif(p_product->>'purchaseRate','')::numeric, v_price,
      coalesce(nullif(p_product->>'lowStockThreshold','')::integer,5)
    ) RETURNING id INTO v_product_id;
    v_created_listing := true;
  ELSE
    UPDATE public.products
    SET universal_product_id = v_universal_id,
        name = v_name,
        brand = coalesce(v_brand, brand),
        description = coalesce(nullif(trim(p_product->>'description'),''), description),
        category_id = coalesce(v_category_id, category_id),
        price = coalesce(v_price, price),
        cost_price = coalesce(nullif(p_product->>'costPrice','')::numeric, cost_price),
        mrp = coalesce(v_mrp, mrp),
        stock = v_stock,
        image_url = coalesce(image_url, (SELECT image_url FROM public.universal_products WHERE id = v_universal_id)),
        status = v_status,
        barcode = coalesce(v_barcode, barcode),
        sku = coalesce(v_sku, sku),
        manufacturer = coalesce(nullif(trim(p_product->>'manufacturer'),''), manufacturer),
        updated_at = now()
    WHERE id = v_existing.id AND vendor_id = v_vendor_id
    RETURNING id INTO v_product_id;
  END IF;

  RETURN jsonb_build_object(
    'product_id', v_product_id,
    'universal_product_id', v_universal_id,
    'created_catalogue_product', v_created_catalogue,
    'created_vendor_listing', v_created_listing,
    'status', v_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_vendor_product(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_vendor_product(jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.import_rivocity_catalogue_staging() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_rivocity_catalogue_staging() TO authenticated, service_role;



-- Batch wrapper keeps large vendor imports efficient while isolating bad rows.
-- The UI sends at most 100 records per RPC call.
CREATE OR REPLACE FUNCTION public.import_vendor_products_batch(p_products jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_result jsonb;
  v_added integer := 0;
  v_updated integer := 0;
  v_catalogue_created integer := 0;
  v_inactive integer := 0;
  v_failed integer := 0;
  v_errors jsonb := '[]'::jsonb;
BEGIN
  IF jsonb_typeof(p_products) <> 'array' THEN
    RAISE EXCEPTION 'p_products must be a JSON array';
  END IF;
  IF jsonb_array_length(p_products) > 100 THEN
    RAISE EXCEPTION 'Maximum 100 products per batch';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_products)
  LOOP
    BEGIN
      v_result := public.import_vendor_product(v_item);
      IF (v_result->>'created_vendor_listing')::boolean THEN
        v_added := v_added + 1;
      ELSE
        v_updated := v_updated + 1;
      END IF;
      IF (v_result->>'created_catalogue_product')::boolean THEN
        v_catalogue_created := v_catalogue_created + 1;
      END IF;
      IF v_result->>'status' <> 'active' THEN
        v_inactive := v_inactive + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'name', v_item->>'name',
        'error', SQLERRM
      ));
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'added_vendor_listings', v_added,
    'updated_vendor_listings', v_updated,
    'new_shared_catalogue_products', v_catalogue_created,
    'inactive_vendor_listings', v_inactive,
    'failed', v_failed,
    'errors', v_errors
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_vendor_products_batch(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_vendor_products_batch(jsonb) TO authenticated;
 THEN
    v_catalogue_id := (p_product->>'catalogProductId')::uuid;
    IF NOT EXISTS (SELECT 1 FROM public.universal_products WHERE id = v_catalogue_id) THEN
      RAISE EXCEPTION 'Selected shared catalogue product does not exist';
    END IF;
  END IF;
  v_sku := nullif(trim(p_product->>'sku'),'');
  v_price := nullif(p_product->>'sellingPrice','')::numeric;
  v_stock := coalesce(nullif(p_product->>'stock','')::numeric, 0);
  v_mrp := nullif(p_product->>'mrp','')::numeric;
  v_image := CASE WHEN coalesce(p_product->>'imageUrl','') ~* '^https?://' THEN p_product->>'imageUrl' ELSE NULL END;

  v_category_id := null;
  IF coalesce(p_product->>'categoryId','') ~* '^[0-9a-f-]{36}$' THEN
    SELECT id INTO v_category_id FROM public.product_categories
    WHERE id = (p_product->>'categoryId')::uuid;
  END IF;

  -- Match by barcode first, then exact normalized name + brand.
  PERFORM pg_advisory_xact_lock(hashtextextended(
    coalesce(v_barcode, lower(v_name) || '|' || lower(coalesce(v_brand,''))), 0
  ));
  IF v_catalogue_id IS NOT NULL THEN
    v_universal_id := v_catalogue_id;
  END IF;
  IF v_universal_id IS NULL AND v_barcode IS NOT NULL THEN
    SELECT id INTO v_universal_id FROM public.universal_products
    WHERE barcode = v_barcode ORDER BY created_at LIMIT 1;
  END IF;
  IF v_universal_id IS NULL THEN
    SELECT id INTO v_universal_id FROM public.universal_products
    WHERE lower(trim(name)) = lower(v_name)
      AND lower(trim(coalesce(brand,''))) = lower(coalesce(v_brand,''))
    ORDER BY created_at LIMIT 1;
  END IF;

  IF v_universal_id IS NULL THEN
    INSERT INTO public.universal_products (
      name, brand, description, category_id, barcode, manufacturer, unit,
      weight, image_url, candidate_image_url, status, product_variant, pack_size, source_catalogue_id
    ) VALUES (
      v_name, v_brand, nullif(trim(p_product->>'description'),''), v_category_id,
      v_barcode, nullif(trim(p_product->>'manufacturer'),''), nullif(trim(p_product->>'unit'),''),
      nullif(trim(p_product->>'weight'),''), NULL, v_image, 'active',
      nullif(trim(p_product->>'productVariant'),''), nullif(trim(p_product->>'packSize'),''),
      'RC-P' || lpad(nextval('public.rivocity_product_code_seq')::text, 5, '0')
    ) RETURNING id INTO v_universal_id;
    v_created_catalogue := true;
  ELSE
    UPDATE public.universal_products
    SET
      category_id = coalesce(category_id, v_category_id),
      manufacturer = coalesce(nullif(trim(manufacturer),''), nullif(trim(p_product->>'manufacturer'),'')),
      description = coalesce(nullif(trim(description),''), nullif(trim(p_product->>'description'),'')),
      candidate_image_url = coalesce(nullif(trim(candidate_image_url),''), v_image),
      product_variant = coalesce(nullif(trim(product_variant),''), nullif(trim(p_product->>'productVariant'),'')),
      pack_size = coalesce(nullif(trim(pack_size),''), nullif(trim(p_product->>'packSize'),'')),
      updated_at = now()
    WHERE id = v_universal_id;
  END IF;

  -- Vendor-supplied image remains on the vendor listing. It is not promoted
  -- into the shared image gallery without catalogue image review.


  -- Find this vendor's existing offer to make repeat imports idempotent.
  SELECT * INTO v_existing FROM public.products
  WHERE vendor_id = v_vendor_id
    AND (
      (v_barcode IS NOT NULL AND barcode = v_barcode)
      OR (v_sku IS NOT NULL AND sku = v_sku)
      OR (lower(trim(name)) = lower(v_name)
          AND lower(trim(coalesce(brand,''))) = lower(coalesce(v_brand,'')))
    )
  ORDER BY created_at
  LIMIT 1;

  v_status := CASE
    WHEN coalesce(v_price, v_existing.price) IS NOT NULL
      AND coalesce(v_price, v_existing.price) > 0
      AND v_stock > 0 THEN 'active'
    ELSE 'inactive'
  END;

  IF v_existing.id IS NULL THEN
    INSERT INTO public.products (
      vendor_id, universal_product_id, name, brand, description, category_id,
      price, cost_price, mrp, stock, image_url, status, barcode, sku,
      manufacturer, weight, unit, purchase_rate, selling_rate, low_stock_threshold
    ) VALUES (
      v_vendor_id, v_universal_id, v_name, v_brand,
      nullif(trim(p_product->>'description'),''), v_category_id,
      v_price, nullif(p_product->>'costPrice','')::numeric, v_mrp, v_stock,
      (SELECT image_url FROM public.universal_products WHERE id = v_universal_id),
      v_status, v_barcode, v_sku, nullif(trim(p_product->>'manufacturer'),''),
      nullif(trim(p_product->>'weight'),''), nullif(trim(p_product->>'unit'),''),
      nullif(p_product->>'purchaseRate','')::numeric, v_price,
      coalesce(nullif(p_product->>'lowStockThreshold','')::integer,5)
    ) RETURNING id INTO v_product_id;
    v_created_listing := true;
  ELSE
    UPDATE public.products
    SET universal_product_id = v_universal_id,
        name = v_name,
        brand = coalesce(v_brand, brand),
        description = coalesce(nullif(trim(p_product->>'description'),''), description),
        category_id = coalesce(v_category_id, category_id),
        price = coalesce(v_price, price),
        cost_price = coalesce(nullif(p_product->>'costPrice','')::numeric, cost_price),
        mrp = coalesce(v_mrp, mrp),
        stock = v_stock,
        image_url = coalesce(image_url, (SELECT image_url FROM public.universal_products WHERE id = v_universal_id)),
        status = v_status,
        barcode = coalesce(v_barcode, barcode),
        sku = coalesce(v_sku, sku),
        manufacturer = coalesce(nullif(trim(p_product->>'manufacturer'),''), manufacturer),
        updated_at = now()
    WHERE id = v_existing.id AND vendor_id = v_vendor_id
    RETURNING id INTO v_product_id;
  END IF;

  RETURN jsonb_build_object(
    'product_id', v_product_id,
    'universal_product_id', v_universal_id,
    'created_catalogue_product', v_created_catalogue,
    'created_vendor_listing', v_created_listing,
    'status', v_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_vendor_product(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_vendor_product(jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.import_rivocity_catalogue_staging() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_rivocity_catalogue_staging() TO authenticated, service_role;



-- Batch wrapper keeps large vendor imports efficient while isolating bad rows.
-- The UI sends at most 100 records per RPC call.
CREATE OR REPLACE FUNCTION public.import_vendor_products_batch(p_products jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_result jsonb;
  v_added integer := 0;
  v_updated integer := 0;
  v_catalogue_created integer := 0;
  v_inactive integer := 0;
  v_failed integer := 0;
  v_errors jsonb := '[]'::jsonb;
BEGIN
  IF jsonb_typeof(p_products) <> 'array' THEN
    RAISE EXCEPTION 'p_products must be a JSON array';
  END IF;
  IF jsonb_array_length(p_products) > 100 THEN
    RAISE EXCEPTION 'Maximum 100 products per batch';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_products)
  LOOP
    BEGIN
      v_result := public.import_vendor_product(v_item);
      IF (v_result->>'created_vendor_listing')::boolean THEN
        v_added := v_added + 1;
      ELSE
        v_updated := v_updated + 1;
      END IF;
      IF (v_result->>'created_catalogue_product')::boolean THEN
        v_catalogue_created := v_catalogue_created + 1;
      END IF;
      IF v_result->>'status' <> 'active' THEN
        v_inactive := v_inactive + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'name', v_item->>'name',
        'error', SQLERRM
      ));
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'added_vendor_listings', v_added,
    'updated_vendor_listings', v_updated,
    'new_shared_catalogue_products', v_catalogue_created,
    'inactive_vendor_listings', v_inactive,
    'failed', v_failed,
    'errors', v_errors
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_vendor_products_batch(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_vendor_products_batch(jsonb) TO authenticated;
 THEN
    v_catalogue_id := (p_product->>'catalogProductId')::uuid;
    IF NOT EXISTS (SELECT 1 FROM public.universal_products WHERE id = v_catalogue_id) THEN
      RAISE EXCEPTION 'Selected shared catalogue product does not exist';
    END IF;
  END IF;
  v_sku := nullif(trim(p_product->>'sku'),'');
  v_price := nullif(p_product->>'sellingPrice','')::numeric;
  v_stock := coalesce(nullif(p_product->>'stock','')::numeric, 0);
  v_mrp := nullif(p_product->>'mrp','')::numeric;
  v_image := CASE WHEN coalesce(p_product->>'imageUrl','') ~* '^https?://' THEN p_product->>'imageUrl' ELSE NULL END;

  v_category_id := null;
  IF coalesce(p_product->>'categoryId','') ~* '^[0-9a-f-]{36}$' THEN
    SELECT id INTO v_category_id FROM public.product_categories
    WHERE id = (p_product->>'categoryId')::uuid;
  END IF;

  -- Match by barcode first, then exact normalized name + brand.
  PERFORM pg_advisory_xact_lock(hashtextextended(
    coalesce(v_barcode, lower(v_name) || '|' || lower(coalesce(v_brand,''))), 0
  ));
  IF v_barcode IS NOT NULL THEN
    SELECT id INTO v_universal_id FROM public.universal_products
    WHERE barcode = v_barcode ORDER BY created_at LIMIT 1;
  END IF;
  IF v_universal_id IS NULL THEN
    SELECT id INTO v_universal_id FROM public.universal_products
    WHERE lower(trim(name)) = lower(v_name)
      AND lower(trim(coalesce(brand,''))) = lower(coalesce(v_brand,''))
    ORDER BY created_at LIMIT 1;
  END IF;

  IF v_universal_id IS NULL THEN
    INSERT INTO public.universal_products (
      name, brand, description, category_id, barcode, manufacturer, unit,
      weight, image_url, candidate_image_url, status, product_variant, pack_size
    ) VALUES (
      v_name, v_brand, nullif(trim(p_product->>'description'),''), v_category_id,
      v_barcode, nullif(trim(p_product->>'manufacturer'),''), nullif(trim(p_product->>'unit'),''),
      nullif(trim(p_product->>'weight'),''), NULL, v_image, 'active',
      nullif(trim(p_product->>'productVariant'),''), nullif(trim(p_product->>'packSize'),'')
    ) RETURNING id INTO v_universal_id;
    v_created_catalogue := true;
  ELSE
    UPDATE public.universal_products
    SET
      category_id = coalesce(category_id, v_category_id),
      manufacturer = coalesce(nullif(trim(manufacturer),''), nullif(trim(p_product->>'manufacturer'),'')),
      description = coalesce(nullif(trim(description),''), nullif(trim(p_product->>'description'),'')),
      candidate_image_url = coalesce(nullif(trim(candidate_image_url),''), v_image),
      product_variant = coalesce(nullif(trim(product_variant),''), nullif(trim(p_product->>'productVariant'),'')),
      pack_size = coalesce(nullif(trim(pack_size),''), nullif(trim(p_product->>'packSize'),'')),
      updated_at = now()
    WHERE id = v_universal_id;
  END IF;

  -- Vendor-supplied image remains on the vendor listing. It is not promoted
  -- into the shared image gallery without catalogue image review.


  -- Find this vendor's existing offer to make repeat imports idempotent.
  SELECT * INTO v_existing FROM public.products
  WHERE vendor_id = v_vendor_id
    AND (
      (v_barcode IS NOT NULL AND barcode = v_barcode)
      OR (v_sku IS NOT NULL AND sku = v_sku)
      OR (lower(trim(name)) = lower(v_name)
          AND lower(trim(coalesce(brand,''))) = lower(coalesce(v_brand,'')))
    )
  ORDER BY created_at
  LIMIT 1;

  v_status := CASE
    WHEN coalesce(v_price, v_existing.price) IS NOT NULL
      AND coalesce(v_price, v_existing.price) > 0
      AND v_stock > 0 THEN 'active'
    ELSE 'inactive'
  END;

  IF v_existing.id IS NULL THEN
    INSERT INTO public.products (
      vendor_id, universal_product_id, name, brand, description, category_id,
      price, cost_price, mrp, stock, image_url, status, barcode, sku,
      manufacturer, weight, unit, purchase_rate, selling_rate, low_stock_threshold
    ) VALUES (
      v_vendor_id, v_universal_id, v_name, v_brand,
      nullif(trim(p_product->>'description'),''), v_category_id,
      v_price, nullif(p_product->>'costPrice','')::numeric, v_mrp, v_stock,
      (SELECT image_url FROM public.universal_products WHERE id = v_universal_id),
      v_status, v_barcode, v_sku, nullif(trim(p_product->>'manufacturer'),''),
      nullif(trim(p_product->>'weight'),''), nullif(trim(p_product->>'unit'),''),
      nullif(p_product->>'purchaseRate','')::numeric, v_price,
      coalesce(nullif(p_product->>'lowStockThreshold','')::integer,5)
    ) RETURNING id INTO v_product_id;
    v_created_listing := true;
  ELSE
    UPDATE public.products
    SET universal_product_id = v_universal_id,
        name = v_name,
        brand = coalesce(v_brand, brand),
        description = coalesce(nullif(trim(p_product->>'description'),''), description),
        category_id = coalesce(v_category_id, category_id),
        price = coalesce(v_price, price),
        cost_price = coalesce(nullif(p_product->>'costPrice','')::numeric, cost_price),
        mrp = coalesce(v_mrp, mrp),
        stock = v_stock,
        image_url = coalesce(image_url, (SELECT image_url FROM public.universal_products WHERE id = v_universal_id)),
        status = v_status,
        barcode = coalesce(v_barcode, barcode),
        sku = coalesce(v_sku, sku),
        manufacturer = coalesce(nullif(trim(p_product->>'manufacturer'),''), manufacturer),
        updated_at = now()
    WHERE id = v_existing.id AND vendor_id = v_vendor_id
    RETURNING id INTO v_product_id;
  END IF;

  RETURN jsonb_build_object(
    'product_id', v_product_id,
    'universal_product_id', v_universal_id,
    'created_catalogue_product', v_created_catalogue,
    'created_vendor_listing', v_created_listing,
    'status', v_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_vendor_product(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_vendor_product(jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.import_rivocity_catalogue_staging() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_rivocity_catalogue_staging() TO authenticated, service_role;



-- Batch wrapper keeps large vendor imports efficient while isolating bad rows.
-- The UI sends at most 100 records per RPC call.
CREATE OR REPLACE FUNCTION public.import_vendor_products_batch(p_products jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_result jsonb;
  v_added integer := 0;
  v_updated integer := 0;
  v_catalogue_created integer := 0;
  v_inactive integer := 0;
  v_failed integer := 0;
  v_errors jsonb := '[]'::jsonb;
BEGIN
  IF jsonb_typeof(p_products) <> 'array' THEN
    RAISE EXCEPTION 'p_products must be a JSON array';
  END IF;
  IF jsonb_array_length(p_products) > 100 THEN
    RAISE EXCEPTION 'Maximum 100 products per batch';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_products)
  LOOP
    BEGIN
      v_result := public.import_vendor_product(v_item);
      IF (v_result->>'created_vendor_listing')::boolean THEN
        v_added := v_added + 1;
      ELSE
        v_updated := v_updated + 1;
      END IF;
      IF (v_result->>'created_catalogue_product')::boolean THEN
        v_catalogue_created := v_catalogue_created + 1;
      END IF;
      IF v_result->>'status' <> 'active' THEN
        v_inactive := v_inactive + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'name', v_item->>'name',
        'error', SQLERRM
      ));
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'added_vendor_listings', v_added,
    'updated_vendor_listings', v_updated,
    'new_shared_catalogue_products', v_catalogue_created,
    'inactive_vendor_listings', v_inactive,
    'failed', v_failed,
    'errors', v_errors
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_vendor_products_batch(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_vendor_products_batch(jsonb) TO authenticated;
