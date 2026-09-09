import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { listMyCommuteConfigsAction } from "@/app/actions/commute";
import { Link, redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { Button } from "@/systemUI/components/Button/Button";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";

import { CommuteConfigListClient } from "./CommuteConfigListClient";
import styles from "./page.module.css";

export default async function CommutePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { locale } = await params;

  if (!session) {
    return redirect({
      href: { pathname: "/auth/signin", query: { callbackUrl: "/commute" } },
      locale,
    });
  }

  const t = await getTranslations("Commute");

  const result = await listMyCommuteConfigsAction();
  const configs = result.success ? result.configs : [];

  return (
    <PageLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("title")}</h1>
          <p className={styles.subtitle}>{t("subtitle")}</p>
          <div className={styles.headerActions}>
            <Link href="/commute/today">
              <Button variant="outline">{t("viewToday")}</Button>
            </Link>
          </div>
        </div>
        <CommuteConfigListClient configs={configs} />
      </div>
    </PageLayout>
  );
}
