import { getTranslations } from "next-intl/server";

import { requireAdmin } from "@/lib/auth-guards";
import { getAttributeValues } from "@/lib/services/trips";

import styles from "../../page.module.css";
import { NewTripForm } from "./NewTripForm";

export default async function NewTripPage() {
  await requireAdmin();
  const t = await getTranslations("TripPlanner");
  const attributeValues = await getAttributeValues();

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t("newTrip")}</h1>
      <NewTripForm attributeValues={attributeValues} />
    </div>
  );
}
