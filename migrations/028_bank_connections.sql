-- migrations/028_bank_connections.sql

CREATE TABLE IF NOT EXISTS bank_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    aspsp_name VARCHAR(200) NOT NULL,
    aspsp_country CHAR(2) NOT NULL,
    psu_type VARCHAR(20) NOT NULL CHECK (psu_type IN ('personal', 'business')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
    state TEXT UNIQUE,
    session_id TEXT,
    accounts JSONB,
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bank_connections_user_id_idx ON bank_connections(user_id);
