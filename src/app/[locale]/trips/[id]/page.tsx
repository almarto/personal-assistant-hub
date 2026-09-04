import { notFound } from "next/navigation";

import { requireTripAccess } from "@/lib/auth-guards";
import { getAttributeValues, getTripById, getTripChecklist } from "@/lib/services/trips";
import { TripAttributeValue } from "@/lib/types/trips";

import { AutoRefresh } from "./components/AutoRefresh";
import { ChecklistSection } from "./components/ChecklistSection";
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

  const [attributeValues, checklist] = await Promise.all([getAttributeValues(), getTripChecklist(id)]);

  const tripAttributeValues: TripAttributeValue[] = [trip.vehicle, trip.overnight, ...trip.activities].filter(
    (v): v is TripAttributeValue => v !== null
  );

  const isAdmin = access.type === "admin";
  const viewerParticipantId = access.participantId;

  const assignedToViewer = viewerParticipantId
    ? checklist.shared.filter((item) => item.assignedParticipantId === viewerParticipantId)
    : [];
  const viewerGroupTotal = assignedToViewer.length;
  const viewerGroupMissing = assignedToViewer.filter((item) => !item.checked).length;

  return (
    <div className={styles.container}>
      <AutoRefresh />
      <TripHeader trip={trip} attributeValues={attributeValues} isAdmin={isAdmin} />

      <ParticipantSummaryBar
        progress={checklist.progress}
        groupItemsTotal={viewerGroupTotal}
        groupItemsMissing={viewerGroupMissing}
      />

      <ChecklistSection
        tripId={id}
        viewerParticipantId={viewerParticipantId}
        participants={trip.participants}
        individualByParticipant={checklist.individualByParticipant}
        sharedItems={checklist.shared}
        tripAttributeValues={tripAttributeValues}
      />
    </div>
  );
}
