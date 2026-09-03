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
