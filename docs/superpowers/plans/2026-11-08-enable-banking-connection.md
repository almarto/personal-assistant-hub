# Enable Banking Connection (minimal) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. **Native execution only: implement every task in the current session; do not dispatch subagents.** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users with the `finances` role (and admins) connect a bank through Enable Banking and see balances and last-30-day transaction counts per account, to prove the integration works in sandbox and then in production.

**Architecture:** A new `finances` app role gates the feature (admins pass automatically, like every app). A domain service under `src/lib/services/banking/` holds config, JWT signing, a typed API client and the DB repository; server actions and one callback route handler are the thin HTTP layer; one Server Component page `/[locale]/banking` renders it. Sandbox vs production is only a change of env vars.

**Tech Stack:** Next.js App Router, TypeScript strict, Postgres (`pg`), Vitest, next-intl, Node `crypto` + native `fetch`.

**Spec:** `docs/superpowers/specs/2026-11-08-enable-banking-connection-design.md`

## Global Constraints

- Package manager `pnpm` only. **No new dependencies** (JWT via Node `crypto`, HTTP via `fetch`).
- TypeScript strict, no `any`; discriminated unions for variants (`Result`, `BankingError`); no enums (use `as const`).
- Named exports except Next.js pages/layouts/route handlers. Server Components by default; **no `"use client"` is needed in this plan**.
- Files `kebab-case.ts`; tests colocated, `*.test.ts` (vitest only includes `src/**/*.test.ts`).
- Access model: **admin (everything) or `APP_ROLE.FINANCES`**. Every action and route calls `requireFinances()`; the page is guarded by `banking/layout.tsx` (same pattern as `schedule/layout.tsx`). Every SQL touching a connection filters by `user_id`.
- Server actions return `{ success: true as const, ... } | { success: false as const, error: string }` (convention in `src/app/actions/commute.ts`). The service layer returns `Result`.
- All UI strings in both `messages/en.json` and `messages/es.json`.
- Secrets: never log the key, JWT, or `code`. The only key source is `ENABLE_BANKING_PRIVATE_KEY` (multi-line value in double quotes in `.env`; inline in Vercel). There is no key-file path option.
- Enable Banking base URL `https://api.enablebanking.com`; JWT `iss` `enablebanking.com`, `aud` `api.enablebanking.com`, RS256, `exp - iat = 3600`.
- `ENABLE_BANKING_REDIRECT_URL` must equal a redirect URL registered with Enable Banking exactly (`https://localhost:3000/api/banking/callback` locally).
- Local dev for this feature runs `pnpm next dev --experimental-https` (Enable Banking rejects `http://`).
- `country` in this feature always means **the bank's country** (ISO 3166-1 alpha-2, e.g. `DE` for Trade Republic), never the UI language; the UI language stays in the `[locale]` route segment. The query parameter is named `bankCountry` to avoid confusion.

## Review Focus

1. Callback with an unknown, reused, or another user's `state` → no session stored, redirect to `/banking?error=invalid_state` (Task 5).
2. Callback with `error=access_denied` (user cancels at the bank) → redirect to `/banking?error=access_denied`, never a 500 (Task 5).
3. `ENABLE_BANKING_PRIVATE_KEY` in any of three shapes — bare base64 body with real newlines (current `.env`), full PEM, or `\n`-escaped — all produce a working key; garbage fails with an error naming the variable (Task 2).
4. A user without the `finances` role (non-admin) is redirected from `/banking` and rejected by actions and the callback; an admin passes (Tasks 1, 5, 6).
5. Enable Banking returns non-2xx or the network drops → `Result` error; the page shows an inline message for that bank/account while other accounts still render (Tasks 3, 6).
6. A bank whose `maximum_consent_validity` is below 90 days → `valid_until` uses the bank's cap (Task 5).

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/types/roles.ts` | Add `APP_ROLE.FINANCES = "finances"` |
| `src/lib/auth-guards.ts` | Add `requireFinances()` |
| `src/lib/services/banking/types.ts` | `Result`, `BankingError`, `PSU_TYPE`/`PsuType`, `BANK_COUNTRIES`/`BankCountry`, API domain types |
| `src/lib/services/banking/config.ts` | `getEnableBankingConfig()`, `normalizePrivateKey()` |
| `src/lib/services/banking/jwt.ts` | `createEnableBankingJwt()` |
| `src/lib/services/banking/client.ts` | `createBankingClient()` |
| `src/lib/services/banking/consent.ts` | `computeValidUntil()` |
| `src/lib/services/banking/connections.ts` | DB repository for `bank_connections` |
| `migrations/028_bank_connections.sql` | Table (no migration needed for the role: `user_roles.role` is free text) |
| `src/app/actions/banking.ts` | `startConnectionAction` |
| `src/app/api/banking/callback/route.ts` | Callback |
| `src/app/[locale]/banking/{layout,page}.tsx`, `page.module.css` | Role guard, connect form, connections list |
| `src/app/[locale]/page.tsx` | Launcher card shown to admin or `finances` |
| `messages/{en,es}.json` | `Admin.appRole_finances`, `Launcher.finances`, `Banking` namespace |
| `README.md` | Document env vars |

---

### Task 1: `finances` app role

**Files:**
- Modify: `src/lib/types/roles.ts`, `src/lib/auth-guards.ts`, `messages/en.json`, `messages/es.json`
- Test: `src/lib/auth-guards.test.ts` (create)

**Interfaces:**
- Produces: `APP_ROLE.FINANCES === "finances"` (so `AppRole` includes it); `requireFinances(): ReturnType<typeof requireAppRole>` in `auth-guards.ts`; message key `Admin.appRole_finances`.
- Already generic, no change needed: the role checkboxes in `admin/users/UserForm.tsx` iterate `Object.entries(APP_ROLE)` and label via `appRole_${key.toLowerCase()}`; `updateUserAppRoles` validates against `Object.values(APP_ROLE)`; `userHasAppRole` lets admins pass.

- [ ] **Step 1: Write failing tests** in `src/lib/auth-guards.test.ts`, mocking `next/headers`, `@/lib/auth` (`auth.api.getSession`) and `@/lib/services/user-roles` (`userHasAppRole`): `requireFinances()` (a) with no session rejects with `"Unauthorized: Authentication required"`; (b) with a session and `userHasAppRole` → `false` rejects with `"Unauthorized: finances role required"` and `userHasAppRole` was called with `(userId, role, "finances")`; (c) with `userHasAppRole` → `true` resolves to the session.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/auth-guards.test.ts` → FAIL.
- [ ] **Step 3: Implement** `FINANCES: "finances"` in `APP_ROLE` and `requireFinances` (one line, like `requireTripPlanner`).
- [ ] **Step 4: Add labels** `Admin.appRole_finances` = `"Finances"` (EN) / `"Finanzas"` (ES), next to `appRole_trip_planner`.
- [ ] **Step 5: Run** `pnpm vitest run src/lib/auth-guards.test.ts` → PASS; `pnpm tsc --noEmit` → no errors.
- [ ] **Step 6: Commit** — `git add src/lib messages && git commit -m "feat(roles): add finances app role"`

---

### Task 2: Config and JWT

**Files:**
- Create: `src/lib/services/banking/types.ts`, `config.ts`, `jwt.ts`
- Test: `src/lib/services/banking/config.test.ts`, `jwt.test.ts`
- Modify: `README.md` (env var docs)

**Interfaces:**
- Produces:
  - `types.ts`: `type Result<T> = { ok: true; value: T } | { ok: false; error: BankingError }`; `type BankingError = { kind: "http"; status: number; message: string } | { kind: "network"; message: string }`; `const PSU_TYPE = { PERSONAL: "personal", BUSINESS: "business" } as const` and `type PsuType`; `const BANK_COUNTRIES = ["DE", "ES", "FR", "IT", "NL", "PT"] as const` and `type BankCountry`.
  - `config.ts`: `interface EnableBankingConfig { appId: string; privateKeyPem: string; redirectUrl: string }`; `normalizePrivateKey(raw: string): string` returning a PKCS8 PEM; `getEnableBankingConfig(env?: NodeJS.ProcessEnv): EnableBankingConfig`.
  - `jwt.ts`: `createEnableBankingJwt(config: Pick<EnableBankingConfig, "appId" | "privateKeyPem">, nowSeconds?: number): string`.

- [ ] **Step 1: Write failing config tests.** Generate a keypair in the test (`crypto.generateKeyPairSync("rsa", { modulusLength: 2048 })`, private key exported as PKCS8 PEM) and derive three inputs from it: `bare` (PEM with the `-----BEGIN/END-----` lines removed, newlines kept — this is the shape of the real `.env` value), `full` (the PEM itself), `escaped` (PEM with real newlines replaced by the two characters `\` `n`). Assert for each: `normalizePrivateKey(input)` starts with `-----BEGIN PRIVATE KEY-----\n`, ends with `-----END PRIVATE KEY-----\n`, and `crypto.createPrivateKey(result)` succeeds with the same key (signing the same data with both yields a signature that verifies with the public key). `normalizePrivateKey("not a key")` throws an error whose message contains `ENABLE_BANKING_PRIVATE_KEY`. `getEnableBankingConfig`: with all three vars (`ENABLE_BANKING_APP_ID`, `ENABLE_BANKING_REDIRECT_URL`, `ENABLE_BANKING_PRIVATE_KEY`) returns `{ appId, redirectUrl, privateKeyPem }` with the normalized key; each var missing or blank throws an error containing that variable name.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/services/banking/config.test.ts` → FAIL.
- [ ] **Step 3: Implement** `types.ts` and `config.ts`. `normalizePrivateKey`: strip any `-----BEGIN …-----`/`-----END …-----` lines, literal `\n` sequences and whitespace; re-wrap the base64 body at 64 characters under `-----BEGIN PRIVATE KEY-----`/`-----END PRIVATE KEY-----` (PKCS8); validate with `crypto.createPrivateKey` and rethrow failures as `Error("ENABLE_BANKING_PRIVATE_KEY is not a valid RSA private key (PKCS8)")`.
- [ ] **Step 4: Run** the same command → PASS.
- [ ] **Step 5: Write failing JWT tests** (`jwt.test.ts`) with a generated keypair: `createEnableBankingJwt({ appId: "app-1", privateKeyPem }, 1_700_000_000)` returns three dot-separated base64url segments; header decodes to `{ typ: "JWT", alg: "RS256", kid: "app-1" }`; payload decodes to `{ iss: "enablebanking.com", aud: "api.enablebanking.com", iat: 1_700_000_000, exp: 1_700_003_600 }`; the signature verifies with the public key (`crypto.createVerify("RSA-SHA256")`); the token contains no `=`, `+` or `/`.
- [ ] **Step 6: Run** `pnpm vitest run src/lib/services/banking/jwt.test.ts` → FAIL.
- [ ] **Step 7: Implement** `createEnableBankingJwt` with `crypto.createSign("RSA-SHA256")` and `Buffer.toString("base64url")`. `nowSeconds` defaults to `Math.floor(Date.now() / 1000)`.
- [ ] **Step 8: Run** `pnpm vitest run src/lib/services/banking` → PASS.
- [ ] **Step 9: Document** the three env vars in the README env section: multi-line `ENABLE_BANKING_PRIVATE_KEY="…"` (bare base64 or full PEM accepted), and `next dev --experimental-https`.
- [ ] **Step 10: Commit** — `git add src/lib/services/banking README.md && git commit -m "feat(banking): Enable Banking config and JWT signing"`

---

### Task 3: API client

**Files:**
- Create: `src/lib/services/banking/client.ts`
- Modify: `src/lib/services/banking/types.ts` (add API types)
- Test: `src/lib/services/banking/client.test.ts`

**Interfaces:**
- Consumes: `EnableBankingConfig`, `createEnableBankingJwt`, `Result`, `BankingError`, `PsuType`, `BankCountry` from Task 2.
- Produces (`types.ts`): `Aspsp { name: string; country: string; maximumConsentValiditySeconds: number | null }`; `BankAccountRef { uid: string; name: string | null }`; `BankSession { sessionId: string; accounts: BankAccountRef[]; validUntil: string }`; `AccountBalance { type: string; currency: string; amount: string }`; `BankTransaction { amount: string; currency: string; bookingDate: string | null; description: string | null }`.
- Produces (`client.ts`):
  ```ts
  export interface BankingClient {
    listAspsps(country: BankCountry): Promise<Result<Aspsp[]>>;
    startAuthorization(params: { aspsp: { name: string; country: string }; psuType: PsuType; state: string; validUntil: string }): Promise<Result<{ url: string }>>;
    createSession(code: string): Promise<Result<BankSession>>;
    getBalances(accountUid: string): Promise<Result<AccountBalance[]>>;
    getTransactions(accountUid: string, dateFrom: string): Promise<Result<BankTransaction[]>>;
  }
  export function createBankingClient(config: EnableBankingConfig, fetchImpl?: typeof fetch, nowSeconds?: () => number): BankingClient
  ```

- [ ] **Step 1: Confirm response field names** against https://enablebanking.com/docs/api/reference/ (spec section "API shapes assumed"); if they differ, update the spec and the shapes below before writing tests.
- [ ] **Step 2: Write failing tests** with a `vi.fn()` `fetchImpl` returning `new Response(JSON.stringify(body), { status })`. One test per method asserting URL, method and body: `listAspsps("ES")` → GET `https://api.enablebanking.com/aspsps?country=ES`, maps `maximum_consent_validity` → `maximumConsentValiditySeconds` (null when absent); `startAuthorization` → POST `/auth` with body `{ access: { valid_until }, aspsp, state, redirect_url: config.redirectUrl, psu_type }`, returns `{ url }`; `createSession("abc")` → POST `/sessions` body `{ code: "abc" }`, maps `session_id`, `accounts[].uid`, `access.valid_until`; `getBalances("u1")` → GET `/accounts/u1/balances`, maps `balance_amount`; `getTransactions("u1", "2026-10-09")` → GET `/accounts/u1/transactions?date_from=2026-10-09`, maps `booking_date` and the first remittance line to `description`. Every request carries `Authorization: Bearer <three-part jwt>`. Errors: HTTP 401 → `{ ok: false, error: { kind: "http", status: 401, message } }` (message includes the response body text, never the JWT); `fetchImpl` rejecting → `{ kind: "network", message }`.
- [ ] **Step 3: Run** `pnpm vitest run src/lib/services/banking/client.test.ts` → FAIL.
- [ ] **Step 4: Implement** `createBankingClient` with one private `request<T>(method, path, body?)` helper that signs a fresh JWT per call, maps non-2xx and thrown errors to `Result`, and returns parsed JSON; each public method maps the response to the domain types above. Encode path segments with `encodeURIComponent`.
- [ ] **Step 5: Run** `pnpm vitest run src/lib/services/banking` → PASS.
- [ ] **Step 6: Commit** — `git add src/lib/services/banking && git commit -m "feat(banking): typed Enable Banking API client"`

---

### Task 4: Persistence

**Files:**
- Create: `migrations/028_bank_connections.sql`, `src/lib/services/banking/connections.ts`
- Test: `src/lib/services/banking/connections.test.ts` (mock `@/lib/db` like `commute/config.test.ts`)

**Interfaces:**
- Consumes: `BankAccountRef`, `PsuType` from Tasks 2–3.
- Produces (`connections.ts`):
  - `type BankConnection = { id: string; aspspName: string; aspspCountry: string; psuType: PsuType; createdAt: string } & ({ status: "pending"; state: string } | { status: "active"; sessionId: string; accounts: BankAccountRef[]; validUntil: string })`
  - `createPendingConnection(params: { userId: string; aspspName: string; aspspCountry: string; psuType: PsuType }): Promise<{ id: string; state: string }>` — `state` is `randomBytes(24).toString("hex")`.
  - `activateConnectionByState(params: { userId: string; state: string; sessionId: string; accounts: BankAccountRef[]; validUntil: string }): Promise<boolean>` — `true` only if exactly one pending row matched `state` **and** `user_id`; sets status `active`, clears `state`.
  - `listConnectionsForUser(userId: string): Promise<BankConnection[]>` — newest first.

- [ ] **Step 1: Write migration** `028_bank_connections.sql` in the style of `025_commute.sql`: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE`, `aspsp_name VARCHAR(200) NOT NULL`, `aspsp_country CHAR(2) NOT NULL`, `psu_type VARCHAR(20) NOT NULL CHECK (psu_type IN ('personal','business'))`, `status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active'))`, `state TEXT UNIQUE`, `session_id TEXT`, `accounts JSONB`, `valid_until TIMESTAMP WITH TIME ZONE`, `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`, plus `CREATE INDEX bank_connections_user_id_idx ON bank_connections(user_id)`.
- [ ] **Step 2: Write failing tests**: `createPendingConnection` inserts the given fields and returns a 48-hex-char `state`, distinct across two calls; `activateConnectionByState` returns `true` when the UPDATE's `rowCount` is 1 and `false` when 0, and its SQL contains `state = $`, `user_id = $` and `status = 'pending'`; `listConnectionsForUser` maps a pending row and an active row (snake_case → camelCase, `valid_until` → ISO string) and orders by `created_at DESC`.
- [ ] **Step 3: Run** `pnpm vitest run src/lib/services/banking/connections.test.ts` → FAIL.
- [ ] **Step 4: Implement** `connections.ts` with ownership enforced in each SQL `WHERE`, as in `commute/config.ts`.
- [ ] **Step 5: Run** the test → PASS; run `pnpm migrate` → output ends with `Migration 028_bank_connections.sql completed successfully`.
- [ ] **Step 6: Commit** — `git add migrations/028_bank_connections.sql src/lib/services/banking && git commit -m "feat(banking): persist bank connections"`

---

### Task 5: Start action and callback route

**Files:**
- Create: `src/app/actions/banking.ts`, `src/app/api/banking/callback/route.ts`, `src/lib/services/banking/consent.ts`
- Test: `src/app/api/banking/callback/route.test.ts`, `src/lib/services/banking/consent.test.ts`

**Interfaces:**
- Consumes: `getEnableBankingConfig`, `createBankingClient`, `createPendingConnection`, `activateConnectionByState`, `requireFinances`, `routing.defaultLocale` from `@/i18n/routing`, `BANK_COUNTRIES`, `PSU_TYPE`.
- Produces:
  - `computeValidUntil(maximumConsentValiditySeconds: number | null, now: Date): string` (ISO) in `consent.ts`: `now + min(cap ?? Infinity, 90 days)`.
  - `startConnectionAction(formData: FormData): Promise<{ success: false; error: string }>` — reads `bankCountry`, `aspspName`, `psuType`; validates (`bankCountry` ∈ `BANK_COUNTRIES`, `psuType` ∈ `PSU_TYPE`, non-empty `aspspName`); `requireFinances()`; looks up the ASPSP via `listAspsps` to get its consent cap; creates the pending row; calls `startAuthorization`; on success `redirect(url)` from `next/navigation` (never returns). Validation or API failures return `{ success: false, error }`.
  - `GET(request: Request)` in the route: reads `code`, `state`, `error`; redirects to `/{routing.defaultLocale}/banking` (+ `?error=<code>` on failure).

- [ ] **Step 1: Write failing `consent.test.ts`**: `(null, 2026-11-08T00:00:00Z)` → `2027-02-06T00:00:00.000Z`; `(86400, same now)` → `2026-11-09T00:00:00.000Z`; `(10_000_000, same now)` → `2027-02-06T00:00:00.000Z` (capped at 90 days).
- [ ] **Step 2: Write failing route tests** (mock `@/lib/auth-guards`, `@/lib/services/banking/*`): (a) valid `code`+`state`, `createSession` ok, `activateConnectionByState` → true → redirect to `/es/banking`, and `activateConnectionByState` called with the session's `sessionId`, `accounts`, `validUntil`; (b) `error=access_denied` → redirect to `/es/banking?error=access_denied`, `createSession` not called; (c) missing `code` or `state` → `?error=invalid_request`; (d) `createSession` returns `{ ok: false }` → `?error=session_failed`, `activateConnectionByState` not called; (e) `activateConnectionByState` → false (unknown, reused or another user's state) → `?error=invalid_state`; (f) `requireFinances` rejecting → redirect to `/es` with no data stored.
- [ ] **Step 3: Run** `pnpm vitest run src/app/api/banking src/lib/services/banking/consent.test.ts` → FAIL.
- [ ] **Step 4: Implement** `consent.ts`, then the route. Order in the route: `requireFinances` → read params → `createSession(code)` → `activateConnectionByState` as the gate for `state`. A wrong `state` therefore still spends the one-time `code`, which is harmless because it is single-use and the session is not stored.
- [ ] **Step 5: Implement `startConnectionAction`** per Interfaces.
- [ ] **Step 6: Run** `pnpm vitest run src/app src/lib/services/banking` → PASS.
- [ ] **Step 7: Commit** — `git add src && git commit -m "feat(banking): start connection action and callback route"`

---

### Task 6: `/banking` page, guard, launcher card, i18n

**Files:**
- Create: `src/app/[locale]/banking/layout.tsx`, `page.tsx`, `page.module.css`
- Modify: `src/app/[locale]/page.tsx` (launcher card), `messages/en.json`, `messages/es.json`

**Interfaces:**
- Consumes: `listConnectionsForUser`, `createBankingClient`, `getEnableBankingConfig`, `startConnectionAction`, `BANK_COUNTRIES`, `userHasAppRole`, `PageLayout` (`@/systemUI/components/PageLayout/PageLayout`), `Button` (`@/systemUI/components/Button/Button`).
- Produces: `BankingLayout` (copy of the `schedule/layout.tsx` pattern with `APP_ROLE.FINANCES`, signin callback `/banking`); default-exported Server Component `BankingPage({ searchParams })` with `searchParams: Promise<{ bankCountry?: string; error?: string }>`.

- [ ] **Step 1: Add messages** (EN and ES, same keys). `Banking`: `title`, `subtitle`, `bankCountryLabel`, `loadBanks`, `bankLabel`, `psuTypeLabel`, `personal`, `business`, `connect`, `connections`, `noConnections`, `pending`, `validUntil`, `balances`, `transactionsLast30Days`, `accountLoadFailed`, `banksLoadFailed`, `errors.invalid_state`, `errors.access_denied`, `errors.session_failed`, `errors.invalid_request`. `Launcher.finances.title`/`description`.
- [ ] **Step 2: Implement the layout** with the role guard (redirect to `/` for signed-in users without access).
- [ ] **Step 3: Implement the page** following `commute/page.tsx`: (1) a GET form with a `bankCountry` `<select>` over `BANK_COUNTRIES` (labelled as the *bank's* country; the page URL stays `/{locale}/banking?bankCountry=DE`); (2) if `bankCountry` is a valid value, `listAspsps` → select of banks + `psuType` select + connect form posting to `startConnectionAction`; a failed lookup renders `banksLoadFailed`; (3) connections list: for each `active` connection and each account, `getBalances` and `getTransactions(uid, <today − 30 days>)`, rendering currency/amount lines and the transaction count; a failed call renders `accountLoadFailed` for that account only; `pending` connections render `pending`. Show `errors.<code>` when `?error=` is a known code and ignore unknown codes.
- [ ] **Step 4: Launcher card** in `src/app/[locale]/page.tsx`: render a Finances card linking to `/banking` only when `isAdmin || appRoles.includes(APP_ROLE.FINANCES)`, mirroring the `hasTripPlannerAccess` block (pick an existing `lucide-react` icon, e.g. `Landmark`).
- [ ] **Step 5: Run checks:** `pnpm tsc --noEmit`, `pnpm lint` → no errors; `pnpm test` → all tests pass.
- [ ] **Step 6: Commit** — `git add src messages && git commit -m "feat(banking): banking page, role guard and launcher card"`

---

### Task 7: Verify against Enable Banking (manual)

No code; produces evidence that the integration works. Sandbox pass first, then production.

- [ ] **Step 1: Role setup.** Run `pnpm migrate`. In `/admin/users`, confirm the **Finances** role checkbox exists. Admin access works without it; test a second non-admin user with and without the role.
- [ ] **Step 2: Environment check.** The first registered application ("Personal Assistant Hub (sandbox)", `c458edd3-…`) is **Environment: PRODUCTION**. For a real sandbox pass use the application registered with environment *Sandbox*: put its client id in `ENABLE_BANKING_APP_ID` and its key in `ENABLE_BANKING_PRIVATE_KEY`.
- [ ] **Step 3: Sandbox run.** `pnpm next dev --experimental-https`, sign in, open `https://localhost:3000/es/banking`, choose the bank country offered by the sandbox. Expected: bank list loads; connecting redirects to the sandbox bank; approving returns to `/es/banking` with an active connection showing balances and a transaction count.
- [ ] **Step 4: Negative checks.** Cancel at the bank → `?error=access_denied` message, no 500. Replay the callback URL → `?error=invalid_state`. Non-admin without the role → redirected from `/banking`.
- [ ] **Step 5: Production run.** Switch the env to the production application (Vercel: set the same three variables; `ENABLE_BANKING_REDIRECT_URL=https://almarto.es/api/banking/callback`). In the Enable Banking control panel use **Activate by linking accounts** for your own accounts, then run the same flow against Trade Republic (`bankCountry=DE`) and your other banks.
- [ ] **Step 6: Probe Trade Republic positions (nice-to-have, not a build task).** For each Trade Republic account, record the balance types returned and check whether Enable Banking exposes anything beyond cash balances (positions/holdings) in its API reference or responses. If positions exist, note the endpoint and shape in the spec's Open questions and write a follow-up plan; if not, record that investments need manual entry or CSV import.
- [ ] **Step 7: Record findings** in the spec's Open questions (what Trade Republic exposes; whether other people's accounts can be linked in restricted mode) and commit.

---

## Self-Review

- **Spec coverage:** role gating (T1), key normalization and JWT (T2), client for all five calls (T3), persistence incl. CSRF `state` (T4), consent cap and callback error paths (T5), page, guard, launcher, i18n (T6), sandbox → production verification and the positions probe (T7). Out-of-scope items are unplanned by design.
- **Types:** `Result`, `BankingError`, `PsuType`, `BankCountry`, `BankAccountRef`, `BankSession`, `Aspsp` are defined once (T2/T3) and reused unchanged in T4–T6. The role guard is `requireFinances` everywhere.
- **Proportion:** tasks list signatures, test names and assertions; bodies are left to the implementer.
