import { verifyWebhookSignature } from '~/server/utils/crypto';
import type { VerifySignaturePayload } from '~/types/signatures';

export default defineEventHandler(async (event) => {
  const body = await readBody<VerifySignaturePayload>(event);

  if (!body) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Request body is required.'
    });
  }

  const result = verifyWebhookSignature({
    provider: body.provider || 'generic',
    rawBody: body.rawBody || '',
    secret: body.secret || '',
    signatureHeader: body.signatureHeader || '',
    headers: body.headers || {},
    algorithm: body.algorithm || 'sha256',
    toleranceSeconds: Number(body.toleranceSeconds) || 300
  });

  return result;
});
