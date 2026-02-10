-- Schedule slots table for tracking Patricia and Alberto's locations
-- throughout the week (Monday-Saturday)

CREATE TABLE IF NOT EXISTS schedule_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start_date DATE NOT NULL, -- Monday of the week
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 6), -- 1=Monday, 6=Saturday
    slot_type VARCHAR(10) NOT NULL CHECK (slot_type IN ('morning', 'afternoon')),
    patricia_location VARCHAR(20) NOT NULL CHECK (patricia_location IN ('Manises', 'Quart', 'Casa')),
    alberto_location VARCHAR(20) NOT NULL CHECK (alberto_location IN ('Manises', 'Quart', 'Casa')),
    parents_needed BOOLEAN DEFAULT FALSE,
    parents_needed_start_time TIME,
    parents_needed_end_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(week_start_date, day_of_week, slot_type)
);

-- Index for faster lookups by week
CREATE INDEX IF NOT EXISTS idx_schedule_slots_week ON schedule_slots(week_start_date);

-- Constraint: Saturday (day_of_week = 6) can only have 'morning' slot
-- This is enforced at application level since partial unique constraints are complex
