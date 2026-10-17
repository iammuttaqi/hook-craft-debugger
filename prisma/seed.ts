import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding HookCraft Debugger database with realistic webhook events...');

  // Clean existing records if any
  await prisma.replayLog.deleteMany();
  await prisma.capturedEvent.deleteMany();
  await prisma.inbox.deleteMany();

  // --- 1. Stripe Inbox & Realistic checkout.session.completed Event ---
  const stripeSecret = 'whsec_test_stripe_secret_123';
  const stripeInbox = await prisma.inbox.create({
    data: {
      name: 'Stripe Production Webhooks',
      slug: 'stripe-payments-demo',
      mockStatusCode: 200,
      mockDelayMs: 0
    }
  });

  const stripeTimestamp = Math.floor(Date.now() / 1000);
  const stripeRawBody = JSON.stringify({
    id: 'evt_1Nwd3jLkdIwHu7ixTest992',
    object: 'event',
    api_version: '2023-10-16',
    created: stripeTimestamp,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_a1b2c3d4e5f6g7h8i9j0',
        object: 'checkout.session',
        amount_subtotal: 4900,
        amount_total: 4900,
        currency: 'usd',
        customer_email: 'alex.rivera@example.com',
        customer_details: {
          email: 'alex.rivera@example.com',
          name: 'Alex Rivera'
        },
        payment_status: 'paid',
        status: 'complete',
        mode: 'payment',
        success_url: 'https://example.com/checkout/success',
        metadata: {
          plan_tier: 'developer_pro',
          environment: 'production'
        }
      }
    },
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: 'req_kL92jF01xx9a',
      idempotency_key: 'b94fd5e4-8c01-447a-8d18-97305943b18e'
    }
  }, null, 2);

  const stripeSignedContent = `${stripeTimestamp}.${stripeRawBody}`;
  const stripeV1Hash = crypto
    .createHmac('sha256', stripeSecret)
    .update(stripeSignedContent, 'utf8')
    .digest('hex');
  const stripeSignatureHeader = `t=${stripeTimestamp},v1=${stripeV1Hash}`;

  const stripeEvent = await prisma.capturedEvent.create({
    data: {
      inboxId: stripeInbox.id,
      method: 'POST',
      path: `/api/inbox/${stripeInbox.slug}`,
      queryParams: null,
      headersJson: JSON.stringify({
        'host': 'hookcraft.local',
        'user-agent': 'Stripe/1.0 (+https://stripe.com/docs/webhooks)',
        'content-type': 'application/json; charset=utf-8',
        'stripe-signature': stripeSignatureHeader,
        'content-length': String(Buffer.byteLength(stripeRawBody, 'utf8')),
        'accept': '*/*',
        'connection': 'close'
      }, null, 2),
      rawBody: stripeRawBody,
      parsedJson: stripeRawBody,
      clientIp: '54.187.174.169',
      responseStatus: 200,
      createdAt: new Date(Date.now() - 1000 * 60 * 3) // 3 minutes ago
    }
  });

  // Replay Log for Stripe Event
  await prisma.replayLog.create({
    data: {
      eventId: stripeEvent.id,
      targetUrl: 'http://localhost:3000/api/webhooks/stripe',
      requestHeadersJson: JSON.stringify({
        'content-type': 'application/json; charset=utf-8',
        'stripe-signature': stripeSignatureHeader,
        'x-hookcraft-replay': 'true'
      }, null, 2),
      requestBody: stripeRawBody,
      responseStatus: 200,
      latencyMs: 38,
      responseBody: '{"received": true, "session": "cs_test_a1b2c3d4e5f6g7h8i9j0", "status": "processed"}',
      createdAt: new Date(Date.now() - 1000 * 60 * 2)
    }
  });

  // --- 2. GitHub Inbox & Realistic push Event ---
  const githubSecret = 'gh_secret_test_456';
  const githubInbox = await prisma.inbox.create({
    data: {
      name: 'GitHub Repository Webhooks',
      slug: 'github-webhooks-demo',
      mockStatusCode: 200,
      mockDelayMs: 0
    }
  });

  const githubRawBody = JSON.stringify({
    ref: 'refs/heads/main',
    before: '4c62b9a10382379374092b31454508ef48e3cf5f',
    after: '7a91c0e3523e1f181f08cb36d39d91244e8bc19d',
    repository: {
      id: 98124019,
      name: 'core-platform',
      full_name: 'acme-corp/core-platform',
      private: true,
      owner: {
        name: 'acme-corp',
        login: 'acme-corp'
      },
      html_url: 'https://github.com/acme-corp/core-platform',
      default_branch: 'main'
    },
    pusher: {
      name: 'dev-lead',
      email: 'lead@example.com'
    },
    sender: {
      login: 'dev-lead',
      id: 1049281,
      type: 'User'
    },
    commits: [
      {
        id: '7a91c0e3523e1f181f08cb36d39d91244e8bc19d',
        message: 'fix(billing): handle asynchronous invoice payment confirmations',
        timestamp: new Date().toISOString(),
        url: 'https://github.com/acme-corp/core-platform/commit/7a91c0e3523e1f181f08cb36d39d91244e8bc19d',
        author: {
          name: 'Dev Lead',
          email: 'lead@example.com'
        },
        added: ['src/services/billing/webhook.ts'],
        modified: ['src/services/billing/processor.ts'],
        removed: []
      }
    ],
    head_commit: {
      id: '7a91c0e3523e1f181f08cb36d39d91244e8bc19d',
      message: 'fix(billing): handle asynchronous invoice payment confirmations',
      author: {
        name: 'Dev Lead',
        email: 'lead@example.com'
      }
    }
  }, null, 2);

  const githubSha256 = crypto
    .createHmac('sha256', githubSecret)
    .update(githubRawBody, 'utf8')
    .digest('hex');
  const githubSignatureHeader = `sha256=${githubSha256}`;

  const githubEvent = await prisma.capturedEvent.create({
    data: {
      inboxId: githubInbox.id,
      method: 'POST',
      path: `/api/inbox/${githubInbox.slug}`,
      queryParams: null,
      headersJson: JSON.stringify({
        'host': 'hookcraft.local',
        'user-agent': 'GitHub-Hookshot/7a91c0e',
        'content-type': 'application/json',
        'x-github-event': 'push',
        'x-github-delivery': '72d3162e-cc78-11e3-8144-a676ca88d68f',
        'x-hub-signature-256': githubSignatureHeader,
        'content-length': String(Buffer.byteLength(githubRawBody, 'utf8')),
        'accept': '*/*'
      }, null, 2),
      rawBody: githubRawBody,
      parsedJson: githubRawBody,
      clientIp: '140.82.115.1',
      responseStatus: 200,
      createdAt: new Date(Date.now() - 1000 * 60 * 12) // 12 minutes ago
    }
  });

  // --- 3. Svix Inbox & Realistic Svix Event ---
  const svixSecret = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw';
  const svixCleanSecret = svixSecret.replace(/^whsec_/, '');
  const svixSecretBuf = Buffer.from(svixCleanSecret, 'base64');
  const svixId = 'msg_2rN5c8kQ4q9W8yZ0';
  const svixTimestamp = Math.floor(Date.now() / 1000) - 30;

  const svixInbox = await prisma.inbox.create({
    data: {
      name: 'Svix Standard Webhooks',
      slug: 'svix-standard-demo',
      mockStatusCode: 200,
      mockDelayMs: 0
    }
  });

  const svixRawBody = JSON.stringify({
    event: 'user.signup.completed',
    timestamp: new Date().toISOString(),
    data: {
      user_id: 'usr_8829410',
      email: 'sara.chen@techstartup.io',
      role: 'admin',
      organization_id: 'org_enterprise_44'
    }
  }, null, 2);

  const svixSignedContent = `${svixId}.${svixTimestamp}.${svixRawBody}`;
  const svixCalculatedSignature = crypto
    .createHmac('sha256', svixSecretBuf)
    .update(svixSignedContent, 'utf8')
    .digest('base64');
  const svixSignatureHeader = `v1,${svixCalculatedSignature}`;

  await prisma.capturedEvent.create({
    data: {
      inboxId: svixInbox.id,
      method: 'POST',
      path: `/api/inbox/${svixInbox.slug}`,
      queryParams: null,
      headersJson: JSON.stringify({
        'host': 'hookcraft.local',
        'user-agent': 'Svix-Webhooks/1.0',
        'content-type': 'application/json',
        'svix-id': svixId,
        'svix-timestamp': String(svixTimestamp),
        'svix-signature': svixSignatureHeader,
        'content-length': String(Buffer.byteLength(svixRawBody, 'utf8'))
      }, null, 2),
      rawBody: svixRawBody,
      parsedJson: svixRawBody,
      clientIp: '13.248.212.11',
      responseStatus: 200,
      createdAt: new Date(Date.now() - 1000 * 60 * 25)
    }
  });

  console.log('Seeded database successfully with Stripe, GitHub, and Svix demonstration inboxes.');
}

main()
  .then(async () => {
    await prisma.$disconnect();

    // Copy seeded database to prisma/starter.db and public/starter.db for serverless cold-start adapter
    const devDbPath = fs.existsSync(path.resolve(process.cwd(), 'prisma/dev.db'))
      ? path.resolve(process.cwd(), 'prisma/dev.db')
      : path.resolve(process.cwd(), 'dev.db');
    const starterDbPath = path.resolve(process.cwd(), 'prisma/starter.db');
    const publicStarterDbPath = path.resolve(process.cwd(), 'public/starter.db');

    if (fs.existsSync(devDbPath)) {
      fs.copyFileSync(devDbPath, starterDbPath);
      console.log(`Copied seeded database to ${starterDbPath}`);

      const publicDir = path.dirname(publicStarterDbPath);
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      fs.copyFileSync(devDbPath, publicStarterDbPath);
      console.log(`Copied seeded database to ${publicStarterDbPath}`);
    }
  })
  .catch(async (e) => {
    console.error('Seeding error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
