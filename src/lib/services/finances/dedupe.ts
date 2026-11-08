import { createHash } from "crypto";

import type { BankTransactionRecord } from "./types";

export function transactionDedupeKey(tx: BankTransactionRecord): string {
  if (tx.transactionId) return `id:${tx.transactionId}`;
  if (tx.entryReference) return `ref:${tx.entryReference}`;
  const fields = [tx.bookingDate, tx.amount, tx.currency, tx.description]
    .map((field) => field ?? "")
    .join("|");
  return `hash:${createHash("sha256").update(fields).digest("hex")}`;
}
