import { ArrowLeft, Plus,Settings } from "lucide-react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { DateDisplay } from "@/components/DateDisplay";
import ShareBabyButton from "@/components/ShareBabyButton";
import { Link, redirect } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { getBaby } from "@/lib/services/babies";
import { getFoodEntries } from "@/lib/services/foods";
import { Button } from "@/systemUI/components/Button/Button";
import { Card } from "@/systemUI/components/Card/Card";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";

import styles from "../baby.module.css";
import FoodList from "./FoodList";

export default async function BabyPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return redirect({
      href: {
        pathname: "/auth/signin",
        query: {
          callbackUrl: `/baby/${id}`,
        },
      },
      locale,
    });
  }

  const baby = await getBaby(id, session.user.id);

  if (!baby) {
    notFound();
  }

  const foods = await getFoodEntries(id, session.user.id);
  const tFood = await getTranslations("Food");

  return (
    <PageLayout>
      <Card className={styles.card} variant="elevated">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h1 className={styles.title} style={{ margin: 0 }}>
            {baby.name}
          </h1>
          {(baby.role === "owner" || baby.role === "parent") && (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <Link href={`/baby/${baby.id}/settings`}>
                <Button variant="ghost" size="sm">
                  <Settings size={20} />
                </Button>
              </Link>
              <div style={{ width: "auto" }}>
                <ShareBabyButton babyId={baby.id} babyName={baby.name} />
              </div>
            </div>
          )}
        </div>

        <DateDisplay date={baby.birth_date} variant="card" />

        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{tFood("title")}</h2>
          <Link href={`/baby/${baby.id}/foods/add`}>
            <Button size="sm" leftIcon={<Plus size={16} />}>
              {tFood("addFood")}
            </Button>
          </Link>
        </div>
        <FoodList foods={foods} />

        <div className={styles.backLink}>
          <Link href="/">
            <Button variant="ghost" leftIcon={<ArrowLeft size={16} />}>
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </PageLayout>
  );
}
