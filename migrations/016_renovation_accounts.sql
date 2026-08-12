CREATE TABLE IF NOT EXISTS renovation_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('shared','personal','cash')),
    balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, account_type)
);
CREATE INDEX IF NOT EXISTS idx_renovation_accounts_user_id ON renovation_accounts(user_id);

INSERT INTO renovation_accounts (user_id, account_type)
SELECT DISTINCT user_id, account_type
FROM (
  SELECT user_id, unnest(ARRAY['shared','personal','cash']) AS account_type FROM renovation_tasks
  UNION
  SELECT user_id, unnest(ARRAY['shared','personal','cash']) FROM renovation_payments
  UNION
  SELECT user_id, unnest(ARRAY['shared','personal','cash']) FROM renovation_loans
) seed
ON CONFLICT (user_id, account_type) DO NOTHING;
