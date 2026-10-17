# HookCraft Debugger — Deployment & Operations Manual

## 1. Overview & Status

| Attribute | Value |
| :--- | :--- |
| **Project Name** | HookCraft Debugger |
| **Deployment Target** | Vercel Serverless Production (AWS Lambda / Edge CDN) |
| **Deployment Status** | **LIVE (Production Verified)** |
| **Live Production URL** | [https://hook-craft-debugger.vercel.app](https://hook-craft-debugger.vercel.app) |
| **GitHub Repository** | [https://github.com/iammuttaqi/hook-craft-debugger](https://github.com/iammuttaqi/hook-craft-debugger) |
| **Deployment Engine** | Vercel CLI via `pnpm dlx vercel` |
| **Package Manager** | `pnpm` (v12.10.1) |
| **Framework & Runtime** | Nuxt 3 (v3.14+), Nitro Engine, Vue 3 (Composition API), TypeScript 5.7, Prisma ORM 5.22, Tailwind CSS 3.4 |

---

## 2. Live Smoke Test Results

All live production endpoints were tested against the public Vercel production deployment:

### 2.1 Serverless Cold-Start & Inboxes API Check
```bash
curl -sI https://hook-craft-debugger.vercel.app/api/inboxes
```
**HTTP Response:**
```http
HTTP/2 200 
age: 0
cache-control: public, max-age=0, must-revalidate
content-type: text/html
date: Sat, 17 Oct 2026 06:50:19 GMT
server: Vercel
strict-transport-security: max-age=63072000; includeSubDomains; preload
x-vercel-cache: MISS
```
> **Result:** HTTP/2 200 OK. Confirms database initialization on serverless cold start into `/tmp/hookcraft.db` from embedded starter seed.

### 2.2 Pre-seeded Inboxes Listing
```bash
curl -s https://hook-craft-debugger.vercel.app/api/inboxes | jq .
```
**Payload Verification:**
```json
{
  "inboxes": [
    {
      "id": "cmvc0hsy5000811jxc21oo4tf",
      "name": "Svix Standard Webhooks",
      "slug": "svix-standard-demo",
      "mockStatusCode": 200,
      "mockDelayMs": 0,
      "eventCount": 1
    },
    {
      "id": "cmvc0hsy3000511jxeegesojj",
      "name": "GitHub Repository Webhooks",
      "slug": "github-webhooks-demo",
      "mockStatusCode": 200,
      "mockDelayMs": 0,
      "eventCount": 1
    },
    {
      "id": "cmvc0hsxv000011jxrfxohj86",
      "name": "Stripe Production Webhooks",
      "slug": "stripe-payments-demo",
      "mockStatusCode": 200,
      "mockDelayMs": 0,
      "eventCount": 1
    }
  ]
}
```

### 2.3 Live Webhook Ingress Test
```bash
curl -s -X POST https://hook-craft-debugger.vercel.app/api/inbox/stripe-payments-demo/ingress \
  -H "Content-Type: application/json" \
  -d '{"event":"payment_intent.succeeded","amount":4200}'
```
**Response:**
```json
{
  "status": "received",
  "eventId": "cmvc1eyoa0001hmyx766jznzm",
  "inbox": "stripe-payments-demo",
  "timestamp": "2026-10-17T06:50:34.378Z",
  "responseStatus": 200
}
```

---

## 3. Local Development & Production Run Instructions

HookCraft Debugger strictly requires `pnpm` as the package manager.

### 3.1 Local Development
```bash
# Clone the repository
git clone https://github.com/iammuttaqi/hook-craft-debugger.git
cd hook-craft-debugger

# Install dependencies using pnpm
pnpm install

# Generate Prisma Client & initialize schema
pnpm prisma:generate
pnpm prisma:push

# (Optional) Seed demonstration inboxes and captured events
pnpm prisma:seed

# Launch development server
pnpm dev
```
The application will be running at `http://localhost:3000`.

### 3.2 Local Production Build & Start
```bash
# Build the production bundle
pnpm build

# Start the optimized production Nitro server
node .output/server/index.mjs
```
The production server listens on `http://localhost:3000` (or `PORT` specified in environment).

### 3.3 Running Automated Test Suite
```bash
pnpm test
```
Executes the full 22-test automated verification suite (`tests/verify-all.ts`) testing HMAC signatures, database cascade operations, cURL generators, and serverless cold-start simulation.

---

## 4. Docker Deployment

### 4.1 Build Docker Image
```bash
docker build -t hook-craft-debugger .
```

### 4.2 Run Docker Container
```bash
docker run -d \
  -p 3000:3000 \
  --name hook-craft-instance \
  -e NODE_ENV=production \
  hook-craft-debugger
```
Access the application at `http://localhost:3000`.

---

## 5. Vercel Cloud Deployment Architecture

- **Serverless Database Strategy:**
  SQLite does not natively persist across serverless instances. HookCraft Debugger resolves this by deploying an embedded 56 KB pre-seeded starter database (`server/utils/starter-db-embedded.ts`). On cold-start, Nitro verifies `/tmp/hookcraft.db` and hydrates it automatically.
- **HMAC Verification:**
  Runs securely inside Node.js Vercel Functions using constant-time cryptographic comparisons (`crypto.timingSafeEqual`) without third-party network egress.
- **Local Replay Engine:**
  The replay engine dispatches outgoing requests to targets with hop-by-hop header stripping and 15-second socket timeouts.
