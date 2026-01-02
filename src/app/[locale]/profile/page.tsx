import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import Navigation from "@/systemUI/components/Navigation/Navigation";
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
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t("profile")}</h1>
        <Navigation showLogout={true} />
      </header>
      <div className={styles.content}>
        <ProfileClient user={user} />
      </div>
    </div>
  );
}
