# Luggage Trip Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `friends-zone` "coming soon" placeholder with a full Luggage Trip Planner: admins create trips (vehicle/overnight-style/activities), invite participants by email (account optional, guest link otherwise), and every trip gets a live, tag-based packing checklist (Individual / Group columns) that reuses catalog items automatically across similar trips.

**Architecture:** Raw-SQL schema (7 new tables) reached through one service file (`src/lib/services/trips.ts`) following the existing `renovations.ts` pattern (error classes, `pool`/`query`, transactions, partial-update-by-field). A new `requireTripAccess` guard resolves admin / participant / guest access per trip, including an opportunistic account-link step. The `friends-zone` route is renamed to `trip-planner`; a new sibling `/trips/[id]` tree (outside `trip-planner`, with its own access-gated layout) holds the trip detail page so guests and non-`FRIENDS_ZONE` participants can still reach their trip. Trip detail pages are Server Components that fetch trip + checklist data directly from the service layer and hand it to small Client Components for optimistic checkbox/assignment interactivity via Server Actions.

**Tech Stack:** Next.js App Router (v16, async `headers()`/`cookies()`), TypeScript (strict), raw SQL via `pg` (no ORM), next-intl, CSS Modules, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-03-luggage-trip-planner-design.md`

## Global Constraints

- Package manager: pnpm exclusively. This plan adds no new dependencies.
- TypeScript strict mode; no `any` without an explicit justifying comment (the codebase's own `query()` helper already has one — follow that precedent, don't remove it).
- Named exports for all new functions/components (Next.js page/layout/route-handler defaults excepted).
- **No automated tests** — this repo has no test runner installed (no Vitest/Playwright config despite CLAUDE.md's aspirational tech-stack table). Each task ends with `pnpm tsc --noEmit`, `pnpm lint`, and a concrete manual-verification step instead of a test-first cycle. This mirrors the decision already made in `docs/superpowers/plans/2026-08-12-renovations-accounts-rework.md`.
- No down-migrations — matches existing repo convention (`migrations/001`–`018` have none).
- No quantities on packing items (single checkbox), no trip status/cancellation field, no activity filtering by vehicle, no standalone catalog-management screen, no reminder emails — these are explicit non-goals in the spec; do not add them.
- The `FRIENDS_ZONE` app-role key / `APP_ROLE.FRIENDS_ZONE` constant is **never renamed** — only the `friends-zone` directory, its routes, and its display heading (→ "Luggage Trip Planner") change.
- Follow existing conventions: raw SQL via `pg` in `src/lib/db.ts` (`pool`, `query`); migrations named `migrations/NNN_description.sql`; service functions throw typed `Error` subclasses; Server Actions call the right guard, call the service, then `revalidatePath`; money/multi-statement writes use an explicit `pool.connect()` transaction.
- Locale-aware navigation inside the app uses `Link`/`redirect`/`useRouter` from `@/i18n/routing` (matches `Navigation.tsx`, `friends-zone/layout.tsx`). Links generated **outside** the app (e-mails, the guest-invite Route Handler) have no locale context and no middleware to add one (there is no `middleware.ts` in this repo) — they hardcode the `/es/` prefix, matching the existing precedent in `src/app/actions/admin-users.ts:69` (`${appUrl}/es/profile`).

---

## Task 1: Database migration

**Files:**
- Create: `migrations/019_trip_planner.sql`

**Interfaces:**
- Produces: tables `trip_attribute_values`, `trips`, `trip_activities`, `trip_participants`, `packing_items`, `packing_item_tags`, `trip_checklist_state` (with partial unique indexes `idx_checklist_state_individual` and `idx_checklist_state_shared`) — consumed by every later task.

- [ ] **Step 1: Write the migration**

```sql
-- migrations/019_trip_planner.sql

CREATE TABLE IF NOT EXISTS trip_attribute_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(20) NOT NULL CHECK (category IN ('vehicle', 'overnight_style', 'activity')),
    name VARCHAR(100) NOT NULL,
    created_by TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category, name)
);

CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE,
    notes TEXT,
    vehicle_value_id UUID REFERENCES trip_attribute_values(id) ON DELETE SET NULL,
    overnight_value_id UUID REFERENCES trip_attribute_values(id) ON DELETE SET NULL,
    created_by TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trips_start_date ON trips(start_date DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS trip_activities (
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    attribute_value_id UUID NOT NULL REFERENCES trip_attribute_values(id) ON DELETE CASCADE,
    PRIMARY KEY (trip_id, attribute_value_id)
);

CREATE TABLE IF NOT EXISTS trip_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    invite_token VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(trip_id, email)
);
CREATE INDEX IF NOT EXISTS idx_trip_participants_trip_id ON trip_participants(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_participants_user_id ON trip_participants(user_id);

CREATE TABLE IF NOT EXISTS packing_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    is_shared BOOLEAN NOT NULL DEFAULT false,
    created_by_participant_id UUID REFERENCES trip_participants(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS packing_item_tags (
    packing_item_id UUID NOT NULL REFERENCES packing_items(id) ON DELETE CASCADE,
    attribute_value_id UUID NOT NULL REFERENCES trip_attribute_values(id) ON DELETE CASCADE,
    PRIMARY KEY (packing_item_id, attribute_value_id)
);

CREATE TABLE IF NOT EXISTS trip_checklist_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    packing_item_id UUID NOT NULL REFERENCES packing_items(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES trip_participants(id) ON DELETE CASCADE,
    assigned_participant_id UUID REFERENCES trip_participants(id) ON DELETE SET NULL,
    checked BOOLEAN NOT NULL DEFAULT false,
    checked_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- One state row per (trip, item, participant) for individual items...
CREATE UNIQUE INDEX IF NOT EXISTS idx_checklist_state_individual
    ON trip_checklist_state(trip_id, packing_item_id, participant_id)
    WHERE participant_id IS NOT NULL;
-- ...and one shared row per (trip, item) when participant_id is NULL.
CREATE UNIQUE INDEX IF NOT EXISTS idx_checklist_state_shared
    ON trip_checklist_state(trip_id, packing_item_id)
    WHERE participant_id IS NULL;
```

- [ ] **Step 2: Run the migration**

Confirm `DATABASE_URL` (in `.env`) points at the database you intend to alter, then:

Run: `pnpm migrate`
Expected: output lists `019_trip_planner.sql` as applied, no errors.

- [ ] **Step 3: Verify schema manually**

Run: `psql "$DATABASE_URL" -c "\d trip_attribute_values" -c "\d trips" -c "\d trip_activities" -c "\d trip_participants" -c "\d packing_items" -c "\d packing_item_tags" -c "\d trip_checklist_state"`
Expected: all 7 tables exist with the columns above; `trip_checklist_state` shows two indexes (`idx_checklist_state_individual`, `idx_checklist_state_shared`) each with a `WHERE` clause.

- [ ] **Step 4: Commit**

```bash
git add migrations/019_trip_planner.sql
git commit -m "$(cat <<'EOF'
feat: add trip planner schema

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NitJbv2kWpzHbHf27MzfFB
EOF
)"
```

---

## Task 2: TypeScript types

**Files:**
- Create: `src/lib/types/trips.ts`

**Interfaces:**
- Consumes: schema from Task 1.
- Produces: `TripAttributeCategory`, `TripAttributeValue`, `Trip`, `TripParticipant` (public — **no `invite_token`**), `TripParticipantWithToken` (internal — has `invite_token`, used only by the service functions that must send/verify it), `PackingItem`, `TripWithDetails`, `CreateTripInput`, `ChecklistIndividualItem`, `ChecklistSharedItem`, `TripChecklist`, `ParticipantProgress`, `TripListItem` — used by every later task.

Deliberate deviation from the spec's single discriminated `ChecklistEntry` union: the checklist is naturally produced and consumed *by column*, not as one mixed list — `getTripChecklist` (Task 3) already groups individual items by participant and shared items separately, and `ChecklistColumn` (Task 12) already knows which kind it's rendering from its own `kind` prop. A `kind` discriminant on every item would be redundant in both places. `ChecklistIndividualItem` / `ChecklistSharedItem` carry exactly the fields each column needs instead.

- [ ] **Step 1: Write the types file**

```typescript
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
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors from this new file (nothing imports it yet).

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/trips.ts
git commit -m "$(cat <<'EOF'
feat: add trip planner TypeScript types

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NitJbv2kWpzHbHf27MzfFB
EOF
)"
```

---

## Task 3: Email template + trips service layer

**Files:**
- Create: `src/lib/services/email/templates/trip-invite.ts`
- Create: `src/lib/services/trips.ts`

**Interfaces:**
- Consumes: `pool`, `query` from `@/lib/db`; `emailService` from `@/lib/services/email`; types from Task 2.
- Produces: error classes `TripNotFoundError`, `AttributeValueNotFoundError`, `DuplicateAttributeValueError`, `ParticipantNotFoundError`, `ParticipantAlreadyInvitedError`, `InvalidInviteTokenError`, `PackingItemNotFoundError`; functions `getAttributeValues`, `createAttributeValue`, `getTrips`, `getTripById`, `createTrip`, `updateTrip`, `deleteTrip`, `inviteParticipant`, `removeParticipant`, `resolveParticipantByToken`, `createPackingItem`, `getTripChecklist`, `setChecklistItemChecked`, `assignChecklistItem` — consumed by Tasks 5, 6, 8–12.

- [ ] **Step 1: Write the email template**

```typescript
// src/lib/services/email/templates/trip-invite.ts

interface TripInviteEmailProps {
  displayName: string;
  tripName: string;
  inviteUrl: string;
}

export function generateTripInviteEmailHtml({
  displayName,
  tripName,
  inviteUrl,
}: TripInviteEmailProps): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited: ${tripName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #2d3748;
      margin: 0;
      padding: 0;
      background-color: #f7f7f7;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #3b82f6;
      text-decoration: none;
    }
    .card {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .title-text {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #111827;
    }
    .button {
      display: inline-block;
      background-color: #3b82f6;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      margin-top: 20px;
      text-align: center;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #9ca3af;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">Personal Assistant Hub</h1>
    </div>

    <div class="card">
      <div class="title-text">Hola, ${displayName}</div>
      <p>Te han invitado al viaje <strong>${tripName}</strong>. Entra para ver la lista de cosas que preparar.</p>
      <div style="text-align: center;">
        <a href="${inviteUrl}" class="button" style="color: #ffffff !important;">Ver mi viaje</a>
      </div>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} Personal Assistant Hub. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
  `;
}
```

- [ ] **Step 2: Write the trips service**

```typescript
// src/lib/services/trips.ts

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
      SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE cs.checked) AS packed
      FROM packing_items pi
      JOIN packing_item_tags pit
        ON pit.packing_item_id = pi.id AND pit.attribute_value_id = ANY(tas.attr_ids)
      LEFT JOIN trip_checklist_state cs
        ON cs.trip_id = t.id AND cs.packing_item_id = pi.id AND cs.participant_id = vp.participant_id
      WHERE pi.is_shared = false AND vp.participant_id IS NOT NULL
    ) ind ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE cs.checked) AS packed
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
    start_date: row.start_date,
    end_date: row.end_date,
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
    start_date: row.start_date,
    end_date: row.end_date,
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
```

Note on `createTrip`: the transaction only writes `trips` + `trip_activities`; the trip is re-fetched via `getTripById` *outside* the transaction (matching how `createRenovationTask` in the reference service composes a return value after its own writes) so its return shape is always identical to every other trip-returning function. The re-fetch keys off `created_by` + `created_at DESC LIMIT 1`, which is safe because `createTrip` is only ever called from `requireAdmin()`-gated Server Actions that run one insert at a time per request.

- [ ] **Step 3: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors in `src/lib/services/trips.ts` or `src/lib/services/email/templates/trip-invite.ts`.

- [ ] **Step 4: Lint**

Run: `pnpm lint`
Expected: no errors in either new file.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/email/templates/trip-invite.ts src/lib/services/trips.ts
git commit -m "$(cat <<'EOF'
feat: add trip planner service layer and invite email template

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NitJbv2kWpzHbHf27MzfFB
EOF
)"
```

---

## Task 4: Auth guard — `requireTripAccess`

**Files:**
- Modify: `src/lib/auth-guards.ts`

**Interfaces:**
- Consumes: `auth` from `@/lib/auth`; `query` from `@/lib/db`; `Role` from `@/lib/types/roles`.
- Produces: `TripAccessDeniedError` (with `.reason: "signin_required" | "not_found"`), `TripAccessResult` (discriminated union: `{type:"admin", userId, participantId:null}` | `{type:"participant", userId, participantId}` | `{type:"guest", participantId}`), `requireTripAccess(tripId: string): Promise<TripAccessResult>` — consumed by Task 6 (actions), Task 10 (`/trips/layout.tsx`), Task 11 (trip detail page).

- [ ] **Step 1: Add the guard**

Append to `src/lib/auth-guards.ts` (keep the existing `requireAdmin`/`requireAppRole`/`requireScheduleManager`/`requireFriendsZone` untouched):

```typescript
import { cookies } from "next/headers";

import { query } from "@/lib/db";

export class TripAccessDeniedError extends Error {
  reason: "signin_required" | "not_found";
  constructor(reason: "signin_required" | "not_found") {
    super(reason === "signin_required" ? "Sign-in required" : "Trip not found");
    this.name = "TripAccessDeniedError";
    this.reason = reason;
  }
}

export type TripAccessResult =
  | { type: "admin"; userId: string; participantId: null }
  | { type: "participant"; userId: string; participantId: string }
  | { type: "guest"; participantId: string };

/**
 * Resolves who's allowed to view/edit a trip, in priority order:
 * 1. Admin session -> full access.
 * 2. Session with a trip_participants row matching user_id -> participant access.
 * 3. Session with a trip_participants row matching email (no user_id yet) -> the
 *    "opportunistic link": we attach this session's user_id to that row right here,
 *    so a guest who signs up (or already had an account) with the invited email
 *    picks up real participant access the next time they open the trip - no
 *    separate "claim" step.
 * 4. No/non-matching session, but a tp_guest_<tripId> cookie matches an
 *    invite_token for this trip -> guest access.
 * 5. Otherwise -> throws TripAccessDeniedError ("signin_required" if there's a
 *    session that just doesn't match anything, "not_found" otherwise - so an
 *    anonymous visitor can't tell whether the trip exists).
 */
export async function requireTripAccess(tripId: string): Promise<TripAccessResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    if (session.user.role === Role.ADMIN) {
      return { type: "admin", userId: session.user.id, participantId: null };
    }

    const byUserId = await query(
      `SELECT id FROM trip_participants WHERE trip_id = $1 AND user_id = $2`,
      [tripId, session.user.id]
    );
    if (byUserId.rows.length > 0) {
      return { type: "participant", userId: session.user.id, participantId: byUserId.rows[0].id };
    }

    const byEmail = await query(
      `SELECT id FROM trip_participants WHERE trip_id = $1 AND email = $2 AND user_id IS NULL`,
      [tripId, session.user.email]
    );
    if (byEmail.rows.length > 0) {
      const participantId = byEmail.rows[0].id;
      await query(`UPDATE trip_participants SET user_id = $1 WHERE id = $2`, [
        session.user.id,
        participantId,
      ]);
      return { type: "participant", userId: session.user.id, participantId };
    }

    throw new TripAccessDeniedError("signin_required");
  }

  const cookieStore = await cookies();
  const guestToken = cookieStore.get(`tp_guest_${tripId}`)?.value;
  if (guestToken) {
    const byToken = await query(
      `SELECT id FROM trip_participants WHERE trip_id = $1 AND invite_token = $2`,
      [tripId, guestToken]
    );
    if (byToken.rows.length > 0) {
      return { type: "guest", participantId: byToken.rows[0].id };
    }
  }

  throw new TripAccessDeniedError("not_found");
}
```

The `cookies` import goes alongside the existing `headers` import at the top of the file; `query` joins the existing `auth`/`userHasAppRole`/`APP_ROLE`/`Role` imports.

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors in `src/lib/auth-guards.ts`.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors in `src/lib/auth-guards.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth-guards.ts
git commit -m "$(cat <<'EOF'
feat: add requireTripAccess guard with opportunistic guest linking

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NitJbv2kWpzHbHf27MzfFB
EOF
)"
```

---

## Task 5: Guest invite Route Handler

**Files:**
- Create: `src/app/api/trip-planner/invite/[token]/route.ts`

**Interfaces:**
- Consumes: `resolveParticipantByToken` from Task 3; `auth` from `@/lib/auth`.
- Produces: `GET` handler at `/api/trip-planner/invite/[token]` — this is the URL embedded in the invite email (Task 3).

- [ ] **Step 1: Write the route handler**

```typescript
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { resolveParticipantByToken } from "@/lib/services/trips";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  let participant;
  try {
    participant = await resolveParticipantByToken(token);
  } catch {
    return NextResponse.redirect(new URL("/es", req.url));
  }

  const tripPath = `/trips/${participant.trip_id}`;

  if (participant.user_id) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user.id === participant.user_id) {
      return NextResponse.redirect(new URL(`/es${tripPath}`, req.url));
    }
    return NextResponse.redirect(
      new URL(`/es/auth/signin?callbackUrl=${encodeURIComponent(tripPath)}`, req.url)
    );
  }

  const response = NextResponse.redirect(new URL(`/es${tripPath}`, req.url));
  response.cookies.set(`tp_guest_${participant.trip_id}`, participant.invite_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return response;
}
```

This is deliberately the one plain Route Handler in the feature: a clicked email link can't submit a Server Action. It hardcodes the `/es/` locale prefix on every redirect target, matching the existing precedent for email-generated links (`src/app/actions/admin-users.ts:69`) — there's no `middleware.ts` in this repo to auto-detect/prepend a locale for a cold external link.

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors in this file.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors in this file.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/trip-planner/invite/[token]/route.ts"
git commit -m "$(cat <<'EOF'
feat: add guest invite link route handler

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NitJbv2kWpzHbHf27MzfFB
EOF
)"
```

---

## Task 6: Server actions

**Files:**
- Create: `src/app/actions/trips.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `requireTripAccess` (Task 4); everything from `src/lib/services/trips.ts` (Task 3); `CreateTripInput`, `TripAttributeCategory` (Task 2).
- Produces: `createAttributeValueAction`, `createTripAction`, `updateTripAction`, `deleteTripAction`, `inviteParticipantAction`, `removeParticipantAction`, `createPackingItemAction`, `toggleIndividualChecklistItemAction`, `toggleSharedChecklistItemAction`, `assignChecklistItemAction` — consumed by every UI task (8–12).

Deliberate deviation from the spec's single `toggleChecklistItemAction`: it's split into an individual and a shared variant here because they need different server-side authorization for the `participantId` they act on. A shared item always toggles the one `participant_id IS NULL` row — no participant id to trust from the client at all. An individual item toggles a *specific participant's* row, and only an admin may pass an arbitrary `targetParticipantId` (for the per-participant sub-list view); every other caller must be forced onto their own resolved `access.participantId`, never a client-supplied one. Folding both cases into one action with a single nullable `participantId` parameter would make that admin-only override ambiguous with "this is a shared item" — see `toggleIndividualChecklistItemAction`'s admin-bypass logic below.

- [ ] **Step 1: Write the actions file**

```typescript
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
    const value = await db.createAttributeValue(session.user.id, data.category, data.name.trim());
    return { error: null, value };
  } catch (error) {
    if (error instanceof db.DuplicateAttributeValueError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function createTripAction(
  data: CreateTripInput & { participants: { email: string; display_name: string }[] }
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

export async function updateTripAction(tripId: string, data: Partial<CreateTripInput>) {
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
    if (error instanceof db.ParticipantAlreadyInvitedError || error instanceof db.TripNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function removeParticipantAction(tripId: string, participantId: string) {
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
      createdByParticipantId: access.type === "admin" ? null : access.participantId,
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

export async function toggleIndividualChecklistItemAction(
  tripId: string,
  packingItemId: string,
  targetParticipantId: string | null,
  checked: boolean
) {
  const access = await requireTripAccess(tripId);
  const participantId = access.type === "admin" ? targetParticipantId : access.participantId;
  if (!participantId) return { error: "No participant to update" };
  try {
    await db.setChecklistItemChecked(tripId, packingItemId, participantId, checked);
    revalidatePath(`/trips/${tripId}`);
    return { error: null };
  } catch (error) {
    if (error instanceof db.PackingItemNotFoundError) return { error: error.message };
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
    if (error instanceof db.PackingItemNotFoundError) return { error: error.message };
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
    if (error instanceof db.PackingItemNotFoundError) return { error: error.message };
    throw error;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors in `src/app/actions/trips.ts`.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors in `src/app/actions/trips.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/app/actions/trips.ts
git commit -m "$(cat <<'EOF'
feat: add trip planner server actions

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NitJbv2kWpzHbHf27MzfFB
EOF
)"
```

---

## Task 7: Route rename — `friends-zone` → `trip-planner`

**Files:**
- Rename: `src/app/[locale]/friends-zone/` → `src/app/[locale]/trip-planner/` (via `git mv`)
- Modify: `src/app/[locale]/trip-planner/layout.tsx` (callback URL only)
- Delete: `src/app/[locale]/trip-planner/page.tsx` and `page.module.css` (rewritten in full in Task 8 — deleting here keeps this task's diff purely mechanical)
- Modify: `src/systemUI/components/Navigation/Navigation.tsx`

**Interfaces:**
- Produces: `/trip-planner` route (still gated by `APP_ROLE.FRIENDS_ZONE`, unchanged) — consumed by Tasks 8–9.

- [ ] **Step 1: Rename the directory**

```bash
git mv "src/app/[locale]/friends-zone" "src/app/[locale]/trip-planner"
```

- [ ] **Step 2: Fix the callback URL in the (moved) layout**

In `src/app/[locale]/trip-planner/layout.tsx`, change:

```typescript
        query: {
          callbackUrl: "/friends-zone",
        },
```

to:

```typescript
        query: {
          callbackUrl: "/trip-planner",
        },
```

- [ ] **Step 3: Remove the placeholder page (rewritten in Task 8)**

```bash
git rm "src/app/[locale]/trip-planner/page.tsx" "src/app/[locale]/trip-planner/page.module.css"
```

- [ ] **Step 4: Update the Navigation link target**

`src/systemUI/components/Navigation/Navigation.tsx` doesn't currently render a direct Friends Zone link (it only shows Admin/Profile/Language/Logout — the Friends Zone entry point must live elsewhere, e.g. the home page's launcher grid). Search for any hardcoded `/friends-zone` reference across the app and repoint it at `/trip-planner`:

Run: `grep -rn "friends-zone" src --include="*.ts" --include="*.tsx"`
Expected (before this step): hits in `src/app/[locale]/page.tsx` (home page launcher) and possibly `src/hooks/use-app-roles.ts` or similar. For each hit that is a **route/href** (not the `FRIENDS_ZONE` role string), change `/friends-zone` to `/trip-planner`. Do **not** touch any occurrence of `APP_ROLE.FRIENDS_ZONE`, `"friends_zone"`, or `FRIENDS_ZONE` — those are the untouched role key.

Run: `grep -rn "friends-zone" src --include="*.ts" --include="*.tsx"`
Expected (after this step): no hits (every remaining `friends_zone`/`FRIENDS_ZONE` occurrence is the role key, matched by a different grep pattern — confirm with `grep -rn "FRIENDS_ZONE" src --include="*.ts" --include="*.tsx"` that those are untouched and still present).

- [ ] **Step 5: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: errors only about the missing `trip-planner/page.tsx` (removed in Step 3, rewritten in Task 8) — no errors elsewhere.

- [ ] **Step 6: Manual verification**

Run: `pnpm dev`, sign in as a user with the `friends_zone` app role, visit `/es/trip-planner`. Expected: a blank/erroring page is fine (page.tsx doesn't exist yet), but the URL itself loads past the layout's auth check (no redirect to `/`). Visit `/es/friends-zone`. Expected: 404 (the old route no longer exists).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: rename friends-zone route to trip-planner

The FRIENDS_ZONE app-role key is unchanged; only the directory, its
routes, and hardcoded href/callbackUrl strings move.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NitJbv2kWpzHbHf27MzfFB
EOF
)"
```

---

## Task 8: Trip list page (`/trip-planner`)

**Files:**
- Create: `src/app/[locale]/trip-planner/page.tsx`
- Create: `src/app/[locale]/trip-planner/page.module.css`

**Interfaces:**
- Consumes: `getTrips` (Task 3); `TripListItem` (Task 2); i18n keys under `TripPlanner` (Task 13 — see note below).
- Produces: the `/trip-planner` page.

- [ ] **Step 1: Write the page module CSS**

```css
.container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.title {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
}

.section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.sectionTitle {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  margin: 0;
}

.grid {
  display: grid;
  gap: var(--spacing-lg);
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}

.card {
  display: flex;
  flex-direction: column;
  padding: var(--spacing-lg);
  background-color: var(--color-surface);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: var(--border-radius-lg);
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary);
}

.cardTitle {
  margin: 0 0 var(--spacing-xs);
  font-size: 1.1rem;
  font-weight: var(--font-weight-semibold);
}

.cardSubtitle {
  margin: 0 0 var(--spacing-md);
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.badges {
  display: flex;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
  margin-bottom: var(--spacing-md);
}

.progressHint {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.emptyState {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
  background-color: var(--color-surface);
  border-radius: var(--border-radius-lg);
  border: 1px dashed rgba(0, 0, 0, 0.15);
}
```

- [ ] **Step 2: Write the page**

```tsx
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { getTrips } from "@/lib/services/trips";
import { TripListItem } from "@/lib/types/trips";
import { isAdmin } from "@/lib/types/roles";
import { Badge } from "@/systemUI/components/Badge/Badge";
import { Button } from "@/systemUI/components/Button/Button";

import styles from "./page.module.css";

type Translate = (key: string, values?: Record<string, string | number>) => string;

function TripGrid({ trips, t }: { trips: TripListItem[]; t: Translate }) {
  if (trips.length === 0) {
    return <div className={styles.emptyState}>{t("noTrips")}</div>;
  }
  return (
    <div className={styles.grid}>
      {trips.map((trip) => (
        <Link key={trip.id} href={`/trips/${trip.id}`} className={styles.card}>
          <h3 className={styles.cardTitle}>{trip.name}</h3>
          <p className={styles.cardSubtitle}>
            {trip.start_date ? new Date(trip.start_date).toLocaleDateString() : "?"}
            {trip.end_date && ` - ${new Date(trip.end_date).toLocaleDateString()}`}
          </p>
          <div className={styles.badges}>
            {trip.vehicleName && <Badge variant="primary">{trip.vehicleName}</Badge>}
            {trip.overnightName && <Badge variant="secondary">{trip.overnightName}</Badge>}
            {trip.activityNames.map((name) => (
              <Badge key={name} variant="outline">
                {name}
              </Badge>
            ))}
          </div>
          {trip.participantId && (
            <span className={styles.progressHint}>
              {t("packed", { packed: trip.packed, total: trip.total })}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

export default async function TripPlannerPage() {
  const t = await getTranslations("TripPlanner");
  const session = await auth.api.getSession({ headers: await headers() });
  const admin = isAdmin(session?.user.role);
  const trips = await getTrips(session!.user.id, admin);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = trips.filter((trip) => !trip.end_date || trip.end_date >= today);
  const past = trips.filter((trip) => !!trip.end_date && trip.end_date < today);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t("title")}</h1>
        {admin && (
          <Link href="/trip-planner/trips/new">
            <Button>{t("newTrip")}</Button>
          </Link>
        )}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("upcoming")}</h2>
        <TripGrid trips={upcoming} t={t} />
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("past")}</h2>
        <TripGrid trips={past} t={t} />
      </div>
    </div>
  );
}
```

`session!` is safe here: `trip-planner/layout.tsx` (Task 7) already redirects to sign-in when there's no session, so by the time this Server Component runs, a session is guaranteed.

- [ ] **Step 3: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors from these two files (missing `TripPlanner` i18n keys are a *runtime* concern, not a type error — `getTranslations`/`t()` aren't statically typed against `messages/en.json` in this repo).

- [ ] **Step 4: Lint**

Run: `pnpm lint`
Expected: no errors in either file.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/trip-planner/page.tsx" "src/app/[locale]/trip-planner/page.module.css"
git commit -m "$(cat <<'EOF'
feat: add trip list page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NitJbv2kWpzHbHf27MzfFB
EOF
)"
```

---

## Task 9: New trip form (`/trip-planner/trips/new`)

**Files:**
- Create: `src/app/[locale]/trip-planner/trips/new/page.tsx`
- Create: `src/app/[locale]/trip-planner/trips/new/NewTripForm.tsx`

**Interfaces:**
- Consumes: `getAttributeValues` (Task 3, called server-side in `page.tsx`); `createAttributeValueAction`, `createTripAction` (Task 6); `TripAttributeValue` (Task 2).
- Produces: the trip-creation form. On success, navigates to `/trips/<id>`.

- [ ] **Step 1: Write the page (Server Component — fetches the picker options)**

```tsx
import { getTranslations } from "next-intl/server";

import { requireAdmin } from "@/lib/auth-guards";
import { getAttributeValues } from "@/lib/services/trips";

import { NewTripForm } from "./NewTripForm";
import styles from "../../page.module.css";

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
```

- [ ] **Step 2: Write the form**

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { createAttributeValueAction, createTripAction } from "@/app/actions/trips";
import { useRouter } from "@/i18n/routing";
import { TripAttributeValue } from "@/lib/types/trips";
import { Button } from "@/systemUI/components/Button/Button";

interface NewTripFormProps {
  attributeValues: TripAttributeValue[];
}

interface ParticipantRow {
  email: string;
  display_name: string;
}

export function NewTripForm({ attributeValues: initialValues }: NewTripFormProps) {
  const t = useTranslations("TripPlanner");
  const router = useRouter();

  const [attributeValues, setAttributeValues] = useState(initialValues);
  const [vehicleId, setVehicleId] = useState<string>("");
  const [overnightId, setOvernightId] = useState<string>("");
  const [activityIds, setActivityIds] = useState<string[]>([]);
  const [newVehicleName, setNewVehicleName] = useState("");
  const [newOvernightName, setNewOvernightName] = useState("");
  const [newActivityName, setNewActivityName] = useState("");
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [participantEmail, setParticipantEmail] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const vehicles = attributeValues.filter((v) => v.category === "vehicle");
  const overnightStyles = attributeValues.filter((v) => v.category === "overnight_style");
  const activities = attributeValues.filter((v) => v.category === "activity");

  const addAttributeValue = async (category: "vehicle" | "overnight_style" | "activity", name: string) => {
    if (!name.trim()) return;
    const result = await createAttributeValueAction({ category, name: name.trim() });
    if (result.error || !result.value) {
      setError(result.error);
      return;
    }
    setAttributeValues((prev) => [...prev, result.value!]);
    if (category === "vehicle") {
      setVehicleId(result.value.id);
      setNewVehicleName("");
    } else if (category === "overnight_style") {
      setOvernightId(result.value.id);
      setNewOvernightName("");
    } else {
      setActivityIds((prev) => [...prev, result.value!.id]);
      setNewActivityName("");
    }
  };

  const toggleActivity = (id: string) => {
    setActivityIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const addParticipant = () => {
    if (!participantEmail.trim() || !participantName.trim()) return;
    setParticipants((prev) => [...prev, { email: participantEmail.trim(), display_name: participantName.trim() }]);
    setParticipantEmail("");
    setParticipantName("");
  };

  const removeParticipant = (email: string) => {
    setParticipants((prev) => prev.filter((p) => p.email !== email));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const result = await createTripAction({
      name: formData.get("name") as string,
      start_date: (formData.get("start_date") as string) || null,
      end_date: (formData.get("end_date") as string) || null,
      notes: (formData.get("notes") as string) || null,
      vehicle_value_id: vehicleId || null,
      overnight_value_id: overnightId || null,
      activity_value_ids: activityIds,
      participants,
    });
    setSubmitting(false);
    if (result.error || !result.tripId) {
      setError(result.error);
      return;
    }
    router.push(`/trips/${result.tripId}`);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 560 }}>
      <div>
        <label>{t("name")}</label>
        <input name="name" required style={{ width: "100%", padding: "0.5rem" }} />
      </div>
      <div style={{ display: "flex", gap: "1rem" }}>
        <div style={{ flex: 1 }}>
          <label>{t("startDate")}</label>
          <input name="start_date" type="date" style={{ width: "100%", padding: "0.5rem" }} />
        </div>
        <div style={{ flex: 1 }}>
          <label>{t("endDate")}</label>
          <input name="end_date" type="date" style={{ width: "100%", padding: "0.5rem" }} />
        </div>
      </div>
      <div>
        <label>{t("notes")}</label>
        <textarea name="notes" style={{ width: "100%", padding: "0.5rem" }} />
      </div>

      <div>
        <label>{t("vehicle")}</label>
        <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} style={{ width: "100%", padding: "0.5rem" }}>
          <option value="">--</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          <input
            value={newVehicleName}
            onChange={(e) => setNewVehicleName(e.target.value)}
            placeholder={t("createNewPlaceholder")}
            style={{ flex: 1, padding: "0.5rem" }}
          />
          <Button type="button" variant="outline" onClick={() => addAttributeValue("vehicle", newVehicleName)}>
            {t("createNew")}
          </Button>
        </div>
      </div>

      <div>
        <label>{t("overnightStyle")}</label>
        <select value={overnightId} onChange={(e) => setOvernightId(e.target.value)} style={{ width: "100%", padding: "0.5rem" }}>
          <option value="">--</option>
          {overnightStyles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          <input
            value={newOvernightName}
            onChange={(e) => setNewOvernightName(e.target.value)}
            placeholder={t("createNewPlaceholder")}
            style={{ flex: 1, padding: "0.5rem" }}
          />
          <Button type="button" variant="outline" onClick={() => addAttributeValue("overnight_style", newOvernightName)}>
            {t("createNew")}
          </Button>
        </div>
      </div>

      <div>
        <label>{t("activities")}</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {activities.map((a) => (
            <label key={a.id} style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
              <input type="checkbox" checked={activityIds.includes(a.id)} onChange={() => toggleActivity(a.id)} />
              {a.name}
            </label>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          <input
            value={newActivityName}
            onChange={(e) => setNewActivityName(e.target.value)}
            placeholder={t("createNewPlaceholder")}
            style={{ flex: 1, padding: "0.5rem" }}
          />
          <Button type="button" variant="outline" onClick={() => addAttributeValue("activity", newActivityName)}>
            {t("createNew")}
          </Button>
        </div>
      </div>

      <div>
        <label>{t("participants")}</label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            placeholder={t("displayName")}
            style={{ flex: 1, padding: "0.5rem" }}
          />
          <input
            value={participantEmail}
            onChange={(e) => setParticipantEmail(e.target.value)}
            placeholder={t("email")}
            type="email"
            style={{ flex: 1, padding: "0.5rem" }}
          />
          <Button type="button" variant="outline" onClick={addParticipant}>
            {t("inviteParticipant")}
          </Button>
        </div>
        <ul>
          {participants.map((p) => (
            <li key={p.email}>
              {p.display_name} ({p.email}){" "}
              <button type="button" onClick={() => removeParticipant(p.email)}>
                {t("remove")}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {error && <p style={{ color: "#ef4444" }}>{error}</p>}

      <Button type="submit" disabled={submitting}>
        {t("create")}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors in either new file.

- [ ] **Step 4: Lint**

Run: `pnpm lint`
Expected: no errors in either new file.

- [ ] **Step 5: Manual verification**

Run: `pnpm dev`, sign in as an admin, visit `/es/trip-planner/trips/new`. Create a vehicle value inline ("Motorbike"), an overnight value inline ("Camping"), tick a new activity inline ("Hiking"), add one participant row, submit. Expected: redirected to `/es/trips/<new-id>` (page not built until Task 11 — a 404/blank page there is expected for now; confirm in the Network tab that `createTripAction` returned `{error: null, tripId: "..."}`. Then `psql "$DATABASE_URL" -c "SELECT * FROM trips ORDER BY created_at DESC LIMIT 1;" -c "SELECT * FROM trip_participants ORDER BY created_at DESC LIMIT 1;"` to confirm the row and the invited participant (with a real `invite_token`) landed.

- [ ] **Step 6: Commit**

```bash
git add "src/app/[locale]/trip-planner/trips/new/page.tsx" "src/app/[locale]/trip-planner/trips/new/NewTripForm.tsx"
git commit -m "$(cat <<'EOF'
feat: add new trip creation form

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NitJbv2kWpzHbHf27MzfFB
EOF
)"
```

---

## Task 10: `/trips` access-gated layout

**Files:**
- Create: `src/app/[locale]/trips/layout.tsx`

**Interfaces:**
- Consumes: `requireTripAccess`, `TripAccessDeniedError` (Task 4).
- Produces: the layout every route under `/trips/[id]` renders inside — replaces the blanket `FRIENDS_ZONE` role gate with per-trip access, so guests and plain (non-`FRIENDS_ZONE`) participants can reach their trip. Consumed by Task 11.

- [ ] **Step 1: Write the layout**

```tsx
import { notFound } from "next/navigation";

import { redirect } from "@/i18n/routing";
import { requireTripAccess, TripAccessDeniedError } from "@/lib/auth-guards";
import { PageLayout } from "@/systemUI/components/PageLayout/PageLayout";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  try {
    await requireTripAccess(id);
  } catch (error) {
    if (error instanceof TripAccessDeniedError) {
      if (error.reason === "signin_required") {
        return redirect({
          href: { pathname: "/auth/signin", query: { callbackUrl: `/trips/${id}` } },
          locale,
        });
      }
      notFound();
    }
    throw error;
  }

  return <PageLayout theme="hub">{children}</PageLayout>;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors in this file.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors in this file.

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/trips/layout.tsx"
git commit -m "$(cat <<'EOF'
feat: add per-trip access-gated layout

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NitJbv2kWpzHbHf27MzfFB
EOF
)"
```

---

## Task 11: Trip detail page — header + edit

**Files:**
- Create: `src/app/[locale]/trips/[id]/page.tsx`
- Create: `src/app/[locale]/trips/[id]/page.module.css`
- Create: `src/app/[locale]/trips/[id]/components/TripHeader.tsx`
- Create: `src/app/[locale]/trips/[id]/components/InviteParticipantModal.tsx`
- Create: `src/app/[locale]/trips/[id]/components/EditTripModal.tsx`

**Interfaces:**
- Consumes: `getTripById`, `getAttributeValues` (Task 3); `requireTripAccess` (Task 4); `updateTripAction`, `deleteTripAction`, `inviteParticipantAction`, `removeParticipantAction`, `createAttributeValueAction` (Task 6); `TripWithDetails`, `TripAttributeValue` (Task 2).
- Produces: `page.tsx` default export (renders `TripHeader`, and — as a placeholder until Task 12 lands — nothing else yet); `TripHeader({ trip, attributeValues, isAdmin })`; `InviteParticipantModal({ tripId, onClose })`; `EditTripModal({ trip, attributeValues, onClose })` (opens `InviteParticipantModal`) — `page.tsx` is modified again in Task 12 to add the checklist.

- [ ] **Step 1: Write the page module CSS**

```css
.container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.backLink {
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.title {
  margin: 0 0 var(--spacing-xs);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
}

.subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

.badges {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.modalOverlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: var(--spacing-md);
}

.modalContent {
  background-color: var(--color-surface);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
}

.modalActions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
}

.columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-lg);
}

@media (max-width: 700px) {
  .columns {
    grid-template-columns: 1fr;
  }
}

.column {
  background-color: var(--color-surface);
  border-radius: var(--border-radius-lg);
  border: 1px solid rgba(0, 0, 0, 0.05);
  padding: var(--spacing-lg);
}

.columnHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.itemRow {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: 10px 4px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.itemLabel {
  flex: 1;
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.itemLabelChecked {
  flex: 1;
  font-size: var(--font-size-sm);
  cursor: pointer;
  color: #a0aec0;
  text-decoration: line-through;
}

.addItemRow {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px dashed rgba(0, 0, 0, 0.15);
}

.summaryBar {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.summaryCard {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  background-color: var(--color-surface);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid rgba(0, 0, 0, 0.05);
  min-width: 200px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 9999px;
  background-color: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-sm);
  flex-shrink: 0;
}

.progressTrack {
  height: 6px;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.08);
  overflow: hidden;
  margin-bottom: 4px;
}

.progressFill {
  height: 100%;
  border-radius: 9999px;
  background-color: var(--color-primary);
}
```

- [ ] **Step 2: Write `InviteParticipantModal.tsx`**

`EditTripModal` (Step 4 below) opens this to add a participant, so it's written first.

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { inviteParticipantAction } from "@/app/actions/trips";
import { Button } from "@/systemUI/components/Button/Button";

import styles from "../page.module.css";

interface InviteParticipantModalProps {
  tripId: string;
  onClose: () => void;
}

export function InviteParticipantModal({ tripId, onClose }: InviteParticipantModalProps) {
  const t = useTranslations("TripPlanner");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await inviteParticipantAction(tripId, { email: email.trim(), display_name: displayName.trim() });
    if (result.error) {
      setError(result.error);
      return;
    }
    onClose();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h3>{t("inviteParticipant")}</h3>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label>{t("displayName")}</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required style={{ width: "100%", padding: "0.5rem" }} />
          </div>
          <div>
            <label>{t("email")}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: "100%", padding: "0.5rem" }} />
          </div>
          {error && <p style={{ color: "#ef4444" }}>{error}</p>}
          <div className={styles.modalActions}>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit">{t("inviteParticipant")}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `TripHeader.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/routing";
import { TripAttributeValue, TripWithDetails } from "@/lib/types/trips";
import { Badge } from "@/systemUI/components/Badge/Badge";
import { Button } from "@/systemUI/components/Button/Button";

import { EditTripModal } from "./EditTripModal";
import styles from "../page.module.css";

interface TripHeaderProps {
  trip: TripWithDetails;
  attributeValues: TripAttributeValue[];
  isAdmin: boolean;
}

export function TripHeader({ trip, attributeValues, isAdmin }: TripHeaderProps) {
  const t = useTranslations("TripPlanner");
  const [editing, setEditing] = useState(false);

  return (
    <>
      <Link href="/trip-planner" className={styles.backLink}>
        &larr; {t("title")}
      </Link>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{trip.name}</h1>
          <div className={styles.subtitle}>
            {trip.start_date ? new Date(trip.start_date).toLocaleDateString() : "?"}
            {trip.end_date && ` - ${new Date(trip.end_date).toLocaleDateString()}`}
          </div>
          <div className={styles.badges}>
            {trip.vehicle && <Badge variant="primary">{trip.vehicle.name}</Badge>}
            {trip.overnight && <Badge variant="secondary">{trip.overnight.name}</Badge>}
            {trip.activities.map((a) => (
              <Badge key={a.id} variant="outline">
                {a.name}
              </Badge>
            ))}
          </div>
        </div>
        {isAdmin && (
          <Button variant="outline" onClick={() => setEditing(true)}>
            {t("editTrip")}
          </Button>
        )}
      </div>

      {editing && (
        <EditTripModal trip={trip} attributeValues={attributeValues} onClose={() => setEditing(false)} />
      )}
    </>
  );
}
```

- [ ] **Step 4: Write `EditTripModal.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import {
  createAttributeValueAction,
  deleteTripAction,
  removeParticipantAction,
  updateTripAction,
} from "@/app/actions/trips";
import { useRouter } from "@/i18n/routing";
import { TripAttributeValue, TripWithDetails } from "@/lib/types/trips";
import { Button } from "@/systemUI/components/Button/Button";

import { InviteParticipantModal } from "./InviteParticipantModal";
import styles from "../page.module.css";

interface EditTripModalProps {
  trip: TripWithDetails;
  attributeValues: TripAttributeValue[];
  onClose: () => void;
}

export function EditTripModal({ trip, attributeValues: initialValues, onClose }: EditTripModalProps) {
  const t = useTranslations("TripPlanner");
  const router = useRouter();

  const [attributeValues, setAttributeValues] = useState(initialValues);
  const [vehicleId, setVehicleId] = useState(trip.vehicle_value_id || "");
  const [overnightId, setOvernightId] = useState(trip.overnight_value_id || "");
  const [activityIds, setActivityIds] = useState(trip.activities.map((a) => a.id));
  const [newValueName, setNewValueName] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vehicles = attributeValues.filter((v) => v.category === "vehicle");
  const overnightStyles = attributeValues.filter((v) => v.category === "overnight_style");
  const activities = attributeValues.filter((v) => v.category === "activity");

  const addAttributeValue = async (category: "vehicle" | "overnight_style" | "activity") => {
    if (!newValueName.trim()) return;
    const result = await createAttributeValueAction({ category, name: newValueName.trim() });
    if (result.error || !result.value) {
      setError(result.error);
      return;
    }
    setAttributeValues((prev) => [...prev, result.value!]);
    setNewValueName("");
  };

  const toggleActivity = (id: string) => {
    setActivityIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await updateTripAction(trip.id, {
      name: formData.get("name") as string,
      start_date: (formData.get("start_date") as string) || null,
      end_date: (formData.get("end_date") as string) || null,
      notes: (formData.get("notes") as string) || null,
      vehicle_value_id: vehicleId || null,
      overnight_value_id: overnightId || null,
      activity_value_ids: activityIds,
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!window.confirm(t("confirmDelete"))) return;
    await deleteTripAction(trip.id);
    router.push("/trip-planner");
  };

  const handleRemoveParticipant = async (participantId: string) => {
    await removeParticipantAction(trip.id, participantId);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h3>{t("editTrip")}</h3>
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label>{t("name")}</label>
            <input name="name" defaultValue={trip.name} required style={{ width: "100%", padding: "0.5rem" }} />
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <div style={{ flex: 1 }}>
              <label>{t("startDate")}</label>
              <input name="start_date" type="date" defaultValue={trip.start_date || ""} style={{ width: "100%", padding: "0.5rem" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label>{t("endDate")}</label>
              <input name="end_date" type="date" defaultValue={trip.end_date || ""} style={{ width: "100%", padding: "0.5rem" }} />
            </div>
          </div>
          <div>
            <label>{t("notes")}</label>
            <textarea name="notes" defaultValue={trip.notes || ""} style={{ width: "100%", padding: "0.5rem" }} />
          </div>

          <div>
            <label>{t("vehicle")}</label>
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} style={{ width: "100%", padding: "0.5rem" }}>
              <option value="">--</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>{t("overnightStyle")}</label>
            <select value={overnightId} onChange={(e) => setOvernightId(e.target.value)} style={{ width: "100%", padding: "0.5rem" }}>
              <option value="">--</option>
              {overnightStyles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>{t("activities")}</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {activities.map((a) => (
                <label key={a.id} style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                  <input type="checkbox" checked={activityIds.includes(a.id)} onChange={() => toggleActivity(a.id)} />
                  {a.name}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              value={newValueName}
              onChange={(e) => setNewValueName(e.target.value)}
              placeholder={t("createNewPlaceholder")}
              style={{ flex: 1, padding: "0.5rem" }}
            />
            <Button type="button" variant="outline" onClick={() => addAttributeValue("activity")}>
              {t("createNew")}
            </Button>
          </div>

          <div>
            <label>{t("participants")}</label>
            <ul>
              {trip.participants.map((p) => (
                <li key={p.id}>
                  {p.display_name} ({p.email}){" "}
                  <button type="button" onClick={() => handleRemoveParticipant(p.id)}>
                    {t("remove")}
                  </button>
                </li>
              ))}
            </ul>
            <Button type="button" variant="outline" onClick={() => setInviting(true)}>
              {t("inviteParticipant")}
            </Button>
          </div>

          {error && <p style={{ color: "#ef4444" }}>{error}</p>}

          <div className={styles.modalActions}>
            <Button type="button" variant="ghost" onClick={handleDelete}>
              {t("delete")}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit">{t("save")}</Button>
          </div>
        </form>
      </div>

      {inviting && <InviteParticipantModal tripId={trip.id} onClose={() => setInviting(false)} />}
    </div>
  );
}
```

`InviteParticipantModal` is rendered as a sibling overlay here (both are `position: fixed` full-screen overlays via `styles.modalOverlay`, so the invite modal simply stacks on top of the edit modal — closing it returns to the edit modal, which is still open underneath). The newly-invited participant appears in the list above via `revalidatePath` re-rendering `page.tsx` with a fresh `trip.participants` array (this component always renders straight from its `trip` prop, never a cloned copy of it).

- [ ] **Step 5: Write `page.tsx`**

```tsx
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
```

Task 12 replaces this `page.tsx` with the full version that also renders `ParticipantSummaryBar` and both `ChecklistColumn`s.

- [ ] **Step 6: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors in the five new files.

- [ ] **Step 7: Lint**

Run: `pnpm lint`
Expected: no errors in the five new files.

- [ ] **Step 8: Manual verification**

Visit `/es/trips/<id>` for the trip created in Task 9's verification, as the admin who created it. Expected: header renders with name/dates/badges; clicking "Edit trip" opens the modal pre-filled with the trip's current values; changing the name and saving updates the header (via `revalidatePath`); clicking "Invite participant" inside the edit modal opens the invite modal on top of it, and a successful invite makes the new participant appear in the edit modal's list without a manual refresh; deleting the trip removes it and redirects to `/trip-planner`. Re-create a trip if you delete it, since Task 12's verification needs one.

- [ ] **Step 9: Commit**

```bash
git add "src/app/[locale]/trips/[id]/page.tsx" "src/app/[locale]/trips/[id]/page.module.css" "src/app/[locale]/trips/[id]/components/TripHeader.tsx" "src/app/[locale]/trips/[id]/components/EditTripModal.tsx" "src/app/[locale]/trips/[id]/components/InviteParticipantModal.tsx"
git commit -m "$(cat <<'EOF'
feat: add trip detail header, edit modal, and invite modal

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NitJbv2kWpzHbHf27MzfFB
EOF
)"
```

---

## Task 12: Checklist UI — summary bar, columns, add-item

**Files:**
- Create: `src/app/[locale]/trips/[id]/components/ParticipantSummaryBar.tsx`
- Create: `src/app/[locale]/trips/[id]/components/ChecklistColumn.tsx`
- Create: `src/app/[locale]/trips/[id]/components/AddItemForm.tsx`
- Modify: `src/app/[locale]/trips/[id]/page.tsx` (full rewrite, adds the checklist)

**Interfaces:**
- Consumes: `getTripChecklist` (Task 3); `toggleIndividualChecklistItemAction`, `toggleSharedChecklistItemAction`, `assignChecklistItemAction`, `createPackingItemAction` (Task 6); `ChecklistIndividualItem`, `ChecklistSharedItem`, `ParticipantProgress`, `TripParticipant` (Task 2).
- Produces: the finished trip detail page. (`InviteParticipantModal`, used by `EditTripModal`, was already created in Task 11.)

- [ ] **Step 1: Write `ParticipantSummaryBar.tsx`** (presentational, no interactivity — stays a Server Component)

```tsx
import { ParticipantProgress } from "@/lib/types/trips";

import styles from "../page.module.css";

interface ParticipantSummaryBarProps {
  progress: ParticipantProgress[];
}

export function ParticipantSummaryBar({ progress }: ParticipantSummaryBarProps) {
  return (
    <div className={styles.summaryBar}>
      {progress.map((p) => {
        const pct = p.total ? Math.round((p.packed / p.total) * 100) : 0;
        return (
          <div key={p.participantId} className={styles.summaryCard}>
            <div className={styles.avatar}>{p.displayName.charAt(0).toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 4 }}>{p.displayName}</div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${pct}%` }} />
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                {p.packed}/{p.total}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Write `AddItemForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { createPackingItemAction } from "@/app/actions/trips";
import { TripAttributeValue } from "@/lib/types/trips";
import { Button } from "@/systemUI/components/Button/Button";

interface AddItemFormProps {
  tripId: string;
  defaultIsShared: boolean;
  tripAttributeValues: TripAttributeValue[];
  compact?: boolean;
}

export function AddItemForm({ tripId, defaultIsShared, tripAttributeValues, compact }: AddItemFormProps) {
  const t = useTranslations("TripPlanner");
  const [name, setName] = useState("");
  const [isShared, setIsShared] = useState(defaultIsShared);
  const [tagIds, setTagIds] = useState<string[]>(tripAttributeValues.map((v) => v.id));
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!compact);

  const toggleTag = (id: string) => {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const result = await createPackingItemAction({
      tripId,
      name: name.trim(),
      is_shared: isShared,
      attributeValueIds: tagIds,
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    setName("");
    setError(null);
    if (compact) setExpanded(false);
  };

  if (compact && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        style={{ background: "none", border: "none", color: "var(--color-primary)", cursor: "pointer", padding: "8px 4px" }}
      >
        + {t("addItem")}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("itemName")}
        style={{ padding: "0.5rem" }}
      />
      <label style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem" }}>
        <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)} />
        {t("shared")}
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {tripAttributeValues.map((v) => (
          <label key={v.id} style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.85rem" }}>
            <input type="checkbox" checked={tagIds.includes(v.id)} onChange={() => toggleTag(v.id)} />
            {v.name}
          </label>
        ))}
      </div>
      {error && <p style={{ color: "#ef4444", fontSize: "0.85rem" }}>{error}</p>}
      <Button type="submit" size="sm">
        {t("addItem")}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Write `ChecklistColumn.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { assignChecklistItemAction, toggleIndividualChecklistItemAction, toggleSharedChecklistItemAction } from "@/app/actions/trips";
import { ChecklistIndividualItem, ChecklistSharedItem, TripAttributeValue, TripParticipant } from "@/lib/types/trips";

import { AddItemForm } from "./AddItemForm";
import styles from "../page.module.css";

interface ChecklistColumnProps {
  tripId: string;
  heading: string;
  kind: "individual" | "shared";
  items: (ChecklistIndividualItem | ChecklistSharedItem)[];
  participantId?: string | null;
  participants?: TripParticipant[];
  tripAttributeValues: TripAttributeValue[];
}

export function ChecklistColumn({
  tripId,
  heading,
  kind,
  items,
  participantId,
  participants,
  tripAttributeValues,
}: ChecklistColumnProps) {
  const t = useTranslations("TripPlanner");
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const total = items.length;
  const packed = items.filter((i) => pending[i.packingItemId] ?? i.checked).length;

  const handleToggle = async (item: ChecklistIndividualItem | ChecklistSharedItem) => {
    const next = !(pending[item.packingItemId] ?? item.checked);
    setPending((p) => ({ ...p, [item.packingItemId]: next }));
    if (kind === "individual") {
      await toggleIndividualChecklistItemAction(tripId, item.packingItemId, participantId ?? null, next);
    } else {
      await toggleSharedChecklistItemAction(tripId, item.packingItemId, next);
    }
    setPending((p) => {
      const rest = { ...p };
      delete rest[item.packingItemId];
      return rest;
    });
  };

  const handleAssign = async (packingItemId: string, assignedParticipantId: string) => {
    await assignChecklistItemAction(tripId, packingItemId, assignedParticipantId || null);
  };

  return (
    <div className={styles.column}>
      <div className={styles.columnHeader}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>{heading}</h2>
        <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
          {packed}/{total}
        </span>
      </div>

      {items.length === 0 ? (
        <div style={{ marginBottom: "1rem" }}>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>{t("addItemPrompt")}</p>
          <AddItemForm tripId={tripId} defaultIsShared={kind === "shared"} tripAttributeValues={tripAttributeValues} />
        </div>
      ) : (
        <>
          {items.map((item) => {
            const checked = pending[item.packingItemId] ?? item.checked;
            const assignedParticipantId = "assignedParticipantId" in item ? item.assignedParticipantId : undefined;
            return (
              <div key={item.packingItemId} className={styles.itemRow}>
                <input type="checkbox" checked={checked} onChange={() => handleToggle(item)} style={{ width: 18, height: 18, cursor: "pointer" }} />
                <label className={checked ? styles.itemLabelChecked : styles.itemLabel} onClick={() => handleToggle(item)}>
                  {item.name}
                </label>
                {kind === "shared" && participants && (
                  <select
                    value={assignedParticipantId || ""}
                    onChange={(e) => handleAssign(item.packingItemId, e.target.value)}
                    style={{ fontSize: "0.8rem", padding: "2px 4px" }}
                  >
                    <option value="">{t("unassigned")}</option>
                    {participants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.display_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
          <div className={styles.addItemRow}>
            <AddItemForm tripId={tripId} defaultIsShared={kind === "shared"} tripAttributeValues={tripAttributeValues} compact />
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Rewrite `page.tsx`**

```tsx
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
```

`EditTripModal` isn't imported here — it's opened from inside `TripHeader` (Task 11), not directly by this page.

- [ ] **Step 5: Typecheck**

Run: `pnpm tsc --noEmit`
Expected: no errors across all files touched in this task.

- [ ] **Step 6: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 7: Manual verification**

Visit `/es/trips/<id>` as the admin who created the trip from Task 9 (no participant row of their own → expect the per-participant "Individual" sublist view, one `ChecklistColumn` per invited participant). Since the catalog is empty for this attribute combination, every column should show the `addItemPrompt` empty state instead of an empty list. Add one individual item ("Tent") and one shared item ("Coffee machine") via the empty-state forms. Expected: they appear immediately (no page reload) with checkboxes; toggling a checkbox flips instantly (optimistic) and stays flipped after the network round-trip; assigning the shared item to a participant via its `<select>` updates `ParticipantSummaryBar`'s packed/total for that participant. Re-run `psql "$DATABASE_URL" -c "SELECT * FROM trip_checklist_state;"` to confirm rows were written only for the boxes actually touched (lazy-write, per spec). Then create a **second** trip with the *same* vehicle/overnight/activity selections (Task 9's form) and open it — expected: "Tent" and "Coffee machine" already appear, unchecked, with zero extra setup (this is the core reuse behavior the whole feature exists for).

- [ ] **Step 8: Commit**

```bash
git add "src/app/[locale]/trips/[id]/components/ParticipantSummaryBar.tsx" "src/app/[locale]/trips/[id]/components/ChecklistColumn.tsx" "src/app/[locale]/trips/[id]/components/AddItemForm.tsx" "src/app/[locale]/trips/[id]/page.tsx"
git commit -m "$(cat <<'EOF'
feat: add two-column packing checklist with live participant progress

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NitJbv2kWpzHbHf27MzfFB
EOF
)"
```

---

## Task 13: i18n messages

**Files:**
- Modify: `messages/en.json` (replace the `FriendsZone` key with `TripPlanner`)
- Modify: `messages/es.json` (same)

**Interfaces:**
- Consumes: every `t("...")` call from Tasks 8–12.
- Produces: the `TripPlanner` namespace, fully populated.

- [ ] **Step 1: Replace `FriendsZone` in `messages/en.json`**

Find:

```json
  "FriendsZone": {
    "title": "Friends Zone",
    "comingSoon": "This section is coming soon."
  },
```

Replace with:

```json
  "TripPlanner": {
    "title": "Luggage Trip Planner",
    "upcoming": "Upcoming",
    "past": "Past",
    "newTrip": "New trip",
    "noTrips": "No trips yet.",
    "packed": "{packed}/{total} packed",
    "vehicle": "Vehicle",
    "overnightStyle": "Overnight style",
    "activities": "Activities",
    "createNew": "+ Create new",
    "createNewPlaceholder": "New value name",
    "name": "Name",
    "startDate": "Start date",
    "endDate": "End date",
    "notes": "Notes",
    "participants": "Participants",
    "inviteParticipant": "Invite participant",
    "email": "Email",
    "displayName": "Display name",
    "remove": "Remove",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "confirmDelete": "Are you sure you want to delete this trip?",
    "editTrip": "Edit trip",
    "individual": "Individual",
    "group": "Group",
    "addItem": "Add item",
    "addItemPrompt": "No items yet for this combination — add the first one.",
    "itemName": "Item name",
    "shared": "Shared item",
    "assignedTo": "Assigned to",
    "unassigned": "Unassigned",
    "create": "Create trip",
    "errors": {
      "tripNotFound": "Trip not found.",
      "attributeValueNotFound": "That option no longer exists.",
      "duplicateAttributeValue": "That value already exists.",
      "participantNotFound": "Participant not found.",
      "participantAlreadyInvited": "That email is already invited to this trip.",
      "invalidInviteToken": "This invite link is invalid or has expired.",
      "packingItemNotFound": "That item no longer exists.",
      "unauthorized": "You don't have access to this trip."
    }
  },
```

- [ ] **Step 2: Replace `FriendsZone` in `messages/es.json`**

Find:

```json
  "FriendsZone": {
    "title": "Zona de Amigos",
    "comingSoon": "Esta sección estará disponible próximamente."
  },
```

(confirm the exact existing Spanish strings with `grep -A3 '"FriendsZone"' messages/es.json` before replacing, in case the wording differs slightly from this guess)

Replace with:

```json
  "TripPlanner": {
    "title": "Luggage Trip Planner",
    "upcoming": "Próximos",
    "past": "Pasados",
    "newTrip": "Nuevo viaje",
    "noTrips": "Todavía no hay viajes.",
    "packed": "{packed}/{total} preparado",
    "vehicle": "Vehículo",
    "overnightStyle": "Tipo de pernocta",
    "activities": "Actividades",
    "createNew": "+ Crear nuevo",
    "createNewPlaceholder": "Nombre del nuevo valor",
    "name": "Nombre",
    "startDate": "Fecha de inicio",
    "endDate": "Fecha de fin",
    "notes": "Notas",
    "participants": "Participantes",
    "inviteParticipant": "Invitar participante",
    "email": "Correo electrónico",
    "displayName": "Nombre para mostrar",
    "remove": "Eliminar",
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "confirmDelete": "¿Seguro que quieres eliminar este viaje?",
    "editTrip": "Editar viaje",
    "individual": "Individual",
    "group": "Grupo",
    "addItem": "Añadir artículo",
    "addItemPrompt": "Todavía no hay artículos para esta combinación — añade el primero.",
    "itemName": "Nombre del artículo",
    "shared": "Artículo compartido",
    "assignedTo": "Asignado a",
    "unassigned": "Sin asignar",
    "create": "Crear viaje",
    "errors": {
      "tripNotFound": "Viaje no encontrado.",
      "attributeValueNotFound": "Esa opción ya no existe.",
      "duplicateAttributeValue": "Ese valor ya existe.",
      "participantNotFound": "Participante no encontrado.",
      "participantAlreadyInvited": "Ese correo ya está invitado a este viaje.",
      "invalidInviteToken": "Este enlace de invitación no es válido o ha caducado.",
      "packingItemNotFound": "Ese artículo ya no existe.",
      "unauthorized": "No tienes acceso a este viaje."
    }
  },
```

- [ ] **Step 3: Validate both JSON files parse**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('messages/es.json','utf8')); console.log('ok')"`
Expected: `ok` (no `SyntaxError`).

- [ ] **Step 4: Typecheck and lint**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: no errors anywhere in the repo now — this is the first point where every file from Tasks 7–12 has its i18n keys satisfied.

- [ ] **Step 5: Manual verification**

Run: `pnpm dev`, click through `/trip-planner` → new trip → trip detail in both `/es/...` and `/en/...` locales. Expected: no raw `TripPlanner.xxx` key strings visible anywhere (that would mean a key is missing or misspelled) and no next-intl console warnings about missing messages.

- [ ] **Step 6: Commit**

```bash
git add messages/en.json messages/es.json
git commit -m "$(cat <<'EOF'
feat: add TripPlanner i18n messages, replacing the FriendsZone placeholder

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NitJbv2kWpzHbHf27MzfFB
EOF
)"
```

---

## Task 14: Final integration pass

**Files:** none created — verification only.

- [ ] **Step 1: Full typecheck**

Run: `pnpm tsc --noEmit`
Expected: zero errors in the whole repo.

- [ ] **Step 2: Full lint**

Run: `pnpm lint`
Expected: zero errors/warnings in every file touched by this plan.

- [ ] **Step 3: Production build**

Run: `pnpm build`
Expected: build succeeds (this also catches any Server/Client Component boundary mistakes — e.g. a `"use client"` file accidentally importing a server-only module — that `tsc` alone won't catch).

- [ ] **Step 4: End-to-end manual walkthrough**

1. As admin: create a trip ("Canyoning day"), a new vehicle ("Car"), overnight style ("Hotel"), activity ("Canyoning"); invite two participants by email — one whose email matches an existing app account, one that doesn't.
2. Confirm (via logs, or a real inbox if `RESEND_API_KEY` is configured) that both invite emails were attempted; check `trip_participants` — the matching-account row has `user_id` set immediately, the other has `user_id IS NULL` with a 64-char hex `invite_token`.
3. Visit the guest's invite URL (`/api/trip-planner/invite/<token>` — copy the token from the DB row since there's no live inbox in dev) in an incognito window. Expected: redirected to `/es/trips/<id>` with a `tp_guest_<id>` cookie set; the trip renders with that participant's own "Individual" checklist (not the admin's per-participant view) and no admin-only affordances (no "Edit trip" button).
4. As the guest, add a shared item and check an individual item. Confirm the checkbox states persist across a page reload (cookie-based access still resolves).
5. **Opportunistic link check**: pick the invited participant whose email doesn't have an account yet. Create a Better Auth account with that exact email (via the normal signup flow or `admin-users.ts`'s `createUserAndNotify`). Sign in as that user and visit `/es/trips/<id>` directly (no token in the URL this time). Expected: `requireTripAccess` matches them by email, runs the `UPDATE trip_participants SET user_id = ...`, and they see the trip as a full participant — confirm via `psql "$DATABASE_URL" -c "SELECT id, email, user_id FROM trip_participants WHERE trip_id = '<id>';"` that `user_id` is now populated for that row.
6. Delete the trip as admin; confirm `trip_checklist_state`, `trip_activities`, and `trip_participants` rows for it are gone (`ON DELETE CASCADE`) but the `packing_items`/`packing_item_tags` rows for "Tent"/"Coffee machine"/whatever was added survive (catalog is trip-independent) — `psql "$DATABASE_URL" -c "SELECT * FROM packing_items;"`.

- [ ] **Step 5: Confirm no stray references remain**

Run: `grep -rn "friends-zone" src --include="*.ts" --include="*.tsx"`
Expected: zero hits.

Run: `grep -rn "FRIENDS_ZONE" src --include="*.ts" --include="*.tsx" | wc -l`
Expected: same count as before this plan started (the role key is untouched) — spot-check a couple of hits to confirm they're still `auth-guards.ts`/`user-roles`/`roles.ts` references, not leftover route strings.

No commit for this task — it's verification-only. If any step surfaces a bug, fix it in the relevant earlier task's files and re-run that task's own typecheck/lint/commit steps before returning here.
