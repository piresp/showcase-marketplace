# Marketplace Case Study

A two-sided mobile marketplace I'm building — two React Native apps (one for consumers, one for business owners) and a GraphQL API they share. This repo documents the architecture, the decisions I made, and a handful of code samples. The full codebase is private.

---

## About

I'm **Gabriel Firmino Pires Pereira**, a **frontend engineer** — React, NextJs and TypeScript as my dominant role but I can take different ones like React Native and backend. I spend most of my day in the UI layer: components, state, animations, accessibility, design systems. I'm also comfortable shaping the GraphQL contract, writing the resolver, or wiring a webhook when a feature needs it — full-stack range, frontend anchor.

Based in Brazil. Open to remote and hybrid roles.

- Email · gabrielfpp47@gmail.com
- GitHub · https://github.com/piresp
- LinkedIn · https://www.linkedin.com/in/piresp/

Happy to walk through the full private codebase on a call or under NDA.

---

## About this repo

Solo-built marketplace. The two React Native apps run on real devices against a full local stack (Mongo replica set, Redis, S3, Stripe sandbox, Uber Direct sandbox). Every architectural decision was made as if the next deploy were going to production — auth hardening, idempotent payments, signed webhooks, typed GraphQL contracts, an in-house design system.

Treat this repo as *"here's how I work end-to-end"*. The frontend craft is the focus; the backend slice proves the work doesn't stop at the API boundary.

---

## Scope

Rough order of magnitude:

- **~45 screens** across the two mobile apps
- **1 design system** built in-house: tokens, atomic components (atoms → molecules → organisms → templates), haptics, motion language
- **12 GraphQL domain files** on the client with dozens of typed operations
- **3 auth contexts** (consumer / tenant admin / staff) with separate JWT secrets and separate account collections
- **2 third-party integrations** with signed webhooks (Stripe, Uber Direct)
- **22 feature modules** on the backend (`auth`, `users`, `orders`, `products`, `payments`, `upload`, etc.)

---

## Stack

**Mobile** (same stack on both apps)
- Expo SDK 54 · React Native 0.81 · React 19 · TypeScript (strict)
- Expo Router 6 (file-based, typed routes)
- React Query 5 + Zustand
- Axios with a refresh-token queue
- GraphQL-over-HTTP via a ~15-line wrapper (no Apollo client)
- expo-secure-store · Reanimated 4 · Expo Glass Effect · Expo Haptics

**Backend**
- NestJS 10 · Apollo Server 4 (code-first) · Express
- MongoDB 8 + Mongoose (2dsphere geo-index, soft deletes)
- Redis + BullMQ (cache, JWT blocklist, webhook fan-out)
- JWT with per-context secrets, rotated refresh tokens
- AWS S3 signed URLs · Stripe · Uber Direct
- Docker Compose for local dev (Mongo replica set, Redis, Mongo Express)
- Jest — unit tests + e2e with Supertest

---

## Architecture

See **[docs/architecture.md](docs/architecture.md)** for the diagram and per-layer notes.

Shape: both mobile clients talk to a single GraphQL API. The API owns Mongo, Redis, S3, and the third-party integrations. Email and push are fired through NestJS's event emitter — they're side effects, not part of the happy-path transaction.

---

## Technical Decisions

For each major choice I list the alternatives I considered and the trade-off I took. Nothing is framed as "best" — just what fit this context.

See **[docs/tech-decisions.md](docs/tech-decisions.md)**.

Deep-dives:
- **[docs/auth-flow.md](docs/auth-flow.md)** — multi-context JWT with a client-side refresh queue
- **[docs/payment-flow.md](docs/payment-flow.md)** — Stripe checkout and webhook handling
- **[docs/delivery-flow.md](docs/delivery-flow.md)** — Uber Direct quote-first flow
- **[docs/data-model.md](docs/data-model.md)** — entities and relationships at a conceptual level

---

## Code Samples

Each file is standalone — minimal imports, generic domain names, business rules removed. Technical approach preserved verbatim from what's in the private repo.

The **Mobile** section is where most of the day-to-day work happens. The **Backend** section is included to show the same person who builds the screen can shape the contract behind it.

### Mobile

| File | What it is |
|---|---|
| [snippets/mobile/01-auth-interceptor-refresh-queue.ts](snippets/mobile/01-auth-interceptor-refresh-queue.ts) | Axios interceptor that queues in-flight requests during a token refresh and replays them afterwards. Also turns GraphQL `UNAUTHENTICATED` (HTTP 200) into a 401 so the rest of the pipeline stays single-path. |
| [snippets/mobile/02-graphql-wrapper.ts](snippets/mobile/02-graphql-wrapper.ts) | A ~15-line generic `gqlRequest<T>` wrapper. React Query handles caching, so Apollo felt redundant. |
| [snippets/mobile/03-design-tokens.ts](snippets/mobile/03-design-tokens.ts) | Design token surface — colors, 8-pt spacing, four radii, motion, shadow presets. Single source of truth for the two apps. |
| [snippets/mobile/04-shadow-helper.ts](snippets/mobile/04-shadow-helper.ts) | A `shadow()` that's both a callable (`shadow('hero')`) and a namespace (`shadow.hero`). Pairs iOS shadow props with Android `elevation` in one place. |
| [snippets/mobile/05-haptics-reduced-motion.ts](snippets/mobile/05-haptics-reduced-motion.ts) | Haptics as semantic events (`confirm`, `error`, `select`), silenced when the OS reports reduced-motion. |
| [snippets/mobile/06-spring-presets.ts](snippets/mobile/06-spring-presets.ts) | Named springs (`gentle`, `snappy`, `bouncy`, `settle`) and a `useSpringPress` hook, so components don't hardcode physics numbers. |
| [snippets/mobile/07-secret-gesture-hook.ts](snippets/mobile/07-secret-gesture-hook.ts) | Hook that fires after N taps inside a time window. Powers a hidden dev route. |
| [snippets/mobile/08-button-molecule.tsx](snippets/mobile/08-button-molecule.tsx) | Production-style button with variants, sizes, loading verbs. Uses the "outer Animated.View + inner Pressable" pattern to work around an iOS bug where `Animated.createAnimatedComponent(Pressable)` silently drops `backgroundColor`. |

### Backend

| File | What it is |
|---|---|
| [snippets/backend/01-jwt-multi-context-strategy.ts](snippets/backend/01-jwt-multi-context-strategy.ts) | One Passport JWT strategy serving three account contexts. `secretOrKeyProvider` reads the token's `context` claim and returns the matching secret — a leak of one secret only affects that slice of users. |
| [snippets/backend/02-roles-guard.ts](snippets/backend/02-roles-guard.ts) | RBAC guard with explicit context enforcement (a staff-level mutation requires a staff-context token, not just a role claim). |
| [snippets/backend/03-jwt-auth-guard-graphql.ts](snippets/backend/03-jwt-auth-guard-graphql.ts) | The ~30-line adapter that makes `AuthGuard('jwt')` work for both HTTP and GraphQL requests, plus a `@Public()` opt-out. |
| [snippets/backend/04-graphql-exception-filter.ts](snippets/backend/04-graphql-exception-filter.ts) | Turns `HttpException` from NestJS pipes/guards into GraphQL errors with proper `extensions.code`. Clients get one error shape regardless of source. |
| [snippets/backend/05-s3-upload-service.ts](snippets/backend/05-s3-upload-service.ts) | S3 upload with MIME whitelist, size cap, UUID keying. |
| [snippets/backend/06-redis-global-module.ts](snippets/backend/06-redis-global-module.ts) | Global Redis provider with `OnModuleDestroy` cleanup. The small detail that stops e2e tests from leaking connections. |

---

## Screenshots

Will be added as the apps get closer to a public beta.

<!-- SCREENSHOT_PLACEHOLDER -->
