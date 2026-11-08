# Finances MVP — Design

Builds on `2026-11-08-enable-banking-connection-design.md` (connection flow, client, JWT, `bank_connections`, `finances` role), which is already implemented on branch `feat/enable-banking-connection`. This document covers the rest of the same PR.

Visual design: the "Finances App Design" canvas — https://claude.ai/artifact/Q4DsVqfgG4kTe1z2Km7dpg (boards: Resumen de bancos, Primer banco, Detalle de un banco, Añadir banco). The "Confirmaciones peligrosas" board is **not** part of this PR.

## Intent

A personal finance app ("Finanzas") that gathers each user's bank accounts in one place. This MVP stores balances and movements in our database, so later features (categories, charts, alerts, budget) can be built on stored data, and so we respect Enable Banking/PSD2 rate limits instead of calling the bank on every page view. It goes live in this PR; the user tests with the sandbox locally first.

## Goals (this PR)

1. **Access**: the app is reachable by admins and by users with the `finances` role (already built). Each user sees **only the banks they connected**. Shared real-world accounts appear once per user, because each person connects them separately.
2. **Link a bank**: choose from **all banks** (no country step), searchable, with country chips to narrow the list; choose Personal or Business; authorize at the bank. Already-connected banks are shown as connected and are not selectable.
3. **On successful link**: store the session, its accounts, all their balance types, and all movements (booked and pending) **from the 1st of the current month** (linking on 8 Nov imports 1–8 Nov).
4. **Overview page**:
   - No banks yet → the "Primer banco" screen.
   - Otherwise: one card per connected bank (initials badge, name, country · type, status, balance, accounts count, last sync), an "Añadir banco" card that opens the add-bank dialog, and a "Conexiones pendientes" section.
   - Card status: Active; "Caduca en N días" when consent expires within 14 days; "Consentimiento caducado" when expired. **Warning only**: re-authorizing is a separate issue.
   - Pending connections: **Reintentar** starts a fresh connection to the same bank and PSU type; **Descartar** hides the attempt from the UI but keeps the row in the DB.
   - The dark summary panel (total balance, monthly income/spending, sparkline) is **out** (issue).
5. **Bank detail page**:
   - Header: bank, status, consent expiry, last sync time, and a temporary **"Sincronizar ahora"** button, always clickable; a bank error (including rate limiting) is shown to the user.
   - Accounts row: a pinned "Todas las cuentas" card, then a horizontal carousel of the accounts (scroll-snap, previous/next buttons). Selecting a card filters the movements list; "Todas" shows all.
   - Movements: a "Pendientes" block on top (amber, dashed, "Pendiente" tag, "≈" amount, "El importe final puede variar"), then booked movements newest first, grouped by day with a day total.
   - Month switcher limited to **months we have stored data for**. No fetching of older history.
   - Search box: **out** (issue). "Desconectar" / "Borrar datos": **out** (issues).
6. **Account display name**: the account `name` from the bank when present, else the product name, else the masked IBAN; the masked IBAN is always shown as a secondary line. (The sandbox returns the holder's name in `name`; that is expected.)
7. **Balance shown** (decided with the user: "the money I have right now"): intraday booked (`ITBD`), else closing booked (`CLBD`), else interim available (`ITAV`), else closing available (`CLAV`), else the first one returned. **Never** use expected (`XPCD`) as the shown balance: it can include credit limits. All balance types are stored.
8. **Sync logic** (shared by the button now and the scheduled job later), per account:
   - **Booked**: request `transaction_status=BOOK` with `date_from` = newest stored booked date for that account minus **5 days** of overlap (or the 1st of the month on first import); follow `continuation_key` until exhausted; insert new ones, skip ones already stored.
   - **Pending**: request `transaction_status=PDNG` with `date_from` = today minus **10 days**; replace that account's stored pending set with the response. This is how a pending movement disappears once its booked version arrives. If a bank ignores the status filter, filter the response by its `status` field ourselves.
   - Balances: fetch and append a snapshot of all balance types.
9. **Deploy**: migrations run **automatically on production deploys only** (`VERCEL_ENV=production`), before `next build`; a failed migration fails the deploy. Preview deployments share the production DB, so they must **never** run migrations. Local `pnpm migrate` and `pnpm migrate:prod` keep working as today. The user adds the env vars on Vercel.

## Non-goals (this PR) → issues

Scheduled sync (twice a day, from the last stored movement; removes the "Sincronizar ahora" button) · Re-authorize expired consent · Overview summary panel · Disconnect a bank (keeps data as history) · Delete a bank's data (separate from disconnect) · Search movements. Already tracked: #15 privacy page, #16 terms page, #17 roles for the other apps, #18 credit card settlement, #19 alerts, #20 replace `confirm()` with a danger modal.

Also out: categories, charts, budgets, investment positions (Trade Republic positions remain a probe during manual verification), household/shared views, fetching history older than the linked month.

## Anti-goals

- Calling Enable Banking on page views (pages read only from our DB).
- A pending movement left behind after its booked version arrives.
- Duplicated booked movements after overlapping syncs.
- Any migration run from a preview deployment.
- One user seeing another user's banks, accounts or movements.

## Constraints

Project rules from `CLAUDE.md` (pnpm, pinned versions, no new dependencies unless necessary, strict TS, Server Components by default, named exports, colocated Vitest tests, EN/ES messages). Enable Banking: restricted production mode (only the owner's linked accounts), consent ≤ 90 days, transaction window limits per bank (the BBVA sandbox rejects ~100 days with `WRONG_TRANSACTIONS_PERIOD`), rate limits (`ASPSP_RATE_LIMIT_EXCEEDED`). Execution of the plan is native (no subagents).

## Data model (builder's guide)

- `bank_connections` (exists): add `discarded_at TIMESTAMPTZ NULL`, `last_synced_at TIMESTAMPTZ NULL`, `last_sync_error TEXT NULL`.
- `bank_accounts`: `id`, `connection_id` → `bank_connections` (cascade), `uid` (session-scoped Enable Banking account id used in API paths), `identification_hash` (stable across sessions; kept for future re-authorization), `name`, `product`, `iban_masked` (only the last 4 digits kept), `currency`, `raw JSONB`, `created_at`. Unique `(connection_id, uid)`.
- `bank_balances`: `account_id`, `balance_type`, `amount NUMERIC(18,2)`, `currency`, `reference_date`, `fetched_at`. Appended per sync; the latest `fetched_at` per account is the current set.
- `bank_transactions`: `id`, `account_id`, `status` (`booked` | `pending`), `amount NUMERIC(18,2)` signed (debits negative), `currency`, `booking_date`, `value_date`, `transaction_date`, `counterparty` (creditor name for debits, debtor name for credits), `description` (remittance lines joined), `dedupe_key`, `raw JSONB`, `created_at`. Unique `(account_id, dedupe_key)` for booked rows. `dedupe_key` = `transaction_id` → else `entry_reference` → else a hash of booking date, signed amount, currency and description.
- Banks give dates, not times; "timestamp" in the UI means the date (plus `created_at` for when we stored it).

## Calls made by Claude (check these)

- Overlap of 5 days for booked and a 10-day pending window.
- The "Caduca en N días" threshold of 14 days.
- Initial import runs inside the callback before redirecting; if it fails, the connection is still stored as active with `last_sync_error` set, and the user retries with "Sincronizar ahora".
- Pages move from `/banking` to `/finances` (the app is "Finanzas" and the role is `finances`); the registered callback stays `/api/banking/callback`.
- "Reintentar" also discards the old pending attempt, so only the new one is listed.
- The old `/banking` page URL redirects to `/finances`; the launcher card points to `/finances`.
- Bank initials badges instead of logos.
- Balance snapshots are appended rather than overwritten (enables the summary panel's history later).
- Production-only migrations run through a `vercel-build` script that checks `VERCEL_ENV`.

## Left to the builder

File layout within existing conventions, query shapes, component split, CSS details matching the canvas, exact copy beyond what the canvas shows.
