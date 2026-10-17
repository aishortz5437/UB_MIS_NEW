CREATE OR REPLACE FUNCTION public.save_quotation_atomic(
  p_is_edit BOOLEAN,
  p_quotation_id UUID,
  p_canonical_work_ubqn TEXT,
  p_new_work_sn_no TEXT,
  p_new_work_name TEXT,
  p_new_work_client_name TEXT,
  p_division_id UUID,
  p_quotation_ubqn TEXT,
  p_firm TEXT,
  p_subsidiary TEXT,
  p_section TEXT,
  p_quotation_subcategory TEXT,
  p_quotation_date DATE,
  p_client_name TEXT,
  p_division_name TEXT,
  p_department_name TEXT,
  p_address TEXT,
  p_subject TEXT,
  p_reference_no TEXT,
  p_save_numeric_total NUMERIC,
  p_line_items JSONB,
  p_work_name TEXT,
  p_work_client_name TEXT,
  p_work_subcategory TEXT,
  p_work_updated_at TIMESTAMPTZ,
  p_percentage_mode BOOLEAN,
  p_display_total TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_quotation public.quotations%ROWTYPE;
  v_work public.works%ROWTYPE;
  v_quotation_id UUID;
  v_row_count INTEGER;
  v_work_metadata JSONB;
  v_work_found BOOLEAN := FALSE;
  v_target_work_ubqn TEXT;
  v_matched_ids UUID[];
  v_lock_key TEXT;
  v_err_constraint TEXT;
  v_err_message TEXT;
BEGIN
  IF p_is_edit IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'QUOTATION_MODE_REQUIRED';
  END IF;

  IF p_division_id IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'DIVISION_REQUIRED';
  END IF;

  IF p_line_items IS NULL OR jsonb_typeof(p_line_items) <> 'array' THEN
    RAISE EXCEPTION USING MESSAGE = 'QUOTATION_ITEMS_INVALID';
  END IF;

  IF p_is_edit THEN
    IF p_quotation_id IS NULL THEN
      RAISE EXCEPTION USING MESSAGE = 'MISSING_QUOTATION_ID';
    END IF;

    SELECT q.*
    INTO v_quotation
    FROM public.quotations AS q
    WHERE q.id = p_quotation_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING MESSAGE = 'QUOTATION_NOT_FOUND';
    END IF;

    IF v_quotation.work_id IS NULL THEN
      RAISE EXCEPTION USING MESSAGE = 'QUOTATION_WORK_REQUIRED';
    END IF;

    SELECT w.*
    INTO v_work
    FROM public.works AS w
    WHERE w.id = v_quotation.work_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING MESSAGE = 'WORK_NOT_FOUND';
    END IF;

    -- Edit-mode division integrity guard:
    -- Ensure an edit cannot silently change a quotation's division while retaining a Work associated with a different division
    IF v_work.division_id IS NOT NULL AND v_work.division_id IS DISTINCT FROM p_division_id THEN
      RAISE EXCEPTION USING
        ERRCODE = '23505',
        MESSAGE = 'WORK_DIVISION_MISMATCH: Quotation division cannot be changed independently from its associated work';
    END IF;
  ELSE
    -- Normalize UBQN identifier: ensure empty strings do not take precedence over valid identifiers
    v_target_work_ubqn := COALESCE(NULLIF(btrim(p_canonical_work_ubqn), ''), NULLIF(btrim(p_quotation_ubqn), ''));

    IF v_target_work_ubqn IS NULL THEN
      RAISE EXCEPTION USING MESSAGE = 'WORK_UBQN_REQUIRED';
    END IF;

    -- Advisory lock on exact normalized UBQN identifier
    v_lock_key := 'ubqn:' || lower(v_target_work_ubqn);
    PERFORM pg_advisory_xact_lock(hashtextextended(v_lock_key, 0));

    v_work_found := FALSE;

    -- Exact match on target work UBQN
    SELECT array_agg(w.id)
    INTO v_matched_ids
    FROM public.works AS w
    WHERE w.ubqn = v_target_work_ubqn;

    IF cardinality(v_matched_ids) > 1 THEN
      RAISE EXCEPTION USING MESSAGE = 'AMBIGUOUS_WORK_MATCH: Multiple works match target UBQN';
    ELSIF cardinality(v_matched_ids) = 1 THEN
      SELECT w.*
      INTO v_work
      FROM public.works AS w
      WHERE w.id = v_matched_ids[1]
      FOR UPDATE;

      -- Explicitly verify that the Work belongs to the requested division
      IF v_work.division_id IS DISTINCT FROM p_division_id THEN
        RAISE EXCEPTION USING
          ERRCODE = '23505',
          MESSAGE = 'WORK_DIVISION_MISMATCH: A work with this UBQN exists but belongs to a different division';
      END IF;

      v_work_found := TRUE;
    END IF;

    -- Fallback: Create new work only when lookup conclusively establishes no match exists
    IF NOT v_work_found THEN
      BEGIN
        INSERT INTO public.works (
          ubqn,
          sn_no,
          division_id,
          status,
          work_name,
          client_name,
          consultancy_cost,
          firm,
          subcategory,
          metadata
        )
        VALUES (
          v_target_work_ubqn,
          p_new_work_sn_no,
          p_division_id,
          'Pipeline',
          p_new_work_name,
          p_new_work_client_name,
          p_save_numeric_total,
          p_firm,
          p_work_subcategory,
          jsonb_build_object(
            'type', 'Quotation',
            'source', 'quotation_generator',
            'created_from_quote', TRUE,
            'include_gst', TRUE,
            'base_cost', p_save_numeric_total
          )
        )
        RETURNING * INTO v_work;
      EXCEPTION
        WHEN unique_violation THEN
          GET STACKED DIAGNOSTICS
            v_err_constraint = CONSTRAINT_NAME,
            v_err_message = MESSAGE_TEXT;

          -- Recover only if the conflict is specifically on works_ubqn_unique and matches the requested division
          IF v_err_constraint = 'works_ubqn_unique' OR v_err_constraint ILIKE '%ubqn%' THEN
            v_work := NULL;
            SELECT w.*
            INTO v_work
            FROM public.works AS w
            WHERE w.ubqn = v_target_work_ubqn
              AND w.division_id = p_division_id
            FOR UPDATE;

            IF v_work.id IS NULL THEN
              RAISE EXCEPTION USING
                ERRCODE = '23505',
                MESSAGE = 'WORK_CREATION_FAILED: Conflicting UBQN belongs to another division or unresolvable work';
            END IF;
          ELSE
            -- Distinct unique constraint violation (e.g. works_sn_no_unique, works_pkey)
            RAISE EXCEPTION USING
              ERRCODE = '23505',
              MESSAGE = 'WORK_CREATION_FAILED: Unique constraint violation on ' || COALESCE(v_err_constraint, 'works') || ': ' || v_err_message;
          END IF;
        WHEN OTHERS THEN
          RAISE EXCEPTION USING
            ERRCODE = SQLSTATE,
            MESSAGE = 'WORK_CREATION_FAILED: ' || SQLERRM;
      END;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.quotations AS q
    WHERE q.work_id = v_work.id
      AND (NOT p_is_edit OR q.id <> p_quotation_id)
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'QUOTATION_EXISTS';
  END IF;

  IF p_is_edit THEN
    v_quotation_id := p_quotation_id;
    BEGIN
      UPDATE public.quotations AS q
      SET ubqn = p_quotation_ubqn,
          firm = p_firm,
          subsidiary = p_subsidiary,
          section = p_section,
          subcategory = p_quotation_subcategory,
          quotation_date = p_quotation_date,
          client_name = p_client_name,
          division_name = p_division_name,
          division_id = p_division_id,
          department_name = p_department_name,
          address = p_address,
          subject = p_subject,
          reference_no = p_reference_no,
          consultancy_cost = p_save_numeric_total,
          work_id = v_work.id
      WHERE q.id = v_quotation_id;
      GET DIAGNOSTICS v_row_count = ROW_COUNT;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION USING
        ERRCODE = SQLSTATE,
        MESSAGE = 'QUOTATION_HEADER_FAILED: ' || SQLERRM;
    END;

    IF v_row_count <> 1 THEN
      RAISE EXCEPTION USING MESSAGE = 'QUOTATION_NOT_FOUND';
    END IF;

    BEGIN
      DELETE FROM public.quotation_items AS qi
      WHERE qi.quotation_id = v_quotation_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION USING
        ERRCODE = SQLSTATE,
        MESSAGE = 'QUOTATION_ITEMS_DELETE_FAILED: ' || SQLERRM;
    END;
  ELSE
    BEGIN
      INSERT INTO public.quotations (
        ubqn,
        firm,
        subsidiary,
        section,
        subcategory,
        quotation_date,
        client_name,
        division_name,
        division_id,
        department_name,
        address,
        subject,
        reference_no,
        consultancy_cost,
        work_id
      )
      VALUES (
        p_quotation_ubqn,
        p_firm,
        p_subsidiary,
        p_section,
        p_quotation_subcategory,
        p_quotation_date,
        p_client_name,
        p_division_name,
        p_division_id,
        p_department_name,
        p_address,
        p_subject,
        p_reference_no,
        p_save_numeric_total,
        v_work.id
      )
      RETURNING id INTO v_quotation_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION USING
        ERRCODE = SQLSTATE,
        MESSAGE = 'QUOTATION_HEADER_FAILED: ' || SQLERRM;
    END;
  END IF;

  BEGIN
    INSERT INTO public.quotation_items (
      quotation_id,
      sn,
      description,
      rate,
      unit,
      qty,
      amount
    )
    SELECT
      v_quotation_id,
      item.sn,
      item.description,
      item.rate,
      item.unit,
      item.qty,
      item.amount
    FROM jsonb_populate_recordset(NULL::public.quotation_items, p_line_items) AS item;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION USING
      ERRCODE = SQLSTATE,
      MESSAGE = 'QUOTATION_ITEMS_INSERT_FAILED: ' || SQLERRM;
  END;

  v_work_metadata := COALESCE(v_work.metadata, '{}'::JSONB)
    || jsonb_build_object(
      'type', 'Quotation',
      'include_gst', TRUE,
      'base_cost', p_save_numeric_total
    );

  IF p_percentage_mode THEN
    v_work_metadata := v_work_metadata
      || jsonb_build_object('display_total', p_display_total);
  ELSE
    v_work_metadata := v_work_metadata - 'display_total';
  END IF;

  BEGIN
    UPDATE public.works AS w
    SET work_name = p_work_name,
        client_name = p_work_client_name,
        consultancy_cost = p_save_numeric_total,
        division_id = COALESCE(v_work.division_id, p_division_id),
        firm = p_firm,
        subcategory = p_work_subcategory,
        updated_at = p_work_updated_at,
        metadata = v_work_metadata
    WHERE w.id = v_work.id;
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION USING
      ERRCODE = SQLSTATE,
      MESSAGE = 'WORK_SYNCHRONIZATION_FAILED: ' || SQLERRM;
  END;

  IF v_row_count <> 1 THEN
    RAISE EXCEPTION USING MESSAGE = 'WORK_NOT_FOUND';
  END IF;

  RETURN jsonb_build_object(
    'quotation_id', v_quotation_id,
    'work_id', v_work.id,
    'canonical_work_ubqn', v_work.ubqn
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.save_quotation_atomic(
  BOOLEAN, UUID, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT,
  DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, JSONB, TEXT, TEXT, TEXT,
  TIMESTAMPTZ, BOOLEAN, TEXT
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.save_quotation_atomic(
  BOOLEAN, UUID, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT,
  DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, JSONB, TEXT, TEXT, TEXT,
  TIMESTAMPTZ, BOOLEAN, TEXT
) FROM anon;

GRANT EXECUTE ON FUNCTION public.save_quotation_atomic(
  BOOLEAN, UUID, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT,
  DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, JSONB, TEXT, TEXT, TEXT,
  TIMESTAMPTZ, BOOLEAN, TEXT
) TO authenticated;