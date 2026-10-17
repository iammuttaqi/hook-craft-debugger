<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Eye,
  EyeOff,
  Clock,
  ArrowRight,
  Info
} from 'lucide-vue-next';
import type { CapturedEvent } from '~/types/database';
import type { SignatureProvider, VerificationResult } from '~/types/signatures';
import Button from '~/components/common/Button.vue';
import Badge from '~/components/common/Badge.vue';

const props = defineProps<{
  event: CapturedEvent;
}>();

const selectedProvider = ref<SignatureProvider>('stripe');
const secret = ref('');
const isSecretRevealed = ref(false);
const toleranceSeconds = ref(300);
const algorithm = ref<'sha256' | 'sha1' | 'sha512'>('sha256');
const signatureHeaderInput = ref('');

const isVerifying = ref(false);
const verificationResult = ref<VerificationResult | null>(null);

// Parse headers once
const parsedHeaders = computed<Record<string, string>>(() => {
  if (!props.event.headersJson) return {};
  try {
    const raw = JSON.parse(props.event.headersJson);
    const normalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      normalized[k.toLowerCase()] = String(v);
    }
    return normalized;
  } catch {
    return {};
  }
});

// Auto-detect provider and extract signature header
function autoDetectProvider() {
  const h = parsedHeaders.value;
  if (h['stripe-signature']) {
    selectedProvider.value = 'stripe';
    signatureHeaderInput.value = h['stripe-signature'];
    if (secret.value === '' && props.event.path.includes('stripe')) {
      secret.value = 'whsec_test_stripe_secret_123';
    }
  } else if (h['x-hub-signature-256'] || h['x-hub-signature']) {
    selectedProvider.value = 'github';
    signatureHeaderInput.value = h['x-hub-signature-256'] || h['x-hub-signature'];
    if (secret.value === '' && props.event.path.includes('github')) {
      secret.value = 'gh_secret_test_456';
    }
  } else if (h['svix-signature']) {
    selectedProvider.value = 'svix';
    signatureHeaderInput.value = h['svix-signature'];
    if (secret.value === '' && props.event.path.includes('svix')) {
      secret.value = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw';
    }
  } else if (h['x-shopify-hmac-sha256']) {
    selectedProvider.value = 'shopify';
    signatureHeaderInput.value = h['x-shopify-hmac-sha256'];
  } else {
    selectedProvider.value = 'generic';
    signatureHeaderInput.value = '';
  }
}

watch(
  () => props.event.id,
  () => {
    verificationResult.value = null;
    autoDetectProvider();
  },
  { immediate: true }
);

watch(selectedProvider, (newProvider) => {
  verificationResult.value = null;
  const h = parsedHeaders.value;
  if (newProvider === 'stripe') {
    signatureHeaderInput.value = h['stripe-signature'] || '';
  } else if (newProvider === 'github') {
    signatureHeaderInput.value = h['x-hub-signature-256'] || h['x-hub-signature'] || '';
  } else if (newProvider === 'svix') {
    signatureHeaderInput.value = h['svix-signature'] || '';
  } else if (newProvider === 'shopify') {
    signatureHeaderInput.value = h['x-shopify-hmac-sha256'] || '';
  }
});

async function runVerification() {
  isVerifying.value = true;
  try {
    const res = await $fetch<VerificationResult>('/api/verify-signature', {
      method: 'POST',
      body: {
        provider: selectedProvider.value,
        rawBody: props.event.rawBody || '',
        secret: secret.value,
        signatureHeader: signatureHeaderInput.value,
        headers: parsedHeaders.value,
        algorithm: algorithm.value,
        toleranceSeconds: Number(toleranceSeconds.value) || 300
      }
    });
    verificationResult.value = res;
  } catch (err: any) {
    verificationResult.value = {
      isValid: false,
      provider: selectedProvider.value,
      algorithm: algorithm.value,
      expectedHash: signatureHeaderInput.value,
      calculatedHash: '',
      diagnostics: [err.data?.message || err.message || 'Signature verification failed']
    };
  } finally {
    isVerifying.value = false;
  }
}

const providerPresets = [
  { id: 'stripe', label: 'Stripe', header: 'Stripe-Signature' },
  { id: 'github', label: 'GitHub', header: 'X-Hub-Signature-256' },
  { id: 'svix', label: 'Svix / Standard', header: 'svix-signature' },
  { id: 'shopify', label: 'Shopify', header: 'X-Shopify-Hmac-Sha256' },
  { id: 'generic', label: 'Generic HMAC', header: 'Custom' }
];

const payloadByteLength = computed(() => {
  return props.event.rawBody ? new TextEncoder().encode(props.event.rawBody).length : 0;
});
</script>

<template>
  <div class="space-y-4">
    <!-- Configuration Form Card -->
    <div class="rounded border border-zinc-800 bg-zinc-950 p-4 space-y-4">
      <div class="flex items-center justify-between pb-2 border-b border-zinc-850">
        <div class="flex items-center gap-2">
          <KeyRound class="w-4 h-4 text-emerald-400" />
          <h3 class="text-xs font-semibold text-zinc-200 tracking-tight">
            Cryptographic HMAC Signature Verification
          </h3>
        </div>

        <Badge variant="zinc" size="sm">
          Node.js node:crypto
        </Badge>
      </div>

      <!-- Provider Selector -->
      <div class="space-y-1.5">
        <label class="block text-xs font-medium text-zinc-400">
          Provider Preset
        </label>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          <button
            v-for="p in providerPresets"
            :key="p.id"
            type="button"
            :class="[
              'px-2.5 py-1.5 rounded text-xs font-medium border text-center transition-colors',
              selectedProvider === p.id
                ? 'bg-zinc-850 text-emerald-400 border-emerald-500/50 shadow-sm'
                : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:bg-zinc-850 hover:text-zinc-200'
            ]"
            @click="selectedProvider = p.id as SignatureProvider"
          >
            {{ p.label }}
          </button>
        </div>
      </div>

      <!-- Secret Input -->
      <div class="space-y-1.5">
        <div class="flex items-center justify-between">
          <label class="block text-xs font-medium text-zinc-400">
            Webhook Signing Secret
          </label>
          <span v-if="selectedProvider === 'stripe'" class="text-[10px] font-mono text-zinc-500">
            whsec_...
          </span>
          <span v-else-if="selectedProvider === 'svix'" class="text-[10px] font-mono text-zinc-500">
            whsec_... (base64)
          </span>
        </div>

        <div class="relative flex items-center">
          <input
            v-model="secret"
            :type="isSecretRevealed ? 'text' : 'password'"
            placeholder="Paste your webhook signing secret..."
            class="w-full bg-zinc-900 border border-zinc-800 rounded pl-3 pr-10 py-2 text-xs text-zinc-100 font-mono placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <button
            type="button"
            class="absolute right-2.5 text-zinc-500 hover:text-zinc-300 transition-colors"
            @click="isSecretRevealed = !isSecretRevealed"
          >
            <EyeOff v-if="isSecretRevealed" class="w-3.5 h-3.5" />
            <Eye v-else class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Signature Header Value -->
      <div class="space-y-1.5">
        <label class="block text-xs font-medium text-zinc-400">
          Signature Header Value
        </label>
        <input
          v-model="signatureHeaderInput"
          type="text"
          placeholder="Signature header extracted from request..."
          class="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      <!-- Algorithm and Tolerance (for Stripe / Svix / Generic) -->
      <div class="grid grid-cols-2 gap-3 pt-1">
        <div v-if="selectedProvider === 'generic'" class="space-y-1.5">
          <label class="block text-xs font-medium text-zinc-400">Hash Algorithm</label>
          <select
            v-model="algorithm"
            class="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
          >
            <option value="sha256">HMAC-SHA256</option>
            <option value="sha1">HMAC-SHA1</option>
            <option value="sha512">HMAC-SHA512</option>
          </select>
        </div>

        <div v-if="selectedProvider === 'stripe' || selectedProvider === 'svix'" class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label class="block text-xs font-medium text-zinc-400">Timestamp Tolerance</label>
            <span class="text-[10px] font-mono text-zinc-500">{{ toleranceSeconds }}s</span>
          </div>
          <input
            v-model.number="toleranceSeconds"
            type="number"
            min="10"
            max="3600"
            step="10"
            class="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <!-- Action Button -->
      <div class="pt-2 flex items-center justify-between">
        <div class="text-[11px] text-zinc-500">
          Payload size: {{ payloadByteLength }} bytes
        </div>

        <Button
          variant="primary"
          size="sm"
          :loading="isVerifying"
          :disabled="!secret.trim()"
          @click="runVerification"
        >
          <ShieldCheck class="w-3.5 h-3.5" />
          <span>Verify Signature</span>
        </Button>
      </div>
    </div>

    <!-- Verification Results View -->
    <div
      v-if="verificationResult"
      :class="[
        'rounded border p-4 space-y-3.5 transition-all',
        verificationResult.isValid
          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
          : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
      ]"
    >
      <!-- Status Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <ShieldCheck v-if="verificationResult.isValid" class="w-5 h-5 text-emerald-400" />
          <ShieldAlert v-else class="w-5 h-5 text-rose-400" />
          <div>
            <h4 class="text-xs font-bold tracking-tight text-zinc-100">
              {{ verificationResult.isValid ? 'Signature Verified (Authentic)' : 'Verification Failed (Mismatch)' }}
            </h4>
            <p class="text-[11px] text-zinc-400">
              Validated using timingSafeEqual constant-time equality
            </p>
          </div>
        </div>

        <Badge
          :variant="verificationResult.isValid ? 'emerald' : 'rose'"
          size="md"
        >
          {{ verificationResult.isValid ? 'PASS' : 'FAIL' }}
        </Badge>
      </div>

      <!-- Timestamp and Drift Metrics (Stripe & Svix) -->
      <div
        v-if="verificationResult.timestamp !== undefined"
        class="grid grid-cols-2 gap-2 p-2.5 rounded bg-zinc-950/60 border border-zinc-800 text-xs font-mono text-zinc-300"
      >
        <div>
          <span class="text-zinc-500 block text-[10px] uppercase">Webhook Timestamp</span>
          <span>{{ verificationResult.timestamp }}</span>
        </div>
        <div>
          <span class="text-zinc-500 block text-[10px] uppercase">Clock Skew / Drift</span>
          <span :class="verificationResult.isExpired ? 'text-rose-400 font-bold' : 'text-emerald-400'">
            {{ verificationResult.driftSeconds !== undefined && verificationResult.driftSeconds >= 0 ? '+' : '' }}{{ verificationResult.driftSeconds }}s
            <span v-if="verificationResult.isExpired" class="text-rose-400 font-sans text-[11px]">(Expired)</span>
          </span>
        </div>
      </div>

      <!-- Hash Comparison Diff -->
      <div class="space-y-2 text-xs font-mono">
        <div class="p-2.5 rounded bg-zinc-950/70 border border-zinc-800 space-y-1.5">
          <div class="text-[10px] text-zinc-500 uppercase tracking-wider font-sans">
            Expected Header Digest
          </div>
          <div class="text-zinc-300 break-all select-all font-mono text-[11px]">
            {{ verificationResult.expectedHash || '(none provided)' }}
          </div>
        </div>

        <div class="p-2.5 rounded bg-zinc-950/70 border border-zinc-800 space-y-1.5">
          <div class="text-[10px] text-zinc-500 uppercase tracking-wider font-sans">
            Calculated Local HMAC Digest
          </div>
          <div
            :class="[
              'break-all select-all font-mono text-[11px]',
              verificationResult.isValid ? 'text-emerald-400' : 'text-rose-400'
            ]"
          >
            {{ verificationResult.calculatedHash || '(computation failed)' }}
          </div>
        </div>
      </div>

      <!-- Step-by-Step Diagnostics -->
      <div class="space-y-1.5 pt-1">
        <div class="text-[11px] font-sans font-medium text-zinc-400">
          Engine Diagnostics:
        </div>
        <ul class="space-y-1 text-xs text-zinc-300 font-mono list-disc list-inside bg-zinc-950/50 p-2.5 rounded border border-zinc-800/80">
          <li v-for="(diag, idx) in verificationResult.diagnostics" :key="idx" class="leading-relaxed">
            {{ diag }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
