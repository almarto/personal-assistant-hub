import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { Button } from "@/systemUI/components/Button/Button";
import { Card } from "@/systemUI/components/Card/Card";
import styles from "./page.module.css";
import { Plus } from "lucide-react";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    return (
      <div className={styles.container}>
        <div className={styles.hero}>
          <h1 className={styles.title}>Baby Food Tracker</h1>
          <p className={styles.subtitle}>
            Track your baby&apos;s journey to solid foods with ease. Monitor reactions, preferences, and progress.
          </p>
          <div className={styles.actions}>
            <Link href="/auth/signin"> 
              <Button size="lg" className={styles.button}>Login</Button>
            </Link>
            <Link href="/auth/signup">
              <Button variant="outline" size="lg" className={styles.button}>Register</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.header}>
        <h1 className={styles.welcome}>Welcome, {session.user.name}</h1>
      </header>

      <main className={styles.grid}>
        <Card className={styles.emptyCard}>
           <h2 className={styles.cardTitle}>Your Babies</h2>
           <p className={styles.cardText}>No babies added yet.</p>
           <Link href="/baby/add">
             <Button leftIcon={<Plus size={20} />}>
               Add Baby
             </Button>
           </Link>
        </Card>
      </main>
    </div>
  );
}
