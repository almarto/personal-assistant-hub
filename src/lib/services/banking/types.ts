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

// ISO 3166-1 alpha-2 country of the *bank* (not the UI language).
export const BANK_COUNTRIES = ["DE", "ES", "FR", "IT", "NL", "PT"] as const;

export type BankCountry = (typeof BANK_COUNTRIES)[number];
