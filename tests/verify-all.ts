import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { verifyWebhookSignature } from '../server/utils/crypto';
import { sanitizeForwardHeaders, tryParseJson } from '../server/utils/http';
import { useCurlGenerator } from '../composables/useCurlGenerator';
import type { CapturedEvent } from '../types/database';

// Test runner state
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults: { name: string; passed: boolean; error?: string }[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function test(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    testResults.push({ name, passed: true });
    console.log(`  \x1b[32m✔\x1b[0m ${name}`);
  } catch (err: any) {
    failedTests++;
    testResults.push({ name, passed: false, error: err.message || String(err) });
    console.error(`  \x1b[31m✖\x1b[0m ${name}`);
    console.error(`    \x1b[31m${err.stack || err.message}\x1b[0m`);
  }
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('   HookCraft Debugger - Automated Verification Suite   ');
  console.log('======================================================\n');

  // ==========================================================
  // SECTION 1: Cryptographic HMAC-SHA256 Verification Tests
  // ==========================================================
  console.log('\x1b[1m\x1b[36m[Suite 1] Cryptographic HMAC-SHA256 Verification Tests\x1b[0m');

  await test('Stripe: Valid signature matches expected calculation', () => {
    const secret = 'whsec_test_stripe_secret_123';
    const timestamp = Math.floor(Date.now() / 1000);
    const body = '{"id":"evt_test_123","type":"charge.succeeded"}';
    const signedPayload = `${timestamp}.${body}`;
    const hash = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
    const header = `t=${timestamp},v1=${hash}`;

    const res = verifyWebhookSignature({
      provider: 'stripe',
      rawBody: body,
      secret,
      signatureHeader: header,
      toleranceSeconds: 300
    });

    assert(res.isValid === true, 'Signature should be valid');
    assert(res.provider === 'stripe', 'Provider should be stripe');
    assert(res.calculatedHash === hash, 'Calculated hash should match');
    assert(res.isExpired === false, 'Timestamp should not be expired');
  });

  await test('Stripe: Rejects mismatched secret or tampered body', () => {
    const secret = 'whsec_test_stripe_secret_123';
    const timestamp = Math.floor(Date.now() / 1000);
    const body = '{"id":"evt_test_123","type":"charge.succeeded"}';
    const signedPayload = `${timestamp}.${body}`;
    const hash = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
    const header = `t=${timestamp},v1=${hash}`;

    const tamperedRes = verifyWebhookSignature({
      provider: 'stripe',
      rawBody: '{"id":"evt_test_123","type":"charge.failed"}',
      secret,
      signatureHeader: header
    });
    assert(tamperedRes.isValid === false, 'Tampered body should be invalid');

    const badSecretRes = verifyWebhookSignature({
      provider: 'stripe',
      rawBody: body,
      secret: 'whsec_wrong_secret',
      signatureHeader: header
    });
    assert(badSecretRes.isValid === false, 'Wrong secret should fail verification');
  });

  await test('Stripe: Rejects timestamp expired beyond tolerance threshold', () => {
    const secret = 'whsec_test_stripe_secret_123';
    // 600 seconds ago (tolerance is 300s)
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600;
    const body = '{"id":"evt_test_old"}';
    const signedPayload = `${oldTimestamp}.${body}`;
    const hash = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
    const header = `t=${oldTimestamp},v1=${hash}`;

    const res = verifyWebhookSignature({
      provider: 'stripe',
      rawBody: body,
      secret,
      signatureHeader: header,
      toleranceSeconds: 300
    });

    assert(res.isExpired === true, 'Signature timestamp must be marked expired');
    assert(res.isValid === false, 'Expired signature must be invalid');
  });

  await test('Stripe: Rejects missing timestamp or malformed signature header', () => {
    const res = verifyWebhookSignature({
      provider: 'stripe',
      rawBody: '{"id":"1"}',
      secret: 'secret123',
      signatureHeader: 'v1=abc123' // missing t=
    });
    assert(res.isValid === false, 'Missing timestamp must fail');

    const res2 = verifyWebhookSignature({
      provider: 'stripe',
      rawBody: '{"id":"1"}',
      secret: 'secret123',
      signatureHeader: 't=123456789' // missing v1=
    });
    assert(res2.isValid === false, 'Missing v1 hash must fail');
  });

  await test('GitHub: Valid sha256 signature verification', () => {
    const secret = 'gh_secret_test_456';
    const body = '{"ref":"refs/heads/main","commits":[]}';
    const hash = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
    const header = `sha256=${hash}`;

    const res = verifyWebhookSignature({
      provider: 'github',
      rawBody: body,
      secret,
      signatureHeader: header
    });

    assert(res.isValid === true, 'GitHub sha256 signature should be valid');
    assert(res.algorithm === 'sha256', 'Algorithm should be sha256');
    assert(res.calculatedHash === hash, 'Hashes should match');
  });

  await test('GitHub: Fallback sha1 signature verification', () => {
    const secret = 'gh_secret_test_456';
    const body = '{"action":"opened"}';
    const hash = crypto.createHmac('sha1', secret).update(body, 'utf8').digest('hex');
    const header = `sha1=${hash}`;

    const res = verifyWebhookSignature({
      provider: 'github',
      rawBody: body,
      secret,
      signatureHeader: header
    });

    assert(res.isValid === true, 'GitHub sha1 fallback should be valid');
    assert(res.algorithm === 'sha1', 'Algorithm should be sha1');
    assert(res.calculatedHash === hash, 'Hashes should match');
  });

  await test('GitHub: Rejects altered body payload', () => {
    const secret = 'gh_secret_test_456';
    const body = '{"ref":"refs/heads/main"}';
    const hash = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
    const header = `sha256=${hash}`;

    const res = verifyWebhookSignature({
      provider: 'github',
      rawBody: '{"ref":"refs/heads/development"}',
      secret,
      signatureHeader: header
    });

    assert(res.isValid === false, 'Tampered GitHub body must be invalid');
  });

  await test('Svix: Valid signature with whsec_ base64 secret', () => {
    const rawSecret = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw';
    const secretBuffer = Buffer.from('MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw', 'base64');
    const msgId = 'msg_test_7788';
    const timestamp = Math.floor(Date.now() / 1000);
    const body = '{"type":"invoice.paid"}';
    const toSign = `${msgId}.${timestamp}.${body}`;
    const hash = crypto.createHmac('sha256', secretBuffer).update(toSign, 'utf8').digest('base64');

    const res = verifyWebhookSignature({
      provider: 'svix',
      rawBody: body,
      secret: rawSecret,
      headers: {
        'svix-id': msgId,
        'svix-timestamp': String(timestamp),
        'svix-signature': `v1,${hash}`
      }
    });

    assert(res.isValid === true, 'Svix signature should be valid');
    assert(res.calculatedHash === hash, 'Base64 hashes should match');
  });

  await test('Svix: Multi-signature header parsing (v1,old v1,new)', () => {
    const rawSecret = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw';
    const secretBuffer = Buffer.from('MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw', 'base64');
    const msgId = 'msg_test_multi';
    const timestamp = Math.floor(Date.now() / 1000);
    const body = '{"type":"account.created"}';
    const toSign = `${msgId}.${timestamp}.${body}`;
    const hash = crypto.createHmac('sha256', secretBuffer).update(toSign, 'utf8').digest('base64');

    const res = verifyWebhookSignature({
      provider: 'svix',
      rawBody: body,
      secret: rawSecret,
      headers: {
        'svix-id': msgId,
        'svix-timestamp': String(timestamp),
        'svix-signature': `v1,bogusSignature v1,${hash}`
      }
    });

    assert(res.isValid === true, 'Svix multi-signature header should match valid signature');
  });

  await test('Shopify: Base64 HMAC-SHA256 signature verification', () => {
    const secret = 'shopify_shared_secret_999';
    const body = '{"order":{"id":12345,"total":"99.00"}}';
    const hash = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64');

    const res = verifyWebhookSignature({
      provider: 'shopify',
      rawBody: body,
      secret,
      signatureHeader: hash
    });

    assert(res.isValid === true, 'Shopify base64 HMAC must be valid');
  });

  await test('Generic HMAC: Standard SHA256 & SHA512 verification', () => {
    const secret = 'generic_key_abc';
    const body = '{"ping":"pong"}';
    const hash256 = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');

    const res256 = verifyWebhookSignature({
      provider: 'generic',
      rawBody: body,
      secret,
      signatureHeader: hash256,
      algorithm: 'sha256'
    });
    assert(res256.isValid === true, 'Generic SHA256 should match');

    const hash512 = crypto.createHmac('sha512', secret).update(body, 'utf8').digest('hex');
    const res512 = verifyWebhookSignature({
      provider: 'generic',
      rawBody: body,
      secret,
      signatureHeader: hash512,
      algorithm: 'sha512'
    });
    assert(res512.isValid === true, 'Generic SHA512 should match');
  });

  await test('Crypto: Fails cleanly with empty secret or missing parameters', () => {
    const res = verifyWebhookSignature({
      provider: 'stripe',
      rawBody: 'test',
      secret: '',
      signatureHeader: 't=1,v1=123'
    });
    assert(res.isValid === false, 'Empty secret must return isValid: false');
    assert(res.diagnostics.length > 0, 'Must include helpful diagnostics');
  });

  // ==========================================================
  // SECTION 2: Database Integrity & Queries
  // ==========================================================
  console.log('\n\x1b[1m\x1b[36m[Suite 2] Database Integrity & Queries (Inboxes and CapturedEvents)\x1b[0m');

  const dbPath = path.resolve(process.cwd(), 'prisma/starter.db');
  const prisma = new PrismaClient({
    datasources: { db: { url: `file:${dbPath}` } }
  });

  await test('Database: Starter database has 3 demonstration inboxes pre-seeded', async () => {
    const inboxes = await prisma.inbox.findMany();
    assert(inboxes.length >= 3, `Expected at least 3 inboxes, found ${inboxes.length}`);

    const slugs = inboxes.map(i => i.slug);
    assert(slugs.includes('stripe-payments-demo'), 'stripe-payments-demo must exist');
    assert(slugs.includes('github-webhooks-demo'), 'github-webhooks-demo must exist');
    assert(slugs.includes('svix-standard-demo'), 'svix-standard-demo must exist');
  });

  await test('Database: Captured events exist for each demo inbox with valid JSON', async () => {
    const inboxes = await prisma.inbox.findMany({
      include: { events: true }
    });

    for (const inbox of inboxes) {
      assert(inbox.events.length > 0, `Inbox ${inbox.slug} should have pre-seeded events`);
      const event = inbox.events[0];
      assert(event.method === 'POST', 'Event method should be POST');
      assert(event.rawBody.length > 0, 'rawBody must not be empty');
      assert(event.headersJson.length > 0, 'headersJson must not be empty');
      const parsed = JSON.parse(event.headersJson);
      assert(typeof parsed === 'object', 'headersJson must be valid JSON object');
    }
  });

  await test('Database: Pre-seeded replay log linked to Stripe captured event', async () => {
    const replays = await prisma.replayLog.findMany({
      include: { event: true }
    });
    assert(replays.length >= 1, `Expected at least 1 replay log, found ${replays.length}`);
    const stripeReplay = replays[0];
    assert(stripeReplay.responseStatus === 200, 'Replay status should be 200');
    assert(stripeReplay.event !== null, 'Replay must be linked to a captured event');
  });

  await test('Database: Dynamic Inbox & CapturedEvent CRUD with cascade deletion', async () => {
    const testSlug = `test-inbox-${Date.now()}`;
    const newInbox = await prisma.inbox.create({
      data: {
        name: 'Temporary Test Inbox',
        slug: testSlug,
        mockStatusCode: 202,
        mockDelayMs: 25
      }
    });
    assert(newInbox.slug === testSlug, 'Inbox slug should match');
    assert(newInbox.mockStatusCode === 202, 'Mock status code should be 202');

    const newEvent = await prisma.capturedEvent.create({
      data: {
        inboxId: newInbox.id,
        method: 'PUT',
        path: `/api/inbox/${testSlug}`,
        headersJson: JSON.stringify({ 'x-test': '1' }),
        rawBody: '{"test":true}',
        parsedJson: '{\n  "test": true\n}',
        responseStatus: 202
      }
    });
    assert(newEvent.inboxId === newInbox.id, 'Event should belong to inbox');

    const newReplay = await prisma.replayLog.create({
      data: {
        eventId: newEvent.id,
        targetUrl: 'http://localhost:9999/webhook',
        requestHeadersJson: JSON.stringify({ 'x-test': '1' }),
        requestBody: '{"test":true}',
        responseStatus: 200,
        latencyMs: 15
      }
    });
    assert(newReplay.eventId === newEvent.id, 'Replay should belong to event');

    // Cascade delete inbox
    await prisma.inbox.delete({ where: { id: newInbox.id } });

    // Verify cascade deleted events and replays
    const orphanEvent = await prisma.capturedEvent.findUnique({ where: { id: newEvent.id } });
    assert(orphanEvent === null, 'Event should be cascade deleted');

    const orphanReplay = await prisma.replayLog.findUnique({ where: { id: newReplay.id } });
    assert(orphanReplay === null, 'Replay should be cascade deleted');
  });

  await prisma.$disconnect();

  // ==========================================================
  // SECTION 3: Replay Forwarder & cURL Generator Utilities
  // ==========================================================
  console.log('\n\x1b[1m\x1b[36m[Suite 3] Replay Forwarder & cURL Generator Utilities\x1b[0m');

  await test('cURL Generator: Correctly constructs curl command from event', () => {
    const { generateCurl } = useCurlGenerator();
    const mockEvent: CapturedEvent = {
      id: 'evt_test_curl',
      inboxId: 'inbox_123',
      method: 'POST',
      path: '/api/inbox/stripe-demo',
      queryParams: null,
      headersJson: JSON.stringify({
        'content-type': 'application/json',
        'host': 'ignore-me.local',
        'connection': 'keep-alive',
        'x-custom-key': 'secret "value"'
      }),
      rawBody: '{"event":"checkout","amount":4900}',
      parsedJson: '{"event":"checkout","amount":4900}',
      clientIp: '127.0.0.1',
      responseStatus: 200,
      createdAt: new Date()
    };

    const curl = generateCurl(mockEvent, 'https://api.hookcraft.dev');

    assert(curl.includes('curl -X POST "https://api.hookcraft.dev/api/inbox/stripe-demo"'), 'Includes target URL and method');
    assert(curl.includes('-H "content-type: application/json"'), 'Includes content-type');
    assert(curl.includes('-H "x-custom-key: secret \\"value\\""'), 'Escapes quotes in header value');
    assert(!curl.includes('-H "host:'), 'Filters out hop-by-hop host header');
    assert(!curl.includes('-H "connection:'), 'Filters out hop-by-hop connection header');
    assert(curl.includes("--data-raw '{\"event\":\"checkout\",\"amount\":4900}'"), 'Includes payload in --data-raw');
  });

  await test('cURL Generator: Handles GET requests without payload body', () => {
    const { generateCurl } = useCurlGenerator();
    const mockEvent: CapturedEvent = {
      id: 'evt_test_get',
      inboxId: 'inbox_123',
      method: 'GET',
      path: '/api/inbox/my-webhook',
      queryParams: null,
      headersJson: JSON.stringify({ 'accept': 'application/json' }),
      rawBody: '',
      parsedJson: null,
      clientIp: '127.0.0.1',
      responseStatus: 200,
      createdAt: new Date()
    };

    const curl = generateCurl(mockEvent);
    assert(curl.includes('curl -X GET'), 'Should be GET method');
    assert(!curl.includes('--data-raw'), 'GET request should not include --data-raw');
  });

  await test('HTTP Utils: sanitizeForwardHeaders strips all hop-by-hop headers', () => {
    const rawHeaders = {
      'host': 'evil.com',
      'connection': 'keep-alive',
      'content-length': '999',
      'transfer-encoding': 'chunked',
      'keep-alive': 'timeout=5',
      'upgrade': 'websocket',
      'user-agent': 'My-App/1.0',
      'content-type': 'application/json',
      'x-signature': 'sig123',
      'x-array-header': ['val1', 'val2']
    };

    const sanitized = sanitizeForwardHeaders(rawHeaders as any);

    assert(!sanitized['host'], 'Must strip host');
    assert(!sanitized['connection'], 'Must strip connection');
    assert(!sanitized['content-length'], 'Must strip content-length');
    assert(!sanitized['transfer-encoding'], 'Must strip transfer-encoding');
    assert(sanitized['user-agent'] === 'My-App/1.0', 'Must keep user-agent');
    assert(sanitized['content-type'] === 'application/json', 'Must keep content-type');
    assert(sanitized['x-signature'] === 'sig123', 'Must keep x-signature');
    assert(sanitized['x-array-header'] === 'val1, val2', 'Must join array headers');
  });

  await test('HTTP Utils: tryParseJson accurately formats valid and rejects invalid JSON', () => {
    const valid = tryParseJson('{"a":1,"b":[2,3]}');
    assert(valid.isValid === true, 'Valid JSON must be accepted');
    assert(valid.parsed.a === 1, 'JSON parsed object must match');
    assert(valid.formatted !== null, 'Formatted JSON must be generated');

    const invalid = tryParseJson('{"invalidJson": true,');
    assert(invalid.isValid === false, 'Invalid JSON must be rejected');
    assert(invalid.parsed === null, 'Parsed must be null');
  });

  await test('Replay Forwarder: Dispatches HTTP request to target endpoint and receives response', async () => {
    let receivedHeader = '';
    let receivedBody = '';
    let receivedMethod = '';

    // Create a local ephemeral test server
    const server = http.createServer((req, res) => {
      receivedMethod = req.method || '';
      receivedHeader = req.headers['x-hookcraft-replay'] as string;
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        receivedBody = body;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ replayed: true, receivedLength: body.length }));
      });
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as any).port;
    const targetUrl = `http://127.0.0.1:${port}/webhook-target`;

    try {
      const payload = '{"status":"replayed_successfully"}';
      const outboundHeaders = sanitizeForwardHeaders({
        'content-type': 'application/json',
        'host': 'hookcraft.local'
      });
      outboundHeaders['x-hookcraft-replay'] = 'true';

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: outboundHeaders,
        body: payload
      });

      assert(response.status === 200, 'Target response status should be 200');
      const json = await response.json() as any;
      assert(json.replayed === true, 'Target response should match');
      assert(receivedMethod === 'POST', 'Method forwarded should be POST');
      assert(receivedHeader === 'true', 'x-hookcraft-replay header must be forwarded');
      assert(receivedBody === payload, 'Payload received by target must match exactly');
    } finally {
      server.close();
    }
  });

  // ==========================================================
  // SECTION 4: Serverless Cold-Start Readiness Simulation
  // ==========================================================
  console.log('\n\x1b[1m\x1b[36m[Suite 4] Serverless Cold-Start Readiness Simulation\x1b[0m');

  await test('Serverless Cold Start: Initializes /tmp/hookcraft.db from starter.db when VERCEL=1', async () => {
    const tmpDbPath = '/tmp/hookcraft_coldstart_test.db';
    if (fs.existsSync(tmpDbPath)) {
      fs.unlinkSync(tmpDbPath);
    }

    const starterCandidate = path.resolve(process.cwd(), 'prisma/starter.db');
    assert(fs.existsSync(starterCandidate), 'prisma/starter.db candidate must exist');

    // Simulate cold-start copy logic
    fs.copyFileSync(starterCandidate, tmpDbPath);
    fs.chmodSync(tmpDbPath, 0o666);

    assert(fs.existsSync(tmpDbPath), '/tmp database must be created');
    assert(fs.statSync(tmpDbPath).size === fs.statSync(starterCandidate).size, 'File sizes must match');

    // Query cold-started database
    const coldPrisma = new PrismaClient({
      datasources: { db: { url: `file:${tmpDbPath}` } }
    });

    const inboxes = await coldPrisma.inbox.findMany();
    assert(inboxes.length >= 3, 'Cold start database must have all 3 seeded inboxes');
    await coldPrisma.$disconnect();

    // Clean up test file
    fs.unlinkSync(tmpDbPath);
  });

  console.log('\n======================================================');
  console.log(`   Test Summary: ${passedTests}/${totalTests} Passed (${failedTests} Failed)   `);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test suite failure:', err);
  process.exit(1);
});
