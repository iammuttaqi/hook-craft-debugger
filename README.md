# HookCraft Debugger

HookCraft Debugger is a high-performance, local-first developer workbench designed to capture, inspect, verify, and replay inbound HTTP webhooks without leaking payload data to third-party cloud infrastructure.

## Core Capabilities

1. **Dynamic Ingress Endpoint Inboxes**
   - Instant capture inboxes with unique URL slugs (e.g., `/api/inbox/stripe-prod-a8f9`).
   - Configurable mock HTTP response codes (`200`, `201`, `400`, `429`, `500`).
   - Chaos latency delay simulation (`0` to `5000ms`) to test provider timeouts and retries.

2. **Real-Time Webhook Event Stream**
   - Live stream polling every 1500ms with pause/resume controls and tab visibility throttling (`document.hidden`).
   - HTTP method filtering (`ALL`, `POST`, `GET`, `PUT`, `DELETE`).
   - Substring searching across path, headers, and raw body.

3. **Master Event Inspector**
   - **Formatted JSON:** Syntax-highlighted, collapsible payload viewer with line numbers and one-click copy.
   - **Raw Payload:** Byte-accurate view of incoming buffers.
   - **Headers:** Searchable key-value table of captured HTTP request headers.
   - **cURL Generator:** Export executable cURL commands replicating the captured request.

4. **Cryptographic HMAC Signature Verification Engine**
   - Built on native `node:crypto` using `crypto.timingSafeEqual` for constant-time comparisons.
   - Provider presets:
     - **Stripe:** Parses `Stripe-Signature` (`t={timestamp},v1={hash}`), evaluates clock skew against server time, and verifies `HMAC-SHA256(secret, "${t}.${rawBody}")`.
     - **GitHub:** Parses `X-Hub-Signature-256` (`sha256={hash}`) or `X-Hub-Signature` (`sha1={hash}`).
     - **Svix / Standard Webhooks:** Validates canonical message signature format `${id}.${timestamp}.${rawBody}` using base64-decoded secrets.
     - **Shopify:** Validates base64 digest from `X-Shopify-Hmac-Sha256`.
     - **Generic HMAC:** Custom algorithm (`sha256`, `sha1`, `sha512`) testing.
   - Side-by-side diagnostic diff of expected vs calculated hashes with timestamp drift reporting.

5. **Local Replay & Forwarding Engine**
   - Dispatches captured webhooks directly to local servers (e.g. `http://localhost:3000/api/webhooks`).
   - In-flight payload tampering and custom header injection (`x-hookcraft-replay: true`).
   - Round-trip latency recording and response body preview.
   - Historical replay execution log linked to parent events.

6. **Serverless SQLite Cold-Start Adapter**
   - Self-contained zero-dependency storage engine using Prisma ORM and SQLite.
   - Automatically initializes `/tmp/hookcraft.db` from bundled `prisma/starter.db` during cold start.

---

## Technical Stack

- **Framework:** Nuxt 3 (Vue 3 Composition API, `<script setup lang="ts">`)
- **Server Engine:** Nitro
- **Styling:** Tailwind CSS (Zinc/Slate palette + Electric Emerald accent)
- **Icons:** `lucide-vue-next` (Strictly zero emojis)
- **Database & ORM:** SQLite + Prisma ORM
- **Package Manager:** `pnpm` exclusively

---

## Getting Started

### Prerequisites
- Node.js 18+ (tested on Node 24)
- `pnpm`

### Installation

```bash
# Install dependencies
pnpm install

# Push schema to SQLite
pnpm prisma:push

# Seed realistic demo webhooks (Stripe, GitHub, Svix)
pnpm prisma:seed
```

### Running Locally

```bash
# Start development server
pnpm dev
```

The debugger dashboard will be available at `http://localhost:3000`.

### Building for Production

```bash
pnpm build
node .output/server/index.mjs
```

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/inboxes` | `GET` | Lists all inboxes with event counts and activity timestamps |
| `/api/inboxes` | `POST` | Creates a new capture inbox |
| `/api/inbox/:slug` | `GET` | Fetches configuration for an inbox |
| `/api/inbox/:slug` | `PUT` | Updates mock response code and simulated latency delay |
| `/api/inbox/:slug` | `DELETE` | Deletes an inbox and cascades all associated events and replays |
| `/api/inbox/:slug/events` | `GET` | Fetches captured events with search, method filter, and delta polling |
| `/api/inbox/:slug` | `POST, ALL` | Ingress endpoint capturing raw body, headers, and metadata |
| `/api/inbox/:slug/ingress` | `ALL` | Catch-all ingress endpoint for all HTTP methods |
| `/api/verify-signature` | `POST` | Validates HMAC signature against raw body and secret |
| `/api/replay` | `POST` | Forwards captured webhook to target URL and records response latency |

---

## Demonstration Credentials

Pre-loaded seed data contains the following demonstration signing secrets:

- **Stripe Demo Inbox (`stripe-payments-demo`):**
  - Webhook Secret: `whsec_test_stripe_secret_123`
- **GitHub Demo Inbox (`github-webhooks-demo`):**
  - Webhook Secret: `gh_secret_test_456`
- **Svix Demo Inbox (`svix-standard-demo`):**
  - Webhook Secret: `whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw`
