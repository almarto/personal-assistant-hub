CREATE TABLE IF NOT EXISTS renovation_funds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., 'savings', 'loan', 'gift'
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    source TEXT, -- e.g., Who gave it (cousin, etc.)
    date_received DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_renovation_funds_user_id ON renovation_funds(user_id);

CREATE TABLE IF NOT EXISTS renovation_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- e.g., 'labor', 'material', 'permit', 'other'
    priority VARCHAR(50) NOT NULL, -- 'mandatory', 'ideal', 'future'
    status VARCHAR(50) NOT NULL, -- 'pending', 'in_progress', 'completed', 'cancelled'
    estimated_cost DECIMAL(12,2) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_renovation_tasks_user_id ON renovation_tasks(user_id);

CREATE TABLE IF NOT EXISTS renovation_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    task_id UUID REFERENCES renovation_tasks(id) ON DELETE SET NULL,
    fund_id UUID REFERENCES renovation_funds(id) ON DELETE SET NULL,
    payee VARCHAR(255) NOT NULL, -- e.g., 'Pintor', 'Albañil'
    amount DECIMAL(12,2) NOT NULL,
    payment_date DATE NOT NULL,
    method VARCHAR(50) NOT NULL, -- 'transfer', 'cash', 'card'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_renovation_payments_user_id ON renovation_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_renovation_payments_task_id ON renovation_payments(task_id);
CREATE INDEX IF NOT EXISTS idx_renovation_payments_fund_id ON renovation_payments(fund_id);
