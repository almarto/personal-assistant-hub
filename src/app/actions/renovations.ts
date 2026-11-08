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

export async function depositAction(data: {
  account_type: string;
  amount: number;
}) {
  const userId = await requireUser();
  try {
    await db.depositToAccount(userId, data.account_type, data.amount);
    revalidatePath("/renovations");
    return { error: null };
  } catch (error) {
    if (error instanceof db.InvalidAccountTypeError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function withdrawAction(data: {
  account_type: string;
  amount: number;
}) {
  const userId = await requireUser();
  try {
    await db.withdrawToCash(userId, data.account_type, data.amount);
    revalidatePath("/renovations");
    return { error: null };
  } catch (error) {
    if (
      error instanceof db.InsufficientFundsError ||
      error instanceof db.InvalidAccountTypeError
    ) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function adjustAction(data: {
  account_type: string;
  amount: number;
}) {
  const userId = await requireUser();
  try {
    await db.adjustAccount(userId, data.account_type, data.amount);
    revalidatePath("/renovations");
    return { error: null };
  } catch (error) {
    if (
      error instanceof db.InsufficientFundsError ||
      error instanceof db.InvalidAccountTypeError
    ) {
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
}): Promise<{ error: string | null }> {
  const userId = await requireUser();
  try {
    await db.createRenovationPayment(userId, data);
    revalidatePath("/renovations");
    return { error: null };
  } catch (error) {
    if (
      error instanceof db.TaskNotFoundError ||
      error instanceof db.InvalidAccountTypeError ||
      error instanceof db.InvalidAmountError
    ) {
      return { error: error.message };
    }
    throw error;
  }
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
): Promise<{ error: string | null }> {
  const userId = await requireUser();
  try {
    await db.updateRenovationPayment(id, userId, data);
    revalidatePath("/renovations");
    return { error: null };
  } catch (error) {
    if (
      error instanceof db.TaskNotFoundError ||
      error instanceof db.InvalidAccountTypeError ||
      error instanceof db.InvalidAmountError
    ) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function deletePaymentAction(id: string) {
  const userId = await requireUser();
  await db.deleteRenovationPayment(id, userId);
  revalidatePath("/renovations");
}
