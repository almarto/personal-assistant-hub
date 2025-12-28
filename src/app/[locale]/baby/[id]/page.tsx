import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";

import { Link } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { getBaby } from "@/lib/services/babies";
import { Button } from "@/systemUI/components/Button/Button";
import Navigation from "@/systemUI/components/Navigation/Navigation";
import { Card } from "@/systemUI/components/Card/Card";

import styles from "../baby.module.css";

export default async function BabyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return null; // Or redirect
  }

  const baby = await getBaby(id, session.user.id);

  if (!baby) {
    notFound();
  }
  
  const t = await getTranslations("HomePage"); // Using HomePage for now as we don't have BabyDetails translations

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          Baby Food Tracker
        </Link>
        <Navigation showLogout={true} />
      </header>
      
      <Card className={styles.card} variant="elevated">
        <h1 className={styles.title}>{baby.name}</h1>
        <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          {new Date(baby.birth_date).toLocaleDateString()}
        </p>
        
        <div className={styles.backLink}>
          <Link href="/">
            <Button variant="ghost" leftIcon={<ArrowLeft size={16} />}>
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
