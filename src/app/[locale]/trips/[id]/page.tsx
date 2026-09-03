import { notFound } from "next/navigation";

import { requireTripAccess } from "@/lib/auth-guards";
import { getAttributeValues, getTripById } from "@/lib/services/trips";

import { TripHeader } from "./components/TripHeader";
import styles from "./page.module.css";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await requireTripAccess(id);
  const trip = await getTripById(id);
  if (!trip) notFound();

  const attributeValues = await getAttributeValues();

  return (
    <div className={styles.container}>
      <TripHeader trip={trip} attributeValues={attributeValues} isAdmin={access.type === "admin"} />
    </div>
  );
}
