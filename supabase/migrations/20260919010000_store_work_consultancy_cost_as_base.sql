-- Standardize works.consultancy_cost as the pre-GST base amount.
-- Existing tender, hand receipt, and quotation rows keep their base in metadata.base_cost.
ALTER TABLE public.tenders ADD COLUMN IF NOT EXISTS include_gst BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.hand_receipts ADD COLUMN IF NOT EXISTS include_gst BOOLEAN NOT NULL DEFAULT true;

-- Older fallback quotation works stored a GST-inclusive amount without base metadata.
UPDATE public.works
SET metadata = metadata || jsonb_build_object(
        'include_gst', true,
        'base_cost', ROUND(consultancy_cost / 1.18, 2)
    ),
    consultancy_cost = ROUND(consultancy_cost / 1.18, 2)
WHERE metadata->>'type' = 'Quotation'
  AND metadata->>'created_from_quote' = 'true'
  AND NOT (metadata ? 'base_cost')
  AND consultancy_cost IS NOT NULL;

UPDATE public.works
SET consultancy_cost = ROUND((metadata->>'base_cost')::numeric, 2)
WHERE metadata->>'include_gst' = 'true'
  AND metadata ? 'base_cost'
  AND (metadata->>'base_cost') ~ '^[0-9]+(\.[0-9]+)?$';
