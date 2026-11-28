-- RivoCity vendor CSV matching and internal RC product-code allocation.
-- Apply after 20261128000000_shared_catalogue_vendor_import.sql.
-- Vendor CSVs do not need RC codes: the importer resolves a shared master by
-- exact barcode, exact name + brand, or a confirmed catalogue UUID from review.

CREATE SEQUENCE IF NOT EXISTS public.rivocity_product_code_seq;

SELECT setval(
  'public.rivocity_product_code_seq',
  GREATEST(
    1,
    COALESCE((
      SELECT MAX((substring(source_catalogue_id FROM '^RC-P([0-9]+)$'))::bigint)
      FROM public.universal_products
      WHERE source_catalogue_id ~ '^RC-P[0-9]+$'
    ), 0)
  ),
  EXISTS (
    SELECT 1 FROM public.universal_products
    WHERE source_catalogue_id ~ '^RC-P[0-9]+$'
  )
);

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
  IF coalesce(p_product->>'catalogProductId','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
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
