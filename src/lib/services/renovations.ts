import { pool, query } from "@/lib/db";

export class InsufficientFundsError extends Error {
  constructor(accountType: string) {
    super(`Insufficient funds in account: ${accountType}`);
    this.name = "InsufficientFundsError";
  }
}

export class InvalidAccountTypeError extends Error {
  constructor(accountType: string) {
    super(`Invalid account type: ${accountType}`);
    this.name = "InvalidAccountTypeError";
  }
}

export class InvalidAmountError extends Error {
  constructor(message = "Amount must be positive") {
    super(message);
    this.name = "InvalidAmountError";
  }
}

export class TaskNotFoundError extends Error {
  constructor(taskId: string) {
    super(`Task not found: ${taskId}`);
    this.name = "TaskNotFoundError";
  }
}

export class LoanNotFoundError extends Error {
  constructor(loanId: string) {
    super(`Loan not found: ${loanId}`);
    this.name = "LoanNotFoundError";
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
  const values: (string | null)[] = [id, userId];
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
  const loanRes = await query(
    `SELECT id FROM renovation_loans WHERE id = $1 AND user_id = $2`,
    [data.loan_id, userId]
  );
  if (loanRes.rows.length === 0) {
    throw new LoanNotFoundError(data.loan_id);
  }
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

function assertValidAccountType(accountType: string): asserts accountType is (typeof ACCOUNT_TYPES)[number] {
  if (!ACCOUNT_TYPES.includes(accountType as (typeof ACCOUNT_TYPES)[number])) {
    throw new InvalidAccountTypeError(accountType);
  }
}

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
  assertValidAccountType(accountType);
  const result = await query(
    `UPDATE renovation_accounts SET balance = balance + $3, updated_at = NOW()
     WHERE user_id = $1 AND account_type = $2 RETURNING *`,
    [userId, accountType, amount]
  );
  return result.rows[0];
}

export async function withdrawToCash(userId: string, sourceAccountType: string, amount: number) {
  assertValidAccountType(sourceAccountType);
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
  assertValidAccountType(accountType);
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
  const values: (string | null)[] = [id, userId];
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
      `SELECT start_date, end_date FROM renovation_groups WHERE id = $1 AND user_id = $2`,
      [data.group_id, userId]
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
  const values: (string | null)[] = [id, userId];
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
  if (data.amount <= 0) {
    throw new InvalidAmountError();
  }
  assertValidAccountType(data.account_type);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (data.task_id) {
      const taskRes = await client.query(
        `SELECT id FROM renovation_tasks WHERE id = $1 AND user_id = $2`,
        [data.task_id, userId]
      );
      if (taskRes.rows.length === 0) {
        throw new TaskNotFoundError(data.task_id);
      }
    }
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

    if (data.amount !== undefined && data.amount <= 0) {
      throw new InvalidAmountError();
    }
    if (data.account_type !== undefined) {
      assertValidAccountType(data.account_type);
    }
    if (data.task_id) {
      const taskRes = await client.query(
        `SELECT id FROM renovation_tasks WHERE id = $1 AND user_id = $2`,
        [data.task_id, userId]
      );
      if (taskRes.rows.length === 0) {
        throw new TaskNotFoundError(data.task_id);
      }
    }

    const sets: string[] = [];
    const values: (string | null)[] = [id, userId];
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
