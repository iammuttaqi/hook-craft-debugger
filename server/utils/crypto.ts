import crypto from 'node:crypto';
import type { SignatureProvider, VerificationResult } from '~/types/signatures';

export interface VerifyOptions {
  provider: SignatureProvider;
  rawBody: string;
  secret: string;
  signatureHeader?: string;
  headers?: Record<string, string>;
  algorithm?: 'sha256' | 'sha1' | 'sha512';
  toleranceSeconds?: number;
}

export function verifyWebhookSignature(options: VerifyOptions): VerificationResult {
  const {
    provider,
    rawBody = '',
    secret = '',
    signatureHeader = '',
    headers = {},
    toleranceSeconds = 300
  } = options;

  const diagnostics: string[] = [];

  if (!secret) {
    return {
      isValid: false,
      provider,
      algorithm: options.algorithm || 'sha256',
      expectedHash: signatureHeader,
      calculatedHash: '',
      diagnostics: ['Secret is empty. A valid webhook secret is required.']
    };
  }

  // Normalize header keys to lowercase for lookup
  const normalizedHeaders: Record<string, string> = {};
  for (const [key, val] of Object.entries(headers)) {
    if (val !== undefined && val !== null) {
      normalizedHeaders[key.toLowerCase()] = String(val);
    }
  }

  switch (provider) {
    case 'stripe': {
      // Stripe Header: t=1700000000,v1=5257a863...[,v0=...]
      const rawHeader = signatureHeader || normalizedHeaders['stripe-signature'] || '';
      const items: Record<string, string> = {};

      for (const part of rawHeader.split(',')) {
        const eqIdx = part.indexOf('=');
        if (eqIdx !== -1) {
          const k = part.slice(0, eqIdx).trim();
          const v = part.slice(eqIdx + 1).trim();
          items[k] = v;
        }
      }

      const timestampStr = items['t'];
      const expectedV1 = items['v1'];

      if (!timestampStr || !expectedV1) {
        return {
          isValid: false,
          provider: 'stripe',
          algorithm: 'sha256',
          expectedHash: expectedV1 || rawHeader || '(missing)',
          calculatedHash: '',
          diagnostics: [
            'Missing timestamp (t) or signature (v1) in Stripe-Signature header.',
            'Header received: ' + (rawHeader ? `"${rawHeader}"` : '(empty)')
          ]
        };
      }

      const timestamp = parseInt(timestampStr, 10);
      const now = Math.floor(Date.now() / 1000);
      const driftSeconds = isNaN(timestamp) ? 0 : now - timestamp;
      const isExpired = Math.abs(driftSeconds) > toleranceSeconds;

      diagnostics.push(`Timestamp extracted: ${timestamp} (Clock drift: ${driftSeconds >= 0 ? '+' : ''}${driftSeconds}s against server time)`);
      if (isExpired) {
        diagnostics.push(`Warning: Timestamp drift (${Math.abs(driftSeconds)}s) exceeds tolerance threshold of ${toleranceSeconds}s.`);
      }

      const signedPayload = `${timestampStr}.${rawBody}`;
      const calculatedHash = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');

      let isValid = false;
      try {
        const expectedBuffer = Buffer.from(expectedV1, 'hex');
        const calculatedBuffer = Buffer.from(calculatedHash, 'hex');
        isValid = expectedBuffer.length === calculatedBuffer.length &&
                  crypto.timingSafeEqual(expectedBuffer, calculatedBuffer);
      } catch {
        isValid = false;
      }

      diagnostics.push(`Signed payload constructed as: "${timestampStr}.<raw_body>" (${signedPayload.length} bytes)`);
      diagnostics.push(isValid
        ? 'Constant-time HMAC comparison matched successfully.'
        : 'Digest mismatch: Computed HMAC does not match expected v1 hash.'
      );

      return {
        isValid: isValid && !isExpired,
        provider: 'stripe',
        algorithm: 'sha256',
        expectedHash: expectedV1,
        calculatedHash,
        timestamp,
        driftSeconds,
        isExpired,
        diagnostics
      };
    }

    case 'github': {
      // GitHub Header: sha256=abcdef... or sha1=abcdef...
      const rawHeader = signatureHeader || normalizedHeaders['x-hub-signature-256'] || normalizedHeaders['x-hub-signature'] || '';
      let expectedHash = rawHeader.trim();
      let algorithm: 'sha256' | 'sha1' = 'sha256';

      if (rawHeader.startsWith('sha256=')) {
        expectedHash = rawHeader.slice(7).trim();
        algorithm = 'sha256';
      } else if (rawHeader.startsWith('sha1=')) {
        expectedHash = rawHeader.slice(5).trim();
        algorithm = 'sha1';
      }

      if (!expectedHash) {
        return {
          isValid: false,
          provider: 'github',
          algorithm,
          expectedHash: '(missing)',
          calculatedHash: '',
          diagnostics: ['Missing signature in X-Hub-Signature-256 or X-Hub-Signature header.']
        };
      }

      const calculatedHash = crypto.createHmac(algorithm, secret).update(rawBody, 'utf8').digest('hex');

      let isValid = false;
      try {
        const expectedBuffer = Buffer.from(expectedHash, 'hex');
        const calculatedBuffer = Buffer.from(calculatedHash, 'hex');
        isValid = expectedBuffer.length === calculatedBuffer.length &&
                  crypto.timingSafeEqual(expectedBuffer, calculatedBuffer);
      } catch {
        isValid = false;
      }

      diagnostics.push(`Algorithm: HMAC-${algorithm.toUpperCase()}`);
      diagnostics.push(`Input payload size: ${Buffer.byteLength(rawBody, 'utf8')} bytes`);
      diagnostics.push(isValid
        ? 'Constant-time comparison passed: GitHub signature is authentic.'
        : 'Signature mismatch: Computed digest does not match header signature.'
      );

      return {
        isValid,
        provider: 'github',
        algorithm,
        expectedHash,
        calculatedHash,
        diagnostics
      };
    }

    case 'svix': {
      // Svix headers: svix-id, svix-timestamp, svix-signature (v1,base64_hash)
      const id = normalizedHeaders['svix-id'] || '';
      const timestampStr = normalizedHeaders['svix-timestamp'] || '';
      const rawSigHeader = signatureHeader || normalizedHeaders['svix-signature'] || '';

      if (!id || !timestampStr || !rawSigHeader) {
        return {
          isValid: false,
          provider: 'svix',
          algorithm: 'sha256',
          expectedHash: rawSigHeader || '(missing)',
          calculatedHash: '',
          diagnostics: [
            'Missing required Svix headers. Expected: "svix-id", "svix-timestamp", and "svix-signature".',
            `Received: id=${id ? 'yes' : 'missing'}, timestamp=${timestampStr ? 'yes' : 'missing'}, signature=${rawSigHeader ? 'yes' : 'missing'}`
          ]
        };
      }

      // Secret starts with 'whsec_', remainder is base64 encoded
      let secretBuffer: Buffer;
      try {
        const cleanSecret = secret.startsWith('whsec_') ? secret.slice(6) : secret;
        secretBuffer = Buffer.from(cleanSecret, 'base64');
      } catch {
        secretBuffer = Buffer.from(secret, 'utf8');
      }

      const timestamp = parseInt(timestampStr, 10);
      const now = Math.floor(Date.now() / 1000);
      const driftSeconds = isNaN(timestamp) ? 0 : now - timestamp;
      const isExpired = Math.abs(driftSeconds) > toleranceSeconds;

      const signedContent = `${id}.${timestampStr}.${rawBody}`;
      const calculatedHash = crypto.createHmac('sha256', secretBuffer).update(signedContent, 'utf8').digest('base64');

      // Header can contain space-separated signatures: "v1,abc v1,def"
      const passedSignatures = rawSigHeader.split(' ').map(s => s.replace(/^v1,/, '').trim());
      let isMatch = false;

      for (const expected of passedSignatures) {
        try {
          const b1 = Buffer.from(expected);
          const b2 = Buffer.from(calculatedHash);
          if (b1.length === b2.length && crypto.timingSafeEqual(b1, b2)) {
            isMatch = true;
            break;
          }
        } catch {
          // ignore error and continue
        }
      }

      diagnostics.push(`Svix Message ID: ${id}`);
      diagnostics.push(`Timestamp Drift: ${driftSeconds >= 0 ? '+' : ''}${driftSeconds}s (Expired: ${isExpired ? 'Yes' : 'No'})`);
      diagnostics.push(isMatch
        ? 'Svix signature verified successfully.'
        : 'Svix signature verification failed: Computed base64 digest does not match.'
      );

      return {
        isValid: isMatch && !isExpired,
        provider: 'svix',
        algorithm: 'sha256',
        expectedHash: passedSignatures[0] || rawSigHeader,
        calculatedHash,
        timestamp,
        driftSeconds,
        isExpired,
        diagnostics
      };
    }

    case 'shopify': {
      // Shopify header: X-Shopify-Hmac-Sha256 (base64 digest)
      const rawHeader = signatureHeader || normalizedHeaders['x-shopify-hmac-sha256'] || '';
      const calculatedHash = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');

      let isValid = false;
      try {
        const b1 = Buffer.from(rawHeader.trim());
        const b2 = Buffer.from(calculatedHash);
        isValid = b1.length === b2.length && crypto.timingSafeEqual(b1, b2);
      } catch {
        isValid = false;
      }

      diagnostics.push(`Computed Base64 HMAC-SHA256 from raw payload (${rawBody.length} bytes)`);
      diagnostics.push(isValid ? 'Shopify HMAC verified successfully.' : 'Shopify HMAC mismatch.');

      return {
        isValid,
        provider: 'shopify',
        algorithm: 'sha256',
        expectedHash: rawHeader,
        calculatedHash,
        diagnostics
      };
    }

    default: {
      // Generic HMAC
      const algo = options.algorithm || 'sha256';
      const cleanHeader = (signatureHeader || '').trim();
      const calculatedHash = crypto.createHmac(algo, secret).update(rawBody, 'utf8').digest('hex');

      let isValid = false;
      try {
        const b1 = Buffer.from(cleanHeader, 'hex');
        const b2 = Buffer.from(calculatedHash, 'hex');
        isValid = b1.length === b2.length && crypto.timingSafeEqual(b1, b2);
      } catch {
        isValid = false;
      }

      diagnostics.push(`Algorithm: HMAC-${algo.toUpperCase()}`);
      diagnostics.push(isValid ? 'Generic HMAC verification matched.' : 'Generic HMAC mismatch.');

      return {
        isValid,
        provider: 'generic',
        algorithm: algo,
        expectedHash: cleanHeader,
        calculatedHash,
        diagnostics
      };
    }
  }
}
