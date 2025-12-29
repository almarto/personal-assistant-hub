import { Plus } from "lucide-react";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { getBabies } from "@/lib/services/babies";
import { Button } from "@/systemUI/components/Button/Button";
import { Card } from "@/systemUI/components/Card/Card";
import Navigation from "@/systemUI/components/Navigation/Navigation";

import styles from "./page.module.css";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const t = await getTranslations("HomePage");

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

  const babies = await getBabies(session.user.id);

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.header}>
        <h1 className={styles.welcome}>
          {t("welcome", { name: session.user.name })}
        </h1>
        <Navigation showLogout={true} />
      </header>

      <main className={styles.grid}>
        {babies.length === 0 ? (
          <Card className={styles.emptyCard}>
            <h2 className={styles.cardTitle}>{t("yourBabies")}</h2>
            <p className={styles.cardText}>{t("noBabies")}</p>
            <Link href="/baby/add">
              <Button leftIcon={<Plus size={20} />}>{t("addBaby")}</Button>
            </Link>
          </Card>
        ) : (
          <>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t("yourBabies")}</h2>
              <Link href="/baby/add">
                <Button size="sm" leftIcon={<Plus size={16} />}>
                  {t("addBaby")}
                </Button>
              </Link>
            </div>
            {babies.map((baby) => (
              <Link
                href={`/baby/${baby.id}`}
                key={baby.id}
                className={styles.babyCardLink}
              >
                <Card className={styles.babyCard}>
                  <h3 className={styles.babyName}>{baby.name}</h3>
                  <p className={styles.babyInfo}>
                    {new Date(baby.birth_date).toLocaleDateString()}
                  </p>
                </Card>
              </Link>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
