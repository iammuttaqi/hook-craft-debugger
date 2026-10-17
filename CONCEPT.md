# Concept: HookCraft Debugger

- **Project Name:** `hook-craft-debugger`
- **Display Title:** HookCraft Debugger
- **Niche:** Developer Tools & Backend Infrastructure
- **Tagline:** Privacy-first webhook capture, cryptographic signature verification, and payload replay for backend engineers.

---

## 1. Executive Summary & Vision
**HookCraft Debugger** is a local-first, privacy-conscious developer utility for inspecting, validating, and replaying inbound HTTP webhooks and event streams. In modern software engineering, webhooks power critical asynchronous workflows—such as Stripe checkout sessions, GitHub commit triggers, Shopify order updates, Resend delivery telemetry, and Clerk identity events. 

However, debugging webhooks remains notoriously painful: testing against localhost requires clunky tunnel configurations; checking cryptographic HMAC signatures requires tedious manual hashing scripts; and public online webhook dumpers expose sensitive user data, PII, and customer payment details to third-party servers.

HookCraft Debugger provides a self-contained, high-performance studio where backend engineers can generate dedicated capture inboxes, inspect raw payloads and HTTP headers in real-time, verify cryptographic signatures automatically across standard providers, simulate upstream delivery failures (429/500/timeouts), and replay events directly to local development servers with one click.

---

## 2. Core Problem Solved
1. **Opaque Cryptographic Signature Failures:**
   Services like Stripe, GitHub, Shopify, and Svix sign webhook payloads with HMAC secrets. A single whitespace mismatch, raw body parsing error, or incorrect timestamp parameter breaks signature verification with an unhelpful `400 Bad Request`. Developers lack a visual diagnostic tool to verify their secret against raw inbound bytes in real time.

2. **Privacy Risks of Public Webhook Dumpers:**
   Popular free webhook inspection websites log and persist sensitive webhook payloads—often containing customer names, emails, billing tokens, and API credentials—on public servers with questionable retention and security policies.

3. **Friction in Local Replay & Mutation:**
   Triggering a realistic webhook cycle from third-party dashboards (e.g. running a test checkout in Stripe or issuing a GitHub release) takes multiple manual steps. When code breaks midway, developers need to replay the exact same payload—or a slightly mutated version—to `http://localhost:3000/api/webhooks` without re-running the entire external flow.

4. **Retry & Edge Case Testing Deficits:**
   Developers rarely test how their upstream providers handle transient server errors, rate limiting (HTTP 429), or slow responses. HookCraft enables configurable mock responses (status code, latency delay, headers) on ingress endpoints to stress-test upstream retry policies.

---

## 3. Target Audience
- **Backend & Full-Stack Engineers:** Developers writing webhook handlers in Next.js, Node.js, Go, Python, and Ruby who integrate Stripe, GitHub, Clerk, Twilio, or WorkOS.
- **API & Integration Architects:** Teams designing event-driven microservices that need an intuitive staging/relay debugger.
- **Indie Hackers & SaaS Builders:** Solo founders building billing, subscription, or automated notification pipelines who require fast, secure local testing.

---

## 4. Key Core Features
1. **Instant Webhook Ingress & Real-Time Event Stream**
   - One-click creation of isolated webhook capture inboxes with unique endpoint URLs (e.g. `/api/inbox/[endpointId]`).
   - Real-time event feed capturing HTTP method, headers, query parameters, client IP, payload size, and timestamps with millisecond precision.
   - Formatted JSON tree view, raw text inspector, and instant copy as cURL or fetch snippet.

2. **Native Cryptographic Signature Verifier**
   - Built-in signature verification engine for leading webhook providers:
     - **Stripe** (`Stripe-Signature` timestamp + `t=...,v1=...` HMAC-SHA256)
     - **GitHub** (`X-Hub-Signature-256` HMAC-SHA256)
     - **Shopify** (`X-Shopify-Hmac-Sha256`)
     - **Svix / Standard Webhooks** (`svix-id`, `svix-timestamp`, `svix-signature`)
     - **Generic HMAC** (SHA256/SHA1 with secret key and custom header mapping)
   - Diagnostic breakdown explaining signature verification passes, failures, clock-skew offsets, and secret mismatches.

3. **Interactive Payload Replayer & Target Forwarder**
   - Re-dispatch any captured webhook payload directly to local dev servers (e.g. `http://localhost:3000/api/webhooks`) or custom staging URLs.
   - Inline payload tampering and header modification to test edge-case data schemas without triggering upstream actions.
   - Replay history log with response status, duration, and target server response body.

4. **Configurable Ingress Response & Failure Simulator**
   - Set custom HTTP response status codes (e.g., `200 OK`, `400 Bad Request`, `429 Too Many Requests`, `500 Internal Error`).
   - Simulated latency delays (0ms to 5000ms) to verify upstream timeout thresholds and retry mechanisms.
   - Custom response headers and JSON body templates for client acknowledgments.

---

## 5. Visual Direction & Design System
- **Foundations:** Editorial, restrained, dark-mode first design using deep zinc/slate tones (`#09090b` background, `#18181b` card surfaces, `#27272a` borders).
- **Typography:** Typography-first hierarchy utilizing `Inter` for interface elements and `JetBrains Mono` / monospace for headers, payloads, hashes, and endpoints.
- **Accent Color:** Single intentional accent: **Electric Emerald** (`#10b981` / emerald-500) for active ingress indicators, verified cryptographic signatures, and HTTP 2xx statuses. Error states use restrained crimson (`#ef4444`), and pending states use amber (`#f59e0b`).
- **Iconography:** Strictly zero emojis as icons. Clean, precision-aligned SVG stroke iconography (Lucide React: `Radio`, `ShieldCheck`, `RefreshCw`, `Sliders`, `Code2`, `Copy`, `Check`).
- **Layout:** Dense, high-utility three-column master-detail layout:
  - Left: Ingress Endpoints & Filter Bar
  - Center: Live Captured Requests Stream
  - Right: Detailed Event Inspector (Headers, Body, Signature Verification, Replayer, and Response Rules)

---

## 6. Architectural & MVP Feasibility
- **Framework:** Next.js 14+ (App Router), React 18, TypeScript, Tailwind CSS.
- **Database & Persistence:** SQLite via Prisma ORM (`Endpoint`, `CapturedRequest`, `ReplayLog`).
- **Cryptographic Engine:** Node.js native `crypto` module (HMAC-SHA256, timingSafeEqual) running in secure server actions / route handlers.
- **Local & Cloud Ready:** Zero third-party cloud service requirements; zero telemetry; fully runnable locally or deployable to Vercel with serverless SQLite or Turso/Postgres.
