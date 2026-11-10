-- Allow authenticated vendors to create support tickets only for their own vendor record.
-- This policy does not grant vendors access to other vendors' tickets.
-- The policy is idempotent; re-running it replaces only this named policy.

DROP POLICY IF EXISTS "Vendors can create their own support tickets"
ON public.vendor_support_tickets;

CREATE POLICY "Vendors can create their own support tickets"
ON public.vendor_support_tickets
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.vendors AS v
    WHERE v.id = vendor_support_tickets.vendor_id
      AND v.auth_user_id = (SELECT auth.uid())
  )
);

-- Feedback-specific authorization: feedback inserts are also checked by the same
-- row ownership predicate. The application stores feedback as issue_type='feedback'.
