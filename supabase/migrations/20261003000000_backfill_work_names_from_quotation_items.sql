DO $$
BEGIN
  IF to_regclass('public.quotations') IS NOT NULL
     AND to_regclass('public.quotation_items') IS NOT NULL THEN
    EXECUTE $backfill$
      WITH latest_quotations AS (
        SELECT DISTINCT ON (work_id)
          id,
          work_id
        FROM public.quotations
        WHERE work_id IS NOT NULL
        ORDER BY work_id, created_at DESC, id DESC
      ), item_names AS (
        SELECT
          latest.work_id,
          string_agg(NULLIF(btrim(item.description), ''), '; ' ORDER BY item.id) AS full_name,
          (array_agg(
            NULLIF(btrim(item.description), '') ORDER BY item.id
          ) FILTER (WHERE NULLIF(btrim(item.description), '') IS NOT NULL))[1] AS first_name
        FROM latest_quotations AS latest
        JOIN public.quotation_items AS item ON item.quotation_id = latest.id
        GROUP BY latest.work_id
      )
      UPDATE public.works AS work
      SET work_name = item_names.full_name,
          updated_at = now()
      FROM item_names
      WHERE work.id = item_names.work_id
        AND item_names.full_name IS NOT NULL
        AND item_names.full_name <> item_names.first_name
        AND btrim(work.work_name) = item_names.first_name
    $backfill$;
  END IF;
END $$;