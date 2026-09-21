-- Keep works.consultancy_cost GST-inclusive across all work creation flows.
-- Quotation records previously stored the base amount in this column.
UPDATE public.works
SET consultancy_cost = ROUND((metadata->>'base_cost')::numeric * 1.18, 2)
WHERE metadata->>'include_gst' = 'true'
  AND metadata ? 'base_cost'
  AND (metadata->>'base_cost') ~ '^[0-9]+(\.[0-9]+)?$'
  AND consultancy_cost = (metadata->>'base_cost')::numeric;
