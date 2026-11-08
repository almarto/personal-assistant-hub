"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin, requireTripAccess } from "@/lib/auth-guards";
import * as db from "@/lib/services/trips";
import type { CreateTripInput, TripAttributeCategory } from "@/lib/types/trips";

export async function createAttributeValueAction(data: {
  category: TripAttributeCategory;
  name: string;
}) {
  const session = await requireAdmin();
  try {
    const value = await db.createAttributeValue(
      session.user.id,
      data.category,
      data.name.trim()
    );
    return { error: null, value };
  } catch (error) {
    if (error instanceof db.DuplicateAttributeValueError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function createTripAction(
  data: CreateTripInput & {
    participants: { email: string; display_name: string }[];
  }
) {
  const session = await requireAdmin();
  try {
    const trip = await db.createTrip(session.user.id, {
      name: data.name,
      start_date: data.start_date,
      end_date: data.end_date,
      notes: data.notes,
      vehicle_value_id: data.vehicle_value_id,
      overnight_value_id: data.overnight_value_id,
      activity_value_ids: data.activity_value_ids,
    });
    for (const participant of data.participants) {
      await db.inviteParticipant(trip.id, participant);
    }
    revalidatePath("/trip-planner");
    return { error: null, tripId: trip.id };
  } catch (error) {
    if (
      error instanceof db.AttributeValueNotFoundError ||
      error instanceof db.ParticipantAlreadyInvitedError
    ) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function updateTripAction(
  tripId: string,
  data: Partial<CreateTripInput>
) {
  await requireAdmin();
  try {
    const updated = await db.updateTrip(tripId, data);
    if (!updated) return { error: "Trip not found" };
    revalidatePath("/trip-planner");
    revalidatePath(`/trips/${tripId}`);
    return { error: null };
  } catch (error) {
    if (error instanceof db.AttributeValueNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function deleteTripAction(tripId: string) {
  await requireAdmin();
  await db.deleteTrip(tripId);
  revalidatePath("/trip-planner");
}

export async function inviteParticipantAction(
  tripId: string,
  data: { email: string; display_name: string }
) {
  await requireAdmin();
  try {
    await db.inviteParticipant(tripId, data);
    revalidatePath(`/trips/${tripId}`);
    return { error: null };
  } catch (error) {
    if (
      error instanceof db.ParticipantAlreadyInvitedError ||
      error instanceof db.TripNotFoundError
    ) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function removeParticipantAction(
  tripId: string,
  participantId: string
) {
  await requireAdmin();
  await db.removeParticipant(participantId);
  revalidatePath(`/trips/${tripId}`);
}

export async function createPackingItemAction(data: {
  tripId: string;
  name: string;
  is_shared: boolean;
  attributeValueIds: string[];
}) {
  const access = await requireTripAccess(data.tripId);
  try {
    await db.createPackingItem({
      name: data.name.trim(),
      is_shared: data.is_shared,
      attributeValueIds: data.attributeValueIds,
      createdByParticipantId: access.participantId,
    });
    revalidatePath(`/trips/${data.tripId}`);
    return { error: null };
  } catch (error) {
    if (error instanceof db.AttributeValueNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function updatePackingItemAction(data: {
  tripId: string;
  packingItemId: string;
  name: string;
  is_shared: boolean;
  attributeValueIds: string[];
}) {
  await requireTripAccess(data.tripId);
  try {
    await db.updatePackingItem(data.packingItemId, {
      name: data.name.trim(),
      is_shared: data.is_shared,
      attributeValueIds: data.attributeValueIds,
    });
    revalidatePath(`/trips/${data.tripId}`);
    return { error: null };
  } catch (error) {
    if (error instanceof db.AttributeValueNotFoundError) {
      return { error: error.message };
    }
    if (error instanceof db.PackingItemNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function toggleIndividualChecklistItemAction(
  tripId: string,
  packingItemId: string,
  targetParticipantId: string | null,
  checked: boolean
) {
  const access = await requireTripAccess(tripId);
  const participantId =
    access.type === "admin" ? targetParticipantId : access.participantId;
  if (!participantId) return { error: "No participant to update" };
  try {
    await db.setChecklistItemChecked(
      tripId,
      packingItemId,
      participantId,
      checked
    );
    revalidatePath(`/trips/${tripId}`);
    return { error: null };
  } catch (error) {
    if (error instanceof db.PackingItemNotFoundError)
      return { error: error.message };
    throw error;
  }
}

export async function toggleSharedChecklistItemAction(
  tripId: string,
  packingItemId: string,
  checked: boolean
) {
  await requireTripAccess(tripId);
  try {
    await db.setChecklistItemChecked(tripId, packingItemId, null, checked);
    revalidatePath(`/trips/${tripId}`);
    return { error: null };
  } catch (error) {
    if (error instanceof db.PackingItemNotFoundError)
      return { error: error.message };
    throw error;
  }
}

export async function assignChecklistItemAction(
  tripId: string,
  packingItemId: string,
  assignedParticipantId: string | null
) {
  await requireTripAccess(tripId);
  try {
    await db.assignChecklistItem(tripId, packingItemId, assignedParticipantId);
    revalidatePath(`/trips/${tripId}`);
    return { error: null };
  } catch (error) {
    if (error instanceof db.PackingItemNotFoundError)
      return { error: error.message };
    throw error;
  }
}
