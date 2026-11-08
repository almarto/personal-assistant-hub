import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import {
  discardConnectionAction,
  retryConnectionAction,
  startConnectionAction,
} from "@/app/actions/finances";
import { Link, redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { createBankingClient } from "@/lib/services/finances/client";
import { getEnableBankingConfig } from "@/lib/services/finances/config";
import type { BankCardData } from "@/lib/services/finances/overview";
import { getFinancesOverview } from "@/lib/services/finances/overview";
import type { Aspsp } from "@/lib/services/finances/types";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";

import { AddBankDialog } from "./components/AddBankDialog";
import { BankCard } from "./components/BankCard";
import { BankPicker } from "./components/BankPicker";
import { PendingConnections } from "./components/PendingConnections";
import { bankKey } from "./format";
import styles from "./page.module.css";

const ERROR_CODES = [
  "invalid_state",
  "access_denied",
  "session_failed",
  "invalid_request",
  "start_failed",
  "retry_failed",
  "discard_failed",
] as const;

type ErrorCode = (typeof ERROR_CODES)[number] | "generic";

function toErrorCode(value: string | undefined): ErrorCode | null {
  if (!value) return null;
  return ERROR_CODES.find((code) => code === value) ?? "generic";
}

type BankList =
  | { kind: "loaded"; banks: Aspsp[] }
  | { kind: "failed" }
  | { kind: "unconfigured" };

/** The only live Enable Banking call on this page, made only for the picker. */
async function loadBankList(): Promise<BankList> {
  let client;
  try {
    client = createBankingClient(getEnableBankingConfig());
  } catch (error) {
    console.error("Enable Banking is not configured:", error);
    return { kind: "unconfigured" };
  }
  const result = await client.listAspsps();
  if (!result.ok) {
    console.error("Loading banks failed:", result.error.message);
    return { kind: "failed" };
  }
  return { kind: "loaded", banks: result.value };
}

/** Server actions may only close over serializable values, so this is module-level. */
function failWith(locale: string, code: ErrorCode): never {
  return redirect({
    href: { pathname: "/finances", query: { error: code } },
    locale,
  });
}

function connectedKeys(banks: BankCardData[]): string[] {
  return banks.map((bank) =>
    bankKey({ name: bank.aspspName, country: bank.aspspCountry })
  );
}

export default async function FinancesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ add?: string; error?: string }>;
}) {
  const { locale } = await params;
  const { add, error } = await searchParams;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return redirect({
      href: { pathname: "/auth/signin", query: { callbackUrl: "/finances" } },
      locale,
    });
  }

  const t = await getTranslations("Finances");
  const { banks, pending } = await getFinancesOverview(
    session.user.id,
    new Date()
  );
  const isFirstBank = banks.length === 0 && pending.length === 0;
  const showDialog = !isFirstBank && add === "1";
  const bankList = isFirstBank || showDialog ? await loadBankList() : null;
  const errorCode = toErrorCode(error);

  async function connect(formData: FormData) {
    "use server";
    const result = await startConnectionAction(formData);
    console.error("Start connection failed:", result.error);
    failWith(locale, "start_failed");
  }

  async function retry(formData: FormData) {
    "use server";
    const result = await retryConnectionAction(formData);
    console.error("Retry connection failed:", result.error);
    failWith(locale, "retry_failed");
  }

  async function discard(formData: FormData) {
    "use server";
    const result = await discardConnectionAction(formData);
    if (!result.success) {
      console.error("Discard connection failed:", result.error);
      failWith(locale, "discard_failed");
    }
  }

  const picker = (cancelHref?: string) => {
    if (!bankList) return null;
    if (bankList.kind === "unconfigured") {
      return <p className={styles.pickerNotice}>{t("configError")}</p>;
    }
    if (bankList.kind === "failed") {
      return <p className={styles.pickerNotice}>{t("banksLoadFailed")}</p>;
    }
    return (
      <BankPicker
        banks={bankList.banks}
        connectedKeys={connectedKeys(banks)}
        action={connect}
        cancelHref={cancelHref}
      />
    );
  };

  return (
    <PageLayout theme="finances">
      <div className={styles.root}>
        {errorCode && (
          <p role="alert" className={styles.error}>
            {t(`errors.${errorCode}`)}
          </p>
        )}

        {isFirstBank ? (
          <>
            <div className={styles.intro}>
              <span className={styles.eyebrow}>{t("firstBank.eyebrow")}</span>
              <h1 className={styles.introTitle}>{t("firstBank.title")}</h1>
              <p className={styles.introLead}>{t("firstBank.lead")}</p>
            </div>
            <div className={styles.firstBankLayout}>
              <section className={styles.pickerCard}>{picker()}</section>
              <aside className={styles.howItWorks}>
                <div className={styles.howCard}>
                  <span className={styles.howTitle}>
                    {t("firstBank.howTitle")}
                  </span>
                  {(["step1", "step2", "step3"] as const).map((step, index) => (
                    <div key={step} className={styles.howStep}>
                      <span className={styles.howNumber}>{index + 1}</span>
                      <span className={styles.howText}>
                        {t(`firstBank.${step}`)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className={styles.readOnlyNote}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                  <span>{t("firstBank.readOnly")}</span>
                </div>
              </aside>
            </div>
          </>
        ) : (
          <>
            <div className={styles.titleRow}>
              <div className={styles.titleText}>
                <h1 className={styles.title}>{t("title")}</h1>
                <p className={styles.subtitle}>{t("subtitle")}</p>
              </div>
              <Link
                href={{ pathname: "/finances", query: { add: "1" } }}
                className={styles.addButton}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {t("addBank")}
              </Link>
            </div>

            {banks.length > 0 && (
              <section className={styles.banksSection}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>{t("banksHeading")}</h2>
                  <span className={styles.sectionHint}>
                    {t("sortedByBalance")}
                  </span>
                </div>
                <div className={styles.bankGrid}>
                  {banks.map((bank) => (
                    <BankCard key={bank.id} bank={bank} />
                  ))}
                  <Link
                    href={{ pathname: "/finances", query: { add: "1" } }}
                    className={styles.addCard}
                  >
                    <span className={styles.addCardIcon}>
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                    <span className={styles.addCardTitle}>
                      {t("addBankCardTitle")}
                    </span>
                    <span className={styles.addCardText}>
                      {t("addBankCardText")}
                    </span>
                  </Link>
                </div>
              </section>
            )}

            <PendingConnections
              pending={pending}
              retryAction={retry}
              discardAction={discard}
            />
          </>
        )}

        {showDialog && <AddBankDialog>{picker("/finances")}</AddBankDialog>}
      </div>
    </PageLayout>
  );
}
