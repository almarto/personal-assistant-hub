import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { getMyCommuteConfigAction } from "@/app/actions/commute";
import { redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";

import { CommuteConfigClient } from "./CommuteConfigClient";
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

  const result = await getMyCommuteConfigAction();
  const initialConfig = result.success ? result.config : null;

  return (
    <PageLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("title")}</h1>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </div>
        <CommuteConfigClient initialConfig={initialConfig} />
      </div>
    </PageLayout>
  );
}
