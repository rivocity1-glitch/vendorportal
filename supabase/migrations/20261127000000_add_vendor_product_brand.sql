-- Add an explicit vendor product brand field.
-- This migration is committed on the feature branch only. Apply it to the
-- Supabase project through the normal reviewed migration deployment process.
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS brand text;

COMMENT ON COLUMN public.products.brand IS
'Brand name displayed on vendor product and inventory listings. Kept separate from manufacturer.';
