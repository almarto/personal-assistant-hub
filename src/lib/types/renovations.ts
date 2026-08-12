export interface RenovationLoan {
  id: string;
  user_id: string;
  name: string;
  amount: string; // Decimal comes as string from postgres
  lender: string;
  date_borrowed: string | null;
  created_at: string;
  updated_at: string;
}

export interface RenovationLoanRepayment {
  id: string;
  loan_id: string;
  user_id: string;
  amount: string; // Decimal
  repayment_date: string;
  notes: string | null;
  created_at: string;
}

export type RenovationAccountType = "shared" | "personal" | "cash";

export interface RenovationAccount {
  id: string;
  user_id: string;
  account_type: RenovationAccountType;
  balance: string; // Decimal
  updated_at: string;
}

export interface RenovationGroup {
  id: string;
  user_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  contractor: string | null;
  created_at: string;
  updated_at: string;
}

export interface RenovationTask {
  id: string;
  user_id: string;
  name: string;
  category: string;
  status: string;
  group_id: string | null;
  estimated_cost: string; // Decimal
  paid_so_far: string; // Decimal, computed from linked payments
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
  payee: string;
  amount: string; // Decimal
  payment_date: string;
  account_type: RenovationAccountType;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
