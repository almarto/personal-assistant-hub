import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getCommuteConfigDetailAction } from "@/app/actions/commute";
import { redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";

import { CommuteConfigClient } from "../CommuteConfigClient";
import styles from "../page.module.css";

export default async function EditCommuteConfigPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { locale, id } = await params;

  if (!session) {
    return redirect({
      href: { pathname: "/auth/signin", query: { callbackUrl: `/commute/${id}` } },
      locale,
    });
  }

  const t = await getTranslations("Commute");
  const result = await getCommuteConfigDetailAction(id);
  if (!result.success || !result.config) {
    notFound();
  }

  return (
    <PageLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("editConfigTitle")}</h1>
        </div>
        <CommuteConfigClient mode="edit" config={result.config} />
      </div>
    </PageLayout>
  );
}
