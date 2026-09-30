ALTER TABLE public.travel_requisitions
  ADD COLUMN IF NOT EXISTS settlement_status TEXT DEFAULT 'Not Submitted',
  ADD COLUMN IF NOT EXISTS expense_accommodation DECIMAL(15, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expense_misc DECIMAL(15, 2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.travel_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requisition_id UUID NOT NULL
    REFERENCES public.travel_requisitions(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.travel_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update own pending requisitions or admins can update"
  ON public.travel_requisitions;
DROP POLICY IF EXISTS "Users can update own pending or rejected requisitions"
  ON public.travel_requisitions;
DROP POLICY IF EXISTS "Admins can view all travel requisitions"
  ON public.travel_requisitions;
DROP POLICY IF EXISTS "Admins can insert travel requisitions"
  ON public.travel_requisitions;

CREATE POLICY "Users can update own pending or rejected requisitions"
  ON public.travel_requisitions
  FOR UPDATE
  USING (
    (
      auth.uid() = employee_id
      AND (
        (ad_status = 'Pending' AND director_status = 'Pending')
        OR director_status = 'Rejected'
      )
    )
    OR public.has_role(auth.uid(), 'Director'::text)
    OR public.has_role(auth.uid(), 'Assistant Director'::text)
    OR public.has_role(auth.uid(), 'Admin'::text)
  )
  WITH CHECK (
    (
      auth.uid() = employee_id
      AND ad_status = 'Pending'
      AND director_status = 'Pending'
    )
    OR public.has_role(auth.uid(), 'Director'::text)
    OR public.has_role(auth.uid(), 'Assistant Director'::text)
    OR public.has_role(auth.uid(), 'Admin'::text)
  );

CREATE POLICY "Admins can view all travel requisitions"
  ON public.travel_requisitions
  FOR SELECT
  USING (public.has_role(auth.uid(), 'Admin'::text));

CREATE POLICY "Admins can insert travel requisitions"
  ON public.travel_requisitions
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'Admin'::text));

DROP POLICY IF EXISTS "Users can insert own expenses"
  ON public.travel_expenses;
DROP POLICY IF EXISTS "Users can update own pending expenses"
  ON public.travel_expenses;
DROP POLICY IF EXISTS "Users can delete own pending expenses"
  ON public.travel_expenses;
DROP POLICY IF EXISTS "Employees can add expenses to approved editable trips"
  ON public.travel_expenses;
DROP POLICY IF EXISTS "Employees can update expenses in editable trips"
  ON public.travel_expenses;
DROP POLICY IF EXISTS "Employees can delete expenses in editable trips"
  ON public.travel_expenses;

CREATE POLICY "Employees can add expenses to approved editable trips"
  ON public.travel_expenses
  FOR INSERT
  WITH CHECK (
    auth.uid() = employee_id
    AND EXISTS (
      SELECT 1
      FROM public.travel_requisitions req
      WHERE req.id = requisition_id
        AND req.employee_id = auth.uid()
        AND req.director_status = 'Approved'
        AND COALESCE(req.settlement_status, 'Not Submitted')
          IN ('Not Submitted', 'AD Rejected', 'Director Rejected', 'Rejected')
    )
  );

CREATE POLICY "Employees can update expenses in editable trips"
  ON public.travel_expenses
  FOR UPDATE
  USING (
    auth.uid() = employee_id
    AND EXISTS (
      SELECT 1
      FROM public.travel_requisitions req
      WHERE req.id = requisition_id
        AND req.employee_id = auth.uid()
        AND req.director_status = 'Approved'
        AND COALESCE(req.settlement_status, 'Not Submitted')
          IN ('Not Submitted', 'AD Rejected', 'Director Rejected', 'Rejected')
    )
  )
  WITH CHECK (
    auth.uid() = employee_id
    AND EXISTS (
      SELECT 1
      FROM public.travel_requisitions req
      WHERE req.id = requisition_id
        AND req.employee_id = auth.uid()
        AND req.director_status = 'Approved'
        AND COALESCE(req.settlement_status, 'Not Submitted')
          IN ('Not Submitted', 'AD Rejected', 'Director Rejected', 'Rejected')
    )
  );

CREATE POLICY "Employees can delete expenses in editable trips"
  ON public.travel_expenses
  FOR DELETE
  USING (
    auth.uid() = employee_id
    AND EXISTS (
      SELECT 1
      FROM public.travel_requisitions req
      WHERE req.id = requisition_id
        AND req.employee_id = auth.uid()
        AND req.director_status = 'Approved'
        AND COALESCE(req.settlement_status, 'Not Submitted')
          IN ('Not Submitted', 'AD Rejected', 'Director Rejected', 'Rejected')
    )
  );

CREATE OR REPLACE FUNCTION public.travel_review_requisition(
  _requisition_id UUID,
  _action TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req public.travel_requisitions%ROWTYPE;
  reviewer_is_director BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR _action IS NULL OR _action NOT IN ('Approve', 'Reject') THEN
    RAISE EXCEPTION 'Invalid travel requisition review';
  END IF;

  reviewer_is_director := public.has_role(auth.uid(), 'Director'::text);
  IF NOT reviewer_is_director
    AND NOT public.has_role(auth.uid(), 'Assistant Director'::text) THEN
    RAISE EXCEPTION 'Not authorized to review travel requisitions';
  END IF;

  SELECT *
  INTO req
  FROM public.travel_requisitions
  WHERE id = _requisition_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Travel requisition not found';
  END IF;

  IF reviewer_is_director THEN
    IF req.ad_status <> 'Approved' OR req.director_status <> 'Pending' THEN
      RAISE EXCEPTION 'Travel requisition is not awaiting Director review';
    END IF;

    UPDATE public.travel_requisitions
    SET director_status = CASE
      WHEN _action = 'Approve' THEN 'Approved'::public.travel_requisition_status
      ELSE 'Rejected'::public.travel_requisition_status
    END
    WHERE id = req.id;

    IF _action = 'Approve' AND req.advance_required > 0 THEN
      INSERT INTO public.ledger_transactions (
        employee_id, transaction_type, amount, requisition_id, description
      )
      VALUES (
        req.employee_id, 'Advance', req.advance_required, req.id,
        'Advance for travel requisition'
      );
    END IF;
  ELSE
    IF req.ad_status <> 'Pending' OR req.director_status <> 'Pending' THEN
      RAISE EXCEPTION 'Travel requisition is not awaiting Assistant Director review';
    END IF;

    UPDATE public.travel_requisitions
    SET ad_status = CASE
          WHEN _action = 'Approve' THEN 'Approved'::public.travel_requisition_status
          ELSE 'Rejected'::public.travel_requisition_status
        END,
        director_status = CASE
          WHEN _action = 'Approve' THEN director_status
          ELSE 'Rejected'::public.travel_requisition_status
        END
    WHERE id = req.id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.travel_submit_settlement(
  _requisition_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req public.travel_requisitions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO req
  FROM public.travel_requisitions
  WHERE id = _requisition_id
  FOR UPDATE;

  IF NOT FOUND OR req.employee_id <> auth.uid() THEN
    RAISE EXCEPTION 'Travel requisition not found';
  END IF;
  IF req.director_status <> 'Approved' THEN
    RAISE EXCEPTION 'Settlement can only be submitted after Director approval';
  END IF;
  IF COALESCE(req.settlement_status, 'Not Submitted')
      NOT IN ('Not Submitted', 'AD Rejected', 'Director Rejected', 'Rejected') THEN
    RAISE EXCEPTION 'Settlement is already submitted or complete';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.travel_expenses WHERE requisition_id = req.id
  ) THEN
    RAISE EXCEPTION 'Add at least one expense before submitting the settlement';
  END IF;

  UPDATE public.travel_requisitions
  SET settlement_status = 'Submitted'
  WHERE id = req.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.travel_review_settlement(
  _requisition_id UUID,
  _action TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req public.travel_requisitions%ROWTYPE;
  reviewer_is_director BOOLEAN;
  expected_status TEXT;
  total_expenses DECIMAL(15, 2);
BEGIN
  IF auth.uid() IS NULL OR _action IS NULL OR _action NOT IN ('Approve', 'Reject') THEN
    RAISE EXCEPTION 'Invalid travel settlement review';
  END IF;

  reviewer_is_director := public.has_role(auth.uid(), 'Director'::text);
  IF NOT reviewer_is_director
    AND NOT public.has_role(auth.uid(), 'Assistant Director'::text) THEN
    RAISE EXCEPTION 'Not authorized to review travel settlements';
  END IF;

  SELECT *
  INTO req
  FROM public.travel_requisitions
  WHERE id = _requisition_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Travel requisition not found';
  END IF;

  expected_status := CASE WHEN reviewer_is_director THEN 'AD Approved' ELSE 'Submitted' END;
  IF req.settlement_status <> expected_status THEN
    RAISE EXCEPTION 'Settlement is not awaiting your review';
  END IF;

  IF reviewer_is_director THEN
    IF _action = 'Approve' THEN
      SELECT COALESCE(SUM(amount), 0)
      INTO total_expenses
      FROM public.travel_expenses
      WHERE requisition_id = req.id;

      UPDATE public.travel_requisitions
      SET settlement_status = 'Settled'
      WHERE id = req.id;

      INSERT INTO public.ledger_transactions (
        employee_id, transaction_type, amount, requisition_id, description
      )
      VALUES (
        req.employee_id, 'Expense', -total_expenses, req.id,
        'Settlement of actual expenses for travel'
      );
    ELSE
      UPDATE public.travel_requisitions
      SET settlement_status = 'Director Rejected'
      WHERE id = req.id;
    END IF;
  ELSIF _action = 'Approve' THEN
    UPDATE public.travel_requisitions
    SET settlement_status = 'AD Approved'
    WHERE id = req.id;
  ELSE
    UPDATE public.travel_requisitions
    SET settlement_status = 'AD Rejected'
    WHERE id = req.id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.travel_review_requisition(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.travel_submit_settlement(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.travel_review_settlement(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.travel_review_requisition(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.travel_submit_settlement(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.travel_review_settlement(UUID, TEXT) TO authenticated;
