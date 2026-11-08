export type BankingError =
  | { kind: "http"; status: number; message: string }
  | { kind: "network"; message: string };

export type Result<T> =
  { ok: true; value: T } | { ok: false; error: BankingError };

export const PSU_TYPE = {
  PERSONAL: "personal",
  BUSINESS: "business",
} as const;

export type PsuType = (typeof PSU_TYPE)[keyof typeof PSU_TYPE];

export interface Aspsp {
  name: string;
  country: string;
  logo: string | null;
  maximumConsentValiditySeconds: number | null;
}

export interface BankAccountInfo {
  /** Session-scoped id used in API paths. */
  uid: string;
  /** Stable across sessions. */
  identificationHash: string | null;
  name: string | null;
  product: string | null;
  iban: string | null;
  currency: string | null;
  raw: unknown;
}

export interface BankSession {
  sessionId: string;
  accounts: BankAccountInfo[];
  validUntil: string;
}

export interface AccountBalance {
  type: string;
  amount: string;
  currency: string;
  referenceDate: string | null;
}

export const TRANSACTION_STATUS = {
  BOOKED: "booked",
  PENDING: "pending",
} as const;

export type TransactionStatus =
  (typeof TRANSACTION_STATUS)[keyof typeof TRANSACTION_STATUS];

export interface BankTransactionRecord {
  status: TransactionStatus;
  /** Signed: debits are negative. */
  amount: string;
  currency: string;
  bookingDate: string | null;
  valueDate: string | null;
  transactionDate: string | null;
  counterparty: string | null;
  description: string | null;
  transactionId: string | null;
  entryReference: string | null;
  raw: unknown;
}

export interface TransactionsPage {
  transactions: BankTransactionRecord[];
  continuationKey: string | null;
}
