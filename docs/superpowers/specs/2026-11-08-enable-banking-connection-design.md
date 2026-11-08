# Enable Banking Connection (minimal) — Design

## Goal

Prove end-to-end that this app can connect to a bank through Enable Banking (PSD2 account information) and read **balances** and **recent transactions**. This is the foundation for the future "Finances" feature (budget, categorisation, alerts, charts); none of that is in scope here.

## Context

- Enable Banking application already registered: "Personal Assistant Hub (sandbox)", client id `c458edd3-c0cb-4b64-986e-36897bb55c13`, private key `*.pem` in the repo root (git-ignored via `*.pem`).
- **The registered application shows `Environment: sandbox`, status Active** The current environment is a sandbox with mocked bank accounts to test connection between this app the Enable Banking is working and all the code works as expected. The code must therefore be environment-agnostic: sandbox vs production is only a change of env vars.
- Registered redirect URLs: `https://localhost:3000/api/banking/callback` in sandbox and `https://almarto.es/api/banking/callback` in production environments. Enable Banking rejects `http://`, so local dev must runs with `next dev --experimental-https`.
- Env vars in `.env`: `ENABLE_BANKING_APP_ID`, `ENABLE_BANKING_REDIRECT_URL`, `ENABLE_BANKING_PRIVATE_KEY`. The key is stored inline as a multi-line double-quoted value containing **only the base64 PKCS8 body, without the `-----BEGIN/END PRIVATE KEY-----` lines** (checked: valid RSA-4096, signs RS256). The code therefore normalizes the value into a PEM; full PEM and `\n`-escaped forms are accepted too.

## Decisions

| Topic | Decision | Why |
| --- | --- | --- |
| HTTP client | Native `fetch` wrapped in `createBankingClient`, `fetchImpl` injectable | Same pattern as `commute/google-routes.ts`; no new dependency |
| JWT signing | Node `crypto` (RS256), no `jsonwebtoken` | CLAUDE.md: no dependency for a <50-line task |
| Error style | `Result<T, BankingError>` in the client; server actions convert to `{ success, ... }` | CLAUDE.md asks for `Result` on predictable failures; actions keep the repo's existing `{ success }` shape |
| Key source | Only `ENABLE_BANKING_PRIVATE_KEY` (inline); `normalizePrivateKey` accepts bare base64, full PEM or `\n`-escaped | One source for local and Vercel (no file there); the real `.env` value has no PEM header |
| Access | Admin (everything) or the new `APP_ROLE.FINANCES` role, via `requireFinances()` and `banking/layout.tsx` | Project convention: each app has its own feature role and admins pass automatically; lets the wife use it once her accounts can be linked. Retrofitting roles to older apps is tracked in issue #17 |
| Persistence | One table `bank_connections` | Needed to hold the CSRF `state` between redirect and callback, and the session/accounts afterwards |
| UI | One Server Component page `/[locale]/banking`, forms post to server actions, plus a launcher card for admin/finances | CLAUDE.md: Server Components by default; no client JS needed |
| Bank country | Query param `bankCountry` (select over `BANK_COUNTRIES`), unrelated to the UI locale | `GET /aspsps` lists banks per country (Trade Republic is `DE`, UI may be `es`); the UI language stays in the `[locale]` route segment |
| Consent validity | `min(aspsp.maximum_consent_validity, 90 days)` | Banks cap consent length; 90 days is the PSD2 re-consent norm |

## Flow

1. `/{locale}/banking?bankCountry=DE` lists that country's banks (`GET /aspsps`) in a form with a PSU type select (personal / business). `bankCountry` is the **bank's** country, not the UI language.
2. Submitting calls `startConnectionAction`: inserts a `pending` row with a random `state`, calls `POST /auth`, redirects the browser to the bank.
3. The bank redirects to `/api/banking/callback?code=…&state=…`. The route matches `state` to the pending row of the signed-in admin, calls `POST /sessions`, stores `session_id`, `accounts`, `valid_until`, marks the row `active`, and redirects to `/banking`.
4. `/banking` renders every active connection with, per account, balances and the number of transactions in the last 30 days (`GET /accounts/{uid}/balances`, `/transactions`). Failures render inline per account.

## API shapes assumed

Taken from Enable Banking's public API; **verify field names against https://enablebanking.com/docs/api/reference/ when implementing Task 2** and adjust tests and types if they differ.

- JWT header `{ typ: "JWT", alg: "RS256", kid: <app id> }`; claims `{ iss: "enablebanking.com", aud: "api.enablebanking.com", iat, exp }`; sent as `Authorization: Bearer <jwt>` to `https://api.enablebanking.com`.
- `GET /aspsps?country=DE` → `{ aspsps: [{ name, country, maximum_consent_validity?, psu_types? }] }`
- `POST /auth` `{ access: { valid_until }, aspsp: { name, country }, state, redirect_url, psu_type }` → `{ url, authorization_id }`
- `POST /sessions` `{ code }` → `{ session_id, accounts: [{ uid, … }], access: { valid_until } }`
- `GET /accounts/{uid}/balances` → `{ balances: [{ name, balance_type, balance_amount: { currency, amount } }] }`
- `GET /accounts/{uid}/transactions?date_from=YYYY-MM-DD` → `{ transactions: [...], continuation_key? }` (first page only here)

## Out of scope

Budgets, categorisation, charts, alerts, building investment/positions features (a probe of what Trade Republic exposes is part of the manual verification), pagination of transactions, consent-expiry reminders, a household/shared view of accounts, scheduled syncing.

## Open questions (do not block this plan)

- Can the wife's accounts be linked in restricted mode?
- What does the Trade Republic integration actually expose (cash only vs positions)? Positions are a nice-to-have; probed in plan Task 7 Step 6.
