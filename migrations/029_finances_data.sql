-- migrations/029_finances_data.sql

ALTER TABLE bank_connections
    ADD COLUMN IF NOT EXISTS aspsp_logo TEXT,
    ADD COLUMN IF NOT EXISTS discarded_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS last_sync_error TEXT,
    DROP COLUMN IF EXISTS accounts;

-- Only the last 4 IBAN digits are kept in a column; the full IBAN stays in raw.
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
    uid TEXT NOT NULL,
    identification_hash TEXT,
    name TEXT,
    product TEXT,
    iban_last4 VARCHAR(4),
    currency CHAR(3),
    raw JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (connection_id, uid)
);

CREATE TABLE IF NOT EXISTS bank_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    balance_type VARCHAR(10) NOT NULL,
    amount NUMERIC(18, 2) NOT NULL,
    currency CHAR(3) NOT NULL,
    reference_date DATE,
    fetched_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS bank_balances_account_fetched_idx
    ON bank_balances(account_id, fetched_at DESC);

CREATE TABLE IF NOT EXISTS bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    status VARCHAR(10) NOT NULL CHECK (status IN ('booked', 'pending')),
    amount NUMERIC(18, 2) NOT NULL,
    currency CHAR(3) NOT NULL,
    booking_date DATE,
    value_date DATE,
    transaction_date DATE,
    counterparty TEXT,
    description TEXT,
    dedupe_key TEXT NOT NULL,
    raw JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS bank_transactions_booked_dedupe
    ON bank_transactions(account_id, dedupe_key) WHERE status = 'booked';

CREATE INDEX IF NOT EXISTS bank_transactions_account_booking_idx
    ON bank_transactions(account_id, booking_date DESC);
