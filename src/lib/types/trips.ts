export type TripAttributeCategory = "vehicle" | "overnight_style" | "activity";

export interface TripAttributeValue {
  id: string;
  category: TripAttributeCategory;
  name: string;
  created_by: string;
  created_at: string;
}

export interface Trip {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  vehicle_value_id: string | null;
  overnight_value_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Public-facing participant shape. Deliberately has no `invite_token` — that
 * value must never reach a client bundle (it's a bearer credential for guest
 * access). Only `TripParticipantWithToken` (below) carries it, and only two
 * service functions return that type.
 */
export interface TripParticipant {
  id: string;
  trip_id: string;
  user_id: string | null;
  email: string;
  display_name: string;
  created_at: string;
}

export interface TripParticipantWithToken extends TripParticipant {
  invite_token: string;
}

export interface PackingItem {
  id: string;
  name: string;
  is_shared: boolean;
  created_by_participant_id: string | null;
  created_at: string;
}

export interface TripWithDetails extends Trip {
  vehicle: TripAttributeValue | null;
  overnight: TripAttributeValue | null;
  activities: TripAttributeValue[];
  participants: TripParticipant[];
}

export interface CreateTripInput {
  name: string;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  vehicle_value_id: string | null;
  overnight_value_id: string | null;
  activity_value_ids: string[];
}

/**
 * Deliberate deviation from the spec's single discriminated `ChecklistEntry` union:
 * the checklist is naturally produced and consumed *by column*, not as one mixed list.
 * `getTripChecklist` already groups individual items by participant and shared items
 * separately, and `ChecklistColumn` already knows which kind it's rendering from its
 * own `kind` prop. A `kind` discriminant on every item would be redundant in both
 * places. `ChecklistIndividualItem` / `ChecklistSharedItem` carry exactly the fields
 * each column needs instead.
 */
export interface ChecklistIndividualItem {
  packingItemId: string;
  name: string;
  checked: boolean;
}

export interface ChecklistSharedItem {
  packingItemId: string;
  name: string;
  checked: boolean;
  assignedParticipantId: string | null;
}

export interface TripChecklist {
  individualByParticipant: Record<string, ChecklistIndividualItem[]>;
  shared: ChecklistSharedItem[];
}

export interface ParticipantProgress {
  participantId: string;
  displayName: string;
  packed: number;
  total: number;
}

export interface TripListItem {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  vehicleName: string | null;
  overnightName: string | null;
  activityNames: string[];
  participantId: string | null;
  packed: number;
  total: number;
}
