CREATE TABLE IF NOT EXISTS renovation_loan_repayments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES renovation_loans(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    repayment_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_renovation_loan_repayments_loan_id ON renovation_loan_repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_renovation_loan_repayments_user_id ON renovation_loan_repayments(user_id);
