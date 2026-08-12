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
