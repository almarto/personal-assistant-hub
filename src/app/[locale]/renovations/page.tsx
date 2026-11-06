"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
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
    // Loading data on mount: the state it sets is what shows the spinner.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
