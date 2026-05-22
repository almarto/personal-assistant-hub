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

export async function fetchFundsAction() {
  const userId = await requireUser();
  return db.getRenovationFunds(userId);
}

export async function createFundAction(data: {
  name: string;
  type: string;
  amount: number;
  source?: string;
  date_received?: string | null;
  lender?: string | null;
  include_in_budget?: boolean;
}) {
  const userId = await requireUser();
  await db.createRenovationFund(userId, data);
  revalidatePath("/renovations");
}

export async function updateFundAction(id: string, data: {
  name?: string;
  type?: string;
  amount?: number;
  source?: string | null;
  date_received?: string | null;
  lender?: string | null;
  include_in_budget?: boolean;
}) {
  const userId = await requireUser();
  await db.updateRenovationFund(id, userId, data);
  revalidatePath("/renovations");
}

export async function deleteFundAction(id: string) {
  const userId = await requireUser();
  await db.deleteRenovationFund(id, userId);
  revalidatePath("/renovations");
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

export async function fetchTasksAction() {
  const userId = await requireUser();
  return db.getRenovationTasks(userId);
}

export async function createTaskAction(data: {
  name: string;
  category: string;
  priority: string;
  status: string;
  group_id?: string | null;
  estimated_cost: number;
  actual_cost?: number;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string;
}) {
  const userId = await requireUser();
  await db.createRenovationTask(userId, data);
  revalidatePath("/renovations");
}

export async function updateTaskAction(id: string, data: {
  name?: string;
  category?: string;
  priority?: string;
  status?: string;
  group_id?: string | null;
  estimated_cost?: number;
  actual_cost?: number;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
}) {
  const userId = await requireUser();
  await db.updateRenovationTask(id, userId, data);
  revalidatePath("/renovations");
}

export async function deleteTaskAction(id: string) {
  const userId = await requireUser();
  await db.deleteRenovationTask(id, userId);
  revalidatePath("/renovations");
}

export async function fetchPaymentsAction() {
  const userId = await requireUser();
  return db.getRenovationPayments(userId);
}

export async function createPaymentAction(data: {
  payee: string;
  amount: number;
  method: string;
  payment_date: string;
  task_id?: string | null;
  notes?: string | null;
}) {
  const userId = await requireUser();
  await db.createRenovationPayment(userId, data);
  revalidatePath("/renovations");
}

export async function updatePaymentAction(id: string, data: {
  payee?: string;
  amount?: number;
  method?: string;
  payment_date?: string;
  task_id?: string | null;
  notes?: string | null;
}) {
  const userId = await requireUser();
  await db.updateRenovationPayment(id, userId, data);
  revalidatePath("/renovations");
}

export async function deletePaymentAction(id: string) {
  const userId = await requireUser();
  await db.deleteRenovationPayment(id, userId);
  revalidatePath("/renovations");
}
