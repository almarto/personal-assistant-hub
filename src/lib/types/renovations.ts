export interface RenovationFund {
  id: string;
  user_id: string;
  name: string;
  type: string;
  amount: string; // Decimal comes as string from postgres
  source: string | null;
  date_received: string | null;
  lender: string | null;
  include_in_budget: boolean;
  created_at: string;
  updated_at: string;
}

export interface RenovationGroup {
  id: string;
  user_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface RenovationTask {
  id: string;
  user_id: string;
  name: string;
  category: string;
  priority: string;
  status: string;
  group_id: string | null;
  estimated_cost: string; // Decimal
  actual_cost: string; // Decimal
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RenovationPayment {
  id: string;
  user_id: string;
  task_id: string | null;
  fund_id: string | null;
  payee: string;
  amount: string; // Decimal
  payment_date: string;
  method: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
