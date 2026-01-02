import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Role, hasRole } from "@/lib/types/roles";
import Navigation from "@/systemUI/components/Navigation/Navigation";
import { Link } from "@/i18n/routing";
import styles from "./admin.module.css";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !hasRole(session.user.role, Role.ADMIN)) {
    redirect("/");
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          Baby Food Tracker
        </Link>
        <Navigation showLogout={true} />
      </header>
      {children}
    </div>
  );
}
