-- Users table is managed by Better Auth (table name: "user")

CREATE TABLE IF NOT EXISTS babies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    birth_date DATE NOT NULL,
    photo_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_babies_user_id ON babies(user_id);
CREATE INDEX IF NOT EXISTS idx_babies_created_at ON babies(created_at DESC);

CREATE TABLE IF NOT EXISTS food_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    food_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    feedback_score INTEGER CHECK (feedback_score >= 1 AND feedback_score <= 5),
    reaction_score INTEGER CHECK (reaction_score >= 0 AND reaction_score <= 3),
    notes TEXT,
    photo_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_food_entries_baby_id ON food_entries(baby_id);
CREATE INDEX IF NOT EXISTS idx_food_entries_created_at ON food_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_entries_food_name ON food_entries(food_name);

CREATE TABLE IF NOT EXISTS caregivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    permission_level VARCHAR(20) DEFAULT 'editor' CHECK (permission_level IN ('viewer', 'editor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(baby_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_caregivers_baby_id ON caregivers(baby_id);
CREATE INDEX IF NOT EXISTS idx_caregivers_user_id ON caregivers(user_id);
