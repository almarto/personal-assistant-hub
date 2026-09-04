import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { requireTripAccess } from "@/lib/auth-guards";
import { getAttributeValues, getTripById, getTripChecklist } from "@/lib/services/trips";
import { TripAttributeValue } from "@/lib/types/trips";

import { AddItemForm } from "./components/AddItemForm";
import { AutoRefresh } from "./components/AutoRefresh";
import { ChecklistColumn } from "./components/ChecklistColumn";
import { ParticipantSummaryBar } from "./components/ParticipantSummaryBar";
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

  const t = await getTranslations("TripPlanner");
  const [attributeValues, checklist] = await Promise.all([getAttributeValues(), getTripChecklist(id)]);

  const tripAttributeValues: TripAttributeValue[] = [trip.vehicle, trip.overnight, ...trip.activities].filter(
    (v): v is TripAttributeValue => v !== null
  );

  const isAdmin = access.type === "admin";
  const viewerParticipantId = access.participantId;

  return (
    <div className={styles.container}>
      <AutoRefresh />
      <TripHeader trip={trip} attributeValues={attributeValues} isAdmin={isAdmin} />

      <ParticipantSummaryBar progress={checklist.progress} />

      <div className={styles.columns}>
        {/* Everyone with a stake in the trip (including the creator, who is
            always also a participant) sees only their own list - the
            summary bar above already covers everyone else's progress. The
            all-participants overview below is a fallback for an admin who
            isn't a participant on this particular trip. */}
        {viewerParticipantId ? (
          <ChecklistColumn
            tripId={id}
            heading={t("individual")}
            kind="individual"
            items={checklist.individualByParticipant[viewerParticipantId] || []}
            participantId={viewerParticipantId}
            tripAttributeValues={tripAttributeValues}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className={styles.column}>
              <div className={styles.columnHeader}>
                <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>{t("addIndividualItem")}</h2>
              </div>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem", marginTop: 0 }}>
                {t("addIndividualItemHint")}
              </p>
              <AddItemForm tripId={id} defaultIsShared={false} tripAttributeValues={tripAttributeValues} />
            </div>
            {trip.participants.map((p) => (
              <ChecklistColumn
                key={p.id}
                tripId={id}
                heading={p.display_name}
                kind="individual"
                items={checklist.individualByParticipant[p.id] || []}
                participantId={p.id}
                tripAttributeValues={tripAttributeValues}
                showAddForm={false}
              />
            ))}
          </div>
        )}

        <ChecklistColumn
          tripId={id}
          heading={t("group")}
          kind="shared"
          items={checklist.shared}
          participants={trip.participants}
          tripAttributeValues={tripAttributeValues}
        />
      </div>
    </div>
  );
}
