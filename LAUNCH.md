# HookCraft Debugger — Launch Collateral & Distribution Pack

This document contains publication-ready launch assets for HookCraft Debugger across Product Hunt, Twitter / X, Reddit (`r/SideProject` and `r/webdev`), and Hacker News (`Show HN`).

- **Live Production URL:** [https://hook-craft-debugger.vercel.app](https://hook-craft-debugger.vercel.app)
- **GitHub Repository:** [https://github.com/iammuttaqi/hook-craft-debugger](https://github.com/iammuttaqi/hook-craft-debugger)
- **Tech Stack:** Nuxt 3, Vue 3 Composition API, Nitro Engine, TypeScript, Tailwind CSS, Prisma ORM, SQLite.

---

## 1. Product Hunt Launch Pack

### 1.1 Product Details
- **Product Name:** HookCraft Debugger
- **Tagline:** Local-first webhook capture, cryptographic signature verification, and payload replay.
- **Primary Category:** Developer Tools
- **Secondary Categories:** Webhooks, Backend Infrastructure, Open Source, API Tools
- **Pricing:** 100% Free & Open Source (MIT)
- **Primary URL:** `https://hook-craft-debugger.vercel.app`
- **GitHub URL:** `https://github.com/iammuttaqi/hook-craft-debugger`

### 1.2 Maker Comment (First Comment)
```markdown
Hey Product Hunt community,

I built HookCraft Debugger out of frustration with two recurring problems in webhook development: opaque cryptographic signature failures and the privacy risks of public webhook dumpers.

When integrating providers like Stripe, GitHub, Shopify, or Svix, a single whitespace difference or timestamp skew breaks your HMAC validation with an unhelpful "400 Bad Request". To make matters worse, most free online webhook dumpers log your customer emails, transaction tokens, and billing metadata to public servers with unknown retention policies.

HookCraft Debugger is a privacy-first, self-contained workbench designed to fix this:

1. Instant Capture Inboxes: Spin up isolated ingress endpoints with unique slugs to capture raw HTTP traffic from any external service.
2. Cryptographic Signature Diagnostic Engine: Native Node.js node:crypto validation for Stripe, GitHub, Svix, and generic HMAC-SHA256. It inspects timestamp drift and runs timingSafeEqual constant-time checks with side-by-side diagnostic diffs.
3. Ingress Chaos Rules: Test upstream retry behavior by simulating latency delays (0-5000ms) and custom HTTP status codes (200, 429, 500).
4. Local Replay & Tampering: Forward any captured event directly to your local dev server (e.g. http://localhost:3000/api/webhooks) with one click, or mutate the JSON payload in-flight to test schema edge cases without re-running production flows.
5. Zero Cloud Telemetry: Runs locally or serverless using an embedded SQLite database. No external trackers, no analytics scripts, no data leakage.

You can run it locally with pnpm or try the live deployment at https://hook-craft-debugger.vercel.app.

I would love to hear your feedback on providers you'd like added and features that would help your local development workflow.
```

---

## 2. Twitter / X Launch Thread (4-Tweet Series)

### Tweet 1 (Hook & Value Proposition)
```
Debugging webhooks usually means two things:
1. Opaque HMAC signature verification failures with no diagnostic diff.
2. Pasting sensitive customer payloads into public webhook loggers.

We built HookCraft Debugger: a local-first, privacy-conscious webhook studio for backend developers.

Live: https://hook-craft-debugger.vercel.app
Code: https://github.com/iammuttaqi/hook-craft-debugger
```

### Tweet 2 (Cryptographic Verification Engine)
```
Ever spent 45 minutes figuring out why your Stripe or GitHub signature verification returned 400?

HookCraft runs native Node.js crypto comparisons (timingSafeEqual) with automatic timestamp clock-skew analysis.

Presets for Stripe (v1), GitHub (SHA256/SHA1), Svix, and custom HMAC algorithms.
```

### Tweet 3 (Chaos Simulation & Local Replay)
```
Upstream retry policies rarely get tested before production outages.

HookCraft lets you configure ingress chaos rules per inbox:
- Inject 0 to 5000ms artificial latency
- Mock HTTP 429 (rate limits) and 500 (internal errors)
- Tamper with payloads in-flight and replay directly to localhost
```

### Tweet 4 (Architecture & Open Source)
```
No external analytics. No third-party telemetry. No remote database loggers.

Built on Nuxt 3, Nitro, Prisma, and an ephemeral serverless SQLite engine that boots instantly with zero configuration.

Clone and run locally in under 30 seconds:
git clone https://github.com/iammuttaqi/hook-craft-debugger
pnpm install && pnpm dev
```

---

## 3. Reddit Showcase Post (r/SideProject & r/webdev)

**Target Subreddits:** `r/SideProject`, `r/webdev`, `r/node`  
**Title:** I built HookCraft Debugger: a local-first webhook capture, HMAC verifier, and replay studio

```markdown
Hi everyone,

Like many backend developers, I frequently integrate third-party webhooks (Stripe billing events, GitHub push triggers, Clerk auth events, Resend telemetry). 

Debugging these locally is consistently frustrating for two reasons:
1. Cryptographic HMAC signatures fail silently. If raw buffer encoding, whitespace, or timestamp drift is slightly off, your verification helper throws a generic 400 error without explaining which half of the hash computation differed.
2. Public webhook dumpers (webhook.site, etc.) are convenient, but sending live sandbox payloads through third-party infrastructure exposes customer names, emails, and payment metadata.

To solve this for myself and my team, I built HookCraft Debugger: a lightweight, self-hosted developer workbench designed specifically for webhook testing.

### What it does:
- Dynamic Ingress Inboxes: Generate isolated endpoints (`/api/inbox/:slug`) to capture inbound HTTP requests with headers, query parameters, and raw byte buffers.
- Cryptographic Signature Diagnostics: Step-by-step verification for Stripe (`Stripe-Signature`), GitHub (`X-Hub-Signature-256`), Svix / Standard Webhooks, and generic HMAC-SHA256. It shows the expected digest vs. calculated digest, clock drift in seconds, and runs constant-time byte comparisons via `crypto.timingSafeEqual`.
- Ingress Chaos Simulation: Configure simulated HTTP status codes (200, 400, 429, 500) and artificial latency delays (0 to 5000ms) on any inbox to test how upstream providers handle timeouts and retries.
- Local Replay & Tampering: Forward any captured event to `http://localhost:3000/api/webhooks` with one click. You can also modify the payload JSON or inject custom headers prior to forwarding to test schema edge cases without re-triggering upstream actions.
- Instant cURL Generator: Exports any captured event as an escaped cURL command replicating headers and raw data.

### Architecture & Tech Stack:
- Nuxt 3 (Vue 3 Composition API, TypeScript) with Nitro server engine.
- Tailwind CSS with an editorial dark zinc palette and zero emoji iconography (precision Lucide SVGs only).
- Prisma ORM with SQLite. On serverless deployments (Vercel), it hydrates an ephemeral `/tmp/hookcraft.db` on cold-start with pre-seeded test fixtures, so there is zero cloud database setup required.
- Zero external tracking scripts, telemetry, or third-party loggers.

### Links:
- Live Demo: https://hook-craft-debugger.vercel.app
- GitHub Repository: https://github.com/iammuttaqi/hook-craft-debugger

I’d love your thoughts, critique on the architecture, and suggestions for webhook providers you'd like to see added.
```

---

## 4. Hacker News Post Draft (Show HN)

**Title:** Show HN: HookCraft Debugger – Local-first webhook inspector, HMAC verifier, and replayer

```markdown
Hey HN,

I built HookCraft Debugger (https://hook-craft-debugger.vercel.app), a local-first utility for capturing, diagnosing, and replaying inbound HTTP webhooks.

### The Problem
When integrating webhooks from Stripe, GitHub, Svix, or Shopify, debugging signature validation issues is usually an exercise in frustration. HMAC failures provide no diagnostic feedback—just a 400 response. The failure could stem from:
- JSON stringification altering key order or whitespace compared to the raw request buffer.
- Ingestion proxies stripping raw bodies or converting encoding.
- Timestamp drift exceeding the provider's validation window.
- Base64 secret decoding nuances (e.g. Svix requiring secret prefix removal before base64 decoding).

Furthermore, sending webhooks through public testing services leaks customer records, PII, and credentials to third-party databases.

### What HookCraft Does
1. Captures inbound webhooks into dedicated inboxes preserving unmodified raw bytes and case-preserved headers.
2. Cryptographic Verification: Implements provider-specific canonicalization rules for Stripe, GitHub, and Svix using Node.js `node:crypto`. It runs `crypto.timingSafeEqual` to avoid timing leaks, compares expected vs calculated digests side-by-side, and calculates timestamp skew.
3. Ingress Chaos Simulation: Allows setting mock HTTP status codes (e.g. 429 Too Many Requests, 500 Server Error) and artificial delays (0 to 5000ms) to verify upstream retry policies and backoff behavior.
4. Local Replay & Mutation: Dispatches captured requests directly to local development servers (`http://localhost:3000/api/webhooks`) with in-flight payload mutation and header injection.

### Technical Implementation
The app is built with Nuxt 3, Nitro, TypeScript, and Prisma ORM backed by SQLite. 

For the serverless deployment on Vercel, SQLite doesn't natively persist across ephemeral Lambda instances. Rather than requiring external managed databases, HookCraft embeds a starter SQLite database directly into the bundle. On cold start, the Nitro runtime copies this seed into `/tmp/hookcraft.db`, providing an isolated, zero-setup, zero-egress database for every instance.

The project contains no tracking scripts, no third-party telemetry, and uses an editorial typography-focused interface without emojis.

- GitHub: https://github.com/iammuttaqi/hook-craft-debugger
- Live Demo: https://hook-craft-debugger.vercel.app

Feedback on the cryptographic diagnostics and replay architecture is very welcome.
```
