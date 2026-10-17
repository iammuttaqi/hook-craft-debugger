# Product Requirements Document (PRD)

## Project Information
- **Product Name:** HookCraft Debugger
- **Repository / Path:** `/Users/muttaqi/ai-engineering-team/projects/hook-craft-debugger`
- **Target Release:** MVP v1.0
- **Document Status:** Approved for Implementation
- **Author:** Lead Product Manager

---

## 1. Executive Summary & Value Proposition

### 1.1 Executive Summary
HookCraft Debugger is a local-first, privacy-centric developer utility designed for capturing, inspecting, verifying, and replaying inbound HTTP webhooks. Modern web applications rely on asynchronous event streams from third-party services such as Stripe, GitHub, Clerk, Shopify, and Svix. However, debugging these event pipelines locally is error-prone:
- Cryptographic HMAC signature checks fail silently due to subtle payload encoding, timestamp variance, or whitespace mismatches.
- Public webhook dumpers expose sensitive user data, personally identifiable information (PII), customer billing records, and API credentials to third-party infrastructure.
- Triggering production or sandbox webhooks repeatedly from provider dashboards introduces unnecessary manual friction into development cycles.
- Testing error handling, retry policies, and upstream rate limits (HTTP 429) is difficult without mock ingress endpoints.

HookCraft Debugger eliminates these issues by providing a self-hosted, lightweight studio running on the developer's machine or internal network. It captures raw webhook traffic, diagnoses cryptographic signature failures with exact mathematical explanations, and allows single-click replay directly to local development servers (`http://localhost:3000/api/webhooks`).

### 1.2 Core Value Propositions
1. **Zero Data Leakage:** All inbound payloads, headers, and secrets remain entirely local or inside an isolated SQLite database. No external tracking, telemetry, or public cloud storage.
2. **Instant Cryptographic Verification:** Direct inspection and validation of HMAC signatures across industry-standard specifications (Stripe, GitHub, Svix, Generic HMAC-SHA256) with millisecond-precision clock-skew calculation and step-by-step diagnostics.
3. **Frictionless Local Replay & Mutation:** Dispatch captured webhooks directly to local endpoints with optional header and payload modification, eliminating the need to repeat manual triggers in third-party dashboards.
4. **Resilience & Chaos Simulation:** Configurable response codes (HTTP 200, 400, 429, 500) and artificial latency delays (0 to 5,000 ms) to validate how upstream providers handle timeouts and retries.

### 1.3 Target Audience
- **Backend & Full-Stack Developers:** Engineers writing webhook listener endpoints in Node.js, Next.js, Python, Go, Ruby, or PHP.
- **Integration Engineers:** Teams integrating payment gateways (Stripe), identity providers (Clerk, WorkOS), or developer platforms (GitHub, GitLab).
- **Indie Hackers & Small Engineering Teams:** Developers who need a fast, reliable, privacy-preserving testing setup without subscribing to enterprise webhook platforms.

---

## 2. User Stories & Acceptance Criteria (Gherkin Format)

### Feature 1: Dynamic Ingress Endpoint Inboxes
*As a developer building a webhook handler,*
*I want to generate isolated capture inboxes with unique endpoint URLs,*
*So that I can route webhook traffic from different providers or environments without collision.*

#### Scenario 1.1: Generate a new capture inbox
```gherkin
Given the developer is on the HookCraft Debugger dashboard
When the developer clicks the "Create Inbox" button
And provides an optional name "Stripe Checkout Test"
Then the system creates a new inbox with a unique identifier slug (e.g., "inb_a8f9c2d1")
And registers an active ingress route at "/api/inbox/inb_a8f9c2d1"
And displays the full capture URL with a one-click copy button
And selects the newly created inbox as active in the sidebar
```

#### Scenario 1.2: Inbound webhook reception and storage
```gherkin
Given an active inbox exists with ID "inb_a8f9c2d1"
When an external service sends an HTTP POST request to "/api/inbox/inb_a8f9c2d1"
Then the server captures the raw HTTP method, headers, query parameters, raw body bytes, client IP, and UTC timestamp
And persists the captured request into the local SQLite database associated with "inb_a8f9c2d1"
And returns an HTTP 200 OK response to the caller within 50 milliseconds
And updates the active event list in real time without requiring a manual page refresh
```

#### Scenario 1.3: Configure inbox response behavior and latency
```gherkin
Given an active inbox "inb_a8f9c2d1"
When the developer navigates to the "Response Rules" configuration tab
And updates the default response status to "429 Too Many Requests"
And sets a simulated latency delay of 1500 milliseconds
Then subsequent requests received by "/api/inbox/inb_a8f9c2d1" wait 1500ms before returning HTTP 429
And the response headers include "Retry-After: 30"
```

---

### Feature 2: Real-Time Webhook Event Stream & Payload/Header Inspector
*As a developer troubleshooting an incoming webhook,*
*I want to inspect the exact HTTP headers, raw payload, and parsed JSON of captured events,*
*So that I can identify schema errors or missing headers immediately.*

#### Scenario 2.1: Live event list rendering
```gherkin
Given the developer has selected inbox "inb_a8f9c2d1"
When new webhook requests arrive at the ingress endpoint
Then the requests appear in the event stream sorted chronologically descending
And each row displays the HTTP method badge (POST, PUT, GET), HTTP response code delivered, URL path, payload byte size, and relative timestamp (e.g., "12s ago")
And selecting an event highlights the row and loads full event details into the inspector pane
```

#### Scenario 2.2: Payload and header inspection
```gherkin
Given an event is selected in the inspector pane
When the developer toggles between "Formatted JSON", "Raw Payload", and "Headers" tabs
Then the "Headers" tab displays all captured HTTP headers in a clean key-value table with search/filter capability
And the "Formatted JSON" tab presents syntax-highlighted, collapsible JSON with line numbers
And the "Raw Payload" tab displays the exact inbound bytes prior to JSON decoding
And a "Copy as cURL" action generates an executable cURL command replicating the exact inbound request
```

---

### Feature 3: Cryptographic Signature Verification Engine
*As a backend developer integrating authenticated webhooks,*
*I want to test my webhook signing secret against incoming payloads,*
*So that I can determine why signature verification is failing in my application.*

#### Scenario 3.1: Successful Stripe HMAC-SHA256 signature verification
```gherkin
Given a captured request with header "Stripe-Signature" containing "t=1700000000,v1=abc123def456..."
When the developer selects the "Signature Verification" tab
And selects the provider preset "Stripe"
And inputs the webhook signing secret "whsec_test_secret_key"
And clicks "Verify Signature"
Then the system computes HMAC-SHA256(secret, "1700000000." + raw_body)
And compares the computed digest against "v1" using constant-time equality
And displays a "Signature Verified" status badge with an emerald check indicator
And displays the computed hash, extracted timestamp, and clock-skew delta against capture time
```

#### Scenario 3.2: Failed GitHub HMAC-SHA256 signature verification
```gherkin
Given a captured request with header "X-Hub-Signature-256" containing "sha256=expected_hash_value"
When the developer selects provider preset "GitHub"
And provides an incorrect signing secret "invalid_secret"
And clicks "Verify Signature"
Then the system computes HMAC-SHA256("invalid_secret", raw_body)
And detects that the calculated hash does not match "expected_hash_value"
And displays a "Verification Failed" status badge in restrained crimson
And presents a side-by-side diagnostic diff showing the expected hash versus the computed hash
```

#### Scenario 3.3: Svix / Standard Webhooks signature verification
```gherkin
Given a captured request containing headers "svix-id", "svix-timestamp", and "svix-signature"
When the developer selects provider preset "Svix"
And provides the base64-encoded signing secret "whsec_..."
And clicks "Verify Signature"
Then the system verifies the signature against the canonical message format "${id}.${timestamp}.${body}"
And validates whether the timestamp is within the standard tolerance window (300 seconds)
And reports the verification verdict with explicit timestamp drift metrics
```

---

### Feature 4: Replay & Target Forwarding Engine
*As a developer testing code changes on localhost,*
*I want to forward any captured webhook to my local server with one click,*
*So that I can test my handler's execution path without triggering external sandbox events.*

#### Scenario 4.1: Single-click forward to local server
```gherkin
Given a captured webhook event in the inspector pane
When the developer navigates to the "Replay & Forward" section
And enters the target URL "http://localhost:3000/api/webhooks/stripe"
And clicks "Dispatch Replay"
Then the backend server executes an HTTP POST to "http://localhost:3000/api/webhooks/stripe"
And forwards the original raw payload body and inbound headers (excluding host/connection overrides)
And displays the target server's response status code (e.g., 200 OK), response latency (e.g., 42ms), and response body preview
And records the execution in the Replay History table
```

#### Scenario 4.2: Payload tampering prior to replay
```gherkin
Given a captured webhook event with JSON body '{"status": "pending", "amount": 1000}'
When the developer toggles "Edit Before Replay"
And modifies the payload to '{"status": "succeeded", "amount": 9999}'
And adds a custom header "X-Debug-Replay: true"
And clicks "Dispatch Replay"
Then the system transmits the modified payload and appended header to the target URL
And logs the mutated payload in the Replay History without overwriting the original immutable captured event
```

---

## 3. Strict Design & Quality Requirements

### 3.1 Visual Direction & Palette
- **Editorial Typography-First:** Layout designed with clean line heights, structured grids, and tabular numbers for data density.
- **Surface Foundations:**
  - Background Canvas: Zinc-950 (`#09090b`)
  - Elevated Cards & Panes: Zinc-900 (`#18181b`)
  - Borders & Dividers: Zinc-800 (`#27272a`)
  - Subdued Borders: Zinc-800/60 (`#27272a99`)
  - Secondary Text / Meta: Zinc-400 (`#a1a1aa`)
  - Primary Text: Zinc-100 (`#f4f4f5`)
- **Accent Philosophy:** Single intentional accent: **Electric Emerald** (`#10b981` / `emerald-500`) for verified states, active ingress status, and 2xx HTTP badges.
- **Status Accents:**
  - Success / Active: Emerald-500 (`#10b981`)
  - Warning / Latency / Skew: Amber-500 (`#f59e0b`)
  - Error / Failure / 5xx: Rose-500 (`#f43f5e`)
  - Informational / Methods: Zinc-300 (`#d4d4d8`) / Slate-400 (`#94a3b8`)
- **Typography:**
  - UI Font: Inter or system sans-serif (`font-sans`)
  - Code & Hashes: JetBrains Mono or system monospace (`font-mono`)

### 3.2 Iconography & Visual Cleanliness
- **Zero Emojis:** Strictly zero emojis in buttons, badges, headers, cards, toasts, empty states, or alerts.
- **Lucide SVG Icons:** Precision stroke SVG icons only (`lucide-vue-next` or inline SVGs).
  - Primary icons: `Radio` (inbox), `ShieldCheck` (signature verify), `Play` / `RefreshCw` (replay), `Sliders` (rules), `Copy` (clipboard), `Check` (copied checkmark), `Search` (filter), `Trash2` (delete), `Clock` (timestamp), `Terminal` (cURL), `Code2` (payload).

### 3.3 State Coverage Specifications
1. **Loading States:**
   - Shimmer skeleton lines across event lists and code blocks while fetching data or dispatching replays.
   - Non-blocking inline spinner or pulse indicator on buttons during signature calculation and replay execution.
2. **Empty States:**
   - **No Inboxes:** Focused card explaining how to create a capture inbox, with a clear primary action button and Lucide `Radio` icon.
   - **Empty Inbox:** Direct display of the generated ingress URL, quick cURL snippet to send a test ping, and a listening heartbeat indicator.
   - **No Replay History:** Subdued placeholder stating "No replays dispatched for this event yet."
3. **Error States:**
   - **Malformed JSON:** Clear banner indicating raw payload contains non-JSON bytes, gracefully falling back to raw text mode.
   - **Network Unreachable Target:** Descriptive error when replaying to localhost (e.g., `ECONNREFUSED 127.0.0.1:3000: Target server is not running`).
   - **Signature Verification Mismatch:** Tabular diagnostic showing expected hash vs calculated hash with secret length validation.

### 3.4 Copywriting & Tone
- Purely technical, concise, and direct developer copy.
- No generic AI marketing buzzwords (strictly avoid words like: *effortless*, *revolutionary*, *supercharge*, *magical*, *game-changer*, *seamless*).
- Examples:
  - *Correct:* "Capturing incoming HTTP requests. Copy the URL above into your webhook provider settings."
  - *Incorrect:* "Supercharge your webhook development with effortless magical event tracking."

---

## 4. Lightweight Stack & Technical Architecture

### 4.1 Framework & Core Engine
- **Framework:** Nuxt 3 (Vue 3 Composition API, TypeScript, Vite).
- **Server Engine:** Nitro server engine providing built-in API routes (`/api/inbox/:id`, `/api/events`, `/api/replay`, `/api/verify`).
- **Styling:** Tailwind CSS with custom zinc palette configuration and typography support.
- **Icons:** `lucide-vue-next` for all iconography.

### 4.2 Persistence & Database
- **Engine:** Serverless SQLite via `better-sqlite3` or Nitro unstorage driver (`db/hookcraft.sqlite`).
- **Data Models:**
  - `Inbox`:
    - `id` (string, primary key, e.g. `inb_...`)
    - `name` (string)
    - `responseStatus` (integer, default `200`)
    - `responseDelayMs` (integer, default `0`)
    - `responseHeaders` (text/json, nullable)
    - `responseBody` (text, nullable)
    - `createdAt` (datetime)
  - `CapturedEvent`:
    - `id` (string, primary key, e.g. `evt_...`)
    - `inboxId` (string, foreign key to `Inbox.id`)
    - `method` (string, e.g. `POST`)
    - `headers` (text/json, serialized key-value pairs)
    - `queryParams` (text/json, serialized query params)
    - `rawBody` (text, raw string or base64)
    - `isJson` (boolean)
    - `contentLength` (integer)
    - `clientIp` (string)
    - `responseDeliveredStatus` (integer)
    - `createdAt` (datetime)
  - `ReplayLog`:
    - `id` (string, primary key, e.g. `rpl_...`)
    - `eventId` (string, foreign key to `CapturedEvent.id`)
    - `targetUrl` (string)
    - `requestHeaders` (text/json)
    - `requestBody` (text)
    - `responseStatus` (integer)
    - `responseDurationMs` (integer)
    - `responseBody` (text)
    - `createdAt` (datetime)

### 4.3 Cryptographic Verification Module
- Built on Node.js native `node:crypto`.
- Functions:
  - `verifyStripeSignature(rawBody, headerValue, secret, toleranceSeconds)`
  - `verifyGitHubSignature(rawBody, headerValue, secret)`
  - `verifySvixSignature(rawBody, headers, secret, toleranceSeconds)`
  - `verifyGenericHmac(rawBody, secret, algorithm, encoding)`
- Utilizes `crypto.timingSafeEqual` for constant-time byte comparisons to prevent timing attacks.

### 4.4 Real-Time Event Communication
- Lightweight polling or Server-Sent Events (SSE) route at `/api/inbox/:id/stream` or reactive interval refetching (1000ms polling with ETag / last-event-id header).

---

## 5. Explicit MVP Scope Boundaries

| Capability / Area | In-Scope (MVP v1.0) | Out-of-Scope (Post-MVP / Future) |
|---|---|---|
| **Capture Inboxes** | Unique URL generation, configurable mock HTTP response status (200, 400, 429, 500), response latency delay (0-5000ms), inbox deletion. | Custom custom-domain DNS bindings, wildcard subdomain routing, persistent tunnel daemon (e.g. ngrok replacement). |
| **Event Inspection** | HTTP headers key-value browser, raw body view, syntax-highlighted formatted JSON viewer, client IP, content size, copy as cURL/Fetch. | Binary protobuf / gRPC decoding, multipart file attachment rendering, automated JSON Schema diffing. |
| **Signature Verifier** | Built-in verification for Stripe (`Stripe-Signature`), GitHub (`X-Hub-Signature-256`), Svix (`svix-signature`), and Generic HMAC-SHA256 with constant-time equality and diffing. | Asymmetric RSA / ECDSA public key signature verification, automated secret vault integrations (AWS Secrets Manager, Vault). |
| **Replay & Forwarding** | Direct HTTP POST replay to user-specified local target (e.g., `http://localhost:3000/api/webhooks`), in-flight payload/header editing, replay history log with target status and latency. | Automated cron-based periodic replay, automated webhook fuzzing/chaos testing engine, parallel fan-out to multiple endpoints simultaneously. |
| **Persistence & Architecture** | Local SQLite database, zero external cloud dependencies, zero telemetry. | Multi-tenant team auth (SSO/OAuth), cloud multi-region replication, billing/Stripe subscriptions. |
| **User Interface** | Three-column desktop-first responsive layout, dark theme (zinc/slate neutrals + emerald accent), strictly Lucide SVG icons, zero emojis. | Native desktop Electron/Tauri wrapper, mobile-optimized native apps, custom UI theme creator. |

---

## 6. Implementation Milestones

1. **Milestone 1: Project Scaffolding & Database Setup**
   - Initialize Nuxt 3 project with Tailwind CSS, Lucide icons, and SQLite storage layer.
   - Create schema tables (`Inbox`, `CapturedEvent`, `ReplayLog`).
2. **Milestone 2: Ingress Routing & Real-Time Event Feed**
   - Implement dynamic catch-all route `/api/inbox/[id]`.
   - Implement configurable status response and latency delay simulation.
   - Build master-detail 3-column UI with reactive event stream polling.
3. **Milestone 3: Payload Inspector & Cryptographic Verification Engine**
   - Build JSON viewer, raw payload inspector, and cURL export.
   - Implement `node:crypto` verification engine for Stripe, GitHub, Svix, and Generic HMAC.
   - Build verification UI with visual diagnostic breakdown.
4. **Milestone 4: Replay Engine & Replay History**
   - Implement `/api/replay` forwarder with target URL dispatch, latency recording, and response body capture.
   - Add inline payload tampering and header modification editor.
5. **Milestone 5: Visual Polish & QA Validation**
   - Verify strict zero-emoji compliance and Lucide SVG icon usage.
   - Complete loading skeletons, empty states, and error handling for connection failures.
   - Validate against live Stripe and GitHub webhook payload samples.
