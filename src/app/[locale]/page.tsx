import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Link } from "@/i18n/routing";
import { Button } from "@/systemUI/components/Button/Button";
import { Card } from "@/systemUI/components/Card/Card";
import styles from "./page.module.css";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import LanguageSwitcher from "@/systemUI/components/LanguageSwitcher/LanguageSwitcher";
import LogoutButton from "@/systemUI/components/LogoutButton/LogoutButton";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  const t = await getTranslations('HomePage');

  // Common header with Language Switcher
  const TopBar = () => (
    <div className={styles.topBar}>
      <LanguageSwitcher />
      {session && <LogoutButton />}
    </div>
  );

  if (!session) {
    return (
      <div className={styles.container}>
        <TopBar />
        <div className={styles.hero}>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.subtitle}>
            {t('subtitle')}
          </p>
          <div className={styles.actions}>
            <Link href="/auth/signin"> 
              <Button size="lg" className={styles.button}>{t('login')}</Button>
            </Link>
            <Link href="/auth/signup">
              <Button variant="outline" size="lg" className={styles.button}>{t('register')}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      <TopBar />
      <header className={styles.header}>
        <h1 className={styles.welcome}>{t('welcome', {name: session.user.name})}</h1>
      </header>

      <main className={styles.grid}>
        <Card className={styles.emptyCard}>
           <h2 className={styles.cardTitle}>{t('yourBabies')}</h2>
           <p className={styles.cardText}>{t('noBabies')}</p>
           <Link href="/baby/add">
             <Button leftIcon={<Plus size={20} />}>
               {t('addBaby')}
             </Button>
           </Link>
        </Card>
      </main>
    </div>
  );
}