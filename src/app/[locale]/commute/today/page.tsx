import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { getCommuteStatusAction, listMyCommuteConfigsAction } from "@/app/actions/commute";
import { redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";

import styles from "../page.module.css";
import { CommuteTodayClient } from "./CommuteTodayClient";

export default async function CommuteTodayPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ config?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { locale } = await params;

  if (!session) {
    return redirect({
      href: { pathname: "/auth/signin", query: { callbackUrl: "/commute/today" } },
      locale,
    });
  }

  const t = await getTranslations("Commute");
  const [{ config: requestedConfigId }, configsResult] = await Promise.all([searchParams, listMyCommuteConfigsAction()]);

  const configs = configsResult.success ? configsResult.configs : [];
  const defaultConfigId = configs.find((c) => c.isDefault)?.id ?? configs[0]?.id ?? null;
  const selectedConfigId =
    requestedConfigId && configs.some((c) => c.id === requestedConfigId) ? requestedConfigId : defaultConfigId;

  const initialResult = selectedConfigId ? await getCommuteStatusAction(selectedConfigId) : null;

  return (
    <PageLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("todayTitle")}</h1>
          <p className={styles.subtitle}>{t("todaySubtitle")}</p>
        </div>
        <CommuteTodayClient configs={configs} selectedConfigId={selectedConfigId} initialResult={initialResult} />
      </div>
    </PageLayout>
  );
}
