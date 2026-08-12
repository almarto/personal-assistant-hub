# Renovations: Real Accounts, Money Borrowed, and Absolute-Value Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Renovations feature's abstract "Budgets" concept with three real account balances (Shared/Personal/Cash), a dedicated Money Borrowed (loans) tab, automatic balance deduction on Payments, an absolute-value Summary, and a dynamic "Paid To" breakdown — per `docs/superpowers/specs/2026-08-12-renovations-accounts-rework-design.md`.

**Architecture:** Split the current 1802-line single-file `page.tsx` into a thin container plus one component per tab under `renovations/components/`, with shared calculations in `renovations/lib/calculations.ts`. Backend: 5 sequential SQL migrations reshape `renovation_funds` → `renovation_loans` (+new `renovation_loan_repayments`, `renovation_accounts` tables), repurpose `renovation_payments.method` into `account_type`, and drop `renovation_tasks.priority`/`actual_cost`. All money-moving service functions (payment create/update/delete, withdraw, adjust) wrap their DB writes in an explicit `pg` transaction so balances can never drift from the records that caused them.

**Tech Stack:** Next.js App Router, TypeScript (strict), raw SQL via `pg` (no ORM), next-intl, no new dependencies.

## Global Constraints

- Package manager: pnpm exclusively. This plan adds no new dependencies.
- TypeScript strict mode; no `any` without an explicit justifying comment.
- Named exports for all new functions/components (Next.js page/layout defaults excepted).
- **No automated tests** — explicit decision for this plan (repo has no test runner installed). Each task ends with `pnpm tsc --noEmit`, `pnpm lint`, and a concrete manual-verification step instead of a test-first cycle.
- No down-migrations — matches existing repo convention (`migrations/001`–`013` have none).
- Follow existing conventions: raw SQL via `pg`, migrations named `migrations/NNN_description.sql`, server actions in `src/app/actions/renovations.ts` each calling `requireUser()` then `revalidatePath("/renovations")`.
- Money migrations (Task 1) are destructive schema changes with no rollback script — flagged explicitly in that task; do not run `pnpm migrate` against a database you're not prepared to have permanently altered.

---

## Task 1: Database migrations

**Files:**
- Create: `migrations/014_renovation_funds_to_loans.sql`
- Create: `migrations/015_renovation_loan_repayments.sql`
- Create: `migrations/016_renovation_accounts.sql`
- Create: `migrations/017_renovation_payments_account_type.sql`
- Create: `migrations/018_renovation_tasks_drop_priority.sql`

**Interfaces:**
- Produces: tables `renovation_loans` (was `renovation_funds`), `renovation_loan_repayments`, `renovation_accounts`; `renovation_payments.account_type` (was `method`, values remapped `transfer→shared`, `card→personal`, `cash→cash`); `renovation_tasks` without `priority`/`actual_cost`.

- [ ] **Step 1: Write migration 014 — rename funds to loans, drop budget/type fields**

```sql
-- migrations/014_renovation_funds_to_loans.sql
ALTER TABLE renovation_funds RENAME TO renovation_loans;

DELETE FROM renovation_loans WHERE type != 'loan';

UPDATE renovation_loans SET lender = 'Unknown' WHERE lender IS NULL;

ALTER TABLE renovation_loans
  DROP COLUMN type,
  DROP COLUMN source,
  DROP COLUMN include_in_budget;

ALTER TABLE renovation_loans RENAME COLUMN date_received TO date_borrowed;

ALTER TABLE renovation_loans ALTER COLUMN lender SET NOT NULL;
```

- [ ] **Step 2: Write migration 015 — loan repayments table**

```sql
-- migrations/015_renovation_loan_repayments.sql
CREATE TABLE IF NOT EXISTS renovation_loan_repayments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES renovation_loans(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    repayment_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_renovation_loan_repayments_loan_id ON renovation_loan_repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_renovation_loan_repayments_user_id ON renovation_loan_repayments(user_id);
```

- [ ] **Step 3: Write migration 016 — accounts table, seeded at zero**

```sql
-- migrations/016_renovation_accounts.sql
CREATE TABLE IF NOT EXISTS renovation_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('shared','personal','cash')),
    balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, account_type)
);
CREATE INDEX IF NOT EXISTS idx_renovation_accounts_user_id ON renovation_accounts(user_id);

INSERT INTO renovation_accounts (user_id, account_type)
SELECT DISTINCT user_id, account_type
FROM (
  SELECT user_id, unnest(ARRAY['shared','personal','cash']) AS account_type FROM renovation_tasks
  UNION
  SELECT user_id, unnest(ARRAY['shared','personal','cash']) FROM renovation_payments
  UNION
  SELECT user_id, unnest(ARRAY['shared','personal','cash']) FROM renovation_loans
) seed
ON CONFLICT (user_id, account_type) DO NOTHING;
```

- [ ] **Step 4: Write migration 017 — payments method to account_type**

```sql
-- migrations/017_renovation_payments_account_type.sql
ALTER TABLE renovation_payments RENAME COLUMN method TO account_type;

UPDATE renovation_payments SET account_type = CASE account_type
  WHEN 'transfer' THEN 'shared'
  WHEN 'card' THEN 'personal'
  WHEN 'cash' THEN 'cash'
  ELSE account_type
END;

ALTER TABLE renovation_payments
  ADD CONSTRAINT renovation_payments_account_type_check
  CHECK (account_type IN ('shared','personal','cash'));

ALTER TABLE renovation_payments DROP COLUMN fund_id;
```

- [ ] **Step 5: Write migration 018 — drop tasks.priority and tasks.actual_cost**

```sql
-- migrations/018_renovation_tasks_drop_priority.sql
ALTER TABLE renovation_tasks
  DROP COLUMN priority,
  DROP COLUMN actual_cost;
```

- [ ] **Step 6: Run the migrations**

This is destructive and irreversible (no down-migration exists). Confirm `DATABASE_URL` (in `.env`) points at the database you intend to alter before running.

Run: `pnpm migrate`
Expected: output lists `014_renovation_funds_to_loans.sql` through `018_renovation_tasks_drop_priority.sql` as applied, no errors.

- [ ] **Step 7: Verify schema manually**

Run: `psql "$DATABASE_URL" -c "\d renovation_loans" -c "\d renovation_loan_repayments" -c "\d renovation_accounts" -c "\d renovation_payments" -c "\d renovation_tasks"`
Expected: `renovation_loans` has no `type`/`source`/`include_in_budget` columns and a `date_borrowed` column; `renovation_accounts` has 3 rows per existing `user_id` with `balance = 0` (check via `SELECT * FROM renovation_accounts;`); `renovation_payments` has `account_type` (not `method`), no `fund_id`; `renovation_tasks` has no `priority`/`actual_cost`.

- [ ] **Step 8: Commit**

```bash
git add migrations/014_renovation_funds_to_loans.sql migrations/015_renovation_loan_repayments.sql migrations/016_renovation_accounts.sql migrations/017_renovation_payments_account_type.sql migrations/018_renovation_tasks_drop_priority.sql
git commit -m "feat: migrate renovations schema to accounts + loans model"
```

---

## Task 2: Update TypeScript types

**Files:**
- Modify: `src/lib/types/renovations.ts` (full rewrite)

**Interfaces:**
- Consumes: schema from Task 1.
- Produces: `RenovationLoan`, `RenovationLoanRepayment`, `RenovationAccountType`, `RenovationAccount`, `RenovationGroup` (unchanged), `RenovationTask` (no `priority`/`actual_cost`, adds `paid_so_far`), `RenovationPayment` (`account_type` replaces `method`, no `fund_id`) — used by every later task.

- [ ] **Step 1: Rewrite the types file**

```typescript
export interface RenovationLoan {
  id: string;
  user_id: string;
  name: string;
  amount: string; // Decimal comes as string from postgres
  lender: string;
  date_borrowed: string | null;
  created_at: string;
  updated_at: string;
}

export interface RenovationLoanRepayment {
  id: string;
  loan_id: string;
  user_id: string;
  amount: string; // Decimal
  repayment_date: string;
  notes: string | null;
  created_at: string;
}

export type RenovationAccountType = "shared" | "personal" | "cash";

export interface RenovationAccount {
  id: string;
  user_id: string;
  account_type: RenovationAccountType;
  balance: string; // Decimal
  updated_at: string;
}

export interface RenovationGroup {
  id: string;
  user_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  contractor: string | null;
  created_at: string;
  updated_at: string;
}

export interface RenovationTask {
  id: string;
  user_id: string;
  name: string;
  category: string;
  status: string;
  group_id: string | null;
  estimated_cost: string; // Decimal
  paid_so_far: string; // Decimal, computed from linked payments
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RenovationPayment {
  id: string;
  user_id: string;
  task_id: string | null;
  payee: string;
  amount: string; // Decimal
  payment_date: string;
  account_type: RenovationAccountType;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Typecheck (expected to still fail elsewhere)**

Run: `pnpm tsc --noEmit`
Expected: errors in `src/lib/services/renovations.ts`, `src/app/actions/renovations.ts`, and `src/app/[locale]/renovations/page.tsx` referencing removed fields (`RenovationFund`, `.method`, `.priority`, `.actual_cost`, `.include_in_budget`). This is expected — those files are rewritten in the next tasks. Confirm the errors are only in those 3 files and only about these renamed/removed identifiers (no unrelated new errors).

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/renovations.ts
git commit -m "refactor: update renovation types for accounts/loans model"
```

---

## Task 3: Rewrite the services layer

**Files:**
- Modify: `src/lib/services/renovations.ts` (full rewrite)

**Interfaces:**
- Consumes: `pool`, `query` from `src/lib/db.ts`; types from Task 2.
- Produces: `InsufficientFundsError`; `getRenovationLoans`, `createRenovationLoan`, `updateRenovationLoan`, `deleteRenovationLoan`, `getRenovationLoanRepayments`, `createRenovationLoanRepayment`, `deleteRenovationLoanRepayment`; `getRenovationAccounts`, `depositToAccount`, `withdrawToCash`, `adjustAccount`; `getRenovationGroups`, `createRenovationGroup`, `updateRenovationGroup`, `deleteRenovationGroup` (unchanged); `getRenovationTasks`, `createRenovationTask`, `updateRenovationTask`, `deleteRenovationTask`; `getRenovationPayments`, `createRenovationPayment`, `updateRenovationPayment`, `deleteRenovationPayment` — all consumed by Task 4 (actions).

- [ ] **Step 1: Write the full service file**

```typescript
import { query, pool } from "@/lib/db";

export class InsufficientFundsError extends Error {
  constructor(accountType: string) {
    super(`Insufficient funds in account: ${accountType}`);
    this.name = "InsufficientFundsError";
  }
}

// ---------- Loans ----------

export async function getRenovationLoans(userId: string) {
  const result = await query(
    `SELECT * FROM renovation_loans WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function createRenovationLoan(
  userId: string,
  data: { name: string; lender: string; amount: number; date_borrowed?: string | null }
) {
  const result = await query(
    `INSERT INTO renovation_loans (user_id, name, lender, amount, date_borrowed)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userId, data.name, data.lender, data.amount, data.date_borrowed || null]
  );
  return result.rows[0];
}

export async function updateRenovationLoan(
  id: string,
  userId: string,
  data: Partial<{
    name: string;
    lender: string;
    amount: number;
    date_borrowed: string | null;
  }>
) {
  const sets: string[] = [];
  const values: any[] = [id, userId];
  let paramIdx = 3;

  const fields = ["name", "lender", "amount", "date_borrowed"] as const;
  for (const field of fields) {
    if (data[field] !== undefined) {
      sets.push(`${field} = $${paramIdx++}`);
      values.push(field === "amount" ? data[field]?.toString() : data[field]);
    }
  }

  sets.push(`updated_at = NOW()`);
  if (sets.length === 1) return null;

  const q = `UPDATE renovation_loans SET ${sets.join(", ")} WHERE id = $1 AND user_id = $2 RETURNING *`;
  const result = await query(q, values);
  return result.rows[0];
}

export async function deleteRenovationLoan(id: string, userId: string) {
  await query(`DELETE FROM renovation_loans WHERE id = $1 AND user_id = $2`, [id, userId]);
}

export async function getRenovationLoanRepayments(userId: string) {
  const result = await query(
    `SELECT * FROM renovation_loan_repayments WHERE user_id = $1 ORDER BY repayment_date DESC`,
    [userId]
  );
  return result.rows;
}

export async function createRenovationLoanRepayment(
  userId: string,
  data: { loan_id: string; amount: number; repayment_date: string; notes?: string | null }
) {
  const result = await query(
    `INSERT INTO renovation_loan_repayments (loan_id, user_id, amount, repayment_date, notes)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.loan_id, userId, data.amount, data.repayment_date, data.notes || null]
  );
  return result.rows[0];
}

export async function deleteRenovationLoanRepayment(id: string, userId: string) {
  await query(`DELETE FROM renovation_loan_repayments WHERE id = $1 AND user_id = $2`, [id, userId]);
}

// ---------- Accounts ----------

const ACCOUNT_TYPES = ["shared", "personal", "cash"] as const;

export async function getRenovationAccounts(userId: string) {
  const result = await query(
    `SELECT * FROM renovation_accounts WHERE user_id = $1 ORDER BY account_type`,
    [userId]
  );
  if (result.rows.length === ACCOUNT_TYPES.length) return result.rows;

  for (const accountType of ACCOUNT_TYPES) {
    await query(
      `INSERT INTO renovation_accounts (user_id, account_type, balance)
       VALUES ($1, $2, 0) ON CONFLICT (user_id, account_type) DO NOTHING`,
      [userId, accountType]
    );
  }
  const seeded = await query(
    `SELECT * FROM renovation_accounts WHERE user_id = $1 ORDER BY account_type`,
    [userId]
  );
  return seeded.rows;
}

export async function depositToAccount(userId: string, accountType: string, amount: number) {
  const result = await query(
    `UPDATE renovation_accounts SET balance = balance + $3, updated_at = NOW()
     WHERE user_id = $1 AND account_type = $2 RETURNING *`,
    [userId, accountType, amount]
  );
  return result.rows[0];
}

export async function withdrawToCash(userId: string, sourceAccountType: string, amount: number) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const sourceRes = await client.query(
      `SELECT balance FROM renovation_accounts WHERE user_id = $1 AND account_type = $2 FOR UPDATE`,
      [userId, sourceAccountType]
    );
    const currentBalance = parseFloat(sourceRes.rows[0]?.balance ?? "0");
    if (currentBalance < amount) {
      throw new InsufficientFundsError(sourceAccountType);
    }
    await client.query(
      `UPDATE renovation_accounts SET balance = balance - $3, updated_at = NOW()
       WHERE user_id = $1 AND account_type = $2`,
      [userId, sourceAccountType, amount]
    );
    await client.query(
      `UPDATE renovation_accounts SET balance = balance + $2, updated_at = NOW()
       WHERE user_id = $1 AND account_type = 'cash'`,
      [userId, amount]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function adjustAccount(userId: string, accountType: string, amount: number) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const res = await client.query(
      `SELECT balance FROM renovation_accounts WHERE user_id = $1 AND account_type = $2 FOR UPDATE`,
      [userId, accountType]
    );
    const currentBalance = parseFloat(res.rows[0]?.balance ?? "0");
    if (currentBalance < amount) {
      throw new InsufficientFundsError(accountType);
    }
    const updated = await client.query(
      `UPDATE renovation_accounts SET balance = balance - $3, updated_at = NOW()
       WHERE user_id = $1 AND account_type = $2 RETURNING *`,
      [userId, accountType, amount]
    );
    await client.query("COMMIT");
    return updated.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ---------- Groups ----------

export async function getRenovationGroups(userId: string) {
  const result = await query(
    `SELECT * FROM renovation_groups WHERE user_id = $1 ORDER BY start_date ASC NULLS LAST, name ASC`,
    [userId]
  );
  return result.rows;
}

export async function createRenovationGroup(
  userId: string,
  data: {
    name: string;
    start_date?: string | null;
    end_date?: string | null;
    contractor?: string | null;
  }
) {
  const result = await query(
    `INSERT INTO renovation_groups (user_id, name, start_date, end_date, contractor)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userId, data.name, data.start_date || null, data.end_date || null, data.contractor || null]
  );
  return result.rows[0];
}

export async function updateRenovationGroup(
  id: string,
  userId: string,
  data: Partial<{
    name: string;
    start_date: string | null;
    end_date: string | null;
    contractor: string | null;
  }>
) {
  const sets: string[] = [];
  const values: any[] = [id, userId];
  let paramIdx = 3;

  const fields = ["name", "start_date", "end_date", "contractor"] as const;
  for (const field of fields) {
    if (data[field] !== undefined) {
      sets.push(`${field} = $${paramIdx++}`);
      values.push(data[field]);
    }
  }

  sets.push(`updated_at = NOW()`);
  if (sets.length === 1) return null;

  const q = `UPDATE renovation_groups SET ${sets.join(", ")} WHERE id = $1 AND user_id = $2 RETURNING *`;
  const result = await query(q, values);
  return result.rows[0];
}

export async function deleteRenovationGroup(id: string, userId: string) {
  await query(`DELETE FROM renovation_groups WHERE id = $1 AND user_id = $2`, [id, userId]);
}

// ---------- Tasks ----------

export async function getRenovationTasks(userId: string) {
  const result = await query(
    `SELECT t.*, COALESCE(p.paid_so_far, 0) AS paid_so_far
     FROM renovation_tasks t
     LEFT JOIN (
       SELECT task_id, SUM(amount) AS paid_so_far
       FROM renovation_payments
       WHERE task_id IS NOT NULL
       GROUP BY task_id
     ) p ON p.task_id = t.id
     WHERE t.user_id = $1
     ORDER BY t.start_date ASC NULLS LAST, t.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function createRenovationTask(
  userId: string,
  data: {
    name: string;
    category: string;
    status: string;
    group_id?: string | null;
    estimated_cost: number;
    start_date?: string | null;
    end_date?: string | null;
    notes?: string | null;
  }
) {
  let startDate = data.start_date || null;
  let endDate = data.end_date || null;

  if (data.group_id && (!startDate || !endDate)) {
    const groupRes = await query(
      `SELECT start_date, end_date FROM renovation_groups WHERE id = $1`,
      [data.group_id]
    );
    if (groupRes.rows.length > 0) {
      if (!startDate) startDate = groupRes.rows[0].start_date;
      if (!endDate) endDate = groupRes.rows[0].end_date;
    }
  }

  const result = await query(
    `INSERT INTO renovation_tasks (user_id, name, category, status, group_id, estimated_cost, start_date, end_date, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      userId,
      data.name,
      data.category,
      data.status,
      data.group_id || null,
      data.estimated_cost,
      startDate,
      endDate,
      data.notes || null,
    ]
  );
  return { ...result.rows[0], paid_so_far: "0" };
}

export async function updateRenovationTask(
  id: string,
  userId: string,
  data: Partial<{
    name: string;
    category: string;
    status: string;
    group_id: string | null;
    estimated_cost: number;
    start_date: string | null;
    end_date: string | null;
    notes: string | null;
  }>
) {
  const sets: string[] = [];
  const values: any[] = [id, userId];
  let paramIdx = 3;

  const fields = [
    "name",
    "category",
    "status",
    "group_id",
    "estimated_cost",
    "start_date",
    "end_date",
    "notes",
  ] as const;
  for (const field of fields) {
    if (data[field] !== undefined) {
      sets.push(`${field} = $${paramIdx++}`);
      values.push(field === "estimated_cost" ? data[field]?.toString() : data[field]);
    }
  }

  sets.push(`updated_at = NOW()`);
  if (sets.length === 1) return null;

  const q = `UPDATE renovation_tasks SET ${sets.join(", ")} WHERE id = $1 AND user_id = $2 RETURNING *`;
  const result = await query(q, values);
  return result.rows[0];
}

export async function deleteRenovationTask(id: string, userId: string) {
  await query(`DELETE FROM renovation_tasks WHERE id = $1 AND user_id = $2`, [id, userId]);
}

// ---------- Payments ----------

export async function getRenovationPayments(userId: string) {
  const result = await query(
    `SELECT * FROM renovation_payments WHERE user_id = $1 ORDER BY payment_date DESC`,
    [userId]
  );
  return result.rows;
}

export async function createRenovationPayment(
  userId: string,
  data: {
    task_id?: string | null;
    payee: string;
    amount: number;
    payment_date: string;
    account_type: string;
    notes?: string | null;
  }
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const res = await client.query(
      `INSERT INTO renovation_payments (user_id, task_id, payee, amount, payment_date, account_type, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        userId,
        data.task_id || null,
        data.payee,
        data.amount,
        data.payment_date,
        data.account_type,
        data.notes || null,
      ]
    );
    await client.query(
      `UPDATE renovation_accounts SET balance = balance - $3, updated_at = NOW()
       WHERE user_id = $1 AND account_type = $2`,
      [userId, data.account_type, data.amount]
    );
    await client.query("COMMIT");
    return res.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateRenovationPayment(
  id: string,
  userId: string,
  data: Partial<{
    task_id: string | null;
    payee: string;
    amount: number;
    payment_date: string;
    account_type: string;
    notes: string | null;
  }>
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existingRes = await client.query(
      `SELECT * FROM renovation_payments WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [id, userId]
    );
    const existing = existingRes.rows[0];
    if (!existing) {
      await client.query("ROLLBACK");
      return null;
    }

    const sets: string[] = [];
    const values: any[] = [id, userId];
    let paramIdx = 3;
    const fields = ["task_id", "payee", "amount", "payment_date", "account_type", "notes"] as const;
    for (const field of fields) {
      if (data[field] !== undefined) {
        sets.push(`${field} = $${paramIdx++}`);
        values.push(field === "amount" ? data[field]?.toString() : data[field]);
      }
    }
    sets.push(`updated_at = NOW()`);

    let updated = existing;
    if (sets.length > 1) {
      const q = `UPDATE renovation_payments SET ${sets.join(", ")} WHERE id = $1 AND user_id = $2 RETURNING *`;
      const result = await client.query(q, values);
      updated = result.rows[0];
    }

    const oldAmount = parseFloat(existing.amount);
    const oldAccountType = existing.account_type;
    const newAmount = data.amount !== undefined ? data.amount : oldAmount;
    const newAccountType = data.account_type !== undefined ? data.account_type : oldAccountType;

    if (oldAccountType !== newAccountType || oldAmount !== newAmount) {
      await client.query(
        `UPDATE renovation_accounts SET balance = balance + $3, updated_at = NOW()
         WHERE user_id = $1 AND account_type = $2`,
        [userId, oldAccountType, oldAmount]
      );
      await client.query(
        `UPDATE renovation_accounts SET balance = balance - $3, updated_at = NOW()
         WHERE user_id = $1 AND account_type = $2`,
        [userId, newAccountType, newAmount]
      );
    }

    await client.query("COMMIT");
    return updated;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteRenovationPayment(id: string, userId: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existingRes = await client.query(
      `SELECT * FROM renovation_payments WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [id, userId]
    );
    const existing = existingRes.rows[0];
    if (!existing) {
      await client.query("ROLLBACK");
      return;
    }
    await client.query(`DELETE FROM renovation_payments WHERE id = $1 AND user_id = $2`, [id, userId]);
    await client.query(
      `UPDATE renovation_accounts SET balance = balance + $3, updated_at = NOW()
       WHERE user_id = $1 AND account_type = $2`,
      [userId, existing.account_type, existing.amount]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
```

- [ ] **Step 2: Typecheck this file specifically**

Run: `pnpm tsc --noEmit`
Expected: no errors originating in `src/lib/services/renovations.ts`. Errors in `src/app/actions/renovations.ts` and `page.tsx` are still expected at this point.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors in `src/lib/services/renovations.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/renovations.ts
git commit -m "feat: rewrite renovations service layer for accounts/loans model"
```

---

## Task 4: Rewrite server actions

**Files:**
- Modify: `src/app/actions/renovations.ts` (full rewrite)

**Interfaces:**
- Consumes: everything produced by Task 3.
- Produces: `fetchLoansAction`, `createLoanAction`, `updateLoanAction`, `deleteLoanAction`, `fetchLoanRepaymentsAction`, `createLoanRepaymentAction`, `deleteLoanRepaymentAction`, `fetchAccountsAction`, `depositAction`, `withdrawAction`, `adjustAction` (latter two return `{ error: string | null }`), `fetchGroupsAction`, `createGroupAction`, `updateGroupAction`, `deleteGroupAction`, `fetchTasksAction`, `createTaskAction`, `updateTaskAction`, `deleteTaskAction`, `fetchPaymentsAction`, `createPaymentAction`, `updatePaymentAction`, `deletePaymentAction` — consumed by every UI component task (6–11) and the page container (Task 13).

- [ ] **Step 1: Write the full actions file**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import * as db from "@/lib/services/renovations";

async function requireUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
}

// Loans
export async function fetchLoansAction() {
  const userId = await requireUser();
  return db.getRenovationLoans(userId);
}

export async function createLoanAction(data: {
  name: string;
  lender: string;
  amount: number;
  date_borrowed?: string | null;
}) {
  const userId = await requireUser();
  await db.createRenovationLoan(userId, data);
  revalidatePath("/renovations");
}

export async function updateLoanAction(
  id: string,
  data: {
    name?: string;
    lender?: string;
    amount?: number;
    date_borrowed?: string | null;
  }
) {
  const userId = await requireUser();
  await db.updateRenovationLoan(id, userId, data);
  revalidatePath("/renovations");
}

export async function deleteLoanAction(id: string) {
  const userId = await requireUser();
  await db.deleteRenovationLoan(id, userId);
  revalidatePath("/renovations");
}

// Loan repayments
export async function fetchLoanRepaymentsAction() {
  const userId = await requireUser();
  return db.getRenovationLoanRepayments(userId);
}

export async function createLoanRepaymentAction(data: {
  loan_id: string;
  amount: number;
  repayment_date: string;
  notes?: string | null;
}) {
  const userId = await requireUser();
  await db.createRenovationLoanRepayment(userId, data);
  revalidatePath("/renovations");
}

export async function deleteLoanRepaymentAction(id: string) {
  const userId = await requireUser();
  await db.deleteRenovationLoanRepayment(id, userId);
  revalidatePath("/renovations");
}

// Accounts
export async function fetchAccountsAction() {
  const userId = await requireUser();
  return db.getRenovationAccounts(userId);
}

export async function depositAction(data: { account_type: string; amount: number }) {
  const userId = await requireUser();
  await db.depositToAccount(userId, data.account_type, data.amount);
  revalidatePath("/renovations");
  return { error: null };
}

export async function withdrawAction(data: { account_type: string; amount: number }) {
  const userId = await requireUser();
  try {
    await db.withdrawToCash(userId, data.account_type, data.amount);
    revalidatePath("/renovations");
    return { error: null };
  } catch (error) {
    if (error instanceof db.InsufficientFundsError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function adjustAction(data: { account_type: string; amount: number }) {
  const userId = await requireUser();
  try {
    await db.adjustAccount(userId, data.account_type, data.amount);
    revalidatePath("/renovations");
    return { error: null };
  } catch (error) {
    if (error instanceof db.InsufficientFundsError) {
      return { error: error.message };
    }
    throw error;
  }
}

// Groups
export async function fetchGroupsAction() {
  const userId = await requireUser();
  return db.getRenovationGroups(userId);
}

export async function createGroupAction(data: {
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  contractor?: string | null;
}) {
  const userId = await requireUser();
  await db.createRenovationGroup(userId, data);
  revalidatePath("/renovations");
}

export async function updateGroupAction(
  id: string,
  data: Partial<{
    name: string;
    start_date: string | null;
    end_date: string | null;
    contractor: string | null;
  }>
) {
  const userId = await requireUser();
  await db.updateRenovationGroup(id, userId, data);
  revalidatePath("/renovations");
}

export async function deleteGroupAction(id: string) {
  const userId = await requireUser();
  await db.deleteRenovationGroup(id, userId);
  revalidatePath("/renovations");
}

// Tasks
export async function fetchTasksAction() {
  const userId = await requireUser();
  return db.getRenovationTasks(userId);
}

export async function createTaskAction(data: {
  name: string;
  category: string;
  status: string;
  group_id?: string | null;
  estimated_cost: number;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string;
}) {
  const userId = await requireUser();
  await db.createRenovationTask(userId, data);
  revalidatePath("/renovations");
}

export async function updateTaskAction(
  id: string,
  data: {
    name?: string;
    category?: string;
    status?: string;
    group_id?: string | null;
    estimated_cost?: number;
    start_date?: string | null;
    end_date?: string | null;
    notes?: string | null;
  }
) {
  const userId = await requireUser();
  await db.updateRenovationTask(id, userId, data);
  revalidatePath("/renovations");
}

export async function deleteTaskAction(id: string) {
  const userId = await requireUser();
  await db.deleteRenovationTask(id, userId);
  revalidatePath("/renovations");
}

// Payments
export async function fetchPaymentsAction() {
  const userId = await requireUser();
  return db.getRenovationPayments(userId);
}

export async function createPaymentAction(data: {
  payee: string;
  amount: number;
  account_type: string;
  payment_date: string;
  task_id?: string | null;
  notes?: string | null;
}) {
  const userId = await requireUser();
  await db.createRenovationPayment(userId, data);
  revalidatePath("/renovations");
}

export async function updatePaymentAction(
  id: string,
  data: {
    payee?: string;
    amount?: number;
    account_type?: string;
    payment_date?: string;
    task_id?: string | null;
    notes?: string | null;
  }
) {
  const userId = await requireUser();
  await db.updateRenovationPayment(id, userId, data);
  revalidatePath("/renovations");
}

export async function deletePaymentAction(id: string) {
  const userId = await requireUser();
  await db.deleteRenovationPayment(id, userId);
  revalidatePath("/renovations");
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors in `src/app/actions/renovations.ts`. `page.tsx` still errors (rewritten in Task 13) — confirm remaining errors are confined to `src/app/[locale]/renovations/page.tsx`.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors in `src/app/actions/renovations.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/app/actions/renovations.ts
git commit -m "feat: rewrite renovations server actions for accounts/loans model"
```

---

## Task 5: Shared calculation helpers

**Files:**
- Create: `src/app/[locale]/renovations/lib/calculations.ts`

**Interfaces:**
- Consumes: `RenovationAccount`, `RenovationPayment`, `RenovationTask`, `RenovationGroup` from `@/lib/types/renovations`.
- Produces: `getAvailableFunds`, `getTaskRemaining`, `getEstimatedRemainingByCategory`, `getTotalSpent`, `PayeeGroup`, `getGroupBudgetByPayee`, `getPaidToGroups` — consumed by `SummaryTab` (Task 11).

- [ ] **Step 1: Write the calculations module**

```typescript
import {
  RenovationAccount,
  RenovationGroup,
  RenovationPayment,
  RenovationTask,
} from "@/lib/types/renovations";

export function getAvailableFunds(accounts: RenovationAccount[]): number {
  return accounts.reduce((sum, a) => sum + parseFloat(a.balance), 0);
}

export function getTaskRemaining(task: RenovationTask): number {
  return parseFloat(task.estimated_cost) - parseFloat(task.paid_so_far);
}

export function getEstimatedRemainingByCategory(tasks: RenovationTask[], category: string): number {
  return tasks
    .filter((t) => t.category === category && t.status !== "cancelled")
    .reduce((sum, t) => sum + getTaskRemaining(t), 0);
}

export function getTotalSpent(payments: RenovationPayment[]): number {
  return payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
}

export interface PayeeGroup {
  payee: string;
  paid: number;
  budget: number;
}

export function getGroupBudgetByPayee(
  tasks: RenovationTask[],
  payments: RenovationPayment[],
  category: string
): Map<string, number> {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const payeesByGroup = new Map<string, Set<string>>();
  for (const p of payments) {
    if (!p.task_id) continue;
    const task = taskMap.get(p.task_id);
    if (!task || task.category !== category || !task.group_id) continue;
    if (!payeesByGroup.has(task.group_id)) payeesByGroup.set(task.group_id, new Set());
    payeesByGroup.get(task.group_id)!.add(p.payee);
  }

  const budgetByPayee = new Map<string, number>();
  for (const [groupId, payees] of payeesByGroup) {
    const groupCost = tasks
      .filter((t) => t.group_id === groupId && t.category === category && t.status !== "cancelled")
      .reduce((sum, t) => sum + parseFloat(t.estimated_cost), 0);
    for (const payee of payees) {
      budgetByPayee.set(payee, (budgetByPayee.get(payee) || 0) + groupCost);
    }
  }
  return budgetByPayee;
}

export function getPaidToGroups(
  tasks: RenovationTask[],
  groups: RenovationGroup[],
  payments: RenovationPayment[]
): { materials: PayeeGroup[]; workers: PayeeGroup[]; other: PayeeGroup[] } {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  const sumByPayee = (list: RenovationPayment[]) => {
    const map = new Map<string, number>();
    for (const p of list) {
      map.set(p.payee, (map.get(p.payee) || 0) + parseFloat(p.amount));
    }
    return map;
  };

  const materialPayments = payments.filter((p) => {
    const task = p.task_id ? taskMap.get(p.task_id) : undefined;
    return task?.category === "material";
  });
  const laborPayments = payments.filter((p) => {
    const task = p.task_id ? taskMap.get(p.task_id) : undefined;
    return task?.category === "labor";
  });
  const otherPayments = payments.filter((p) => !p.task_id);

  const materialBudgets = getGroupBudgetByPayee(tasks, payments, "material");
  const laborBudgets = getGroupBudgetByPayee(tasks, payments, "labor");

  const toGroupList = (paidMap: Map<string, number>, budgetMap: Map<string, number>): PayeeGroup[] =>
    [...paidMap.entries()]
      .map(([payee, paid]) => ({ payee, paid, budget: budgetMap.get(payee) || 0 }))
      .sort((a, b) => b.paid - a.paid);

  return {
    materials: toGroupList(sumByPayee(materialPayments), materialBudgets),
    workers: toGroupList(sumByPayee(laborPayments), laborBudgets),
    other: toGroupList(sumByPayee(otherPayments), new Map()),
  };
}
```

Note: `groups` parameter in `getPaidToGroups` is currently unused directly (group membership is read via `task.group_id`), kept in the signature because it's the natural input a caller has on hand and keeps the function's purpose ("paid-to groups, in the context of these groups") self-documenting; TypeScript strict mode won't flag an unused parameter (only unused locals), so this compiles cleanly.

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors in the new `calculations.ts` file.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/renovations/lib/calculations.ts"
git commit -m "feat: add renovations summary calculation helpers"
```

---

## Task 6: BudgetTab component (accounts + deposit/withdraw/adjust)

**Files:**
- Create: `src/app/[locale]/renovations/components/BudgetTab.tsx`

**Interfaces:**
- Consumes: `depositAction`, `withdrawAction`, `adjustAction` (Task 4); `RenovationAccount`, `RenovationAccountType` (Task 2); i18n keys `deposit`, `withdraw`, `adjust`, `account`, `accounts.shared`, `accounts.personal`, `accounts.cash`, `amount`, `cancel`, `save` (added in Task 12).
- Produces: `BudgetTab({ accounts, onRefresh }: { accounts: RenovationAccount[]; onRefresh: () => Promise<void> })` — consumed by Task 13.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { adjustAction, depositAction, withdrawAction } from "@/app/actions/renovations";
import { RenovationAccount, RenovationAccountType } from "@/lib/types/renovations";
import { Button } from "@/systemUI/components/Button/Button";

import styles from "../page.module.css";

interface BudgetTabProps {
  accounts: RenovationAccount[];
  onRefresh: () => Promise<void>;
}

type ModalType = "deposit" | "withdraw" | "adjust" | null;

const ACCOUNT_LABEL_KEY: Record<RenovationAccountType, string> = {
  shared: "accounts.shared",
  personal: "accounts.personal",
  cash: "accounts.cash",
};

export function BudgetTab({ accounts, onRefresh }: BudgetTabProps) {
  const t = useTranslations("Renovations");
  const [modal, setModal] = useState<ModalType>(null);
  const [error, setError] = useState<string | null>(null);

  const getBalance = (accountType: RenovationAccountType) =>
    parseFloat(accounts.find((a) => a.account_type === accountType)?.balance || "0");

  const closeModal = () => {
    setModal(null);
    setError(null);
  };

  const handleDeposit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await depositAction({
      account_type: formData.get("account_type") as string,
      amount: parseFloat(formData.get("amount") as string),
    });
    closeModal();
    await onRefresh();
  };

  const handleWithdraw = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await withdrawAction({
      account_type: formData.get("account_type") as string,
      amount: parseFloat(formData.get("amount") as string),
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    closeModal();
    await onRefresh();
  };

  const handleAdjust = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await adjustAction({
      account_type: formData.get("account_type") as string,
      amount: parseFloat(formData.get("amount") as string),
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    closeModal();
    await onRefresh();
  };

  return (
    <div>
      <div className={styles.summary}>
        {(["shared", "personal", "cash"] as const).map((accountType) => (
          <div key={accountType} className={styles.summaryCard}>
            <h4>{t(ACCOUNT_LABEL_KEY[accountType])}</h4>
            <p>€{getBalance(accountType).toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <Button onClick={() => setModal("deposit")}>{t("deposit")}</Button>
        <Button onClick={() => setModal("withdraw")} variant="secondary">
          {t("withdraw")}
        </Button>
        <Button onClick={() => setModal("adjust")} variant="secondary">
          {t("adjust")}
        </Button>
      </div>

      {modal === "deposit" && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>{t("deposit")}</h3>
            <form onSubmit={handleDeposit}>
              <div className={styles.formGroup}>
                <label>{t("account")}</label>
                <select name="account_type" required defaultValue="shared">
                  <option value="shared">{t("accounts.shared")}</option>
                  <option value="personal">{t("accounts.personal")}</option>
                  <option value="cash">{t("accounts.cash")}</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>{t("amount")}</label>
                <input name="amount" type="number" step="0.01" min="0.01" required />
              </div>
              <div className={styles.modalActions}>
                <Button type="button" variant="secondary" onClick={closeModal}>
                  {t("cancel")}
                </Button>
                <Button type="submit">{t("save")}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === "withdraw" && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>{t("withdraw")}</h3>
            <form onSubmit={handleWithdraw}>
              <div className={styles.formGroup}>
                <label>{t("account")}</label>
                <select name="account_type" required defaultValue="shared">
                  <option value="shared">{t("accounts.shared")}</option>
                  <option value="personal">{t("accounts.personal")}</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>{t("amount")}</label>
                <input name="amount" type="number" step="0.01" min="0.01" required />
              </div>
              {error && <p style={{ color: "#ef4444" }}>{error}</p>}
              <div className={styles.modalActions}>
                <Button type="button" variant="secondary" onClick={closeModal}>
                  {t("cancel")}
                </Button>
                <Button type="submit">{t("save")}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === "adjust" && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>{t("adjust")}</h3>
            <form onSubmit={handleAdjust}>
              <div className={styles.formGroup}>
                <label>{t("account")}</label>
                <select name="account_type" required defaultValue="shared">
                  <option value="shared">{t("accounts.shared")}</option>
                  <option value="personal">{t("accounts.personal")}</option>
                  <option value="cash">{t("accounts.cash")}</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>{t("amount")}</label>
                <input name="amount" type="number" step="0.01" min="0.01" required />
              </div>
              {error && <p style={{ color: "#ef4444" }}>{error}</p>}
              <div className={styles.modalActions}>
                <Button type="button" variant="secondary" onClick={closeModal}>
                  {t("cancel")}
                </Button>
                <Button type="submit">{t("save")}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no new errors from this file (it will show missing-key errors from `next-intl` only if Task 12 hasn't landed yet — that's fine, cross-check after Task 12).

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/renovations/components/BudgetTab.tsx"
git commit -m "feat: add BudgetTab component with deposit/withdraw/adjust"
```

---

## Task 7: MoneyBorrowedTab component (loans + repayments)

**Files:**
- Create: `src/app/[locale]/renovations/components/MoneyBorrowedTab.tsx`

**Interfaces:**
- Consumes: `createLoanAction`, `updateLoanAction`, `deleteLoanAction`, `createLoanRepaymentAction`, `deleteLoanRepaymentAction` (Task 4); `RenovationLoan`, `RenovationLoanRepayment` (Task 2); i18n keys `addLoan`, `editLoan`, `name`, `lender`, `amount`, `dateBorrowed`, `repaid`, `outstanding`, `fullyRepaid`, `addRepayment`, `repaymentDate`, `notes`, `confirmDelete`, `cancel`, `save` (Task 12).
- Produces: `MoneyBorrowedTab({ loans, repayments, onRefresh })` — consumed by Task 13.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { Edit2, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  createLoanAction,
  createLoanRepaymentAction,
  deleteLoanAction,
  deleteLoanRepaymentAction,
  updateLoanAction,
} from "@/app/actions/renovations";
import { RenovationLoan, RenovationLoanRepayment } from "@/lib/types/renovations";
import { Button } from "@/systemUI/components/Button/Button";

import styles from "../page.module.css";

interface MoneyBorrowedTabProps {
  loans: RenovationLoan[];
  repayments: RenovationLoanRepayment[];
  onRefresh: () => Promise<void>;
}

export function MoneyBorrowedTab({ loans, repayments, onRefresh }: MoneyBorrowedTabProps) {
  const t = useTranslations("Renovations");
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState<RenovationLoan | null>(null);
  const [repaymentLoanId, setRepaymentLoanId] = useState<string | null>(null);

  const repaidByLoan = repayments.reduce(
    (acc, r) => {
      acc[r.loan_id] = (acc[r.loan_id] || 0) + parseFloat(r.amount);
      return acc;
    },
    {} as Record<string, number>
  );

  const openLoanModal = (loan?: RenovationLoan) => {
    setEditingLoan(loan || null);
    setShowLoanModal(true);
  };

  const handleSaveLoan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      lender: formData.get("lender") as string,
      amount: parseFloat(formData.get("amount") as string),
      date_borrowed: (formData.get("date_borrowed") as string) || null,
    };
    if (editingLoan) {
      await updateLoanAction(editingLoan.id, data);
    } else {
      await createLoanAction(data);
    }
    setShowLoanModal(false);
    setEditingLoan(null);
    await onRefresh();
  };

  const handleDeleteLoan = async (id: string) => {
    if (window.confirm(t("confirmDelete"))) {
      await deleteLoanAction(id);
      await onRefresh();
    }
  };

  const handleAddRepayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!repaymentLoanId) return;
    const formData = new FormData(e.currentTarget);
    await createLoanRepaymentAction({
      loan_id: repaymentLoanId,
      amount: parseFloat(formData.get("amount") as string),
      repayment_date: formData.get("repayment_date") as string,
      notes: (formData.get("notes") as string) || null,
    });
    setRepaymentLoanId(null);
    await onRefresh();
  };

  const handleDeleteRepayment = async (id: string) => {
    if (window.confirm(t("confirmDelete"))) {
      await deleteLoanRepaymentAction(id);
      await onRefresh();
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <Button onClick={() => openLoanModal()}>
          <Plus size={20} /> {t("addLoan")}
        </Button>
      </div>
      <div className={styles.grid}>
        {loans.map((loan) => {
          const repaid = repaidByLoan[loan.id] || 0;
          const outstanding = parseFloat(loan.amount) - repaid;
          const loanRepayments = repayments.filter((r) => r.loan_id === loan.id);
          return (
            <div key={loan.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.cardTitle}>{loan.name}</h3>
                  <span className={styles.cardSubtitle}>
                    {loan.lender}
                    {loan.date_borrowed && ` • ${new Date(loan.date_borrowed).toLocaleDateString()}`}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => openLoanModal(loan)}
                    style={{ color: "#0070f3" }}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button className={styles.deleteBtn} onClick={() => handleDeleteLoan(loan.id)}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className={styles.cardAmount}>€{parseFloat(loan.amount).toFixed(2)}</div>
              <div style={{ fontSize: "0.9rem" }}>
                {t("repaid")}: €{repaid.toFixed(2)}
              </div>
              {outstanding <= 0 ? (
                <span className={styles.badge} style={{ background: "#dcfce3", color: "#15803d" }}>
                  {t("fullyRepaid")}
                </span>
              ) : (
                <div style={{ fontWeight: 700, color: "#ef4444" }}>
                  {t("outstanding")}: €{outstanding.toFixed(2)}
                </div>
              )}
              {loanRepayments.length > 0 && (
                <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem", fontSize: "0.85rem" }}>
                  {loanRepayments.map((r) => (
                    <li key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                      <span>{new Date(r.repayment_date).toLocaleDateString()}</span>
                      <span>€{parseFloat(r.amount).toFixed(2)}</span>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDeleteRepayment(r.id)}
                        style={{ padding: 0 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <Button variant="secondary" size="sm" onClick={() => setRepaymentLoanId(loan.id)}>
                {t("addRepayment")}
              </Button>
            </div>
          );
        })}
      </div>

      {showLoanModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>{editingLoan ? t("editLoan") : t("addLoan")}</h3>
            <form onSubmit={handleSaveLoan}>
              <div className={styles.formGroup}>
                <label>{t("name")}</label>
                <input name="name" required defaultValue={editingLoan?.name} />
              </div>
              <div className={styles.formGroup}>
                <label>{t("lender")}</label>
                <input name="lender" required defaultValue={editingLoan?.lender} />
              </div>
              <div className={styles.formGroup}>
                <label>{t("amount")}</label>
                <input name="amount" type="number" step="0.01" required defaultValue={editingLoan?.amount} />
              </div>
              <div className={styles.formGroup}>
                <label>{t("dateBorrowed")}</label>
                <input
                  name="date_borrowed"
                  type="date"
                  defaultValue={
                    editingLoan?.date_borrowed
                      ? new Date(editingLoan.date_borrowed).toISOString().split("T")[0]
                      : ""
                  }
                />
              </div>
              <div className={styles.modalActions}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowLoanModal(false);
                    setEditingLoan(null);
                  }}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit">{t("save")}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {repaymentLoanId && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>{t("addRepayment")}</h3>
            <form onSubmit={handleAddRepayment}>
              <div className={styles.formGroup}>
                <label>{t("amount")}</label>
                <input name="amount" type="number" step="0.01" required />
              </div>
              <div className={styles.formGroup}>
                <label>{t("repaymentDate")}</label>
                <input
                  name="repayment_date"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t("notes")}</label>
                <input name="notes" />
              </div>
              <div className={styles.modalActions}>
                <Button type="button" variant="secondary" onClick={() => setRepaymentLoanId(null)}>
                  {t("cancel")}
                </Button>
                <Button type="submit">{t("save")}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no new type errors from this file.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/renovations/components/MoneyBorrowedTab.tsx"
git commit -m "feat: add MoneyBorrowedTab component with repayment tracking"
```

---

## Task 8: PaymentsTab component

**Files:**
- Create: `src/app/[locale]/renovations/components/PaymentsTab.tsx`

**Interfaces:**
- Consumes: `createPaymentAction`, `updatePaymentAction`, `deletePaymentAction` (Task 4); `RenovationPayment`, `RenovationTask` (Task 2); i18n keys `account`, `accounts.shared/personal/cash`, `payee`, `amount`, `paymentDate`, `tasksOptional`, `noTaskAssigned`, `editPayment`, `addPayment`, `groupByTask`, `unassigned`, `subtotal`, `confirmDelete`, `cancel`, `save` (Task 12).
- Produces: `PaymentsTab({ payments, tasks, onRefresh })` — consumed by Task 13.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { Edit2, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { createPaymentAction, deletePaymentAction, updatePaymentAction } from "@/app/actions/renovations";
import { RenovationPayment, RenovationTask } from "@/lib/types/renovations";
import { Button } from "@/systemUI/components/Button/Button";

import styles from "../page.module.css";

interface PaymentsTabProps {
  payments: RenovationPayment[];
  tasks: RenovationTask[];
  onRefresh: () => Promise<void>;
}

export function PaymentsTab({ payments, tasks, onRefresh }: PaymentsTabProps) {
  const t = useTranslations("Renovations");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<RenovationPayment | null>(null);
  const [groupByTask, setGroupByTask] = useState(false);

  const taskMap = new Map(tasks.map((tk) => [tk.id, tk]));

  const openPaymentModal = (payment?: RenovationPayment) => {
    setEditingPayment(payment || null);
    setShowPaymentModal(true);
  };

  const handleSavePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      payee: formData.get("payee") as string,
      amount: parseFloat(formData.get("amount") as string),
      account_type: formData.get("account_type") as string,
      payment_date: formData.get("payment_date") as string,
      task_id: (formData.get("task_id") as string) || null,
    };
    if (editingPayment) {
      await updatePaymentAction(editingPayment.id, data);
    } else {
      await createPaymentAction(data);
    }
    setShowPaymentModal(false);
    setEditingPayment(null);
    await onRefresh();
  };

  const handleDeletePayment = async (id: string) => {
    if (window.confirm(t("confirmDelete"))) {
      await deletePaymentAction(id);
      await onRefresh();
    }
  };

  const renderPaymentCard = (p: RenovationPayment) => {
    const linkedTask = p.task_id ? taskMap.get(p.task_id) : undefined;
    return (
      <div key={p.id} className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h3 className={styles.cardTitle}>{p.payee}</h3>
            <span className={styles.cardSubtitle}>{new Date(p.payment_date).toLocaleDateString()}</span>
            {linkedTask && (
              <span
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  marginTop: "0.15rem",
                }}
              >
                {linkedTask.name}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.25rem" }}>
            <button className={styles.deleteBtn} onClick={() => openPaymentModal(p)} style={{ color: "#0070f3" }}>
              <Edit2 size={18} />
            </button>
            <button className={styles.deleteBtn} onClick={() => handleDeletePayment(p.id)}>
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        <p style={{ margin: "0", fontSize: "0.9rem" }}>
          {t("account")}: {t(`accounts.${p.account_type}`)}
        </p>
        <div className={styles.cardAmount}>€{parseFloat(p.amount).toFixed(2)}</div>
      </div>
    );
  };

  const groupedPayments = (() => {
    const map = new Map<string, { label: string; items: RenovationPayment[] }>();
    for (const p of payments) {
      const task = p.task_id ? taskMap.get(p.task_id) : undefined;
      const key = task ? task.id : "__unassigned__";
      const label = task ? task.name : t("unassigned");
      if (!map.has(key)) map.set(key, { label, items: [] });
      map.get(key)!.items.push(p);
    }
    return [...map.entries()]
      .sort(([aKey, aVal], [bKey, bVal]) => {
        if (aKey === "__unassigned__") return 1;
        if (bKey === "__unassigned__") return -1;
        return aVal.label.localeCompare(bVal.label);
      })
      .map(([key, val]) => ({ key, ...val }));
  })();

  return (
    <div>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1rem" }}>
        <button
          className={`${styles.filterToggle} ${groupByTask ? styles.active : ""}`}
          onClick={() => setGroupByTask((v) => !v)}
        >
          {t("groupByTask")}
        </button>
        <Button onClick={() => openPaymentModal()}>
          <Plus size={20} /> {t("addPayment")}
        </Button>
      </div>

      {groupByTask ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {groupedPayments.map((group) => {
            const { key: groupKey, label, items } = group;
            const subtotal = items.reduce((acc, p) => acc + parseFloat(p.amount), 0);
            return (
              <div key={groupKey} className={styles.groupSection}>
                <div className={styles.groupSectionHeader}>
                  <span>{label}</span>
                  <span style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 400 }}>
                      {items.length}×
                    </span>
                    <span>
                      {t("subtotal")}: €{subtotal.toFixed(2)}
                    </span>
                  </span>
                </div>
                <div className={styles.grid}>{items.map((p) => renderPaymentCard(p))}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.grid}>{payments.map((p) => renderPaymentCard(p))}</div>
      )}

      {showPaymentModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>{editingPayment ? t("editPayment") : t("addPayment")}</h3>
            <form onSubmit={handleSavePayment}>
              <div className={styles.formGroup}>
                <label>{t("payee")}</label>
                <input name="payee" required defaultValue={editingPayment?.payee} />
              </div>
              <div className={styles.formGroup}>
                <label>{t("amount")}</label>
                <input name="amount" type="number" step="0.01" required defaultValue={editingPayment?.amount} />
              </div>
              <div className={styles.formGroup}>
                <label>{t("account")}</label>
                <select name="account_type" required defaultValue={editingPayment?.account_type}>
                  <option value="shared">{t("accounts.shared")}</option>
                  <option value="personal">{t("accounts.personal")}</option>
                  <option value="cash">{t("accounts.cash")}</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>{t("paymentDate")}</label>
                <input
                  name="payment_date"
                  type="date"
                  required
                  defaultValue={
                    editingPayment?.payment_date
                      ? new Date(editingPayment.payment_date).toISOString().split("T")[0]
                      : new Date().toISOString().split("T")[0]
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t("tasksOptional")}</label>
                <select name="task_id" defaultValue={editingPayment?.task_id || ""}>
                  <option value="">{t("noTaskAssigned")}</option>
                  {tasks.map((tk) => (
                    <option key={tk.id} value={tk.id}>
                      {tk.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.modalActions}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setEditingPayment(null);
                  }}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit">{t("save")}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no new type errors from this file.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/renovations/components/PaymentsTab.tsx"
git commit -m "feat: add PaymentsTab component with account-based source"
```

---

## Task 9: TasksTab component

**Files:**
- Create: `src/app/[locale]/renovations/components/TasksTab.tsx`

**Interfaces:**
- Consumes: `createTaskAction`, `updateTaskAction`, `deleteTaskAction` (Task 4); `RenovationTask`, `RenovationGroup` (Task 2); i18n keys `addTask`, `editTask`, `name`, `category`, `categories.labor/material/allCategories`, `status`, `statuses.*`, `group`, `noGroup`, `estimatedCost`, `alreadyPaid`, `pending`, `startDate`, `endDate`, `confirmDelete`, `cancel`, `save` (Task 12).
- Produces: `TasksTab({ tasks, groups, onRefresh })` — consumed by Task 13.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { Edit2, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { createTaskAction, deleteTaskAction, updateTaskAction } from "@/app/actions/renovations";
import { RenovationGroup, RenovationTask } from "@/lib/types/renovations";
import { Button } from "@/systemUI/components/Button/Button";

import styles from "../page.module.css";

interface TasksTabProps {
  tasks: RenovationTask[];
  groups: RenovationGroup[];
  onRefresh: () => Promise<void>;
}

export function TasksTab({ tasks, groups, onRefresh }: TasksTabProps) {
  const t = useTranslations("Renovations");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<RenovationTask | null>(null);
  const [taskStartDate, setTaskStartDate] = useState("");
  const [taskEndDate, setTaskEndDate] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const openTaskModal = (task?: RenovationTask) => {
    setEditingTask(task || null);
    setTaskStartDate(task?.start_date ? new Date(task.start_date).toISOString().split("T")[0] : "");
    setTaskEndDate(task?.end_date ? new Date(task.end_date).toISOString().split("T")[0] : "");
    setSelectedGroupId(task?.group_id || "");
    setShowTaskModal(true);
  };

  const handleSaveTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      category: formData.get("category") as string,
      status: formData.get("status") as string,
      group_id: (formData.get("group_id") as string) || null,
      estimated_cost: parseFloat(formData.get("estimated_cost") as string) || 0,
      start_date: (formData.get("start_date") as string) || null,
      end_date: (formData.get("end_date") as string) || null,
    };
    if (editingTask) {
      await updateTaskAction(editingTask.id, data);
    } else {
      await createTaskAction(data);
    }
    setShowTaskModal(false);
    setEditingTask(null);
    await onRefresh();
  };

  const handleDeleteTask = async (id: string) => {
    if (window.confirm(t("confirmDelete"))) {
      await deleteTaskAction(id);
      await onRefresh();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div>
          <Button onClick={() => openTaskModal()}>
            <Plus size={20} /> {t("addTask")}
          </Button>
        </div>
        <div className={styles.filterToggles}>
          <button
            className={`${styles.filterToggle} ${filterCategory === "" ? styles.active : ""}`}
            onClick={() => setFilterCategory("")}
          >
            {t("categories.allCategories")}
          </button>
          <button
            className={`${styles.filterToggle} ${filterCategory === "labor" ? styles.active : ""}`}
            onClick={() => setFilterCategory("labor")}
          >
            {t("categories.labor")}
          </button>
          <button
            className={`${styles.filterToggle} ${filterCategory === "material" ? styles.active : ""}`}
            onClick={() => setFilterCategory("material")}
          >
            {t("categories.material")}
          </button>
        </div>
        <div className={styles.filterToggles}>
          <button
            className={`${styles.filterToggle} ${filterStatus === "" ? styles.active : ""}`}
            onClick={() => setFilterStatus("")}
          >
            {t("statuses.allStatuses")}
          </button>
          <button
            className={`${styles.filterToggle} ${filterStatus === "pending" ? styles.active : ""}`}
            onClick={() => setFilterStatus("pending")}
          >
            {t("statuses.pending")}
          </button>
          <button
            className={`${styles.filterToggle} ${filterStatus === "in_progress" ? styles.active : ""}`}
            onClick={() => setFilterStatus("in_progress")}
          >
            {t("statuses.in_progress")}
          </button>
          <button
            className={`${styles.filterToggle} ${filterStatus === "completed" ? styles.active : ""}`}
            onClick={() => setFilterStatus("completed")}
          >
            {t("statuses.completed")}
          </button>
        </div>
      </div>

      {[...groups, { id: "none", name: t("noGroup") }].map((group) => {
        const groupTasks = tasks.filter((tk) => {
          const matchesGroup = group.id === "none" ? !tk.group_id : tk.group_id === group.id;
          const matchesCategory = !filterCategory || tk.category === filterCategory;
          const matchesStatus = !filterStatus || tk.status === filterStatus;
          return matchesGroup && matchesCategory && matchesStatus;
        });

        if (groupTasks.length === 0) return null;

        return (
          <div key={group.id}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-main)" }}>{group.name}</h2>
              <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-color)", opacity: 0.5 }} />
            </div>
            <div className={styles.grid}>
              {groupTasks.map((tk) => {
                const estimated = parseFloat(tk.estimated_cost) || 0;
                const paid = parseFloat(tk.paid_so_far) || 0;
                const pendingAmount = estimated - paid;
                return (
                  <div key={tk.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div>
                        <h3 className={styles.cardTitle}>{tk.name}</h3>
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                          <span className={`${styles.badge} ${styles[tk.category] ?? ""}`}>
                            {t(`categories.${tk.category}`)}
                          </span>
                          <span className={`${styles.badge} ${styles[tk.status]}`}>
                            {t(`statuses.${tk.status}`)}
                          </span>
                        </div>
                        {(tk.start_date || tk.end_date) && (
                          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                            {tk.start_date ? new Date(tk.start_date).toLocaleDateString() : "..."}
                            {tk.end_date && ` - ${new Date(tk.end_date).toLocaleDateString()}`}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => openTaskModal(tk)}
                          style={{ color: "#0070f3" }}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button className={styles.deleteBtn} onClick={() => handleDeleteTask(tk.id)}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: "auto",
                        paddingTop: "1rem",
                        gap: "0.5rem",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{t("estimatedCost")}</div>
                        <div style={{ fontWeight: 600 }}>€{estimated.toFixed(2)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{t("alreadyPaid")}</div>
                        <div style={{ fontWeight: 600 }}>€{paid.toFixed(2)}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{t("pending")}</div>
                        <div style={{ fontWeight: 600 }}>€{pendingAmount.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {showTaskModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>{editingTask ? t("editTask") : t("addTask")}</h3>
            <form onSubmit={handleSaveTask}>
              <div className={styles.formGroup}>
                <label>{t("name")}</label>
                <input name="name" required defaultValue={editingTask?.name} />
              </div>
              <div className={styles.formGroup}>
                <label>{t("category")}</label>
                <select name="category" required defaultValue={editingTask?.category}>
                  <option value="labor">{t("categories.labor")}</option>
                  <option value="material">{t("categories.material")}</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>{t("status")}</label>
                <select name="status" required defaultValue={editingTask?.status}>
                  <option value="pending">{t("statuses.pending")}</option>
                  <option value="in_progress">{t("statuses.in_progress")}</option>
                  <option value="completed">{t("statuses.completed")}</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>{t("group")}</label>
                <select
                  name="group_id"
                  value={selectedGroupId}
                  onChange={(e) => {
                    const groupId = e.target.value;
                    setSelectedGroupId(groupId);
                    if (groupId) {
                      const group = groups.find((g) => g.id === groupId);
                      if (group) {
                        if (group.start_date) {
                          setTaskStartDate(new Date(group.start_date).toISOString().split("T")[0]);
                        }
                        if (group.end_date) {
                          setTaskEndDate(new Date(group.end_date).toISOString().split("T")[0]);
                        }
                      }
                    }
                  }}
                >
                  <option value="">{t("noGroup")}</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>{t("estimatedCost")}</label>
                <input
                  name="estimated_cost"
                  type="number"
                  step="0.01"
                  required
                  defaultValue={editingTask?.estimated_cost || 0}
                />
              </div>
              <div style={{ display: "flex", gap: "1rem" }}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label>{t("startDate")}</label>
                  <input
                    type="date"
                    name="start_date"
                    value={taskStartDate}
                    onChange={(e) => setTaskStartDate(e.target.value)}
                    onFocus={(e) => {
                      if (!taskStartDate) {
                        const group = groups.find((g) => g.id === selectedGroupId);
                        if (group?.start_date) {
                          setTaskStartDate(new Date(group.start_date).toISOString().split("T")[0]);
                        }
                      }
                    }}
                  />
                </div>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label>{t("endDate")}</label>
                  <input
                    type="date"
                    name="end_date"
                    value={taskEndDate}
                    min={taskStartDate}
                    onChange={(e) => setTaskEndDate(e.target.value)}
                    onFocus={(e) => {
                      if (!taskEndDate && taskStartDate) {
                        setTaskEndDate(taskStartDate);
                      } else if (!taskEndDate && !taskStartDate && selectedGroupId) {
                        const group = groups.find((g) => g.id === selectedGroupId);
                        if (group?.end_date) {
                          setTaskEndDate(new Date(group.end_date).toISOString().split("T")[0]);
                        }
                      }
                    }}
                  />
                </div>
              </div>
              <div className={styles.modalActions}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowTaskModal(false);
                    setEditingTask(null);
                  }}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit">{t("save")}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no new type errors from this file.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/renovations/components/TasksTab.tsx"
git commit -m "feat: add TasksTab component with paid/pending breakdown"
```

---

## Task 10: GroupsTab component

**Files:**
- Create: `src/app/[locale]/renovations/components/GroupsTab.tsx`

**Interfaces:**
- Consumes: `createGroupAction`, `updateGroupAction`, `deleteGroupAction` (Task 4); `RenovationGroup` (Task 2); i18n keys `addGroup`, `editGroup`, `name`, `startDate`, `endDate`, `contractor`, `toDefine`, `confirmDelete`, `cancel`, `save` (Task 12).
- Produces: `GroupsTab({ groups, onRefresh })` — consumed by Task 13.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { Edit2, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { createGroupAction, deleteGroupAction, updateGroupAction } from "@/app/actions/renovations";
import { RenovationGroup } from "@/lib/types/renovations";
import { Button } from "@/systemUI/components/Button/Button";

import styles from "../page.module.css";

interface GroupsTabProps {
  groups: RenovationGroup[];
  onRefresh: () => Promise<void>;
}

export function GroupsTab({ groups, onRefresh }: GroupsTabProps) {
  const t = useTranslations("Renovations");
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<RenovationGroup | null>(null);
  const [groupStartDate, setGroupStartDate] = useState("");
  const [groupEndDate, setGroupEndDate] = useState("");
  const [groupContractor, setGroupContractor] = useState("");

  const openGroupModal = (group?: RenovationGroup) => {
    setEditingGroup(group || null);
    setGroupStartDate(group?.start_date || "");
    setGroupEndDate(group?.end_date || "");
    setGroupContractor(group?.contractor || "");
    setShowGroupModal(true);
  };

  const handleSaveGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      start_date: (formData.get("start_date") as string) || null,
      end_date: (formData.get("end_date") as string) || null,
      contractor: (formData.get("contractor") as string) || null,
    };
    if (editingGroup) {
      await updateGroupAction(editingGroup.id, data);
    } else {
      await createGroupAction(data);
    }
    setShowGroupModal(false);
    setEditingGroup(null);
    await onRefresh();
  };

  const handleDeleteGroup = async (id: string) => {
    if (window.confirm(t("confirmDelete"))) {
      await deleteGroupAction(id);
      await onRefresh();
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <Button onClick={() => openGroupModal()}>
          <Plus size={20} /> {t("addGroup")}
        </Button>
      </div>
      <div className={styles.grid}>
        {groups.map((g) => (
          <div key={g.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>{g.name}</h3>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                  {g.contractor && (
                    <span className={styles.badge} style={{ background: "#fef3c7", color: "#b45309" }}>
                      {g.contractor}
                    </span>
                  )}
                  {(g.start_date || g.end_date) && (
                    <span className={styles.cardSubtitle}>
                      {g.start_date ? new Date(g.start_date).toLocaleDateString() : "..."}
                      {g.end_date && ` - ${new Date(g.end_date).toLocaleDateString()}`}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.25rem" }}>
                <button className={styles.deleteBtn} onClick={() => openGroupModal(g)} style={{ color: "#0070f3" }}>
                  <Edit2 size={18} />
                </button>
                <button className={styles.deleteBtn} onClick={() => handleDeleteGroup(g.id)}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showGroupModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>{editingGroup ? t("editGroup") : t("addGroup")}</h3>
            <form onSubmit={handleSaveGroup}>
              <div className={styles.formGroup}>
                <label>{t("name")}</label>
                <input name="name" required defaultValue={editingGroup?.name || ""} />
              </div>
              <div className={styles.formGroup}>
                <label>{t("startDate")}</label>
                <input
                  type="date"
                  name="start_date"
                  value={groupStartDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGroupStartDate(val);
                    if (val && groupEndDate && groupEndDate < val) {
                      setGroupEndDate("");
                    }
                  }}
                  onFocus={(e) => {
                    if (!groupStartDate && e.target.min) {
                      setGroupStartDate(e.target.min);
                    }
                  }}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t("endDate")}</label>
                <input
                  type="date"
                  name="end_date"
                  value={groupEndDate}
                  min={groupStartDate}
                  onChange={(e) => setGroupEndDate(e.target.value)}
                  onFocus={(e) => {
                    if (!groupEndDate && groupStartDate) {
                      setGroupEndDate(groupStartDate);
                    }
                  }}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t("contractor")}</label>
                <select
                  name="contractor"
                  value={groupContractor}
                  onChange={(e) => setGroupContractor(e.target.value)}
                >
                  <option value="">{t("toDefine")}</option>
                  <option value="Samuel">Samuel</option>
                  <option value="Carlos">Carlos</option>
                </select>
              </div>
              <div className={styles.modalActions}>
                <Button type="button" variant="secondary" onClick={() => setShowGroupModal(false)}>
                  {t("cancel")}
                </Button>
                <Button type="submit">{t("save")}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no new type errors from this file.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/renovations/components/GroupsTab.tsx"
git commit -m "feat: extract GroupsTab component, fix hardcoded edit-title strings"
```

---

## Task 11: SummaryTab component

**Files:**
- Create: `src/app/[locale]/renovations/components/SummaryTab.tsx`

**Interfaces:**
- Consumes: `getAvailableFunds`, `getEstimatedRemainingByCategory`, `getTotalSpent`, `getPaidToGroups`, `PayeeGroup` (Task 5); `RenovationAccount`, `RenovationTask`, `RenovationGroup`, `RenovationPayment` (Task 2); i18n keys `summary.availableFunds`, `summary.estimatedMaterials`, `summary.estimatedWorkers`, `summary.totalSpent`, `summary.remainingFunds`, `summary.paidTo`, `summary.materials`, `summary.workers`, `summary.other` (Task 12).
- Produces: `SummaryTab({ accounts, tasks, groups, payments })` — consumed by Task 13.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useTranslations } from "next-intl";

import {
  RenovationAccount,
  RenovationGroup,
  RenovationPayment,
  RenovationTask,
} from "@/lib/types/renovations";

import { getAvailableFunds, getEstimatedRemainingByCategory, getPaidToGroups, getTotalSpent } from "../lib/calculations";
import styles from "../page.module.css";

interface SummaryTabProps {
  accounts: RenovationAccount[];
  tasks: RenovationTask[];
  groups: RenovationGroup[];
  payments: RenovationPayment[];
}

export function SummaryTab({ accounts, tasks, groups, payments }: SummaryTabProps) {
  const t = useTranslations("Renovations");

  const availableFunds = getAvailableFunds(accounts);
  const estimatedMaterials = getEstimatedRemainingByCategory(tasks, "material");
  const estimatedWorkers = getEstimatedRemainingByCategory(tasks, "labor");
  const totalSpent = getTotalSpent(payments);
  const remainingFunds = availableFunds - estimatedMaterials - estimatedWorkers;
  const paidTo = getPaidToGroups(tasks, groups, payments);

  const renderPayeeGroup = (
    title: string,
    color: string,
    list: { payee: string; paid: number; budget: number }[]
  ) => {
    if (list.length === 0) return null;
    return (
      <div style={{ marginBottom: "1.5rem" }}>
        <h4 style={{ fontSize: "0.95rem", fontWeight: 600, color, marginBottom: "0.5rem" }}>{title}</h4>
        <div className={styles.grid}>
          {list.map(({ payee, paid, budget }) => (
            <div key={payee} className={styles.card} style={{ borderLeft: `4px solid ${color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>{payee}</span>
                <span style={{ fontWeight: 700, color, fontSize: "1.2rem" }}>
                  €{paid.toFixed(2)}
                  {budget > 0 && (
                    <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)" }}>
                      {" "}/ €{budget.toFixed(2)}
                    </span>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <h4>{t("summary.availableFunds")}</h4>
          <p>€{availableFunds.toFixed(2)}</p>
        </div>
        <div className={styles.summaryCard} style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
          <h4>{t("summary.estimatedMaterials")}</h4>
          <p>€{estimatedMaterials.toFixed(2)}</p>
        </div>
        <div className={styles.summaryCard} style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)" }}>
          <h4>{t("summary.estimatedWorkers")}</h4>
          <p>€{estimatedWorkers.toFixed(2)}</p>
        </div>
        <div className={styles.summaryCard}>
          <h4>{t("summary.totalSpent")}</h4>
          <p>€{totalSpent.toFixed(2)}</p>
        </div>
        <div
          className={styles.summaryCard}
          style={{
            background:
              remainingFunds >= 0
                ? "linear-gradient(135deg, #10b981, #059669)"
                : "linear-gradient(135deg, #ef4444, #dc2626)",
          }}
        >
          <h4>{t("summary.remainingFunds")}</h4>
          <p>€{remainingFunds.toFixed(2)}</p>
        </div>
      </div>

      {(paidTo.materials.length > 0 || paidTo.workers.length > 0 || paidTo.other.length > 0) && (
        <div style={{ marginTop: "2rem" }}>
          <h3 style={{ marginBottom: "0.75rem" }}>{t("summary.paidTo")}</h3>
          {renderPayeeGroup(t("summary.materials"), "#f59e0b", paidTo.materials)}
          {renderPayeeGroup(t("summary.workers"), "#8b5cf6", paidTo.workers)}
          {renderPayeeGroup(t("summary.other"), "#6b7280", paidTo.other)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no new type errors from this file.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/renovations/components/SummaryTab.tsx"
git commit -m "feat: add SummaryTab component with absolute-value calculations"
```

---

## Task 12: i18n updates

**Files:**
- Modify: `messages/en.json` (the `Renovations` key)
- Modify: `messages/es.json` (the `Renovations` key)

**Interfaces:**
- Produces: all i18n keys consumed by Tasks 6–11 and Task 13.

- [ ] **Step 1: Replace the `Renovations` block in `messages/en.json`**

Find the top-level `"Renovations": { ... }` block and replace its entire contents with:

```json
"Renovations": {
  "tabs": {
    "summary": "Summary",
    "budgets": "Budget",
    "loans": "Money Borrowed",
    "groups": "Groups",
    "tasks": "Tasks",
    "payments": "Payments"
  },
  "title": "House Renovations",
  "addTask": "Add Task",
  "editTask": "Edit Task",
  "addGroup": "Add Group",
  "editGroup": "Edit Group",
  "addPayment": "Add Payment",
  "editPayment": "Edit Payment",
  "addLoan": "Add Loan",
  "editLoan": "Edit Loan",
  "addRepayment": "Add Repayment",
  "name": "Name",
  "amount": "Amount",
  "lender": "Lender",
  "dateBorrowed": "Date Borrowed",
  "repaid": "Repaid",
  "outstanding": "Outstanding",
  "fullyRepaid": "Fully repaid",
  "repaymentDate": "Repayment Date",
  "notes": "Notes",
  "deposit": "Deposit",
  "withdraw": "Withdraw",
  "adjust": "Adjust",
  "account": "Account",
  "group": "Group",
  "noGroup": "No group",
  "category": "Category",
  "status": "Status",
  "estimatedCost": "Est. Cost",
  "alreadyPaid": "Already Paid",
  "pending": "Pending",
  "startDate": "Start Date",
  "endDate": "End Date",
  "contractor": "Contractor",
  "toDefine": "To Define",
  "payee": "Payee",
  "paymentDate": "Payment Date",
  "tasksOptional": "Tasks (Optional)",
  "noTaskAssigned": "-- Unassigned --",
  "save": "Save",
  "cancel": "Cancel",
  "delete": "Delete",
  "confirmDelete": "Are you sure you want to delete this?",
  "statuses": {
    "allStatuses": "All Statuses",
    "pending": "Pending",
    "in_progress": "In Progress",
    "completed": "Completed",
    "cancelled": "Cancelled"
  },
  "categories": {
    "labor": "Labor",
    "material": "Material",
    "allCategories": "All"
  },
  "accounts": {
    "shared": "Shared account",
    "personal": "Personal account",
    "cash": "Cash"
  },
  "groupByTask": "Group by Task",
  "unassigned": "Unassigned",
  "subtotal": "Subtotal",
  "summary": {
    "availableFunds": "Available Funds",
    "estimatedMaterials": "Est. Materials",
    "estimatedWorkers": "Est. Workers",
    "totalSpent": "Total Spent",
    "remainingFunds": "Remaining Funds",
    "paidTo": "Paid To",
    "materials": "Materials",
    "workers": "Workers",
    "other": "Other"
  }
}
```

- [ ] **Step 2: Replace the `Renovations` block in `messages/es.json`**

```json
"Renovations": {
  "tabs": {
    "summary": "Resumen",
    "budgets": "Presupuesto",
    "loans": "Dinero Prestado",
    "groups": "Grupos",
    "tasks": "Tareas",
    "payments": "Pagos"
  },
  "title": "Reformas de Casa",
  "addTask": "Añadir Tarea",
  "editTask": "Editar Tarea",
  "addGroup": "Añadir Grupo",
  "editGroup": "Editar Grupo",
  "addPayment": "Añadir Pago",
  "editPayment": "Editar Pago",
  "addLoan": "Añadir Préstamo",
  "editLoan": "Editar Préstamo",
  "addRepayment": "Añadir Devolución",
  "name": "Nombre",
  "amount": "Cantidad",
  "lender": "Prestamista",
  "dateBorrowed": "Fecha de Préstamo",
  "repaid": "Devuelto",
  "outstanding": "Pendiente de devolver",
  "fullyRepaid": "Totalmente devuelto",
  "repaymentDate": "Fecha de Devolución",
  "notes": "Notas",
  "deposit": "Depositar",
  "withdraw": "Retirar",
  "adjust": "Ajustar",
  "account": "Cuenta",
  "group": "Grupo",
  "noGroup": "Sin grupo",
  "category": "Categoría",
  "status": "Estado",
  "estimatedCost": "Coste Estimado",
  "alreadyPaid": "Ya Pagado",
  "pending": "Pendiente",
  "startDate": "Fecha Inicio",
  "endDate": "Fecha Fin",
  "contractor": "Contratista",
  "toDefine": "Por Definir",
  "payee": "Beneficiario/Trabajador",
  "paymentDate": "Fecha Pago",
  "tasksOptional": "Tareas (Opcional)",
  "noTaskAssigned": "-- Sin asignar --",
  "save": "Guardar",
  "cancel": "Cancelar",
  "delete": "Eliminar",
  "confirmDelete": "¿Estás seguro de que quieres eliminar esto?",
  "statuses": {
    "allStatuses": "Todos los estados",
    "pending": "Pendiente",
    "in_progress": "En Curso",
    "completed": "Completada",
    "cancelled": "Cancelada"
  },
  "categories": {
    "labor": "Mano de obra",
    "material": "Material",
    "allCategories": "Todas"
  },
  "accounts": {
    "shared": "Cuenta compartida",
    "personal": "Cuenta personal",
    "cash": "Efectivo"
  },
  "groupByTask": "Agrupar por tarea",
  "unassigned": "Sin tarea",
  "subtotal": "Subtotal",
  "summary": {
    "availableFunds": "Fondos Disponibles",
    "estimatedMaterials": "Est. Materiales",
    "estimatedWorkers": "Est. Mano de Obra",
    "totalSpent": "Total Gastado",
    "remainingFunds": "Fondos Restantes",
    "paidTo": "Pagado a",
    "materials": "Materiales",
    "workers": "Mano de Obra",
    "other": "Otros"
  }
}
```

- [ ] **Step 3: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json')); JSON.parse(require('fs').readFileSync('messages/es.json')); console.log('valid')"`
Expected: prints `valid` with no errors.

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/es.json
git commit -m "feat: update renovations i18n keys for accounts/loans model"
```

---

## Task 13: Rewrite the page container

**Files:**
- Modify: `src/app/[locale]/renovations/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: all components from Tasks 6–11; all fetch actions from Task 4.
- Produces: default export `RenovationsPage`, wired to URL `?tab=` search param for persistence across reloads.

- [ ] **Step 1: Rewrite `page.tsx`**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import {
  fetchAccountsAction,
  fetchGroupsAction,
  fetchLoanRepaymentsAction,
  fetchLoansAction,
  fetchPaymentsAction,
  fetchTasksAction,
} from "@/app/actions/renovations";
import {
  RenovationAccount,
  RenovationGroup,
  RenovationLoan,
  RenovationLoanRepayment,
  RenovationPayment,
  RenovationTask,
} from "@/lib/types/renovations";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";

import { BudgetTab } from "./components/BudgetTab";
import { GroupsTab } from "./components/GroupsTab";
import { MoneyBorrowedTab } from "./components/MoneyBorrowedTab";
import { PaymentsTab } from "./components/PaymentsTab";
import { SummaryTab } from "./components/SummaryTab";
import { TasksTab } from "./components/TasksTab";
import styles from "./page.module.css";

type Tab = "summary" | "groups" | "tasks" | "budgets" | "loans" | "payments";

const TABS: Tab[] = ["summary", "groups", "tasks", "budgets", "loans", "payments"];

export default function RenovationsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RenovationsPageContent />
    </Suspense>
  );
}

function RenovationsPageContent() {
  const t = useTranslations("Renovations");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const activeTab: Tab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "summary";

  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<RenovationAccount[]>([]);
  const [loans, setLoans] = useState<RenovationLoan[]>([]);
  const [repayments, setRepayments] = useState<RenovationLoanRepayment[]>([]);
  const [tasks, setTasks] = useState<RenovationTask[]>([]);
  const [groups, setGroups] = useState<RenovationGroup[]>([]);
  const [payments, setPayments] = useState<RenovationPayment[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [acc, ln, rep, tks, g, p] = await Promise.all([
        fetchAccountsAction(),
        fetchLoansAction(),
        fetchLoanRepaymentsAction(),
        fetchTasksAction(),
        fetchGroupsAction(),
        fetchPaymentsAction(),
      ]);
      setAccounts(acc);
      setLoans(ln);
      setRepayments(rep);
      setTasks(tks);
      setGroups(g);
      setPayments(p);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const setActiveTab = (tab: Tab) => {
    router.replace(`${pathname}?tab=${tab}`, { scroll: false });
  };

  return (
    <PageLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("title")}</h1>
        </div>

        <div className={styles.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`${styles.tab} ${activeTab === tab ? styles.active : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {t(`tabs.${tab}`)}
            </button>
          ))}
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            {activeTab === "summary" && (
              <SummaryTab accounts={accounts} tasks={tasks} groups={groups} payments={payments} />
            )}
            {activeTab === "groups" && <GroupsTab groups={groups} onRefresh={loadData} />}
            {activeTab === "tasks" && <TasksTab tasks={tasks} groups={groups} onRefresh={loadData} />}
            {activeTab === "budgets" && <BudgetTab accounts={accounts} onRefresh={loadData} />}
            {activeTab === "loans" && (
              <MoneyBorrowedTab loans={loans} repayments={repayments} onRefresh={loadData} />
            )}
            {activeTab === "payments" && (
              <PaymentsTab payments={payments} tasks={tasks} onRefresh={loadData} />
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
}
```

- [ ] **Step 2: Typecheck the whole project**

Run: `pnpm tsc --noEmit`
Expected: zero errors project-wide. If there are leftover errors, they indicate a mismatch between a component's props (Tasks 6–11) and what this file passes — fix by aligning to the prop interfaces documented in those tasks.

- [ ] **Step 3: Lint the whole project**

Run: `pnpm lint`
Expected: zero errors/warnings.

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/renovations/page.tsx"
git commit -m "feat: rewrite renovations page container with URL-based tab state"
```

---

## Task 14: Final manual QA pass

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`
Expected: starts with no compile errors; navigate to `/en/renovations` (or `/es/renovations`) in a browser while signed in.

- [ ] **Step 2: Budget tab**

Manually verify: Shared/Personal/Cash all show €0.00 (or your seeded values). Deposit €100 to Shared → balance updates to €100.00. Withdraw €30 from Shared → Shared drops to €70.00, Cash rises by €30. Attempt to withdraw more than a balance holds → inline error shown, no balance change. Adjust (remove) €10 from Personal when it has less than €10 → inline error shown, no balance change; Adjust with sufficient balance succeeds.

- [ ] **Step 3: Money Borrowed tab**

Manually verify: Add Loan (name, lender, amount, date) → card appears showing amount, 0 repaid, outstanding = amount. Add Repayment (partial amount) → card's repaid/outstanding update correctly, repayment appears in the list. Add another repayment that brings outstanding to 0 → card shows "Fully repaid" badge instead of an outstanding amount. Delete a repayment → outstanding recalculates upward. Edit and delete a loan → both work.

- [ ] **Step 4: Tasks tab**

Manually verify: no Priority field/badge appears anywhere. Create a task with an estimated cost → card shows Estimated = that amount, Already Paid = €0.00, Pending = same as Estimated. Category/status filters still work. Group auto-inherits dates when selected in the modal (start/end date auto-fill on focus).

- [ ] **Step 5: Payments tab**

Manually verify: create a payment against a task, selecting "Shared account" as the account → go to Budget tab, confirm Shared's balance decreased by that amount. Edit the payment to change its account to "Cash" → confirm Shared's balance is restored and Cash's balance decreased instead. Delete the payment → confirm Cash's balance is restored. Go back to Tasks tab → confirm the linked task's "Already Paid"/"Pending" reflect the current (or, after delete, zero) payment total. Group-by-task toggle still works.

- [ ] **Step 6: Summary tab**

Manually verify: Available funds equals the sum of the three Budget-tab balances. Estimated Materials/Workers equal the sum of (estimated − already paid) across non-cancelled material/labor tasks respectively. Remaining funds = Available − Estimated Materials − Estimated Workers, and its card turns red when negative. "Paid To" shows Materials/Workers/Other sub-sections only for payees with linked payments, budgets shown as "paid / budget" for Materials and Workers, plain amounts for Other.

- [ ] **Step 7: Tab persistence**

Manually verify: switch to the Payments tab, note the URL now has `?tab=payments`, reload the page → still on Payments tab (not reset to Summary).

- [ ] **Step 8: Groups tab**

Manually verify: Add/Edit/Delete a group still works, and the modal title reads "Edit Group"/"Editar Grupo" correctly when editing (not a mistranslated string).

- [ ] **Step 9: Final full-project checks**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: both pass cleanly with zero errors.

- [ ] **Step 10: Commit (if any fixes were made during QA)**

```bash
git add -A
git commit -m "fix: address issues found during renovations rework QA pass"
```

If no fixes were needed, skip this step — nothing to commit.
