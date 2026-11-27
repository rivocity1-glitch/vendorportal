-- RivoCity vendor CSV matching and internal RC product-code allocation.
-- Existing master products are linked by the UUID selected during catalogue matching.
-- New shared master products receive the next RC-P serial.

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
  true
);

