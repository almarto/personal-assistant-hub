import crypto from "crypto";

import { pool, query } from "@/lib/db";
import { emailService } from "@/lib/services/email";
import { generateTripInviteEmailHtml } from "@/lib/services/email/templates/trip-invite";
import type {
  CreateTripInput,
  PackingItem,
  ParticipantProgress,
  TripAttributeCategory,
  TripAttributeValue,
  TripChecklist,
  TripListItem,
  TripParticipantWithToken,
  TripWithDetails,
} from "@/lib/types/trips";

// node-pg parses Postgres DATE columns (oid 1082) into JS `Date` objects by
// default. This repo's `Trip`/`TripListItem` types declare start_date/end_date
// as `string | null` (YYYY-MM-DD), so normalize at the service boundary
// wherever a DATE column's raw row value crosses into a returned object.
function toDateString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value as string;
}

export class TripNotFoundError extends Error {
  constructor(tripId: string) {
    super(`Trip not found: ${tripId}`);
    this.name = "TripNotFoundError";
  }
}

export class AttributeValueNotFoundError extends Error {
  constructor(id: string) {
    super(`Attribute value not found: ${id}`);
    this.name = "AttributeValueNotFoundError";
  }
}

export class DuplicateAttributeValueError extends Error {
  constructor(category: string, name: string) {
    super(`"${name}" already exists for ${category}`);
    this.name = "DuplicateAttributeValueError";
  }
}

export class ParticipantNotFoundError extends Error {
  constructor(participantId: string) {
    super(`Participant not found: ${participantId}`);
    this.name = "ParticipantNotFoundError";
  }
}

export class ParticipantAlreadyInvitedError extends Error {
  constructor(email: string) {
    super(`${email} is already invited to this trip`);
    this.name = "ParticipantAlreadyInvitedError";
  }
}

export class InvalidInviteTokenError extends Error {
  constructor() {
    super("Invalid or expired invite link");
    this.name = "InvalidInviteTokenError";
  }
}

export class PackingItemNotFoundError extends Error {
  constructor(packingItemId: string) {
    super(`Packing item not found: ${packingItemId}`);
    this.name = "PackingItemNotFoundError";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isUniqueViolation(error: any): boolean {
  return error?.code === "23505";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isForeignKeyViolation(error: any): boolean {
  return error?.code === "23503";
}

// A trip's applicable attribute-value ids: vehicle + overnight style + every
// selected activity. Requires a `trips` row in scope aliased `t`.
const TRIP_ATTR_IDS_SQL = `
  ARRAY_REMOVE(ARRAY[t.vehicle_value_id, t.overnight_value_id], NULL::uuid)
    || COALESCE(
      (SELECT ARRAY_AGG(ta.attribute_value_id) FROM trip_activities ta WHERE ta.trip_id = t.id),
      ARRAY[]::UUID[]
    )
`;

// ---------- Attribute values ----------

export async function getAttributeValues(
  category?: TripAttributeCategory
): Promise<TripAttributeValue[]> {
  if (category) {
    const result = await query(
      `SELECT * FROM trip_attribute_values WHERE category = $1 ORDER BY name`,
      [category]
    );
    return result.rows;
  }
  const result = await query(`SELECT * FROM trip_attribute_values ORDER BY category, name`);
  return result.rows;
}

export async function createAttributeValue(
  userId: string,
  category: TripAttributeCategory,
  name: string
): Promise<TripAttributeValue> {
  try {
    const result = await query(
      `INSERT INTO trip_attribute_values (category, name, created_by) VALUES ($1, $2, $3) RETURNING *`,
      [category, name, userId]
    );
    return result.rows[0];
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new DuplicateAttributeValueError(category, name);
    }
    throw error;
  }
}

async function assertAttributeValuesExist(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const result = await query(`SELECT id FROM trip_attribute_values WHERE id = ANY($1::uuid[])`, [
    ids,
  ]);
  const found = new Set(result.rows.map((r) => r.id));
  for (const id of ids) {
    if (!found.has(id)) throw new AttributeValueNotFoundError(id);
  }
}

// ---------- Trips ----------

export async function getTrips(userId: string, isAdmin: boolean): Promise<TripListItem[]> {
  const result = await query(
    `
    WITH trip_attrs AS (
      SELECT t.id AS trip_id, ${TRIP_ATTR_IDS_SQL} AS attr_ids
      FROM trips t
    ),
    viewer_participant AS (
      SELECT trip_id, id AS participant_id FROM trip_participants WHERE user_id = $1
    )
    SELECT
      t.id, t.name, t.start_date, t.end_date,
      v.name AS vehicle_name,
      o.name AS overnight_name,
      COALESCE(
        (SELECT ARRAY_AGG(av.name ORDER BY av.name)
         FROM trip_activities act
         JOIN trip_attribute_values av ON av.id = act.attribute_value_id
         WHERE act.trip_id = t.id),
        ARRAY[]::TEXT[]
      ) AS activity_names,
      vp.participant_id,
      COALESCE(ind.total, 0) + COALESCE(shr.total, 0) AS total,
      COALESCE(ind.packed, 0) + COALESCE(shr.packed, 0) AS packed
    FROM trips t
    JOIN trip_attrs tas ON tas.trip_id = t.id
    LEFT JOIN trip_attribute_values v ON v.id = t.vehicle_value_id
    LEFT JOIN trip_attribute_values o ON o.id = t.overnight_value_id
    LEFT JOIN viewer_participant vp ON vp.trip_id = t.id
    LEFT JOIN LATERAL (
      SELECT COUNT(DISTINCT pi.id) AS total, COUNT(DISTINCT pi.id) FILTER (WHERE cs.checked) AS packed
      FROM packing_items pi
      JOIN packing_item_tags pit
        ON pit.packing_item_id = pi.id AND pit.attribute_value_id = ANY(tas.attr_ids)
      LEFT JOIN trip_checklist_state cs
        ON cs.trip_id = t.id AND cs.packing_item_id = pi.id AND cs.participant_id = vp.participant_id
      WHERE pi.is_shared = false AND vp.participant_id IS NOT NULL
    ) ind ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(DISTINCT pi.id) AS total, COUNT(DISTINCT pi.id) FILTER (WHERE cs.checked) AS packed
      FROM packing_items pi
      JOIN packing_item_tags pit
        ON pit.packing_item_id = pi.id AND pit.attribute_value_id = ANY(tas.attr_ids)
      LEFT JOIN trip_checklist_state cs
        ON cs.trip_id = t.id AND cs.packing_item_id = pi.id AND cs.participant_id IS NULL
      WHERE pi.is_shared = true AND vp.participant_id IS NOT NULL
        AND cs.assigned_participant_id = vp.participant_id
    ) shr ON true
    WHERE $2 = true OR vp.participant_id IS NOT NULL
    ORDER BY t.start_date DESC NULLS LAST, t.created_at DESC
    `,
    [userId, isAdmin]
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    start_date: toDateString(row.start_date),
    end_date: toDateString(row.end_date),
    vehicleName: row.vehicle_name,
    overnightName: row.overnight_name,
    activityNames: row.activity_names,
    participantId: row.participant_id,
    packed: Number(row.packed),
    total: Number(row.total),
  }));
}

export async function getTripById(tripId: string): Promise<TripWithDetails | null> {
  const result = await query(
    `
    SELECT
      t.*,
      row_to_json(v) AS vehicle,
      row_to_json(o) AS overnight,
      COALESCE(
        (SELECT json_agg(row_to_json(av) ORDER BY av.name)
         FROM trip_activities act JOIN trip_attribute_values av ON av.id = act.attribute_value_id
         WHERE act.trip_id = t.id),
        '[]'::json
      ) AS activities,
      COALESCE(
        (SELECT json_agg(
                  json_build_object(
                    'id', tp.id, 'trip_id', tp.trip_id, 'user_id', tp.user_id,
                    'email', tp.email, 'display_name', tp.display_name, 'created_at', tp.created_at
                  ) ORDER BY tp.display_name
                )
         FROM trip_participants tp WHERE tp.trip_id = t.id),
        '[]'::json
      ) AS participants
    FROM trips t
    LEFT JOIN trip_attribute_values v ON v.id = t.vehicle_value_id
    LEFT JOIN trip_attribute_values o ON o.id = t.overnight_value_id
    WHERE t.id = $1
    `,
    [tripId]
  );
  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    start_date: toDateString(row.start_date),
    end_date: toDateString(row.end_date),
    notes: row.notes,
    vehicle_value_id: row.vehicle_value_id,
    overnight_value_id: row.overnight_value_id,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    vehicle: row.vehicle,
    overnight: row.overnight,
    activities: row.activities,
    participants: row.participants,
  };
}

export async function createTrip(
  userId: string,
  data: CreateTripInput
): Promise<TripWithDetails> {
  await assertAttributeValuesExist(
    [data.vehicle_value_id, data.overnight_value_id, ...data.activity_value_ids].filter(
      (id): id is string => id !== null
    )
  );

  const client = await pool.connect();
  let tripId: string;
  try {
    await client.query("BEGIN");
    const tripRes = await client.query(
      `INSERT INTO trips (name, start_date, end_date, notes, vehicle_value_id, overnight_value_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        data.name,
        data.start_date,
        data.end_date,
        data.notes,
        data.vehicle_value_id,
        data.overnight_value_id,
        userId,
      ]
    );
    tripId = tripRes.rows[0].id;
    for (const activityId of data.activity_value_ids) {
      await client.query(`INSERT INTO trip_activities (trip_id, attribute_value_id) VALUES ($1, $2)`, [
        tripId,
        activityId,
      ]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  // Re-fetch outside the transaction (via the plain pool, not the released client) so the
  // returned shape always matches getTripById's — including the vehicle/overnight objects
  // and the activities array, which the INSERT...RETURNING above doesn't carry.
  const created = await getTripById(tripId);
  if (!created) throw new TripNotFoundError(tripId);
  return created;
}

export async function updateTrip(
  tripId: string,
  data: Partial<CreateTripInput>
): Promise<TripWithDetails | null> {
  await assertAttributeValuesExist(
    [data.vehicle_value_id, data.overnight_value_id, ...(data.activity_value_ids || [])].filter(
      (id): id is string => !!id
    )
  );

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(`SELECT id FROM trips WHERE id = $1`, [tripId]);
    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const sets: string[] = [];
    const values: (string | null)[] = [tripId];
    let paramIdx = 2;
    const fields = [
      "name",
      "start_date",
      "end_date",
      "notes",
      "vehicle_value_id",
      "overnight_value_id",
    ] as const;
    for (const field of fields) {
      if (data[field] !== undefined) {
        sets.push(`${field} = $${paramIdx++}`);
        values.push(data[field] as string | null);
      }
    }
    sets.push(`updated_at = NOW()`);
    if (sets.length > 1) {
      await client.query(`UPDATE trips SET ${sets.join(", ")} WHERE id = $1`, values);
    }

    if (data.activity_value_ids !== undefined) {
      await client.query(`DELETE FROM trip_activities WHERE trip_id = $1`, [tripId]);
      for (const activityId of data.activity_value_ids) {
        await client.query(
          `INSERT INTO trip_activities (trip_id, attribute_value_id) VALUES ($1, $2)`,
          [tripId, activityId]
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return getTripById(tripId);
}

export async function deleteTrip(tripId: string): Promise<void> {
  await query(`DELETE FROM trips WHERE id = $1`, [tripId]);
}

// ---------- Participants ----------

export async function inviteParticipant(
  tripId: string,
  data: { email: string; display_name: string }
): Promise<TripParticipantWithToken> {
  const tripRes = await query(`SELECT name FROM trips WHERE id = $1`, [tripId]);
  const trip = tripRes.rows[0];
  if (!trip) throw new TripNotFoundError(tripId);

  const userRes = await query('SELECT id FROM "user" WHERE email = $1', [data.email]);
  const userId: string | null = userRes.rows[0]?.id ?? null;
  const inviteToken = crypto.randomBytes(32).toString("hex");

  let participant: TripParticipantWithToken;
  try {
    const result = await query(
      `INSERT INTO trip_participants (trip_id, user_id, email, display_name, invite_token)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [tripId, userId, data.email, data.display_name, inviteToken]
    );
    participant = result.rows[0];
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ParticipantAlreadyInvitedError(data.email);
    }
    throw error;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteUrl = `${appUrl}/api/trip-planner/invite/${inviteToken}`;
  const emailHtml = generateTripInviteEmailHtml({
    displayName: data.display_name,
    tripName: trip.name,
    inviteUrl,
  });
  const { error: emailError } = await emailService.sendEmail({
    to: [data.email],
    subject: `You're invited: ${trip.name}`,
    text: `${data.display_name}, you've been invited to "${trip.name}". Open your trip: ${inviteUrl}`,
    html: emailHtml,
  });
  if (emailError) {
    console.error("Failed to send trip invite email:", emailError);
  }

  return participant;
}

export async function removeParticipant(participantId: string): Promise<void> {
  const result = await query(`DELETE FROM trip_participants WHERE id = $1 RETURNING id`, [
    participantId,
  ]);
  if (result.rows.length === 0) throw new ParticipantNotFoundError(participantId);
}

export async function resolveParticipantByToken(token: string): Promise<TripParticipantWithToken> {
  const result = await query(`SELECT * FROM trip_participants WHERE invite_token = $1`, [token]);
  const participant = result.rows[0];
  if (!participant) throw new InvalidInviteTokenError();
  return participant;
}

// ---------- Packing items ----------

export async function createPackingItem(data: {
  name: string;
  is_shared: boolean;
  attributeValueIds: string[];
  createdByParticipantId: string | null;
}): Promise<PackingItem> {
  await assertAttributeValuesExist(data.attributeValueIds);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const itemRes = await client.query(
      `INSERT INTO packing_items (name, is_shared, created_by_participant_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [data.name, data.is_shared, data.createdByParticipantId]
    );
    const item = itemRes.rows[0];
    for (const attributeValueId of data.attributeValueIds) {
      await client.query(
        `INSERT INTO packing_item_tags (packing_item_id, attribute_value_id) VALUES ($1, $2)`,
        [item.id, attributeValueId]
      );
    }
    await client.query("COMMIT");
    return item;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ---------- Checklist ----------

async function getTripAttributeIds(tripId: string): Promise<string[]> {
  const result = await query(`SELECT ${TRIP_ATTR_IDS_SQL} AS attr_ids FROM trips t WHERE t.id = $1`, [
    tripId,
  ]);
  return result.rows[0]?.attr_ids ?? [];
}

export async function getTripChecklist(
  tripId: string
): Promise<TripChecklist & { progress: ParticipantProgress[] }> {
  const attrIds = await getTripAttributeIds(tripId);

  const participantsRes = await query(
    `SELECT id, display_name FROM trip_participants WHERE trip_id = $1 ORDER BY display_name`,
    [tripId]
  );
  const participants: { id: string; display_name: string }[] = participantsRes.rows;

  const individualByParticipant: TripChecklist["individualByParticipant"] = {};
  for (const p of participants) individualByParticipant[p.id] = [];

  if (attrIds.length > 0) {
    const individualRes = await query(
      `SELECT DISTINCT pi.id AS packing_item_id, pi.name, tp.id AS participant_id,
              COALESCE(cs.checked, false) AS checked
       FROM trip_participants tp
       CROSS JOIN packing_items pi
       JOIN packing_item_tags pit ON pit.packing_item_id = pi.id
       LEFT JOIN trip_checklist_state cs
         ON cs.trip_id = $1 AND cs.packing_item_id = pi.id AND cs.participant_id = tp.id
       WHERE tp.trip_id = $1 AND pi.is_shared = false AND pit.attribute_value_id = ANY($2::uuid[])
       ORDER BY pi.name`,
      [tripId, attrIds]
    );
    for (const row of individualRes.rows) {
      individualByParticipant[row.participant_id].push({
        packingItemId: row.packing_item_id,
        name: row.name,
        checked: row.checked,
      });
    }
  }

  let shared: TripChecklist["shared"] = [];
  if (attrIds.length > 0) {
    const sharedRes = await query(
      `SELECT DISTINCT pi.id AS packing_item_id, pi.name, COALESCE(cs.checked, false) AS checked,
              cs.assigned_participant_id
       FROM packing_items pi
       JOIN packing_item_tags pit ON pit.packing_item_id = pi.id
       LEFT JOIN trip_checklist_state cs
         ON cs.trip_id = $1 AND cs.packing_item_id = pi.id AND cs.participant_id IS NULL
       WHERE pi.is_shared = true AND pit.attribute_value_id = ANY($2::uuid[])
       ORDER BY pi.name`,
      [tripId, attrIds]
    );
    shared = sharedRes.rows.map((row) => ({
      packingItemId: row.packing_item_id,
      name: row.name,
      checked: row.checked,
      assignedParticipantId: row.assigned_participant_id,
    }));
  }

  const progress: ParticipantProgress[] = participants
    .map((p) => {
      const individualItems = individualByParticipant[p.id];
      const assignedShared = shared.filter((s) => s.assignedParticipantId === p.id);
      const total = individualItems.length + assignedShared.length;
      const packed =
        individualItems.filter((i) => i.checked).length +
        assignedShared.filter((s) => s.checked).length;
      return { participantId: p.id, displayName: p.display_name, packed, total };
    })
    .sort((a, b) => (b.total ? b.packed / b.total : 0) - (a.total ? a.packed / a.total : 0));

  return { individualByParticipant, shared, progress };
}

export async function setChecklistItemChecked(
  tripId: string,
  packingItemId: string,
  participantId: string | null,
  checked: boolean
): Promise<void> {
  try {
    if (participantId) {
      await query(
        `INSERT INTO trip_checklist_state (trip_id, packing_item_id, participant_id, checked, checked_at)
         VALUES ($1, $2, $3, $4, CASE WHEN $4 THEN NOW() ELSE NULL END)
         ON CONFLICT (trip_id, packing_item_id, participant_id) WHERE participant_id IS NOT NULL
         DO UPDATE SET checked = EXCLUDED.checked, checked_at = EXCLUDED.checked_at, updated_at = NOW()`,
        [tripId, packingItemId, participantId, checked]
      );
      return;
    }
    await query(
      `INSERT INTO trip_checklist_state (trip_id, packing_item_id, participant_id, checked, checked_at)
       VALUES ($1, $2, NULL, $3, CASE WHEN $3 THEN NOW() ELSE NULL END)
       ON CONFLICT (trip_id, packing_item_id) WHERE participant_id IS NULL
       DO UPDATE SET checked = EXCLUDED.checked, checked_at = EXCLUDED.checked_at, updated_at = NOW()`,
      [tripId, packingItemId, checked]
    );
  } catch (error) {
    if (isForeignKeyViolation(error)) throw new PackingItemNotFoundError(packingItemId);
    throw error;
  }
}

export async function assignChecklistItem(
  tripId: string,
  packingItemId: string,
  assignedParticipantId: string | null
): Promise<void> {
  try {
    await query(
      `INSERT INTO trip_checklist_state (trip_id, packing_item_id, participant_id, assigned_participant_id, checked)
       VALUES ($1, $2, NULL, $3, false)
       ON CONFLICT (trip_id, packing_item_id) WHERE participant_id IS NULL
       DO UPDATE SET assigned_participant_id = EXCLUDED.assigned_participant_id, updated_at = NOW()`,
      [tripId, packingItemId, assignedParticipantId]
    );
  } catch (error) {
    if (isForeignKeyViolation(error)) throw new PackingItemNotFoundError(packingItemId);
    throw error;
  }
}
