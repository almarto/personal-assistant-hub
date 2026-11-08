# Finances MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. **Native execution only: implement every task in the current session; do not dispatch subagents.** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the working Enable Banking connection into the Finances MVP: store accounts, balances and movements in our DB, show them on the overview and bank-detail pages from the design, sync on demand, and run migrations automatically on production deploys.

**Architecture:** Everything moves under `finances` (service folder, actions, routes, pages, messages). The Enable Banking client is extended to return full account, balance and transaction data. Pure helpers decide what to display and how to dedupe. Repositories persist to four tables. One `syncConnection` service holds the sync rules, shared by the callback (initial import), the "Sincronizar ahora" action, and later the cron job (#21). Pages read only from the DB through two read-model functions.

**Tech Stack:** Next.js App Router, TypeScript strict, Postgres (`pg`), Vitest, next-intl, `next/image`, Node `crypto`, native `fetch`.

**Spec:** `docs/superpowers/specs/2026-11-08-finances-mvp-design.md` (builds on `2026-11-08-enable-banking-connection-design.md`). Visual design: https://claude.ai/artifact/Q4DsVqfgG4kTe1z2Km7dpg (boards Resumen de bancos, Primer banco, Detalle de un banco, Añadir banco).

## Global Constraints

- `pnpm` only. **No new dependencies.**
- TypeScript strict, no `any`, discriminated unions for variants, `as const` objects (no enums), named exports except Next.js pages/layouts/route handlers.
- Server Components by default. `"use client"` only for: the bank picker (search/chips/selection), the account carousel (scroll buttons), the sync button (pending state), and the bank logo (image error fallback).
- Tests colocated as `*.test.ts` (Vitest only runs `src/**/*.test.ts`). Repositories are tested with `vi.mock("@/lib/db")` as in `commute/config.test.ts`.
- Ownership: every query reachable from a request filters by `user_id` through `bank_connections` in SQL. Every action and route calls `requireFinances()`.
- **Pages never call Enable Banking for account data**; only the bank list (`GET /aspsps`) is fetched live, and only when the picker is shown.
- Amounts are `NUMERIC(18,2)` in the DB and decimal **strings** in TS; sums go through integer cents, never floats.
- All UI copy in `messages/en.json` and `messages/es.json` under the `Finances` namespace (replacing `Banking`).
- Sync rules (spec): booked `date_from` = newest stored booked date − **5** days (first import: 1st of the current month), `transaction_status=BOOK`, follow `continuation_key`; pending `date_from` = today − **10** days, `transaction_status=PDNG`, replace the stored pending set; append a balance snapshot.
- Display balance order: `ITBD` → `CLBD` → `ITAV` → `CLAV` → first non-`XPCD`; never `XPCD`.
- Consent badge: expiring when ≤ **14** days left.
- Account title: `name` → `product` → masked IBAN; masked IBAN always as secondary line (`•••• 1234`).
- Migrations run on Vercel **only when `VERCEL_ENV === "production"`**.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. A user opening, syncing, retrying or discarding another user's connection id → 404/not found, nothing changes (Tasks 5, 7, 8).
2. Two overlapping syncs → no duplicated booked movements; a pending movement that got booked → gone from the pending block (Task 6).
3. A bank that ignores `transaction_status` and returns booked and pending together → each lands in the right place (Task 6).
4. A sync that fails mid-way (rate limit on account 2 of 3) → accounts 1 and 3 still updated, error shown on the page, connection keeps working (Task 6, 7).
5. Accounts in different currencies at one bank → the card shows one total per currency, never a mixed sum (Task 4, 8).
6. A preview deployment build → migrations skipped, build continues (Task 11).

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/services/finances/{types,config,jwt,client,consent}.ts` | Moved from `services/banking`; client extended |
| `src/lib/services/finances/display.ts` | `pickDisplayBalance`, `accountDisplayName`, `maskIban`, `sumAmounts` |
| `src/lib/services/finances/dedupe.ts` | `transactionDedupeKey` |
| `src/lib/services/finances/dates.ts` | `startOfMonthUtc`, `subtractDays`, `monthKey` |
| `src/lib/services/finances/connections.ts` | `bank_connections` repository (moved + extended) |
| `src/lib/services/finances/accounts.ts` | `bank_accounts` repository |
| `src/lib/services/finances/balances.ts` | `bank_balances` repository |
| `src/lib/services/finances/transactions.ts` | `bank_transactions` repository |
| `src/lib/services/finances/sync.ts` | `syncConnection` |
| `src/lib/services/finances/overview.ts`, `detail.ts` | Read models for the two pages |
| `migrations/029_finances_data.sql` | New tables and columns |
| `src/app/actions/finances.ts` | start, retry, discard, sync-now actions |
| `src/app/api/finances/callback/route.ts` | Callback (moved) + store accounts + initial sync |
| `src/app/[locale]/finances/**` | Overview, first-bank, add-bank dialog, detail page and components |
| `src/app/[locale]/banking/page.tsx` | Redirect to `/finances` |
| `src/lib/deploy/should-run-migrations.ts`, `scripts/deploy-migrate.ts` | Production-only migrations |
| `next.config.ts` | `images.remotePatterns` for `enablebanking.com/brands/**` |

---

### Task 1: Rename banking → finances (no behaviour change)

**Files:**
- Move: `src/lib/services/banking/*` → `src/lib/services/finances/*`; `src/app/actions/banking{,.test}.ts` → `src/app/actions/finances{,.test}.ts`; `src/app/api/banking/callback/*` → `src/app/api/finances/callback/*`; `src/app/[locale]/banking/*` → `src/app/[locale]/finances/*`
- Create: `src/app/[locale]/banking/page.tsx` (redirect only)
- Modify: imports everywhere, `messages/{en,es}.json` (`Banking` → `Finances`), launcher card href in `src/app/[locale]/page.tsx`, `README.md` (callback URL), `.env` (`ENABLE_BANKING_REDIRECT_URL=https://localhost:3000/api/finances/callback`)

**Interfaces:**
- Produces: import paths `@/lib/services/finances/...`, `@/app/actions/finances`, route `GET /api/finances/callback` redirecting to `/{defaultLocale}/finances`, page `/[locale]/finances`, messages namespace `Finances`.

- [ ] **Step 1: Move files with `git mv`**, fix imports, rename the namespace in both message files and in `getTranslations(...)` calls, update the route test's expected redirects from `/es/banking` to `/es/finances`.
- [ ] **Step 2: Add the redirect page** `src/app/[locale]/banking/page.tsx` that calls `redirect({ href: "/finances", locale })` from `@/i18n/routing`.
- [ ] **Step 3: Update `.env`'s `ENABLE_BANKING_REDIRECT_URL`** and the README; remind the user to register `https://localhost:3000/api/finances/callback` (sandbox) and `https://almarto.es/api/finances/callback` (production) in Enable Banking.
- [ ] **Step 4: Run** `pnpm vitest run` → all pass; `pnpm tsc --noEmit` and `pnpm lint` → clean; `grep -rn "services/banking\|api/banking\|\"Banking\"" src messages` → no matches.
- [ ] **Step 5: Commit** — `refactor(finances): move banking feature under finances`

---

### Task 2: Data model

**Files:**
- Create: `migrations/029_finances_data.sql`

**Interfaces:**
- Produces: columns `bank_connections.{aspsp_logo TEXT, discarded_at TIMESTAMPTZ, last_synced_at TIMESTAMPTZ, last_sync_error TEXT}`; `bank_connections.accounts` dropped; tables `bank_accounts`, `bank_balances`, `bank_transactions` as below.

- [ ] **Step 1: Write the migration** (style of `025_commute.sql`):
  - `ALTER TABLE bank_connections ADD COLUMN aspsp_logo TEXT, ADD COLUMN discarded_at TIMESTAMP WITH TIME ZONE, ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE, ADD COLUMN last_sync_error TEXT, DROP COLUMN accounts;`
  - `bank_accounts`: `id UUID PK DEFAULT gen_random_uuid()`, `connection_id UUID NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE`, `uid TEXT NOT NULL`, `identification_hash TEXT`, `name TEXT`, `product TEXT`, `iban_last4 VARCHAR(4)`, `currency CHAR(3)`, `raw JSONB NOT NULL`, `created_at TIMESTAMPTZ DEFAULT NOW()`, `UNIQUE (connection_id, uid)`.
  - `bank_balances`: `id UUID PK`, `account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE`, `balance_type VARCHAR(10) NOT NULL`, `amount NUMERIC(18,2) NOT NULL`, `currency CHAR(3) NOT NULL`, `reference_date DATE`, `fetched_at TIMESTAMPTZ NOT NULL`; index `(account_id, fetched_at DESC)`.
  - `bank_transactions`: `id UUID PK`, `account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE`, `status VARCHAR(10) NOT NULL CHECK (status IN ('booked','pending'))`, `amount NUMERIC(18,2) NOT NULL`, `currency CHAR(3) NOT NULL`, `booking_date DATE`, `value_date DATE`, `transaction_date DATE`, `counterparty TEXT`, `description TEXT`, `dedupe_key TEXT NOT NULL`, `raw JSONB NOT NULL`, `created_at TIMESTAMPTZ DEFAULT NOW()`; `CREATE UNIQUE INDEX bank_transactions_booked_dedupe ON bank_transactions(account_id, dedupe_key) WHERE status = 'booked'`; index `(account_id, booking_date DESC)`.
  - The masked IBAN keeps only the last 4 digits (`iban_last4`); the full IBAN stays only inside `raw`.
- [ ] **Step 2: Run** `pnpm migrate` → ends with `Migration 029_finances_data.sql completed successfully`.
- [ ] **Step 3: Commit** — `feat(finances): tables for accounts, balances and movements`

---

### Task 3: Client returns full data

**Files:**
- Modify: `src/lib/services/finances/types.ts`, `client.ts`, `client.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  - `Aspsp { name: string; country: string; logo: string | null; maximumConsentValiditySeconds: number | null }`
  - `BankAccountInfo { uid: string; identificationHash: string | null; name: string | null; product: string | null; iban: string | null; currency: string | null; raw: unknown }` (replaces `BankAccountRef`; `BankSession.accounts: BankAccountInfo[]`)
  - `AccountBalance { type: string; amount: string; currency: string; referenceDate: string | null }`
  - `const TRANSACTION_STATUS = { BOOKED: "booked", PENDING: "pending" } as const`, `type TransactionStatus`
  - `BankTransactionRecord { status: TransactionStatus; amount: string /* signed */; currency: string; bookingDate: string | null; valueDate: string | null; transactionDate: string | null; counterparty: string | null; description: string | null; transactionId: string | null; entryReference: string | null; raw: unknown }`
  - `TransactionsPage { transactions: BankTransactionRecord[]; continuationKey: string | null }`
- Produces (`client.ts`): `listAspsps(country?: string): Promise<Result<Aspsp[]>>` (no `country` param → all banks); `getTransactions(accountUid: string, params: { dateFrom: string; status: "BOOK" | "PDNG"; continuationKey?: string }): Promise<Result<TransactionsPage>>`. `createSession` and `getBalances` return the new types. `BANK_COUNTRIES`/`BankCountry` are removed (the picker derives countries from the bank list).

- [ ] **Step 1: Update tests first**: `listAspsps()` → GET `/aspsps` (no query), maps `logo` (null when absent); `listAspsps("DE")` keeps `?country=DE`. `createSession` maps `uid`, `identification_hash`, `name`, `product`, `currency`, IBAN from `account_id.iban` (else `all_account_ids[]` entry with `scheme_name: "IBAN"`), keeps the account object as `raw`. `getBalances` maps `reference_date`. `getTransactions("u1", { dateFrom: "2026-11-01", status: "BOOK", continuationKey: "k1" })` → GET `/accounts/u1/transactions?date_from=2026-11-01&transaction_status=BOOK&continuation_key=k1`; maps `status` `BOOK`→`booked`, `PDNG`→`pending` (anything else → `booked` only if `booking_date` is set, else `pending`); DBIT amounts negative; `counterparty` = `creditor.name` for DBIT, `debtor.name` for CRDT; `description` = `remittance_information` joined with `" · "`; returns `continuationKey` from the response (null when absent).
- [ ] **Step 2: Run** `pnpm vitest run src/lib/services/finances/client.test.ts` → FAIL.
- [ ] **Step 3: Implement**; update the callers that break (`startConnectionAction`, the old page) just enough to compile.
- [ ] **Step 4: Run** `pnpm vitest run` → PASS; `pnpm tsc --noEmit` → clean.
- [ ] **Step 5: Commit** — `feat(finances): client returns full account, balance and movement data`

---

### Task 4: Pure helpers

**Files:**
- Create: `src/lib/services/finances/{display,dedupe,dates}.ts` + tests; Modify: `consent.ts` + test

**Interfaces:**
- `pickDisplayBalance(balances: AccountBalance[]): AccountBalance | null`
- `maskIban(iban: string | null): string | null` → `"•••• 1234"`
- `accountDisplayName(account: { name: string | null; product: string | null; ibanLast4: string | null }): string` (falls back to `"•••• 1234"`, and to `"—"` if all are null)
- `sumAmounts(amounts: Array<{ amount: string; currency: string }>): Array<{ amount: string; currency: string }>` (one entry per currency, decimal strings with 2 decimals, via integer cents)
- `transactionDedupeKey(tx: BankTransactionRecord): string` → `id:<transactionId>` | `ref:<entryReference>` | `hash:<sha256 hex of "bookingDate|amount|currency|description">`
- `startOfMonthUtc(now: Date): string` (`YYYY-MM-DD`), `subtractDays(date: string, days: number): string`, `monthKey(date: string): string` (`YYYY-MM`)
- `consentStatus(validUntil: string, now: Date): { kind: "active" } | { kind: "expiring"; daysLeft: number } | { kind: "expired" }`

- [ ] **Step 1: Write failing tests**: balance order (`[XPCD, CLBD, ITBD]` → ITBD; `[XPCD, CLBD]` → CLBD; `[XPCD, OPBD]` → OPBD; `[XPCD]` → null; `[]` → null). `maskIban("ES9121000418450200051332")` → `"•••• 1332"`, `null` → null. `accountDisplayName` with name / without name / only last4 / nothing. `sumAmounts([{ "10.10","EUR" }, { "-0.20","EUR" }, { "5.00","USD" }])` → `[{ "9.90","EUR" }, { "5.00","USD" }]`; `0.1 + 0.2` case gives `"0.30"`. Dedupe: transactionId wins over entryReference; hash is stable for equal fields and differs when the amount differs. `startOfMonthUtc(2026-11-08T23:30Z)` → `"2026-11-01"`; `subtractDays("2026-11-03", 5)` → `"2026-10-29"`; `monthKey("2026-11-08")` → `"2026-11"`. `consentStatus`: 30 days left → active; exactly 14 → expiring 14; 0.5 day left → expiring 1; past → expired.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/services/finances` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `feat(finances): display, dedupe, date and consent helpers`

---

### Task 5: Repositories

**Files:**
- Modify: `src/lib/services/finances/connections.ts` + test; Create: `accounts.ts`, `balances.ts`, `transactions.ts` + tests

**Interfaces:**
- `connections.ts`:
  - `createPendingConnection(params: { userId; aspspName; aspspCountry; aspspLogo: string | null; psuType }): Promise<{ id: string; state: string }>`
  - `activateConnectionByState(params: { userId; state; sessionId; validUntil }): Promise<{ id: string } | null>` (accounts no longer stored here)
  - `findConnectionForUser(userId: string, connectionId: string): Promise<BankConnection | null>`
  - `discardConnection(userId: string, connectionId: string): Promise<boolean>` (only `pending` rows; sets `discarded_at`)
  - `recordSyncResult(connectionId: string, result: { at: Date; error: string | null }): Promise<void>`
  - `listConnectionsForUser(userId: string): Promise<BankConnection[]>` excludes discarded rows; `BankConnection` gains `aspspLogo`, `lastSyncedAt`, `lastSyncError`.
- `accounts.ts`: `StoredAccount { id; connectionId; uid; identificationHash; name; product; ibanLast4; currency }`; `upsertAccounts(connectionId: string, accounts: BankAccountInfo[]): Promise<StoredAccount[]>` (`ON CONFLICT (connection_id, uid) DO UPDATE` name/product/currency/raw); `listAccountsForConnection(userId: string, connectionId: string): Promise<StoredAccount[]>`.
- `balances.ts`: `appendBalanceSnapshot(accountId: string, balances: AccountBalance[], fetchedAt: Date): Promise<void>`; `latestBalances(accountIds: string[]): Promise<Map<string, AccountBalance[]>>` (rows with the max `fetched_at` per account).
- `transactions.ts`: `StoredTransaction { id: string; accountId: string; status: TransactionStatus; amount: string; currency: string; bookingDate: string | null; transactionDate: string | null; counterparty: string | null; description: string | null }`; `newestBookedDate(accountId: string): Promise<string | null>`; `insertBookedTransactions(accountId: string, txs: BankTransactionRecord[]): Promise<number>` (`ON CONFLICT (account_id, dedupe_key) WHERE status = 'booked' DO NOTHING`, returns inserted count); `replacePendingTransactions(accountId: string, txs: BankTransactionRecord[]): Promise<void>` (ONE statement: `WITH removed AS (DELETE … WHERE account_id = $1 AND status = 'pending') INSERT …`, or just the DELETE when the list is empty); `listTransactions(userId: string, connectionId: string, filter: { accountId: string | null; month: string }): Promise<StoredTransaction[]>`; `listAvailableMonths(userId: string, connectionId: string): Promise<string[]>` (distinct `YYYY-MM` of booked rows, newest first).

- [ ] **Step 1: Write failing tests** (mocked `query`): every request-facing query (`findConnectionForUser`, `discardConnection`, `listAccountsForConnection`, `listTransactions`, `listAvailableMonths`) has `user_id = $` in its SQL; `discardConnection` SQL contains `status = 'pending'` and returns `rowCount === 1`; `upsertAccounts` stores only the last 4 IBAN characters and maps rows back; `insertBookedTransactions` passes the dedupe key from `transactionDedupeKey` and returns the reported row count, and with `[]` makes no query; `replacePendingTransactions` issues exactly one query; `latestBalances` groups rows per account; `listConnectionsForUser` SQL has `discarded_at IS NULL`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** `pnpm vitest run` → PASS; `pnpm tsc --noEmit` clean.
- [ ] **Step 5: Commit** — `feat(finances): repositories for accounts, balances and movements`

---

### Task 6: Sync service

**Files:**
- Create: `src/lib/services/finances/sync.ts` + test

**Interfaces:**
- Consumes: Task 3 client, Task 4 helpers, Task 5 repositories.
- Produces: `syncConnection(params: { client: BankingClient; connectionId: string; accounts: StoredAccount[]; now: Date }): Promise<SyncResult>` with `type SyncResult = { ok: true; insertedBooked: number } | { ok: false; insertedBooked: number; error: string }`. Always calls `recordSyncResult(connectionId, { at: now, error })`.

- [ ] **Step 1: Write failing tests** (mock the repositories module and pass a fake client):
  - First import (no stored booked date) asks `BOOK` from `startOfMonthUtc(now)`; with a stored date `2026-11-06` asks from `2026-11-01`.
  - Follows `continuationKey` across pages until null and inserts every page.
  - Pending asks `PDNG` from `now − 10 days` and calls `replacePendingTransactions` with only `pending` records; booked records found in that response go to `insertBookedTransactions`, and pending records found in the `BOOK` response go to the pending set (bank ignoring the filter).
  - Appends a balance snapshot per account with `fetchedAt = now`.
  - Account 2's transactions call returns `ASPSP_RATE_LIMIT_EXCEEDED` → accounts 1 and 3 still synced, result `{ ok: false, error }` mentions the bank's message, `recordSyncResult` called with that error.
  - All accounts succeed → `recordSyncResult(…, { error: null })` and `{ ok: true }`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** (accounts processed sequentially to be gentle with rate limits). **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `feat(finances): sync service for balances and movements`

---

### Task 7: Callback and actions

**Files:**
- Modify: `src/app/api/finances/callback/route.ts` + test, `src/app/actions/finances.ts` + test

**Interfaces:**
- Callback: after `createSession` ok → `activateConnectionByState` (null → `?error=invalid_state`) → `upsertAccounts(connection.id, session.accounts)` → `syncConnection(...)` → redirect to `/{defaultLocale}/finances/{connectionId}`; a failed sync still redirects there (the page shows `last_sync_error`).
- Actions (all `requireFinances()` first, return `{ success: false, error }` on failure):
  - `startConnectionAction(formData)` reads `aspspName`, `aspspCountry` (`/^[A-Z]{2}$/`), `psuType`; looks the bank up with `listAspsps(aspspCountry)`; stores its `logo`; consent via `computeValidUntil`; redirects to the bank.
  - `retryConnectionAction(formData)` reads `connectionId`; loads it with `findConnectionForUser` (must be `pending`); discards it; starts a new authorization with the same bank and PSU type.
  - `discardConnectionAction(formData)` → `discardConnection`; `revalidatePath` the overview.
  - `syncNowAction(formData)` reads `connectionId`; loads connection (must be `active`) and accounts; runs `syncConnection`; `revalidatePath` the detail page; returns `{ success: true } | { success: false, error }`.

- [ ] **Step 1: Update/write failing tests**: callback happy path stores accounts, syncs, and redirects to `/es/finances/c-1`; sync failure still redirects there; existing error cases keep their redirects (now under `/es/finances`). Actions: another user's id → not found error and no repository writes; retry discards the old attempt and redirects to the new bank URL; discard of a non-pending connection returns failure; `syncNowAction` returns the sync error message on failure.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** `pnpm vitest run` → PASS.
- [ ] **Step 5: Commit** — `feat(finances): store accounts and import movements when linking; retry, discard and sync actions`

---

### Task 8: Read models

**Files:**
- Create: `src/lib/services/finances/overview.ts`, `detail.ts` + tests

**Interfaces:**
- `getFinancesOverview(userId: string, now: Date): Promise<{ banks: BankCardData[]; pending: PendingConnectionData[] }>`
  - `BankCardData { id; aspspName; aspspCountry; aspspLogo: string | null; psuType; consent: ReturnType<typeof consentStatus>; totals: Array<{ amount: string; currency: string }>; accountCount: number; lastSyncedAt: string | null; lastSyncError: string | null }` — totals = `sumAmounts` of each account's `pickDisplayBalance`; banks sorted by their first total descending.
  - `PendingConnectionData { id; aspspName; aspspCountry; createdAt }`
- `getBankDetail(userId: string, connectionId: string, params: { accountId: string | null; month: string | null; now: Date }): Promise<BankDetailData | null>`
  - `BankDetailData { bank: BankCardData; accounts: Array<{ id; title: string; ibanMasked: string | null; balance: AccountBalance | null }>; allTotals: Array<{ amount; currency }>; selectedAccountId: string | null; months: string[]; selectedMonth: string | null; pending: StoredTransaction[]; days: Array<{ date: string; total: Array<{ amount; currency }>; transactions: StoredTransaction[] }> }`
  - Unknown `accountId` → treated as null (all). Unknown `month` → newest available. Pending are always shown (not month-filtered); days newest first.

- [ ] **Step 1: Write failing tests** (mock repositories): totals per currency; card order; expiring consent flows through; detail returns null for a connection of another user (repository returns null); day grouping and day totals; month fallback; unknown account falls back to all.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `feat(finances): read models for overview and bank detail`

---

### Task 9: Overview, first bank and add-bank UI

**Files:**
- Create under `src/app/[locale]/finances/`: `page.tsx` (rewrite), `page.module.css`, `components/BankLogo.tsx` (client), `components/BankPicker.tsx` (client) + `.module.css`, `components/BankCard.tsx`, `components/AddBankDialog.tsx`, `components/PendingConnections.tsx`
- Delete: `src/app/[locale]/finances/AccountSummary.tsx`
- Modify: `next.config.ts` (`images.remotePatterns: [{ protocol: "https", hostname: "enablebanking.com", pathname: "/brands/**" }]`), `messages/{en,es}.json`

**Interfaces:**
- `BankPicker({ banks: Aspsp[]; connectedKeys: string[]; action: (formData: FormData) => Promise<void> })`: search box, country chips derived from the banks, connected banks disabled with "Conectado", Personal/Empresa toggle, submit posts `aspspName`, `aspspCountry`, `psuType`.
- `BankLogo({ name: string; logo: string | null; size: number })`: `next/image` with `unoptimized={false}`; on load error or missing logo → initials badge.
- Page `searchParams: Promise<{ add?: string; error?: string }>`: no banks and no pending → "Primer banco" layout with `BankPicker`; otherwise cards grid (`BankCard` links to `/finances/{id}`), "Añadir banco" card linking to `?add=1`, `AddBankDialog` rendered when `add=1` (close link back to `/finances`), `PendingConnections` with Retry and Discard forms. `GET /aspsps` is called only when the picker is rendered; a failure shows `banksLoadFailed`.

- [ ] **Step 1: Messages** for every string on the four boards (EN/ES), including the consent states, "Conectado", pending-section copy and error codes.
- [ ] **Step 2: Implement** following the canvas (spacing, colours `#0f766e`/`#0b1f33`, Geist via existing `next/font`, monospaced tabular amounts), with no summary panel.
- [ ] **Step 3: Run** `pnpm tsc --noEmit`, `pnpm lint`, `pnpm vitest run`, `pnpm build` → all clean; the build lists `/[locale]/finances`.
- [ ] **Step 4: Commit** — `feat(finances): overview, first-bank and add-bank screens`

---

### Task 10: Bank detail UI

**Files:**
- Create: `src/app/[locale]/finances/[connectionId]/page.tsx`, `page.module.css`, `components/AccountCarousel.tsx` (client), `components/SyncNowButton.tsx` (client), `components/TransactionList.tsx`, `components/MonthSwitcher.tsx`

**Interfaces:**
- Page `params: Promise<{ locale: string; connectionId: string }>`, `searchParams: Promise<{ account?: string; month?: string }>`; `getBankDetail` null → `notFound()`.
- `AccountCarousel({ accounts; allTotals; selectedAccountId; hrefFor: … })`: pinned "Todas las cuentas" link + horizontally scrolling account links (`?account=<id>&month=…`), scroll-snap, previous/next buttons scrolling by one card.
- `SyncNowButton({ connectionId })`: form posting `syncNowAction`, disabled while pending (`useFormStatus`), shows the returned error.
- `MonthSwitcher({ months; selectedMonth; accountId })`: previous/next links only to months in `months`.
- `TransactionList({ pending; days })`: amber pending block (dashed rows, "Pendiente", `≈` amount, "El importe final puede variar"), then day groups with totals, debits dark, credits green with `+`.
- Header shows logo, status badge (from `consent`), consent date, last sync time, `lastSyncError` if any, and `SyncNowButton`.

- [ ] **Step 1: Messages** (EN/ES) for the detail page.
- [ ] **Step 2: Implement** following the canvas.
- [ ] **Step 3: Run** `pnpm tsc --noEmit`, `pnpm lint`, `pnpm vitest run`, `pnpm build` → clean; the build lists `/[locale]/finances/[connectionId]`.
- [ ] **Step 4: Commit** — `feat(finances): bank detail with accounts carousel, pending block and month switcher`

---

### Task 11: Production-only migrations on deploy

**Files:**
- Create: `src/lib/deploy/should-run-migrations.ts` + test, `scripts/deploy-migrate.ts`
- Modify: `scripts/migrate.ts` (accept `--from-env`: skip loading any env file and use `process.env`), `package.json` (`"vercel-build": "tsx scripts/deploy-migrate.ts && next build"`), `README.md`

**Interfaces:**
- `shouldRunDeployMigrations(env: Record<string, string | undefined>): boolean` → true only when `env.VERCEL_ENV === "production"`.
- `scripts/deploy-migrate.ts`: if false, log `Skipping migrations (VERCEL_ENV=<value>)` and exit 0; if true, run `tsx scripts/migrate.ts --from-env` and propagate a non-zero exit (failing the build).

- [ ] **Step 1: Failing test**: `production` → true; `preview`, `development`, undefined → false.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Local checks**: `VERCEL_ENV=preview pnpm tsx scripts/deploy-migrate.ts` → prints the skip line, exit 0. `pnpm migrate` still works locally.
- [ ] **Step 6: Vercel check**: confirm the project's Build Command is not overridden (Vercel then runs `vercel-build`); if it is, set it to `pnpm vercel-build`. Report to the user rather than changing project settings without asking.
- [ ] **Step 7: Commit** — `build: run migrations on production deploys only`

---

### Task 12: Verify (manual, with the user)

- [ ] **Step 1:** Register `https://localhost:3000/api/finances/callback` on the sandbox app. Run `pnpm next dev --experimental-https`.
- [ ] **Step 2:** With no banks → "Primer banco"; connect BBVA (sandbox, `user1` / `1234` / OTP `012345`, Particular) → lands on its detail page with accounts, balances and November movements (the sandbox data may only have older movements: check the import window logic, not the count).
- [ ] **Step 3:** "Sincronizar ahora" twice → no duplicates; a rate-limit error is shown, not a crash.
- [ ] **Step 4:** Start and cancel a Sabadell connection → appears under pending; Retry starts a fresh attempt; Discard hides it.
- [ ] **Step 5:** A second non-admin user with the `finances` role sees no banks of the first user; opening the first user's `/finances/<id>` → 404.
- [ ] **Step 6:** Production: user sets Vercel env vars (`ENABLE_BANKING_APP_ID`, `ENABLE_BANKING_PRIVATE_KEY`, `ENABLE_BANKING_REDIRECT_URL=https://almarto.es/api/finances/callback`), registers that URL on the production app, merges; the production build log shows migrations running and the preview build log shows them skipped. Then link real banks in restricted mode and probe Trade Republic positions (nice-to-have).

---

## Self-Review

- **Spec coverage:** access/ownership (T5, T7, T12), all-banks picker with chips, connected disabled (T3, T9), store on link from the 1st (T6, T7), overview cards/status/pending retry-discard (T5, T7, T8, T9), detail carousel/pending/months/sync button (T8, T10), display name and balance rules (T4), sync rules (T6), logos via `next/image` (T9), finances naming and callback (T1), production-only migrations (T11). Out-of-scope items have issues #15–#26.
- **Types:** `BankAccountInfo`, `AccountBalance`, `BankTransactionRecord`, `StoredAccount`, `StoredTransaction`, `SyncResult`, `BankCardData`, `BankDetailData` are defined once and reused.
- **Proportion:** signatures, rules and test assertions only; bodies are left to the implementer.
