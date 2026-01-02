import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { ProfileClient } from "./ProfileClient";
import styles from "./page.module.css";
import { Role } from "@/lib/types/roles";

export default async function ProfilePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/signin");
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
