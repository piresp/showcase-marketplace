# Tech Decisions

This is a solo project, so every choice below is mine alone. For each one I list the alternatives I considered and the trade-off I accepted. Nothing here is framed as "best" — just what fit this context (two mobile apps, one backend, need to move fast without spending months on infrastructure).

### 1. `React Native (Expo SDK 54)`
- **Alternatives considered**: Flutter, native Swift/Kotlin, Kotlin Multiplatform.
- **Why this one**: two apps sharing conventions, domain logic, validation, and API-client code. TypeScript end-to-end reduces context-switching. Expo gives OTA updates (JS hot-patches without a store review), a large native-module ecosystem, and `expo-glass-effect` for Liquid Glass surfaces. Fast Refresh keeps the iteration loop tight.
- **Trade-off accepted**: a JS bridge sits between the UI and native APIs, cold-start is noticeably slower than a pure-native app, and every so often a native module requires a config-plugin dance or a custom dev-client build.

### 2. `NestJS 10 (with Apollo code-first)`
- **Alternatives considered**: bare Express, Fastify, tRPC, plain Apollo Server on a minimal HTTP layer.
- **Why this one**: module boundaries by domain, DI baked in, and guards/pipes/filters/interceptors as decorators — cross-cutting concerns (auth, validation, logging, error shaping) live in one place. Code-first GraphQL keeps schema, DTOs, and TypeScript types in a single source of truth, which cuts drift between them.
- **Trade-off accepted**: more boilerplate than Fastify or tRPC, a decorator/DI learning curve, and the framework occasionally fights you when you want something lightweight.

### 3. `MongoDB (8.x with Mongoose)`
- **Alternatives considered**: PostgreSQL, CockroachDB, DynamoDB.
- **Why this one**: while the schema is still moving, Mongo absorbs changes without a migration for every tweak. Native geo queries (`2dsphere` + `$near` / `$geoWithin`) cover "find nearby" without needing PostGIS. `$lookup` handles the handful of joins this domain actually needs, and Mongoose adds a familiar schema/hooks layer. A replica set spins up from one Compose file, which matters for local dev.
- **Trade-off accepted**: no distributed transactions across shards, aggregation pipelines get harder to read once business rules pile up, and replica-set consistency sometimes surprises people coming from single-node SQL.

### 4. `Docker Compose (local development)`
- **Alternatives considered**: native binaries installed per machine, Nix, direnv with shims.
- **Why this one**: one command brings the whole local stack up — Mongo replica set, Redis, Mongo Express. Reboots cleanly, pins versions in a single file, and avoids the "works on my machine" class of bugs on a second laptop.
- **Trade-off accepted**: RAM footprint, Docker Desktop licensing considerations for larger organizations, and slightly slower filesystem on macOS (mitigated by VirtioFS, not eliminated).

### 5. `Stripe (payments and subscriptions)`
- **Alternatives considered**: Mercado Pago, Adyen, Brazilian acquirers directly (Cielo, Rede).
- **Why this one**: one SDK covers one-off payments (Payment Element, Checkout) and recurring billing (Subscriptions, Customer Portal). Webhooks are HMAC-signed, so signature verification is straightforward. Card data never touches my servers, which keeps PCI scope minimal. Docs and test mode are solid.
- **Trade-off accepted**: per-transaction fees in Brazil aren't the cheapest option, BRL settlement has regional quirks, and Pix (a locally popular method) requires extra wiring and isn't as polished as the card flow.

### 6. `Uber Direct (last-mile delivery)`
- **Alternatives considered**: Loggi, Lalamove, direct carrier integrations, operating an in-house courier fleet.
- **Why this one**: the API is quote-first — cost is known *before* the user commits, which matters for checkout UX and margin. Status webhooks keep tracking screens fresh without polling. Delivery liability sits with the provider. The integration shape (quote → create → webhook lifecycle) maps onto the order state machine cleanly.
- **Trade-off accepted**: pricing is often uncompetitive in smaller cities, SLA varies by region, and routing a critical journey through a third party means their outages become yours.
