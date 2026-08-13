# Renovations: Real Accounts, Money Borrowed, and Absolute-Value Summary

## Problem

The Renovations feature currently tracks a "Budgets" concept (`renovation_funds`, with an
`include_in_budget` toggle) that mixes savings, gifts, and loans into one abstract number, and a
Summary tab that nets estimated cost against that abstract budget rather than against real bank
balances. In practice the user tracks money across three real places — a shared account, a
personal account, and cash — and the app's numbers routinely drift from reality because there is
no mechanism to reconcile them. The Summary also includes a brute-force "Recommendations" engine
(subset-sum search over deferrable tasks) that is being removed as part of this rework, along with
the "Nice to have"/"Future tasks" affordability sections and "Active Debts" section it's coupled
to.

## Goals

- Replace "Budgets" with a "Money Borrowed" tab that only tracks loans and their repayments.
- Replace the abstract budget number with three real account balances (Shared, Personal, Cash)
  that the user can deposit into, withdraw from (transfer to cash), or adjust directly.
- Have Payments automatically deduct from the selected account.
- Rework Summary to show absolute available/estimated/spent/remaining figures, not netted against
  what's already been paid.
- Remove Recommendations, Active Debts, Nice-to-have, and Future-tasks sections entirely.
- Fix the pre-existing drift between manually-entered `actual_cost` and real Payments by deriving
  "paid so far" from Payments instead.
- Split the single 1800-line `page.tsx` into per-tab components, with the active tab tracked in a
  URL search param so a reload preserves position.

## Non-goals

- No down-migrations (matches existing repo convention — no rollback scripts exist today).
- No changes to the Groups tab.
- No transaction/audit history for deposits, withdrawals, or adjustments — only current balances
  are stored and shown.
- No changes to authentication, routing outside this feature, or other app areas.

## Data Model

### Money Borrowed (renamed from `renovation_funds`)

```sql
-- 014_renovation_funds_to_loans.sql
ALTER TABLE renovation_funds RENAME TO renovation_loans;
DELETE FROM renovation_loans WHERE type != 'loan';
ALTER TABLE renovation_loans
  DROP COLUMN type,
  DROP COLUMN source,
  DROP COLUMN include_in_budget;
ALTER TABLE renovation_loans RENAME COLUMN date_received TO date_borrowed;
ALTER TABLE renovation_loans ALTER COLUMN lender SET NOT NULL;
```

```sql
-- 015_renovation_loan_repayments.sql
CREATE TABLE IF NOT EXISTS renovation_loan_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES renovation_loans(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  repayment_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_renovation_loan_repayments_loan_id
  ON renovation_loan_repayments(loan_id);
```

Existing `type='savings'`/`type='gift'` fund rows are dropped as part of the migration — they
don't represent debt, and any real balance they represented should be re-entered as a Deposit
against one of the three new accounts. `name` stays as a free-text label for the loan (e.g. "Home
Depot loan"); `lender`, `amount`, `date_borrowed` are unchanged.

Loan derived fields (computed, not stored): `repaid = SUM(renovation_loan_repayments.amount) WHERE
loan_id = X`, `outstanding = amount - repaid`.

### Accounts (new)

```sql
-- 016_renovation_accounts.sql
CREATE TABLE IF NOT EXISTS renovation_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('shared','personal','cash')),
  balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, account_type)
);

-- Seed 3 rows (balance 0) for every distinct user_id already present in renovation data
INSERT INTO renovation_accounts (user_id, account_type)
SELECT DISTINCT user_id, account_type
FROM (
  SELECT user_id, unnest(ARRAY['shared','personal','cash']) AS account_type
  FROM renovation_tasks
  UNION
  SELECT user_id, unnest(ARRAY['shared','personal','cash']) FROM renovation_payments
  UNION
  SELECT user_id, unnest(ARRAY['shared','personal','cash']) FROM renovation_loans
) seed
ON CONFLICT (user_id, account_type) DO NOTHING;
```

Balances start at 0 for existing users; the user reconciles them to reality via Deposit.

### Payments

```sql
-- 017_renovation_payments_account_type.sql
ALTER TABLE renovation_payments RENAME COLUMN method TO account_type;
UPDATE renovation_payments SET account_type = CASE account_type
  WHEN 'transfer' THEN 'shared'
  WHEN 'card' THEN 'personal'
  WHEN 'cash' THEN 'cash'
  ELSE account_type END;
ALTER TABLE renovation_payments
  ADD CONSTRAINT renovation_payments_account_type_check
  CHECK (account_type IN ('shared','personal','cash'));
ALTER TABLE renovation_payments DROP COLUMN fund_id;
```

`fund_id` existed in the schema but was never read or written by the service layer — dead column,
dropped as cleanup.

### Tasks

```sql
-- 018_renovation_tasks_drop_priority.sql
ALTER TABLE renovation_tasks
  DROP COLUMN priority,
  DROP COLUMN actual_cost;
```

All tasks are implicitly "mandatory" going forward — `priority` (mandatory/ideal/future) is
removed from the schema, task modal, task cards, and all calculations. `status`
(pending/in_progress/completed/cancelled) is unchanged. `actual_cost` is dropped too — "already
paid" is now always computed from linked Payments (see Task tab section below), so the manual
column would just be dead weight. `category` (`labor`/`material`) is unchanged.

## Backend (services/actions)

`src/lib/services/renovations.ts` reorganized around the new entities:

- **Loans**: `getLoans`, `saveLoan`, `deleteLoan`, `addRepayment`, `deleteRepayment`.
- **Accounts**: `getAccounts()` returns the 3 balances for the user; `deposit(accountType,
  amount)` adds; `withdraw(accountType, amount)` — only `shared`/`personal` as source — decrements
  that account and increments `cash` in the same transaction, throwing `InsufficientFundsError` if
  `amount > balance`; `adjust(accountType, amount)` decrements the given account for
  non-renovation spend, same insufficient-funds guard.
- **Payments**: `savePayment`/`updatePayment`/`deletePayment` wrap the payment write and the
  corresponding account balance change in one DB transaction (`BEGIN`/`COMMIT` via the shared `pg`
  pool):
  - create → insert payment, `balance -= amount` on `account_type`
  - delete → delete payment, `balance += amount` back
  - update → if `amount` or `account_type` changed, reverse the old effect then apply the new one
- **Tasks**: `getTasks` returns each task with a computed `paid_so_far` (`SUM(amount) FROM
  renovation_payments WHERE task_id = tasks.id`, via a join/subquery, not N+1 queries).
  `saveTask`/`getTasks` drop `priority`.

`src/app/actions/renovations.ts` gets matching actions: `saveLoanAction`, `deleteLoanAction`,
`addRepaymentAction`, `deleteRepaymentAction`, `depositAction`, `withdrawAction`, `adjustAction`,
replacing `saveFundAction`/`deleteFundAction`. Each still calls `requireUser()` then
`revalidatePath("/renovations")`. `withdrawAction`/`adjustAction` catch
`InsufficientFundsError` and return a structured `{ error: string }` result instead of throwing,
so the UI can show an inline message.

`src/lib/types/renovations.ts` updated: `RenovationFund` → `RenovationLoan` (drops `type`,
`source`, `include_in_budget`; renames `date_received` → `date_borrowed`), new
`RenovationLoanRepayment`, new `RenovationAccount`, `RenovationPayment.method` →
`RenovationPayment.account_type` (drops `fund_id`), `RenovationTask` drops `priority` and
`actual_cost`, adds computed `paid_so_far` (not persisted, added by the service read).

## UI

### File structure

```
renovations/
  page.tsx                    # thin container: loads data, reads/writes ?tab= search param
  page.module.css
  components/
    SummaryTab.tsx
    BudgetTab.tsx              # 3 balances + Deposit/Withdraw/Adjust modals
    MoneyBorrowedTab.tsx       # loan cards + repayment modal
    PaymentsTab.tsx
    TasksTab.tsx
    GroupsTab.tsx
  lib/
    calculations.ts            # summary/paid-to derivations shared by SummaryTab
```

`page.tsx` reads the active tab from `useSearchParams()` and updates it via
`router.replace(pathname + "?tab=" + tab, { scroll: false })` on tab-button click, so a page
reload keeps the user on the same tab. Default tab when no param is present: `summary`.

### Budget tab

Three balance cards: Shared account, Personal account, Cash. Three actions:

- **Deposit** — modal: account (select: any of 3), amount. Increases the selected account.
- **Withdraw** — modal: source account (select: Shared or Personal only — Cash is not a valid
  source), amount. Decreases the source, increases Cash. Inline error if amount exceeds the source
  balance.
- **Adjust** — modal: account (select: any of 3), amount. Decreases the selected account for
  non-renovation spending (money leaves the tracked system entirely, no destination). Inline error
  if it would go negative.

### Money Borrowed tab (replaces Budgets)

Card grid, one card per loan: name, lender, amount borrowed, date borrowed, repaid so far,
outstanding (`amount - repaid`, highlighted if > 0, "fully repaid" badge if 0). Each card has "Add
repayment" (modal: amount, date, optional note) and existing edit/delete for the loan. No
`include_in_budget` toggle, no `type` selector.

### Payments tab

Payment modal's account select replaces the old `method` select: Shared account / Personal account
/ Cash, backed by `account_type`. Creating/editing/deleting a payment adjusts the linked account
balance as described in Backend section. Existing group-by-task toggle/view is unchanged.

### Tasks tab

`priority` select and badge removed from both the task card and the task modal. Task modal fields:
`name`, `category`, `status`, `estimated_cost`, `group_id`, `start_date`, `end_date`, `notes` — no
manual paid-amount entry. Each task card displays three amounts:

- **Estimated** — `estimated_cost` (editable in modal)
- **Already paid** — computed `paid_so_far` (sum of linked Payments), read-only
- **Pending** — computed `estimated_cost - paid_so_far`, read-only

### Groups tab

Unchanged.

### Summary tab

Five headline cards, all absolute values:

- **Available funds** = sum of the 3 account balances
- **Estimated materials** = `SUM(estimated_cost - paid_so_far)` over non-cancelled tasks where
  `category = 'material'`
- **Estimated workers** = same, for `category = 'labor'`
- **Total spent** = sum of all Payments (unchanged from today)
- **Remaining funds** = Available funds − Estimated materials − Estimated workers

**"Paid To"** section — dynamic grouping, no hardcoded payee name lists:

- **Materials** — payments linked to a `material`-category task, grouped by payee; each card shows
  paid vs. that payee's group material budget (mirrors today's Contractors budget calc, but
  filtered to `category = 'material'`).
- **Workers** (renamed from Contractors) — same, filtered to `category = 'labor'`.
- **Other/Unassigned** — payments with no linked task, grouped by payee, amount paid only (no
  budget denominator).

Removed entirely: Recommendations (and its subset-sum engine), Active Debts, Nice-to-have, Future
tasks, and the old "Lenders" Paid-To subsection (loan repayments now live only in Money Borrowed).

## i18n

Remove: `types.*`, `priorities.*`, `includeInBudget`, `recommendationsTitle`/`Desc`, `option`,
`savedAmount`, `newBalance`, `noRecommendations`, `activeDebts`, `niceToHave`, `futureTasks`,
`lenders`.

Add: `moneyBorrowed` (tab label), `repayment`/`repayments`, `outstanding`, `fullyRepaid`,
`accounts.shared`/`personal`/`cash`, `deposit`, `withdraw`, `adjust`, `alreadyPaid`, `pending`,
`materials` (Paid To subsection), `workers` (renamed from `contractors`), `other`/`unassigned`
(Paid To).

While rewriting the fund/task/payment modals into their own components, fix the existing
hardcoded-Spanish edit-mode-title hack (`t("addFund").replace("Añadir", "Editar")`) with proper
`editLoan`/`editTask`/`editPayment`/`editGroup` keys, and the other hardcoded strings noted during
research (`"Excluido"`, `"Editar Grupo"/"Nuevo Grupo"`, `"(Opcional)"` suffixes, `"-- Sin asignar
--"`) — all in both `en.json` and `es.json`.

## Scope

- New migrations `014` through `018` in `migrations/`.
- Rewritten `src/lib/services/renovations.ts`, `src/app/actions/renovations.ts`,
  `src/lib/types/renovations.ts`.
- `src/app/[locale]/renovations/page.tsx` split into `page.tsx` + `components/*.tsx` +
  `lib/calculations.ts` as described above.
- `messages/en.json` and `messages/es.json` updated under the `Renovations` namespace.
- No new dependencies.
