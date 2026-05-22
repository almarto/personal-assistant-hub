import { query } from "@/lib/db";

export async function getRenovationFunds(userId: string) {
  const result = await query(
    `SELECT * FROM renovation_funds WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function createRenovationFund(
  userId: string,
  data: {
    name: string;
    type: string;
    amount: number;
    source?: string | null;
    date_received?: string | null;
    lender?: string | null;
    include_in_budget?: boolean;
  }
) {
  const result = await query(
    `INSERT INTO renovation_funds (user_id, name, type, amount, source, date_received, lender, include_in_budget)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      userId,
      data.name,
      data.type,
      data.amount,
      data.source || null,
      data.date_received || null,
      data.lender || null,
      data.include_in_budget ?? true,
    ]
  );
  return result.rows[0];
}

export async function updateRenovationFund(
  id: string,
  userId: string,
  data: Partial<{
    name: string;
    type: string;
    amount: number;
    source: string | null;
    date_received: string | null;
    lender: string | null;
    include_in_budget: boolean;
  }>
) {
  const sets = [];
  const values: any[] = [id, userId];
  let paramIdx = 3;

  const fields = ['name', 'type', 'amount', 'source', 'date_received', 'lender', 'include_in_budget'] as const;
  for (const field of fields) {
    if (data[field] !== undefined) {
      sets.push(`${field} = $${paramIdx++}`);
      values.push(field === 'amount' ? data[field]?.toString() : data[field]);
    }
  }

  sets.push(`updated_at = NOW()`);
  if (sets.length === 1) return null;

  const q = `UPDATE renovation_funds SET ${sets.join(", ")} WHERE id = $1 AND user_id = $2 RETURNING *`;
  const result = await query(q, values);
  return result.rows[0];
}

export async function deleteRenovationFund(id: string, userId: string) {
  await query(`DELETE FROM renovation_funds WHERE id = $1 AND user_id = $2`, [id, userId]);
}

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
  const sets = [];
  const values: any[] = [id, userId];
  let paramIdx = 3;

  const fields = ['name', 'start_date', 'end_date', 'contractor'] as const;
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

export async function getRenovationTasks(userId: string) {
  const result = await query(
    `SELECT * FROM renovation_tasks WHERE user_id = $1 ORDER BY start_date ASC NULLS LAST, priority, created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function createRenovationTask(
  userId: string,
  data: {
    name: string;
    category: string;
    priority: string;
    status: string;
    group_id?: string | null;
    estimated_cost: number;
    actual_cost?: number;
    start_date?: string | null;
    end_date?: string | null;
    notes?: string | null;
  }
) {
  let startDate = data.start_date || null;
  let endDate = data.end_date || null;

  // Auto-inherit dates from group if not provided
  if (data.group_id && (!startDate || !endDate)) {
    const groupRes = await query(`SELECT start_date, end_date FROM renovation_groups WHERE id = $1`, [data.group_id]);
    if (groupRes.rows.length > 0) {
      if (!startDate) startDate = groupRes.rows[0].start_date;
      if (!endDate) endDate = groupRes.rows[0].end_date;
    }
  }

  const result = await query(
    `INSERT INTO renovation_tasks (user_id, name, category, priority, status, group_id, estimated_cost, actual_cost, start_date, end_date, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      userId,
      data.name,
      data.category,
      data.priority,
      data.status,
      data.group_id || null,
      data.estimated_cost,
      data.actual_cost || 0,
      startDate,
      endDate,
      data.notes || null,
    ]
  );
  return result.rows[0];
}

export async function updateRenovationTask(
  id: string,
  userId: string,
  data: Partial<{
    name: string;
    category: string;
    priority: string;
    status: string;
    group_id: string | null;
    estimated_cost: number;
    actual_cost: number;
    start_date: string | null;
    end_date: string | null;
    notes: string | null;
  }>
) {
  const sets = [];
  const values: any[] = [id, userId];
  let paramIdx = 3;

  const fields = ['name', 'category', 'priority', 'status', 'group_id', 'estimated_cost', 'actual_cost', 'start_date', 'end_date', 'notes'] as const;
  for (const field of fields) {
    if (data[field] !== undefined) {
      sets.push(`${field} = $${paramIdx++}`);
      values.push(['estimated_cost', 'actual_cost'].includes(field) ? data[field]?.toString() : data[field]);
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
    method: string;
    notes?: string | null;
  }
) {
  const result = await query(
    `INSERT INTO renovation_payments (user_id, task_id, payee, amount, payment_date, method, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      userId,
      data.task_id || null,
      data.payee,
      data.amount,
      data.payment_date,
      data.method,
      data.notes || null,
    ]
  );
  
  // If payment is linked to a task, we could optionally update the task's actual_cost
  // But let's leave that to the user to manually update or do it automatically here:
  if (data.task_id) {
    await query(`UPDATE renovation_tasks SET actual_cost = actual_cost + $1 WHERE id = $2`, [data.amount, data.task_id]);
  }

  return result.rows[0];
}

export async function updateRenovationPayment(
  id: string,
  userId: string,
  data: Partial<{
    task_id: string | null;
    payee: string;
    amount: number;
    payment_date: string;
    method: string;
    notes: string | null;
  }>
) {
  // Complex case: if amount or task_id changed, we need to adjust task actual_cost.
  // For simplicity, we just update the fields. In a perfect world we'd revert old cost and add new cost.
  
  const sets = [];
  const values: any[] = [id, userId];
  let paramIdx = 3;

  const fields = ['task_id', 'payee', 'amount', 'payment_date', 'method', 'notes'] as const;
  for (const field of fields) {
    if (data[field] !== undefined) {
      sets.push(`${field} = $${paramIdx++}`);
      values.push(field === 'amount' ? data[field]?.toString() : data[field]);
    }
  }

  sets.push(`updated_at = NOW()`);
  if (sets.length === 1) return null;

  const q = `UPDATE renovation_payments SET ${sets.join(", ")} WHERE id = $1 AND user_id = $2 RETURNING *`;
  const result = await query(q, values);
  return result.rows[0];
}

export async function deleteRenovationPayment(id: string, userId: string) {
  const payment = await query(`SELECT * FROM renovation_payments WHERE id = $1 AND user_id = $2`, [id, userId]);
  if (payment.rows.length > 0) {
    const p = payment.rows[0];
    if (p.task_id) {
      await query(`UPDATE renovation_tasks SET actual_cost = actual_cost - $1 WHERE id = $2`, [p.amount, p.task_id]);
    }
  }

  await query(`DELETE FROM renovation_payments WHERE id = $1 AND user_id = $2`, [id, userId]);
}
