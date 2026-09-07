INSERT INTO public.ledger_transactions (employee_id, transaction_type, amount, requisition_id, description, created_at)
SELECT employee_id, 'Advance', advance_required, id, 'Advance for travel requisition', created_at
FROM public.travel_requisitions
WHERE director_status = 'Approved' 
AND id NOT IN (SELECT requisition_id FROM public.ledger_transactions WHERE transaction_type = 'Advance' AND requisition_id IS NOT NULL);

INSERT INTO public.ledger_transactions (employee_id, transaction_type, amount, requisition_id, description, created_at)
SELECT 
  req.employee_id, 
  'Expense', 
  - (COALESCE(req.expense_transport,0) + COALESCE(req.expense_local,0) + COALESCE(req.expense_food,0) + COALESCE(req.expense_driver,0)), 
  req.id, 
  'Settlement of actual expenses for travel', 
  req.updated_at
FROM public.travel_requisitions req
WHERE req.settlement_status = 'Settled'
AND req.id NOT IN (SELECT requisition_id FROM public.ledger_transactions WHERE transaction_type = 'Expense' AND requisition_id IS NOT NULL);
