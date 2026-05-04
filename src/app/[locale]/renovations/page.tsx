"use client";

import { Edit2, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  createFundAction,
  createGroupAction,
  createPaymentAction,
  createTaskAction,
  deleteFundAction,
  deleteGroupAction,
  deletePaymentAction,
  deleteTaskAction,
  fetchFundsAction,
  fetchGroupsAction,
  fetchPaymentsAction,
  fetchTasksAction,
  updateFundAction,
  updateGroupAction,
  updatePaymentAction,
  updateTaskAction,
} from "@/app/actions/renovations";
import {
  RenovationFund,
  RenovationGroup,
  RenovationPayment,
  RenovationTask,
} from "@/lib/types/renovations";
import { Button } from "@/systemUI/components/Button/Button";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";

import styles from "./page.module.css";

type Tab = "summary" | "groups" | "tasks" | "budgets" | "payments";

export default function RenovationsPage() {
  const t = useTranslations("Renovations");
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [loading, setLoading] = useState(true);

  const [funds, setFunds] = useState<RenovationFund[]>([]);
  const [tasks, setTasks] = useState<RenovationTask[]>([]);
  const [groups, setGroups] = useState<RenovationGroup[]>([]);
  const [payments, setPayments] = useState<RenovationPayment[]>([]);

  const [showFundModal, setShowFundModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [editingFund, setEditingFund] = useState<RenovationFund | null>(null);
  const [editingTask, setEditingTask] = useState<RenovationTask | null>(null);
  const [editingGroup, setEditingGroup] = useState<RenovationGroup | null>(
    null
  );
  const [editingPayment, setEditingPayment] =
    useState<RenovationPayment | null>(null);

  const [fundType, setFundType] = useState<string>("savings");
  const [includeInBudget, setIncludeInBudget] = useState<boolean>(true);
  const [taskStartDate, setTaskStartDate] = useState<string>("");
  const [taskEndDate, setTaskEndDate] = useState<string>("");
  const [groupStartDate, setGroupStartDate] = useState<string>("");
  const [groupEndDate, setGroupEndDate] = useState<string>("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [f, tks, g, p] = await Promise.all([
        fetchFundsAction(),
        fetchTasksAction(),
        fetchGroupsAction(),
        fetchPaymentsAction(),
      ]);
      setFunds(f);
      setTasks(tks);
      setGroups(g);
      setPayments(p);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFund = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      amount: parseFloat(formData.get("amount") as string),
      source: formData.get("source") as string,
      date_received: (formData.get("date_received") as string) || null,
      lender: (formData.get("lender") as string) || null,
      include_in_budget: formData.get("include_in_budget") === "on",
    };

    if (editingFund) {
      await updateFundAction(editingFund.id, data);
    } else {
      await createFundAction(data);
    }

    setShowFundModal(false);
    setEditingFund(null);
    loadData();
  };

  const handleDeleteFund = async (id: string) => {
    if (window.confirm(t("confirmDelete"))) {
      await deleteFundAction(id);
      loadData();
    }
  };

  const handleSaveTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      category: formData.get("category") as string,
      priority: formData.get("priority") as string,
      status: formData.get("status") as string,
      group_id: (formData.get("group_id") as string) || null,
      estimated_cost: parseFloat(formData.get("estimated_cost") as string) || 0,
      actual_cost: parseFloat(formData.get("actual_cost") as string) || 0,
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
    loadData();
  };

  const handleDeleteTask = async (id: string) => {
    if (window.confirm(t("confirmDelete"))) {
      await deleteTaskAction(id);
      loadData();
    }
    setShowTaskModal(false);
  };

  const handleSaveGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      start_date: (formData.get("start_date") as string) || null,
      end_date: (formData.get("end_date") as string) || null,
    };

    if (editingGroup) {
      await updateGroupAction(editingGroup.id, data);
    } else {
      await createGroupAction(data);
    }
    loadData();
    setShowGroupModal(false);
  };

  const handleDeleteGroup = async (id: string) => {
    if (window.confirm(t("confirmDelete"))) {
      await deleteGroupAction(id);
      loadData();
    }
  };

  const handleSavePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      payee: formData.get("payee") as string,
      amount: parseFloat(formData.get("amount") as string),
      method: formData.get("method") as string,
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
    loadData();
  };

  const handleDeletePayment = async (id: string) => {
    if (window.confirm(t("confirmDelete"))) {
      await deletePaymentAction(id);
      loadData();
    }
  };

  const openFundModal = (fund?: RenovationFund) => {
    setEditingFund(fund || null);
    setFundType(fund?.type || "savings");
    setIncludeInBudget(fund ? fund.include_in_budget : true);
    setShowFundModal(true);
  };

  const openTaskModal = (task?: RenovationTask) => {
    setEditingTask(task || null);
    setTaskStartDate(
      task?.start_date
        ? new Date(task.start_date).toISOString().split("T")[0]
        : ""
    );
    setTaskEndDate(
      task?.end_date ? new Date(task.end_date).toISOString().split("T")[0] : ""
    );
    setSelectedGroupId(task?.group_id || "");
    setShowTaskModal(true);
  };

  const openGroupModal = (group?: RenovationGroup) => {
    setEditingGroup(group || null);
    setGroupStartDate(group?.start_date || "");
    setGroupEndDate(group?.end_date || "");
    setShowGroupModal(true);
  };

  const openPaymentModal = (payment?: RenovationPayment) => {
    setEditingPayment(payment || null);
    setShowPaymentModal(true);
  };

  // Summaries calculation
  const totalFunds = funds
    .filter((f) => f.include_in_budget)
    .reduce((acc, f) => acc + parseFloat(f.amount), 0);
  const totalEstimated = tasks.reduce(
    (acc, tk) => acc + parseFloat(tk.estimated_cost),
    0
  );
  const totalSpent = payments.reduce((acc, p) => acc + parseFloat(p.amount), 0);
  const remainingFunds = totalFunds - totalEstimated;

  const estimatedEndDateMs = tasks
    .filter((t) => t.status !== "cancelled" && t.end_date)
    .map((t) => new Date(t.end_date!).getTime())
    .reduce((max, current) => Math.max(max, current), 0);

  const estimatedEndDate =
    estimatedEndDateMs > 0 ? new Date(estimatedEndDateMs) : null;

  const loansByLender = funds
    .filter((f) => f.type === "loan" && f.lender)
    .reduce(
      (acc, f) => {
        acc[f.lender!] = (acc[f.lender!] || 0) + parseFloat(f.amount);
        return acc;
      },
      {} as Record<string, number>
    );

  const deficit = -remainingFunds;
  let recommendations: RenovationTask[][] = [];
  if (deficit > 0) {
    const candidateTasks = tasks.filter(
      (t) =>
        t.priority !== "mandatory" &&
        t.status !== "completed" &&
        parseFloat(t.estimated_cost as any) > 0
    );

    const subsets: RenovationTask[][] = [];
    const findSubsets = (
      index: number,
      currentSubset: RenovationTask[],
      currentSum: number
    ) => {
      if (currentSum >= deficit) {
        subsets.push([...currentSubset]);
        return;
      }
      if (index >= candidateTasks.length) return;

      findSubsets(
        index + 1,
        [...currentSubset, candidateTasks[index]],
        currentSum + parseFloat(candidateTasks[index].estimated_cost as any)
      );
      findSubsets(index + 1, currentSubset, currentSum);
    };

    findSubsets(0, [], 0);

    subsets.sort((a, b) => {
      const getScore = (t: RenovationTask) => (t.priority === "future" ? 1 : 2);
      const scoreA = a.reduce((sum, t) => sum + getScore(t), 0);
      const scoreB = b.reduce((sum, t) => sum + getScore(t), 0);

      if (scoreA !== scoreB) return scoreA - scoreB;

      const sumA = a.reduce(
        (sum, t) => sum + parseFloat(t.estimated_cost as any),
        0
      );
      const sumB = b.reduce(
        (sum, t) => sum + parseFloat(t.estimated_cost as any),
        0
      );
      return sumA - sumB;
    });

    const seen = new Set<string>();
    for (const sub of subsets) {
      const key = sub
        .map((t) => t.id)
        .sort()
        .join(",");
      if (!seen.has(key)) {
        seen.add(key);
        recommendations.push(sub);
      }
      if (recommendations.length >= 4) break;
    }
  }

  return (
    <PageLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("title")}</h1>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {activeTab === "budgets" && (
              <Button onClick={() => openFundModal()}>
                <Plus size={20} /> {t("addFund")}
              </Button>
            )}
            {activeTab === "groups" && (
              <Button onClick={() => openGroupModal()}>
                <Plus size={20} /> {t("addGroup")}
              </Button>
            )}
            {activeTab === "tasks" && (
              <Button onClick={() => openTaskModal()}>
                <Plus size={20} /> {t("addTask")}
              </Button>
            )}
            {activeTab === "payments" && (
              <Button onClick={() => openPaymentModal()}>
                <Plus size={20} /> {t("addPayment")}
              </Button>
            )}
          </div>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "summary" ? styles.active : ""}`}
            onClick={() => setActiveTab("summary")}
          >
            {t("tabs.summary")}
          </button>
          <button
            className={`${styles.tab} ${activeTab === "groups" ? styles.active : ""}`}
            onClick={() => setActiveTab("groups")}
          >
            {t("tabs.groups")}
          </button>
          <button
            className={`${styles.tab} ${activeTab === "tasks" ? styles.active : ""}`}
            onClick={() => setActiveTab("tasks")}
          >
            {t("tabs.tasks")}
          </button>
          <button
            className={`${styles.tab} ${activeTab === "budgets" ? styles.active : ""}`}
            onClick={() => setActiveTab("budgets")}
          >
            {t("tabs.budgets")}
          </button>
          <button
            className={`${styles.tab} ${activeTab === "payments" ? styles.active : ""}`}
            onClick={() => setActiveTab("payments")}
          >
            {t("tabs.payments")}
          </button>
        </div>

        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          {/* This section is now redundant if buttons are in header, but user might want them here too. 
              Let's keep the ones in the header and remove this extra div to avoid confusion. */}
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            {activeTab === "summary" && (
              <div>
                <div className={styles.summary}>
                  <div className={styles.summaryCard}>
                    <h4>{t("summary.totalFunds")}</h4>
                    <p>€{totalFunds.toFixed(2)}</p>
                  </div>
                  <div className={styles.summaryCard}>
                    <h4>{t("summary.totalEstimated")}</h4>
                    <p>€{totalEstimated.toFixed(2)}</p>
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
                  {estimatedEndDate && (
                    <div className={styles.summaryCard}>
                      <h4>{t("summary.estimatedCompletion")}</h4>
                      <p>{estimatedEndDate.toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                {Object.keys(loansByLender).length > 0 && (
                  <div style={{ marginTop: "2rem" }}>
                    <h3>{t("summary.activeDebts")}</h3>
                    <div className={styles.grid}>
                      {Object.entries(loansByLender).map(([lender, amount]) => (
                        <div
                          key={lender}
                          className={styles.card}
                          style={{ borderLeft: "4px solid #ef4444" }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>{lender}</span>
                            <span
                              style={{
                                fontWeight: 700,
                                color: "#ef4444",
                                fontSize: "1.2rem",
                              }}
                            >
                              €{amount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {deficit > 0 && recommendations.length > 0 && (
                  <div style={{ marginTop: "2rem" }}>
                    <h3>{t("summary.recommendationsTitle")}</h3>
                    <p
                      style={{
                        color: "var(--text-muted)",
                        marginBottom: "1rem",
                      }}
                    >
                      {t("summary.recommendationsDesc")}
                    </p>
                    <div className={styles.grid}>
                      {recommendations.map((rec, i) => {
                        const saved = rec.reduce(
                          (s, t) => s + parseFloat(t.estimated_cost as any),
                          0
                        );
                        const newBalance = remainingFunds + saved;
                        return (
                          <div key={i} className={styles.card}>
                            <div className={styles.cardHeader}>
                              <h3 className={styles.cardTitle}>
                                {t("summary.option")} {i + 1}
                              </h3>
                            </div>
                            <ul
                              style={{
                                margin: "1rem 0",
                                paddingLeft: "1.5rem",
                              }}
                            >
                              {rec.map((tk) => (
                                <li key={tk.id}>
                                  {tk.name}{" "}
                                  <span style={{ color: "var(--text-muted)" }}>
                                    (€
                                    {parseFloat(
                                      tk.estimated_cost as any
                                    ).toFixed(2)}
                                    )
                                  </span>
                                </li>
                              ))}
                            </ul>
                            <div
                              style={{
                                marginTop: "auto",
                                borderTop: "1px solid var(--border-color)",
                                paddingTop: "1rem",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span>{t("summary.savedAmount")}:</span>
                                <span
                                  style={{
                                    fontWeight: "bold",
                                    color: "#10b981",
                                  }}
                                >
                                  +€{saved.toFixed(2)}
                                </span>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  marginTop: "0.5rem",
                                }}
                              >
                                <span>{t("summary.newBalance")}:</span>
                                <span style={{ fontWeight: "bold" }}>
                                  €{newBalance.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {deficit > 0 && recommendations.length === 0 && (
                  <div
                    style={{
                      marginTop: "2rem",
                      padding: "1rem",
                      background: "#fee2e2",
                      borderRadius: "8px",
                      color: "#991b1b",
                    }}
                  >
                    {t("summary.noRecommendations")}
                  </div>
                )}
              </div>
            )}

            {activeTab === "budgets" && (
              <div className={styles.grid}>
                {funds.map((f) => (
                  <div key={f.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div>
                        <h3 className={styles.cardTitle}>{f.name}</h3>
                        <span className={styles.cardSubtitle}>
                          {t(`types.${f.type}`)}
                          {f.date_received &&
                            ` • ${new Date(f.date_received).toLocaleDateString()}`}
                          {!f.include_in_budget && ` • Excluido`}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => openFundModal(f)}
                          style={{ color: "#0070f3" }}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDeleteFund(f.id)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    {f.source && (
                      <p style={{ margin: "0", fontSize: "0.9rem" }}>
                        {t("source")}: {f.source}
                      </p>
                    )}
                    <div
                      className={styles.cardAmount}
                      style={{
                        color: f.type === "loan" ? "#ef4444" : "inherit",
                        opacity: f.include_in_budget ? 1 : 0.5,
                      }}
                    >
                      €{parseFloat(f.amount).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "groups" && (
              <div className={styles.grid}>
                {groups.map((g) => (
                  <div key={g.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div>
                        <h3 className={styles.cardTitle}>{g.name}</h3>
                        {(g.start_date || g.end_date) && (
                          <span className={styles.cardSubtitle}>
                            {g.start_date
                              ? new Date(g.start_date).toLocaleDateString()
                              : "..."}
                            {g.end_date &&
                              ` - ${new Date(g.end_date).toLocaleDateString()}`}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => openGroupModal(g)}
                          style={{ color: "#0070f3" }}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDeleteGroup(g.id)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "tasks" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "2rem",
                }}
              >
                {[...groups, { id: "none", name: t("noGroup") }].map(
                  (group) => {
                    const groupTasks = tasks.filter((tk) =>
                      group.id === "none"
                        ? !tk.group_id
                        : tk.group_id === group.id
                    );

                    if (groupTasks.length === 0) return null;

                    return (
                      <div key={group.id}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "1rem",
                            marginBottom: "1rem",
                          }}
                        >
                          <h2
                            style={{
                              margin: 0,
                              fontSize: "1.2rem",
                              color: "var(--text-main)",
                            }}
                          >
                            {group.name}
                          </h2>
                          <div
                            style={{
                              flex: 1,
                              height: "1px",
                              backgroundColor: "var(--border-color)",
                              opacity: 0.5,
                            }}
                          />
                        </div>
                        <div className={styles.grid}>
                          {groupTasks.map((tk) => (
                            <div key={tk.id} className={styles.card}>
                              <div className={styles.cardHeader}>
                                <div>
                                  <h3 className={styles.cardTitle}>
                                    {tk.name}
                                  </h3>
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "0.5rem",
                                      marginTop: "0.5rem",
                                    }}
                                  >
                                    <span
                                      className={`${styles.badge} ${styles[tk.priority]}`}
                                    >
                                      {t(`priorities.${tk.priority}`)}
                                    </span>
                                    <span
                                      className={`${styles.badge} ${styles[tk.status]}`}
                                    >
                                      {t(`statuses.${tk.status}`)}
                                    </span>
                                  </div>
                                  {(tk.start_date || tk.end_date) && (
                                    <div
                                      style={{
                                        fontSize: "0.8rem",
                                        color: "var(--text-muted)",
                                        marginTop: "0.5rem",
                                      }}
                                    >
                                      {tk.start_date
                                        ? new Date(
                                            tk.start_date
                                          ).toLocaleDateString()
                                        : "..."}
                                      {tk.end_date &&
                                        ` - ${new Date(tk.end_date).toLocaleDateString()}`}
                                    </div>
                                  )}
                                </div>
                                <div
                                  style={{ display: "flex", gap: "0.25rem" }}
                                >
                                  <button
                                    className={styles.deleteBtn}
                                    onClick={() => openTaskModal(tk)}
                                    style={{ color: "#0070f3" }}
                                  >
                                    <Edit2 size={18} />
                                  </button>
                                  <button
                                    className={styles.deleteBtn}
                                    onClick={() => handleDeleteTask(tk.id)}
                                  >
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
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      fontSize: "0.8rem",
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    {t("estimatedCost")}
                                  </div>
                                  <div style={{ fontWeight: 600 }}>
                                    €
                                    {(
                                      parseFloat(
                                        tk.estimated_cost?.toString()
                                      ) || 0
                                    ).toFixed(2)}
                                  </div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  <div
                                    style={{
                                      fontSize: "0.8rem",
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    {t("actualCost")}
                                  </div>
                                  <div style={{ fontWeight: 600 }}>
                                    €
                                    {(
                                      parseFloat(tk.actual_cost?.toString()) ||
                                      0
                                    ).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            {activeTab === "payments" && (
              <div className={styles.grid}>
                {payments.map((p) => (
                  <div key={p.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div>
                        <h3 className={styles.cardTitle}>{p.payee}</h3>
                        <span className={styles.cardSubtitle}>
                          {new Date(p.payment_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => openPaymentModal(p)}
                          style={{ color: "#0070f3" }}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDeletePayment(p.id)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <p style={{ margin: "0", fontSize: "0.9rem" }}>
                      {t("method")}: {t(`methods.${p.method}`)}
                    </p>
                    <div className={styles.cardAmount}>
                      €{parseFloat(p.amount).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Fund Modal */}
      {showFundModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>
              {editingFund
                ? t("addFund").replace("Añadir", "Editar")
                : t("addFund")}
            </h3>
            <form onSubmit={handleSaveFund}>
              <div className={styles.formGroup}>
                <label>{t("name")}</label>
                <input name="name" required defaultValue={editingFund?.name} />
              </div>
              <div className={styles.formGroup}>
                <label>{t("type")}</label>
                <select
                  name="type"
                  required
                  value={fundType}
                  onChange={(e) => setFundType(e.target.value)}
                >
                  <option value="savings">{t("types.savings")}</option>
                  <option value="loan">{t("types.loan")}</option>
                  <option value="gift">{t("types.gift")}</option>
                </select>
              </div>
              {fundType === "loan" && (
                <div className={styles.formGroup}>
                  <label>{t("lender")}</label>
                  <input
                    name="lender"
                    required
                    defaultValue={editingFund?.lender || ""}
                  />
                </div>
              )}
              <div
                className={styles.formGroup}
                style={{
                  flexDirection: "row",
                  gap: "0.5rem",
                  alignItems: "center",
                }}
              >
                <input
                  type="checkbox"
                  name="include_in_budget"
                  checked={includeInBudget}
                  onChange={(e) => setIncludeInBudget(e.target.checked)}
                />
                <label style={{ margin: 0 }}>{t("includeInBudget")}</label>
              </div>
              <div className={styles.formGroup}>
                <label>{t("amount")}</label>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  required
                  defaultValue={editingFund?.amount}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t("source")}</label>
                <input name="source" defaultValue={editingFund?.source || ""} />
              </div>
              <div className={styles.formGroup}>
                <label>{t("dateReceived")}</label>
                <input
                  name="date_received"
                  type="date"
                  defaultValue={
                    editingFund?.date_received
                      ? new Date(editingFund.date_received)
                          .toISOString()
                          .split("T")[0]
                      : ""
                  }
                />
              </div>
              <div className={styles.modalActions}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowFundModal(false);
                    setEditingFund(null);
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

      {/* Group Modal */}
      {showGroupModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>{editingGroup ? "Editar Grupo" : "Nuevo Grupo"}</h3>
            <form onSubmit={handleSaveGroup}>
              <div className={styles.formGroup}>
                <label>{t("name")}</label>
                <input
                  name="name"
                  required
                  defaultValue={editingGroup?.name || ""}
                />
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
              <div className={styles.modalActions}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowGroupModal(false)}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit">{t("save")}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>
              {editingTask
                ? t("addTask").replace("Añadir", "Editar")
                : t("addTask")}
            </h3>
            <form onSubmit={handleSaveTask}>
              <div className={styles.formGroup}>
                <label>{t("name")}</label>
                <input name="name" required defaultValue={editingTask?.name} />
              </div>
              <div className={styles.formGroup}>
                <label>{t("category")}</label>
                <select
                  name="category"
                  required
                  defaultValue={editingTask?.category}
                >
                  <option value="labor">{t("categories.labor")}</option>
                  <option value="material">{t("categories.material")}</option>
                  <option value="permit">{t("categories.permit")}</option>
                  <option value="other">{t("categories.other")}</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>{t("priority")}</label>
                <select
                  name="priority"
                  required
                  defaultValue={editingTask?.priority}
                >
                  <option value="mandatory">{t("priorities.mandatory")}</option>
                  <option value="ideal">{t("priorities.ideal")}</option>
                  <option value="future">{t("priorities.future")}</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>{t("status")}</label>
                <select
                  name="status"
                  required
                  defaultValue={editingTask?.status}
                >
                  <option value="pending">{t("statuses.pending")}</option>
                  <option value="in_progress">
                    {t("statuses.in_progress")}
                  </option>
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
                          setTaskStartDate(
                            new Date(group.start_date)
                              .toISOString()
                              .split("T")[0]
                          );
                        }
                        if (group.end_date) {
                          setTaskEndDate(
                            new Date(group.end_date).toISOString().split("T")[0]
                          );
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
              <div style={{ display: "flex", gap: "1rem" }}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label>{t("estimatedCost")}</label>
                  <input
                    name="estimated_cost"
                    type="number"
                    step="0.01"
                    required
                    defaultValue={editingTask?.estimated_cost || 0}
                  />
                </div>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label>{t("actualCost")} (Opcional)</label>
                  <input
                    name="actual_cost"
                    type="number"
                    step="0.01"
                    defaultValue={editingTask?.actual_cost || ""}
                  />
                </div>
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
                        const group = groups.find(
                          (g) => g.id === selectedGroupId
                        );
                        if (group?.start_date) {
                          setTaskStartDate(
                            new Date(group.start_date)
                              .toISOString()
                              .split("T")[0]
                          );
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
                      } else if (
                        !taskEndDate &&
                        !taskStartDate &&
                        selectedGroupId
                      ) {
                        const group = groups.find(
                          (g) => g.id === selectedGroupId
                        );
                        if (group?.end_date) {
                          setTaskEndDate(
                            new Date(group.end_date).toISOString().split("T")[0]
                          );
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

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>
              {editingPayment
                ? t("addPayment").replace("Añadir", "Editar")
                : t("addPayment")}
            </h3>
            <form onSubmit={handleSavePayment}>
              <div className={styles.formGroup}>
                <label>{t("payee")}</label>
                <input
                  name="payee"
                  required
                  defaultValue={editingPayment?.payee}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t("amount")}</label>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  required
                  defaultValue={editingPayment?.amount}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t("method")}</label>
                <select
                  name="method"
                  required
                  defaultValue={editingPayment?.method}
                >
                  <option value="transfer">{t("methods.transfer")}</option>
                  <option value="cash">{t("methods.cash")}</option>
                  <option value="card">{t("methods.card")}</option>
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
                      ? new Date(editingPayment.payment_date)
                          .toISOString()
                          .split("T")[0]
                      : new Date().toISOString().split("T")[0]
                  }
                  onFocus={(e) => {
                    if (!e.target.value) {
                      e.target.value = new Date().toISOString().split("T")[0];
                    }
                  }}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t("tasks")} (Opcional)</label>
                <select
                  name="task_id"
                  defaultValue={editingPayment?.task_id || ""}
                >
                  <option value="">-- Sin asignar --</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
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
    </PageLayout>
  );
}
