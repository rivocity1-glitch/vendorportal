# Vendor Portal Audit

Branch: `vendorportal-full-audit-optimization`
Base: `main`
Audit type: static repository review. No live Supabase/RLS inspection or local runtime test has been performed.

## Changes made

1. **Dashboard settlement workflow**
   - Removed the legacy dashboard insert that created `pending_request` settlement rows with only vendor ID, amount, and request date.
   - That path conflicted with the current Settlements page workflow, which creates daily `REQUESTED` batches with order IDs and order counts after the 9:00 PM IST cutoff.
   - Dashboard now routes vendors to the Settlements page to submit/manage the batch.
   - Pending-request detection accepts the current `REQUESTED` status and the legacy `pending_request` spelling so older records remain visible.

2. **Settlement eligibility fallback**
   - The settlement query previously filtered only with `delivered_at <= cutoff`, even though the subsequent client-side logic explicitly fell back to `created_at` when `delivered_at` was null.
   - Updated the query to include rows with a null `delivered_at` when their `created_at` is at or before the cutoff.

3. **Authentication**
   - Session validation now uses `supabase.auth.getUser()` rather than trusting the locally stored session snapshot.
   - Vendor status normalization is null-safe.
   - Auth-state-triggered Supabase work is deferred until after the auth callback returns, avoiding Supabase auth-lock re-entrancy problems.

4. **Logging**
   - Removed unnecessary logging of the Supabase project URL.

5. **Dashboard analytics**
   - Top-selling product quantities now include only order items belonging to delivered orders.
   - “Today” and relative-date labels now use the browser’s local calendar date rather than UTC date strings, avoiding day-boundary shifts for IST users.

## Findings requiring further verification / follow-up

### High priority
- **Settlement idempotency is not guaranteed by the client flow.** The page checks existing settlement order IDs and then inserts a new batch in separate requests. Two concurrent submissions can race. A database-side transaction/RPC or appropriate uniqueness constraint is needed before treating settlement submission as concurrency-safe. Do not add a schema change without reviewing the live constraints and existing settlement data.
- **RLS and vendor isolation remain unverified.** The frontend filters many queries by `vendor_id`, but frontend filters are not a security boundary. Verify policies for vendors, vendor_profiles, products, orders, order_items, vendor_settlements, invoices, notifications, vendor_workers, picker requests/tasks, storage buckets, and related tables. Test with two vendor accounts.
- **Payout status semantics need confirmation.** The Settlements page uses `REQUESTED`, `AVAILABLE`, and `PAID`; confirm these values and transitions match the live table constraints and Admin settlement processing.

### Medium priority
- `src/services/orderService.ts` appears unused and defines an order `status` field with values that do not match the established `orders.order_status` schema. Its update helper writes `status`, so reusing it may fail or update the wrong field. It was not changed because it currently has no discovered callers.
- Dashboard metrics fetch several resources concurrently but do not check each Supabase response's `error`; failed queries can be presented as empty/zero metrics.
- Product statistics and several list views fetch all matching rows without explicit pagination/count handling; PostgREST row limits may undercount larger vendor catalogs or histories.
- Subscription page reads platform settings and plan configuration but does not consistently surface query errors. Verify the live `platform_settings` JSON/key structure and active subscription uniqueness before changing behavior.
- Profile and settings flows include vendor banking/KYC-related fields. Verify field-level access and storage policies; do not rely on hidden UI fields for protection.

## Validation status

- Branch created from current `main`.
- No database migrations or destructive data operations made.
- No local `npm run build`, browser test, or live Supabase test has been run by the assistant.
- The repository currently has no `.github/workflows` CI workflow in the inspected tree. Add reproducible build/type-check CI after confirming the package manager and TypeScript dependency strategy.
- Before merge: run a clean install/build, test vendor registration/login/password reset, product create/edit/gallery/loose quantity, inventory adjustments, order lifecycle, picker assignment, invoices, settlement cutoff and duplicate-submit behavior, and verify RLS using separate vendor accounts.
