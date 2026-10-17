# HookCraft Debugger — Comprehensive User Guide

HookCraft Debugger is a high-performance, local-first developer studio designed to capture, inspect, verify, and replay inbound HTTP webhooks without routing sensitive payload data through third-party cloud infrastructure.

This guide details end-to-end workflows, configuration of chaos engineering rules, cryptographic signature verification procedures across standard providers, local event replay, architecture guarantees, and troubleshooting FAQs.

---

## Table of Contents
1. [Core Workflow Overview](#1-core-workflow-overview)
2. [Getting Started: Ingress Capture Inboxes](#2-getting-started-ingress-capture-inboxes)
3. [Chaos Engineering: Simulating Latency & Failure Modes](#3-chaos-engineering-simulating-latency--failure-modes)
4. [Real-Time Event Inspection](#4-real-time-event-inspection)
5. [Cryptographic Signature Verification Guide](#5-cryptographic-signature-verification-guide)
   - [Stripe Webhook Signatures](#51-stripe-webhook-signatures)
   - [GitHub Webhook Signatures](#52-github-webhook-signatures)
   - [Svix / Standard Webhooks](#53-svix--standard-webhooks)
   - [Generic HMAC Verification](#54-generic-hmac-verification)
6. [Local Event Replay & Forwarding Engine](#6-local-event-replay--forwarding-engine)
7. [cURL Generation & CLI Workflows](#7-curl-generation--cli-workflows)
8. [Architecture, Security & Privacy Model](#8-architecture-security--privacy-model)
9. [Keyboard Shortcuts & Productivity Tips](#9-keyboard-shortcuts--productivity-tips)
10. [Frequently Asked Questions (FAQs)](#10-frequently-asked-questions-faqs)

---

## 1. Core Workflow Overview

Modern distributed systems rely on asynchronous webhooks for payments, deployments, authentication, and order processing. HookCraft Debugger standardizes your testing pipeline into four reproducible stages:

```
+-----------------------------------------------------------------------------------+
| 1. INGRESS CAPTURE                                                                |
| Provider (Stripe, GitHub, etc.) -> Ingress Endpoint -> Raw Buffer Persistence    |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| 2. CHAOS SIMULATION                                                               |
| Inject Artificial Latency (0-5000ms) & Mock Status Codes (200, 429, 500)          |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| 3. CRYPTOGRAPHIC DIAGNOSIS                                                        |
| node:crypto verification, timingSafeEqual check, timestamp clock-skew analysis    |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| 4. LOCAL REPLAY & TAMPERING                                                       |
| Forward to http://localhost:3000/api/webhooks with live payload & header mutation |
+-----------------------------------------------------------------------------------+
```

---

## 2. Getting Started: Ingress Capture Inboxes

### 2.1 Provisioning a Capture Inbox

1. Navigate to the HookCraft Debugger studio (locally at `http://localhost:3000` or production at [`https://hook-craft-debugger.vercel.app`](https://hook-craft-debugger.vercel.app)).
2. Locate the **Inboxes** panel in the left column.
3. Click **New** (or **Create Ingress Inbox** if no inboxes are present).
4. Enter an inbox name (e.g. `Stripe Checkout Staging` or `GitHub Push Triggers`).
5. (Optional) Provide a custom URL slug, or leave blank to auto-generate a unique slug (e.g., `stripe-checkout-staging-8f2c`).
6. Click **Create Inbox**.

The inbox becomes active immediately, binding to two ingress paths:
- Direct slug route: `/api/inbox/[slug]`
- Ingress catch-all: `/api/inbox/[slug]/ingress`

Both routes accept all HTTP verbs (`POST`, `GET`, `PUT`, `PATCH`, `DELETE`, `HEAD`).

### 2.2 Capturing Your First Webhook

Once an inbox is selected, the center column displays the ingress URL and a quick-test cURL command.

#### Quick Shell Test
Run this command in your terminal to fire a verification request:

```bash
curl -X POST "https://hook-craft-debugger.vercel.app/api/inbox/YOUR_INBOX_SLUG/ingress" \
  -H "Content-Type: application/json" \
  -H "User-Agent: HookCraft-Probe/1.0" \
  -d '{"event":"test.ping","message":"Hello HookCraft","timestamp":1700000000}'
```

#### Ingress Response
The server responds with an acknowledgment payload:

```json
{
  "status": "received",
  "eventId": "evt_cmvc1eyoa0001hmyx766jznzm",
  "inbox": "YOUR_INBOX_SLUG",
  "timestamp": "2026-10-17T06:50:34.378Z",
  "responseStatus": 200
}
```

The new event appears in the center column event feed within 1,500ms without manual page refreshes.

---

## 3. Chaos Engineering: Simulating Latency & Failure Modes

Most webhook delivery engines implement automated retry schedules with exponential backoff when downstream listeners return errors or timeout. HookCraft allows you to simulate these network and application edge cases directly at the ingress gate.

### 3.1 Response Rules Configuration
In the left column under **Inboxes**, select the target inbox and locate the **Chaos & Ingress Rules** widget at the bottom of the panel.

#### Mock Response Codes
Select the status code returned to the external provider:
- `200 OK` / `201 Created` / `202 Accepted`: Standard successful acknowledgments.
- `400 Bad Request`: Simulates schema parsing rejections.
- `401 Unauthorized`: Simulates rejected signing keys.
- `429 Too Many Requests`: Verifies whether the provider honors rate-limiting policies and schedules retries.
- `500 Server Error` / `503 Service Unavailable`: Simulates internal server crash or downstream outages to test provider exponential backoff retries.

#### Artificial Latency Delay Slider
Adjust the slider from `0 ms` (instant processing) up to `5000 ms` in 100ms increments.

### 3.2 Testing Stripe Retry Backoff
1. In the **Chaos & Ingress Rules** editor, set the response code to `429 Too Many Requests`.
2. Set the latency slider to `1200 ms`.
3. Trigger a test event via Stripe CLI:
   ```bash
   stripe trigger payment_intent.succeeded
   ```
4. Observe Stripe's webhook delivery log in the Stripe Developer Dashboard: Stripe records the 429 response status and schedules an automated retry attempt.

---

## 4. Real-Time Event Inspection

The studio divides event diagnostics across three functional areas:

### 4.1 Event Stream Filtering & Search
Located at the top of the center column:
- **Search Bar:** Real-time query matching against request path, raw payload body, or header keys and values.
- **Method Pills:** Instant filter for `ALL`, `POST`, `GET`, `PUT`, or `DELETE`.
- **Live / Paused Toggle:** Click the status pill to pause live polling while inspecting high-frequency event streams.
- **Clear Stream:** Click the trash icon to clear the in-memory display.

### 4.2 Formatted JSON Tab
- Automatically parses and validates valid JSON bodies.
- Syntax-highlighted code rendering with line numbering.
- Automatic non-JSON detection: If the request is URL-encoded form data (e.g. Twilio) or raw binary, an alert prompt directs you to the raw payload viewer.

### 4.3 Raw Payload Tab
- Displays the exact byte sequence received by the HTTP server prior to transformation.
- Displays payload size in bytes (`new TextEncoder().encode(rawBody).length`).
- Essential for debugging cryptographic failures caused by whitespace, unescaped characters, or serializer differences.

### 4.4 Headers Tab
- Filterable key-value table showing all captured request headers.
- Filter headers instantly using the embedded search box.
- One-click copy for any header value.

---

## 5. Cryptographic Signature Verification Guide

Webhook providers sign inbound payloads using Hash-based Message Authentication Code (HMAC) algorithms to guarantee authenticity and prevent tampering. HookCraft uses native Node.js `node:crypto` with constant-time equality comparisons (`crypto.timingSafeEqual`) to avoid timing attacks.

Select an event in the stream and open the **Signature Verifier** tab in the right-hand panel.

### 5.1 Stripe Webhook Signatures

Stripe includes a signature header containing a timestamp and one or more HMAC-SHA256 signatures:
`Stripe-Signature: t=1700000000,v1=5257a869e7ecebeda32affa62cd32311ba62cd32311b...`

#### Step-by-Step Setup:
1. Select **Stripe** from the provider preset buttons.
2. HookCraft automatically extracts `Stripe-Signature` from the captured headers.
3. Retrieve your webhook secret from the Stripe Dashboard (`Developers > Webhooks > Signing Secret`) or Stripe CLI output (starts with `whsec_`).
4. Paste the secret into the **Webhook Signing Secret** field.
5. Set the **Timestamp Tolerance** (default is 300 seconds).
6. Click **Verify Signature**.

#### How HookCraft Verifies:
1. Extracts `t` (timestamp) and `v1` (signature digest) from the header.
2. Constructs the canonical signed payload: `${t}.${rawBody}`.
3. Computes `crypto.createHmac('sha256', secret).update(signedPayload).digest('hex')`.
4. Evaluates clock skew against current UTC time: `drift = Math.abs(currentTimestamp - t)`.
5. Compares digests using `crypto.timingSafeEqual`.

### 5.2 GitHub Webhook Signatures

GitHub sends an HMAC digest computed over the raw payload body:
`X-Hub-Signature-256: sha256=d57c68a12b...` (or legacy `X-Hub-Signature: sha1=...`)

#### Step-by-Step Setup:
1. Select **GitHub** from the provider presets.
2. HookCraft extracts `X-Hub-Signature-256` (falling back to `X-Hub-Signature`).
3. Enter the secret configured in your GitHub repository (`Settings > Webhooks > Secret`).
4. Click **Verify Signature**.

#### How HookCraft Verifies:
1. Strips the prefix (`sha256=` or `sha1=`).
2. Computes HMAC over the raw request body buffer.
3. Performs constant-time comparison against the received hex hash.

### 5.3 Svix / Standard Webhooks

Svix powers webhooks for modern platforms such as Clerk, Resend, and Brex, adhering to the Standard Webhooks specification:
- `svix-id`: Unique message ID
- `svix-timestamp`: Unix timestamp in seconds
- `svix-signature`: Space-separated signatures, e.g., `v1,g0hM9SsE+OTPJspd... v1,k2...`

#### Step-by-Step Setup:
1. Select **Svix / Standard** from the provider presets.
2. HookCraft auto-populates `svix-signature`.
3. Provide your signing secret (starts with `whsec_` followed by base64 characters).
4. Set timestamp tolerance (standard is 300 seconds).
5. Click **Verify Signature**.

#### How HookCraft Verifies:
1. Strips `whsec_` prefix and decodes the secret from base64 into a raw binary buffer.
2. Constructs the canonical payload: `${svixId}.${svixTimestamp}.${rawBody}`.
3. Generates base64 digest: `crypto.createHmac('sha256', rawSecretKey).update(toSign).digest('base64')`.
4. Tests every `v1,` token in the header to handle zero-downtime secret rotation.

### 5.4 Generic HMAC Verification
For custom webhooks (e.g. Shopify, Slack, or in-house services):
1. Select **Generic HMAC**.
2. Choose algorithm: `HMAC-SHA256`, `HMAC-SHA1`, or `HMAC-SHA512`.
3. Paste the expected signature and secret key.
4. Click **Verify Signature**.

### 5.5 Understanding the Diagnostic Diff
When a verification fails, HookCraft renders a structured diagnostic breakdown:
- **Expected Header Digest:** The raw string sent by the provider.
- **Calculated Local HMAC Digest:** The exact hash produced by your secret and payload.
- **Clock Skew / Drift:** Calculated drift in seconds. If drift exceeds the tolerance limit, an `(Expired)` flag warns of potential replay attack rejections.
- **Step-by-Step Diagnostic Engine:** Detailed messages explaining if the failure was caused by missing headers, incorrect secret encoding, timestamp expiration, or byte mismatch.

---

## 6. Local Event Replay & Forwarding Engine

Testing webhook handlers against localhost normally requires manually reproducing actions in third-party dashboards. HookCraft enables single-click replays directly to your local server.

### 6.1 Dispatching a Replay
1. In the right column, select the **Replay & Forward** tab.
2. Enter your local endpoint (e.g., `http://localhost:3000/api/webhooks` or `http://127.0.0.1:8000/api/webhook`).
3. Select the HTTP method (defaults to the captured method, typically `POST`).
4. Click **Dispatch Replay**.

The backend server dispatches the request, records round-trip duration with millisecond precision, and displays:
- Response HTTP status badge (e.g., `200 OK`).
- Round-trip latency (e.g., `38ms`).
- Preview of the response body returned by your local server.

### 6.2 In-Flight Payload Mutation & Tampering
To test edge cases (such as altered totals, refunded statuses, or invalid user IDs) without mutating production data:
1. Under **Payload Mutation & Tampering**, click **Edit Before Replay**.
2. Modify the JSON or plaintext in the editor.
3. Click **Dispatch Replay**.
4. The mutated payload is dispatched to your target server and recorded in the replay log without altering the original immutable captured event.

### 6.3 Header Injection
By default, HookCraft appends `x-hookcraft-replay: true` to help your local server distinguish replays from live traffic. You can add, edit, or remove custom headers using the **Add Header** button.

Hop-by-hop headers (`host`, `content-length`, `connection`) are stripped automatically to prevent socket connection drops.

### 6.4 Replay History
Every dispatched replay is logged in the **Replay Execution History** table at the bottom of the tab, tracking:
- Target URL
- Timestamp
- Status code
- Latency in milliseconds
- Expandable response body preview

---

## 7. cURL Generation & CLI Workflows

Every captured webhook can be exported as an executable cURL command replicating the exact payload, headers, and HTTP method.

### 7.1 Generating cURL from the UI
In the header of the master inspector, click **Copy as cURL**. 

The generated command is ready to paste into your terminal:

```bash
curl -X POST "http://localhost:3000/api/inbox/stripe-payments-demo" \
  -H "content-type: application/json" \
  -H "stripe-signature: t=1700000000,v1=5257a869e7ecebeda32affa62cd32311ba62cd32311b5ff7be486a43e498144b" \
  -H "user-agent: Stripe/1.0 (+https://stripe.com/docs/webhooks)" \
  --data-raw '{"id":"evt_test_123","object":"event","type":"payment_intent.succeeded"}'
```

### 7.2 Forwarding Directly to Localhost via cURL
To replay directly to your local development service without opening the web interface:
1. Copy the generated cURL command.
2. Replace the ingress URL with your local server endpoint (`http://localhost:3000/api/webhooks`).
3. Execute the command in your shell.

---

## 8. Architecture, Security & Privacy Model

Public webhook dumpers log your customer names, payment metadata, and API tokens to shared multi-tenant databases with uncertain retention policies. HookCraft Debugger is engineered under a local-first, zero-leakage security paradigm.

```
+-------------------------------------------------------------------------+
| PRIVACY & SECURITY BOUNDARY                                             |
|                                                                         |
|  [External Sender]                                                      |
|         |                                                               |
|         v                                                               |
|  [Ingress Route: /api/inbox/:slug]                                      |
|         |                                                               |
|         +---> [Local SQLite Engine /tmp/hookcraft.db]                   |
|         |     (Isolated, Ephemeral, Zero External Egress)               |
|         |                                                               |
|         +---> [Node.js node:crypto Verifier]                            |
|         |     (HMAC-SHA256, timingSafeEqual, Local-only)                |
|         |                                                               |
|         +---> [Local Forwarder -> http://localhost:3000]                |
|                                                                         |
|  NO Analytics | NO Third-Party Trackers | NO Remote Storage Loggers     |
+-------------------------------------------------------------------------+
```

### 8.1 Key Security Principles
1. **Zero External Cloud Trackers:** No telemetry, analytics scripts, or third-party loggers are bundled.
2. **Local Cryptographic Processing:** Webhook secrets are never stored in third-party services. Hash calculations run entirely within the Node.js process using native `node:crypto`.
3. **Serverless Ephemeral Storage:** When deployed to Vercel, the application operates against an ephemeral SQLite database located in `/tmp/hookcraft.db`, initialized from a pre-seeded starter image. No data persists in public databases.
4. **Timing-Attack Resistance:** All digest comparisons use `crypto.timingSafeEqual` with byte length verification to eliminate timing side-channel vulnerabilities.

---

## 9. Keyboard Shortcuts & Productivity Tips

| Action | Control / Interaction | Description |
|---|---|---|
| **Filter by Method** | Click Method Pill (`POST`, `GET`, etc.) | Isolates events matching the selected HTTP verb |
| **Search Events** | Click Search Bar or press tab | Filter events across path, body, and headers |
| **Pause Event Feed** | Click `Live / Paused` Badge | Suspends 1.5s background polling to inspect live events |
| **Copy Event cURL** | Click `Copy as cURL` button | Copies shell-ready cURL command to system clipboard |
| **Copy Header Value** | Hover table row and click copy icon | Copies specific header value directly |
| **Inspect Raw Bytes** | Click `Raw Payload` tab | View byte-accurate body without JSON formatter |
| **Mutate Payload** | Click `Edit Before Replay` | Modifies outbound JSON before forwarding to localhost |

---

## 10. Frequently Asked Questions (FAQs)

### Q: Why does Stripe signature verification fail with "Signature mismatch"?
**A:** Check the following three common causes:
1. **Wrong Secret:** Ensure you are using the webhook endpoint secret (`whsec_...`) from the Webhook configuration page, NOT your Stripe API secret key (`sk_test_...` or `rk_test_...`).
2. **Whitespace Mutation:** If your payload was modified or pretty-printed by an intermediary proxy, the raw body bytes will no longer match the hash Stripe computed. Always verify against the **Raw Payload**.
3. **Timestamp Tolerance:** If testing captured payloads from earlier days, the event timestamp `t` will exceed the default 300-second tolerance window. Increase the tolerance parameter in the verification panel.

### Q: Why do I receive `ECONNREFUSED 127.0.0.1:3000` when dispatching a replay?
**A:** This indicates that no local HTTP server is listening on port 3000. Ensure your application server (e.g. Next.js, Express, FastAPI) is running locally and that the route (`/api/webhooks`) is configured to accept POST requests. If running in a container, use `host.docker.internal` instead of `localhost`.

### Q: Does HookCraft store or upload my webhook payloads?
**A:** No. HookCraft stores data exclusively in the local SQLite database (`prisma/dev.db` for local runs, or `/tmp/hookcraft.db` when deployed serverless). It never uploads payloads or signing secrets to external servers or telemetry collectors.

### Q: Can I run HookCraft Debugger in a Docker container?
**A:** Yes. Build and run the self-contained container:
```bash
docker build -t hook-craft-debugger .
docker run -d -p 3000:3000 --name hookcraft hook-craft-debugger
```
Access the dashboard at `http://localhost:3000`.

### Q: How do I test rate-limiting behavior with my webhook sender?
**A:** Open the target inbox in the left sidebar, navigate to **Chaos & Ingress Rules**, select `429 Too Many Requests`, and set the latency slider to `1500 ms`. When your provider delivers the next event, HookCraft will hold the socket for 1.5 seconds and return an HTTP 429 response.
