import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";

import { CommuteConfigClient } from "../CommuteConfigClient";
import styles from "../page.module.css";

export default async function NewCommuteConfigPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { locale } = await params;

  if (!session) {
    return redirect({
      href: { pathname: "/auth/signin", query: { callbackUrl: "/commute/new" } },
      locale,
    });
  }

  const t = await getTranslations("Commute");

  return (
    <PageLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("newConfigTitle")}</h1>
        </div>
        <CommuteConfigClient mode="create" />
      </div>
    </PageLayout>
  );
}
