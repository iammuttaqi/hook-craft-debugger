export type SignatureProvider = 'stripe' | 'github' | 'shopify' | 'svix' | 'generic';

export interface VerifySignaturePayload {
  provider: SignatureProvider;
  rawBody: string;
  secret: string;
  signatureHeader?: string;
  headers?: Record<string, string>;
  algorithm?: 'sha256' | 'sha1' | 'sha512';
  toleranceSeconds?: number;
}

export interface VerificationResult {
  isValid: boolean;
  provider: SignatureProvider;
  algorithm: string;
  expectedHash: string;
  calculatedHash: string;
  timestamp?: number;
  driftSeconds?: number;
  isExpired?: boolean;
  diagnostics: string[];
}
