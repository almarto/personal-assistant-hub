# 🏠 Personal Assistant Hub

> My personal corner of the internet: one Next.js app that slowly absorbs the small problems of my day to day.

## 🤔 What lives here?

- 🍼 **Baby food tracking** - what the little one eats, allergens included
- 🏡 **House renovation budget** - costs, loans and who has paid what
- 🧳 **Trip planner** - packing lists that don't forget the charger
- 💪 **Wellness** - diet and training plans
- 🚗 **Commute engine** - compares my usual routes against live traffic and tells me which one to take
- 📦 **Home inventory** and 🗓️ **family schedule** - because everything has a place, in theory

## 🧭 Here from my job application? Start here

The commute module is the best tour of how I work:

- 📐 **Design doc first**: [`docs/superpowers/specs/2026-09-08-commute-engine-design.md`](docs/superpowers/specs/2026-09-08-commute-engine-design.md) - API choice, pinned waypoints, a distrust buffer for the route that lies, and why there's no cache
- 🧠 **The decision logic**: [`src/lib/services/commute/decision.ts`](src/lib/services/commute/decision.ts) - a small pure function with boundary tests, including the exact tie at the buffer threshold
- Several other features have their own design docs and plans in [`docs/superpowers/`](docs/superpowers/)

## 🛠️ Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** in strict mode
- **PostgreSQL** with numbered SQL migrations - no ORM, on purpose
- Server actions + route handlers, **zod** for validation
- **better-auth** for auth, **next-intl** (🇬🇧/🇪🇸), CSS Modules, PWA
- **Vitest** for unit tests

## 🤖 Built with AI, openly

The honest version: AI does much of the typing. The engineering is still human:

- 📏 [`CLAUDE.md`](CLAUDE.md) sets the rules AI works under - pinned versions, minimal dependencies, strict types, simplicity over cleverness
- 📝 The commute engine, wellness and other modules have design docs alongside the implementation
- 🔍 Commits stay small and scoped by feature

## 🚀 Run it locally

```bash
pnpm install
docker compose up -d   # PostgreSQL 15 on port 5433
pnpm migrate
pnpm dev
```

You'll need a `.env` with at least:

```bash
DATABASE_URL=...        # matches the docker-compose Postgres
BETTER_AUTH_SECRET=...  # generate a strong random secret for local development
```

`GOOGLE_ROUTES_API_KEY` is only needed for the commute engine to query live traffic.

Bank connections (Enable Banking) need three more variables:

```bash
ENABLE_BANKING_APP_ID=...        # application (client) id from the Enable Banking control panel
ENABLE_BANKING_REDIRECT_URL=https://localhost:3000/api/banking/callback  # must match a registered redirect URL
ENABLE_BANKING_PRIVATE_KEY="..." # the application's private key; multi-line quoted value, bare base64 or full PEM
```

Enable Banking only accepts `https` redirect URLs, so run the dev server with `pnpm next dev --experimental-https` when working on the banking feature.

## 📁 Layout

```
src/app/[locale]/    # pages, organized by feature
src/app/actions/     # server actions
src/app/api/         # HTTP endpoints
src/lib/services/    # domain logic, tests colocated
migrations/          # the database story, one numbered file at a time
docs/superpowers/    # design specs + implementation plans
messages/            # every UI string, EN & ES
```

## ⚖️ License

All rights reserved. The code is public to read, not to use: see [LICENSE](LICENSE).

---

Built by [Alberto Martínez Tomás](https://www.linkedin.com/in/almarto/) - software engineer, Valencia 🇪🇸
