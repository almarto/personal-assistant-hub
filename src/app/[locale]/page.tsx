import { Activity, Boxes, Calendar } from "lucide-react";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { Button } from "@/systemUI/components/Button/Button";
import Navigation from "@/systemUI/components/Navigation/Navigation";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";

import styles from "./page.module.css";

export default async function HubHome() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const t = await getTranslations("HomePage");
  const launcherT = await getTranslations("Launcher");

  if (!session) {
    return (
      <div className={styles.container}>
        <header className={styles.landingHeader}>
          <Navigation />
        </header>
        <div className={styles.mainContent}>
          <div className={styles.hero}>
            <h1 className={styles.title}>{t("title")}</h1>
            <p className={styles.subtitle}>{t("subtitle")}</p>
            <div className={styles.actions}>
              <Link href="/auth/signin">
                <Button size="lg" className={styles.button}>
                  {t("login")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageLayout
      showLogo={false}
      headerContent={
        <h1 className={styles.welcome}>
          {t("welcome", { name: session.user.name })}
        </h1>
      }
    >
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{t("apps")}</h2>
      </div>

      <div className={styles.appGrid}>
        <div className={styles.appCard}>
          <Link href="/baby" className={styles.appCardLink}>
            <div className={styles.iconWrapper}>
              <Activity size={28} />
            </div>
            <h3 className={styles.appTitle}>
              {launcherT("babyTracker.title")}
            </h3>
            <p className={styles.appDescription}>
              {launcherT("babyTracker.description")}
            </p>
          </Link>
        </div>

        <div className={styles.appCard}>
          <Link href="/schedule" className={styles.appCardLink}>
            <div className={styles.iconWrapper}>
              <Calendar size={28} />
            </div>
            <h3 className={styles.appTitle}>{launcherT("schedule.title")}</h3>
            <p className={styles.appDescription}>
              {launcherT("schedule.description")}
            </p>
          </Link>
        </div>

        <div className={styles.appCard}>
          <Link href="/inventory" className={styles.appCardLink}>
            <div className={styles.iconWrapper}>
              <Boxes size={28} />
            </div>
            <h3 className={styles.appTitle}>{launcherT("inventory.title")}</h3>
            <p className={styles.appDescription}>
              {launcherT("inventory.description")}
            </p>
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}
