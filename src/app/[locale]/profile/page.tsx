import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";

import { auth } from "@/lib/auth";
import { ProfileClient } from "./ProfileClient";
import styles from "./page.module.css";
import { Role } from "@/lib/types/roles";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const { locale } = await params;

  if (!session) {
    return redirect({
      href: {
        pathname: "/auth/signin",
        query: {
          callbackUrl: "/profile",
        },
      },
      locale,
    });
  }

  const t = await getTranslations("Navigation");

  const user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    username: (session.user as any).username || "",
    role: session.user.role as Role,
  };

  return (
    <div>
      <div className={styles.header}>
        <h2 className={styles.title}>{t("profile")}</h2>
      </div>
      <ProfileClient user={user} />
    </div>
  );
}
