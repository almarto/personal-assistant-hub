# Luggage Trip Planner (Friends Zone)

## Problem

The `friends-zone` route exists (gated behind the `FRIENDS_ZONE` app role) but only shows a "coming
soon" placeholder. The actual need: an admin organizes group trips (motorbike touring with camping,
a hiking weekend, a canyoning day, etc.) and wants a packing checklist that (a) adapts to what kind
of trip it is, (b) splits into "bring your own" vs "shared" items, (c) tracks who has and hasn't
packed what, and (d) doesn't require re-typing the same item list every time a similar trip comes
up. Participants may or may not already have an account in the app.

## Goals

- Admin creates a trip: name, dates, a vehicle, an overnight style, and one or more activities —
  each picked from an admin-extensible list, with inline "create new" when the value doesn't exist
  yet.
- A packing-item catalog where each item is tagged to one or more of those attribute values and
  marked individual or shared. A trip's checklist is the live union of catalog items whose tags
  match the trip's selected attributes — so items are reused automatically across any trip that
  shares an attribute, with no per-trip copy step and no manual resync when the catalog grows.
- When a trip's attribute combination has no matching items yet, the checklist shows an inline
  "add the first one" prompt instead of an empty list — building the trip doubles as seeding the
  catalog.
- Admin invites participants by email; no account required. An invite with a matching account links
  to it; an invite with no account gets a token-based guest link (no login) scoped to that one trip.
- Any trip viewer — admin, logged-in participant, or guest — can add new catalog items from the trip
  page (tagged to that trip's current attributes). Only admins can introduce new attribute *values*
  (new vehicle/overnight/activity types) or create/edit/delete trips and participants.
- Checklist: individual items are a personal per-participant checklist (each participant only sees
  and checks their own copy); shared items are one row per trip with an optional "assigned to"
  participant.
- Any Friends Zone user sees the trips they're participating in (upcoming and past) on the landing
  page; admins additionally see every trip and a "New trip" action.

## Non-goals

- No quantities — items are a single checkbox, not "bring 2 gas canisters."
- No trip status/cancellation field — a trip is just deleted if it's off.
- No filtering of activity options by the selected vehicle — one flat activity list regardless of
  vehicle/overnight choice.
- No standalone catalog-management screen — items are only created/edited inline from a trip. Can
  be added later if the catalog grows unwieldy.
- No reminder emails — a single invite email per participant, sent once, on invite.
- No retroactive account linking — if a guest participant later creates an account with the same
  email, their existing `trip_participants.user_id` stays `NULL`; they keep using their guest link.
- No down-migrations (matches existing repo convention).

## Data Model

```sql
-- 019_trip_planner.sql

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

`trip_checklist_state` rows are written lazily — only when a box is first checked or a shared item
first assigned. Which items apply to a trip is never stored; it's computed at read time (see
`getTripChecklist` below), so a catalog item created today shows up immediately on every trip, past
or future, whose attributes match — including the current trip you're mid-building.

`packing_items.created_by_participant_id` records who added it (works uniformly for admins, logged
-in participants, and guests, since every viewer of a trip has a `trip_participants` row except the
admin who isn't a participant — nullable for that case).

## Backend

### `src/lib/services/trips.ts`

Error classes: `TripNotFoundError`, `AttributeValueNotFoundError`, `ParticipantNotFoundError`,
`InvalidInviteTokenError`, `PackingItemNotFoundError`.

- **Attribute values**: `getAttributeValues(category?)`, `createAttributeValue(userId, category,
  name)` (throws on duplicate `(category, name)` — caught by the action and surfaced inline).
- **Trips**: `getTrips(userId, isAdmin)` — admin gets every trip; otherwise trips where a
  `trip_participants` row matches `user_id`. `getTripById(tripId)` — trip + attribute values +
  activities + participants, one query with joins. `createTrip(userId, data)` — inserts the trip
  and its `trip_activities` rows in one transaction. `updateTrip`/`deleteTrip` — same
  partial-update-by-field pattern as `updateRenovationTask`.
- **Participants**: `inviteParticipant(tripId, { email, display_name })` — looks up `"user"` by
  email to resolve `user_id` if they already have an account, generates a 32-byte hex
  `invite_token` (`crypto.randomBytes(32).toString("hex")`), inserts the row, sends the invite email
  (see Email below). `removeParticipant(participantId)`. `resolveParticipantByToken(token)`.
- **Packing items**: `createPackingItem({ name, is_shared, attributeValueIds, createdByParticipantId
  })` — inserts item + tags in one transaction.
- **Checklist**: `getTripChecklist(tripId)` — two queries unioned in the service (not SQL UNION,
  since shapes differ):
  - Individual: matching `is_shared = false` items × trip's participants (`CROSS JOIN`), `LEFT JOIN
    trip_checklist_state` on `(trip_id, packing_item_id, participant_id)` for `checked`.
  - Shared: matching `is_shared = true` items, `LEFT JOIN trip_checklist_state` on `(trip_id,
    packing_item_id)` where `participant_id IS NULL`, for `checked` + `assigned_participant_id`.
  - "Matching" = item has a tag in
    `(trip.vehicle_value_id, trip.overnight_value_id, trip's activity_value_ids)`.
  `setChecklistItemChecked(tripId, packingItemId, participantId | null, checked)` — upsert via
  `INSERT ... ON CONFLICT` against the relevant partial unique index.
  `assignChecklistItem(tripId, packingItemId, assignedParticipantId | null)` — same upsert, sets
  `assigned_participant_id` on the shared row.

### Access control (`src/lib/auth-guards.ts`)

`requireTripAccess(tripId)` — reads the Better Auth session (optional) and, if absent or not a
match, a per-trip guest cookie (`tp_guest_<tripId>`, set by the invite link below):

1. Session + admin role → full access.
2. Session + a `trip_participants` row for `(tripId, user_id)` → participant access.
3. No/non-matching session, but the `tp_guest_<tripId>` cookie value matches a
   `trip_participants.invite_token` for this trip → guest access.
4. Otherwise → redirect to sign-in (session case) or 404 (no session, no valid guest cookie — avoids
   leaking trip existence to randoms).

Trip creation, editing, deletion, participant invite/removal, and new attribute values keep using
the existing `requireAdmin()`. Adding a packing item and toggling/assigning checklist state only
need `requireTripAccess(tripId)` — any admin, participant, or guest.

### Guest invite link

`src/app/api/friends-zone/invite/[token]/route.ts` (`GET`) — the one plain Route Handler in this
feature, needed because a clicked email link can't submit a Server Action. Resolves the participant
by token:

- `user_id` set (they have an account) → redirect to `/auth/signin?callbackUrl=/trips/<tripId>` if
  not currently signed in as that user, else straight to `/trips/<tripId>`.
- `user_id` null (no account) → set `tp_guest_<tripId>` cookie (httpOnly, the raw token, no
  expiry — matches the trip's own lifetime, revocable by deleting the participant) and redirect to
  `/trips/<tripId>`.

### Email

`src/lib/services/email/templates/trip-invite.ts`, following `welcome.ts`'s shape: subject + body
with the participant's display name, the trip name, and the `/api/friends-zone/invite/<token>` link.
Sent once from `inviteParticipant`.

### `src/app/actions/trips.ts`

Server actions mirroring `src/app/actions/renovations.ts`'s shape (call the right guard, call the
service, `revalidatePath`): `createTripAction`, `updateTripAction`, `deleteTripAction`,
`createAttributeValueAction`, `inviteParticipantAction`, `removeParticipantAction`,
`createPackingItemAction`, `toggleChecklistItemAction`, `assignChecklistItemAction`.

### `src/lib/types/trips.ts`

`Trip`, `TripAttributeValue`, `TripParticipant`, `PackingItem`, and a discriminated
`ChecklistEntry = { kind: "individual"; participantId: string; ... } | { kind: "shared";
assignedParticipantId: string | null; ... }` for the two checklist row shapes.

## UI

### File structure

```
src/app/[locale]/friends-zone/
  layout.tsx              # unchanged: session + FRIENDS_ZONE role gate (admin bypasses)
  page.tsx                 # trip list, heading "Luggage Trip Planner"
  page.module.css
  trips/new/
    page.tsx                # requireAdmin(); the creation form
    NewTripForm.tsx

src/app/[locale]/trips/
  layout.tsx               # new: requireTripAccess(tripId) instead of the blanket role gate,
                            # so guests and non-FRIENDS_ZONE participants can reach their trip
  [id]/
    page.tsx                 # trip detail
    page.module.css
    components/
      TripHeader.tsx
      ParticipantSummaryBar.tsx      # "Alberto 40/42", "Miguel 42/42" per participant
      ChecklistColumn.tsx            # reused for Individual and Group columns via props
      AddItemForm.tsx                # inline, open to any viewer
      InviteParticipantModal.tsx     # admin only
      EditTripModal.tsx              # admin only

src/app/api/friends-zone/invite/[token]/route.ts
```

`/trips/[id]` lives outside the `/friends-zone` subtree specifically so its layout can grant access
by trip participation instead of the blanket `FRIENDS_ZONE` role — a guest or a plain participant
without that role still needs to open their trip.

### Trip list (`/friends-zone`)

Cards grouped Upcoming / Past (by `end_date` vs today). Admins see every trip plus a "New trip"
button; everyone else sees only trips they participate in. Each card: name, dates, vehicle +
overnight + activity badges, a small "your checklist: 8/12" progress hint.

### New trip (`/friends-zone/trips/new`, admin only)

Single form: name, dates, notes, then the three pickers described in Goals (vehicle/overnight
single-select combobox with inline "+ create", activities multi-select tag input with inline "+
create"). Participant emails can be added here too (repeatable email + name rows) or afterward from
the trip page — both paths call the same `inviteParticipantAction`. Submitting creates the trip and
redirects to `/trips/<id>`.

### Trip detail (`/trips/[id]`)

- **Header**: name, dates, attribute badges, notes; admin sees an edit affordance opening
  `EditTripModal` (same field set as creation, plus invite/remove participants).
- **Participant summary bar**: one chip per participant, `name  packed/total` (counting their
  individual items plus shared items, matching the "Alberto 40/42" ask), sorted by completion.
- **Two-column checklist**: **Individual** (the viewer's own items only — if viewing as a
  participant/guest; admins viewing without a participant row see a per-participant sub-list
  instead) and **Group** (shared items, each with a checkbox and an "assigned to" select). Checking
  a box is optimistic-UI over `toggleChecklistItemAction`.
- **Empty state**: when a column has no matching catalog items for the trip's current attributes,
  it shows the inline `AddItemForm` prompt instead of nothing — name, shared/individual toggle
  (defaulted from which column triggered it), tags pre-checked to the trip's current attribute
  values and editable. Once items exist, the same "+ add item" affordance stays available at the
  bottom of each column.

## i18n

New namespace `TripPlanner` (replacing the placeholder `FriendsZone` namespace, which today only
has `title`/`comingSoon`) in `messages/en.json` and `messages/es.json`: `title` ("Luggage Trip
Planner"), `upcoming`, `past`, `newTrip`, `vehicle`, `overnightStyle`, `activities`,
`createNew`, `individual`, `group`, `addItem`, `assignedTo`, `unassigned`, `participants`,
`inviteParticipant`, `packed` (progress format), plus error-message keys for the new error classes
(mirroring `RenovationsErrors`-style keys already in the file).

## Scope

- New migration `019_trip_planner.sql`.
- New `src/lib/services/trips.ts`, `src/app/actions/trips.ts`, `src/lib/types/trips.ts`.
- New `src/app/api/friends-zone/invite/[token]/route.ts`.
- New email template `src/lib/services/email/templates/trip-invite.ts`.
- `src/lib/auth-guards.ts` gets `requireTripAccess`.
- `src/app/[locale]/friends-zone/page.tsx` rewritten (list); new `trips/new/` under it.
- New `src/app/[locale]/trips/[id]/` tree with its own `layout.tsx`.
- `messages/en.json` / `messages/es.json`: replace `FriendsZone` namespace with `TripPlanner`.
- No new dependencies.
