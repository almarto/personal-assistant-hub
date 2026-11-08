import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { startConnectionAction } from "@/app/actions/finances";
import { redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import type { BankingClient } from "@/lib/services/finances/client";
import { createBankingClient } from "@/lib/services/finances/client";
import { getEnableBankingConfig } from "@/lib/services/finances/config";
import { listConnectionsForUser } from "@/lib/services/finances/connections";
import type { BankCountry } from "@/lib/services/finances/types";
import { BANK_COUNTRIES, PSU_TYPE } from "@/lib/services/finances/types";
import { Button } from "@/systemUI/components/Button/Button";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";

import { AccountSummary } from "./AccountSummary";
import styles from "./page.module.css";

const ERROR_CODES = [
  "invalid_state",
  "access_denied",
  "session_failed",
  "invalid_request",
  "start_failed",
] as const;

type ErrorCode = (typeof ERROR_CODES)[number];

function isErrorCode(value: string | undefined): value is ErrorCode {
  return ERROR_CODES.some((code) => code === value);
}

function isBankCountry(value: string | undefined): value is BankCountry {
  return BANK_COUNTRIES.some((country) => country === value);
}

function createClientOrNull(): BankingClient | null {
  try {
    return createBankingClient(getEnableBankingConfig());
  } catch (error) {
    console.error("Enable Banking is not configured:", error);
    return null;
  }
}

export default async function FinancesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ bankCountry?: string; error?: string }>;
}) {
  const { locale } = await params;
  const { bankCountry, error } = await searchParams;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return redirect({
      href: { pathname: "/auth/signin", query: { callbackUrl: "/finances" } },
      locale,
    });
  }

  const t = await getTranslations("Finances");
  const client = createClientOrNull();
  const connections = await listConnectionsForUser(session.user.id);
  const countryNames = new Intl.DisplayNames(locale, { type: "region" });

  const selectedCountry = isBankCountry(bankCountry) ? bankCountry : null;
  const aspsps =
    client && selectedCountry ? await client.listAspsps(selectedCountry) : null;
  if (aspsps && !aspsps.ok) {
    console.error("Loading banks failed:", aspsps.error.message);
  }

  async function connect(formData: FormData) {
    "use server";
    const result = await startConnectionAction(formData);
    console.error("Start connection failed:", result.error);
    return redirect({
      href: { pathname: "/finances", query: { error: "start_failed" } },
      locale,
    });
  }

  return (
    <PageLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("title")}</h1>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </div>

        {isErrorCode(error) && (
          <p className={styles.error}>{t(`errors.${error}`)}</p>
        )}
        {!client && <p className={styles.error}>{t("configError")}</p>}

        {client && (
          <section className={styles.section}>
            <form method="get" className={styles.form}>
              <label className={styles.field}>
                {t("bankCountryLabel")}
                <select
                  name="bankCountry"
                  defaultValue={selectedCountry ?? ""}
                  className={styles.select}
                  required
                >
                  <option value="" disabled>
                    —
                  </option>
                  {BANK_COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {countryNames.of(country)} ({country})
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" variant="outline">
                {t("loadBanks")}
              </Button>
            </form>

            {aspsps && !aspsps.ok && (
              <p className={styles.error}>{t("banksLoadFailed")}</p>
            )}

            {aspsps?.ok && selectedCountry && (
              <form action={connect} className={styles.form}>
                <input
                  type="hidden"
                  name="bankCountry"
                  value={selectedCountry}
                />
                <label className={styles.field}>
                  {t("bankLabel")}
                  <select name="aspspName" className={styles.select} required>
                    {aspsps.value.map((aspsp) => (
                      <option key={aspsp.name} value={aspsp.name}>
                        {aspsp.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  {t("psuTypeLabel")}
                  <select name="psuType" className={styles.select}>
                    <option value={PSU_TYPE.PERSONAL}>{t("personal")}</option>
                    <option value={PSU_TYPE.BUSINESS}>{t("business")}</option>
                  </select>
                </label>
                <Button type="submit">{t("connect")}</Button>
              </form>
            )}
          </section>
        )}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("connections")}</h2>
          {connections.length === 0 ? (
            <p className={styles.notice}>{t("noConnections")}</p>
          ) : (
            <ul className={styles.connectionList}>
              {connections.map((connection) => (
                <li key={connection.id} className={styles.connection}>
                  <p className={styles.connectionName}>
                    {connection.aspspName} ({connection.aspspCountry})
                  </p>
                  {connection.status === "pending" ? (
                    <p className={styles.meta}>{t("pending")}</p>
                  ) : (
                    <>
                      <p className={styles.meta}>
                        {t("validUntil", {
                          date: new Date(
                            connection.validUntil
                          ).toLocaleDateString(locale),
                        })}
                      </p>
                      {client && (
                        <ul className={styles.accountList}>
                          {connection.accounts.map((account) => (
                            <AccountSummary
                              key={account.uid}
                              client={client}
                              account={account}
                            />
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageLayout>
  );
}
