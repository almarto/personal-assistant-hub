import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { requireTripAccess } from "@/lib/auth-guards";
import { getAttributeValues, getTripById, getTripChecklist } from "@/lib/services/trips";
import { TripAttributeValue } from "@/lib/types/trips";

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
  const viewerParticipantId = access.type === "admin" ? null : access.participantId;

  return (
    <div className={styles.container}>
      <TripHeader trip={trip} attributeValues={attributeValues} isAdmin={isAdmin} />

      <ParticipantSummaryBar progress={checklist.progress} />

      <div className={styles.columns}>
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
            {trip.participants.map((p) => (
              <ChecklistColumn
                key={p.id}
                tripId={id}
                heading={p.display_name}
                kind="individual"
                items={checklist.individualByParticipant[p.id] || []}
                participantId={p.id}
                tripAttributeValues={tripAttributeValues}
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
