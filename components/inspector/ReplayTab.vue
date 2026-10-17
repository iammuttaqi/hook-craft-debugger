<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Send, RefreshCw, Plus, Trash2, ArrowUpRight, Check, AlertCircle } from 'lucide-vue-next';
import type { CapturedEvent, ReplayLog } from '~/types/database';
import type { ReplayResponse } from '~/types/api';
import { useHookCraft } from '~/composables/useHookCraft';
import Button from '~/components/common/Button.vue';
import ReplayHistoryTable from '~/components/replay/ReplayHistoryTable.vue';
import ReplayStatusBadge from '~/components/replay/ReplayStatusBadge.vue';

const props = defineProps<{
  event: CapturedEvent;
}>();

const { appendReplayLog } = useHookCraft();

const targetUrl = ref('http://localhost:3000/api/webhooks');
const replayMethod = ref('POST');
const payloadText = ref('');
const isEditingPayload = ref(false);

interface CustomHeader {
  key: string;
  value: string;
}

const customHeaders = ref<CustomHeader[]>([
  { key: 'x-hookcraft-replay', value: 'true' }
]);

const isReplaying = ref(false);
const latestReplay = ref<ReplayLog | null>(null);
const errorMessage = ref('');

// Parse existing headers from event
const eventHeaders = computed<Record<string, string>>(() => {
  if (!props.event.headersJson) return {};
  try {
    return JSON.parse(props.event.headersJson);
  } catch {
    return {};
  }
});

watch(
  () => props.event.id,
  () => {
    replayMethod.value = props.event.method || 'POST';
    payloadText.value = props.event.rawBody || '';
    isEditingPayload.value = false;
    latestReplay.value = null;
    errorMessage.value = '';
  },
  { immediate: true }
);

function addCustomHeader() {
  customHeaders.value.push({ key: '', value: '' });
}

function removeCustomHeader(index: number) {
  customHeaders.value.splice(index, 1);
}

function setSuggestionUrl(url: string) {
  targetUrl.value = url;
}

async function handleDispatch() {
  if (!targetUrl.value.trim()) {
    errorMessage.value = 'Target URL is required.';
    return;
  }

  isReplaying.value = true;
  errorMessage.value = '';
  latestReplay.value = null;

  try {
    // Build headers
    const combinedHeaders: Record<string, string> = {
      ...eventHeaders.value
    };

    // Apply custom headers overrides
    for (const item of customHeaders.value) {
      if (item.key.trim()) {
        combinedHeaders[item.key.trim()] = item.value;
      }
    }

    const res = await $fetch<ReplayResponse>('/api/replay', {
      method: 'POST',
      body: {
        eventId: props.event.id,
        targetUrl: targetUrl.value.trim(),
        method: replayMethod.value,
        headers: combinedHeaders,
        body: payloadText.value
      }
    });

    latestReplay.value = res.replayLog;
    appendReplayLog(res.replayLog);
  } catch (err: any) {
    errorMessage.value = err.data?.message || err.message || 'Failed to dispatch replay.';
  } finally {
    isReplaying.value = false;
  }
}

const replaysList = computed(() => {
  return props.event.replays || [];
});

const payloadByteLength = computed(() => {
  return payloadText.value ? new TextEncoder().encode(payloadText.value).length : 0;
});
</script>

<template>
  <div class="space-y-4">
    <!-- Replay Form Card -->
    <div class="rounded border border-zinc-800 bg-zinc-950 p-4 space-y-4">
      <div class="flex items-center justify-between pb-2 border-b border-zinc-850">
        <div class="flex items-center gap-2">
          <Send class="w-4 h-4 text-emerald-400" />
          <h3 class="text-xs font-semibold text-zinc-200 tracking-tight">
            Local Forwarder & Replay Dispatcher
          </h3>
        </div>

        <span class="text-[11px] font-mono text-zinc-500">
          Timeout 15s
        </span>
      </div>

      <!-- Target URL & Method -->
      <div class="space-y-1.5">
        <label class="block text-xs font-medium text-zinc-400">
          Target Endpoint URL
        </label>
        <div class="flex items-center gap-2">
          <select
            v-model="replayMethod"
            class="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500 w-24 shrink-0"
          >
            <option value="POST">POST</option>
            <option value="GET">GET</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>

          <input
            v-model="targetUrl"
            type="text"
            placeholder="http://localhost:3000/api/webhooks"
            class="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100 font-mono placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <!-- Target Suggestions -->
        <div class="flex items-center gap-1.5 pt-1 text-[11px] text-zinc-500 font-mono overflow-x-auto">
          <span>Presets:</span>
          <button
            type="button"
            class="hover:text-emerald-400 transition-colors underline decoration-dotted"
            @click="setSuggestionUrl('http://localhost:3000/api/webhooks')"
          >
            localhost:3000/api/webhooks
          </button>
          <span>•</span>
          <button
            type="button"
            class="hover:text-emerald-400 transition-colors underline decoration-dotted"
            @click="setSuggestionUrl('http://127.0.0.1:8000/api/webhook')"
          >
            127.0.0.1:8000/api/webhook
          </button>
        </div>
      </div>

      <!-- Payload Tampering Section -->
      <div class="space-y-2 pt-1 border-t border-zinc-850">
        <div class="flex items-center justify-between">
          <label class="text-xs font-medium text-zinc-400">
            Payload Mutation & Tampering
          </label>
          <button
            type="button"
            class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
            @click="isEditingPayload = !isEditingPayload"
          >
            {{ isEditingPayload ? 'Lock Payload' : 'Edit Before Replay' }}
          </button>
        </div>

        <div v-if="isEditingPayload">
          <textarea
            v-model="payloadText"
            rows="6"
            class="w-full bg-zinc-900 border border-zinc-800 rounded p-2.5 text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-emerald-500 leading-relaxed"
          ></textarea>
        </div>
        <div v-else class="text-[11px] text-zinc-500 font-mono truncate">
          Forwarding original captured body ({{ payloadByteLength }} bytes)
        </div>
      </div>

      <!-- Custom Injected Headers -->
      <div class="space-y-2 pt-1 border-t border-zinc-850">
        <div class="flex items-center justify-between">
          <label class="text-xs font-medium text-zinc-400">
            Injected Replay Headers
          </label>
          <button
            type="button"
            class="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200"
            @click="addCustomHeader"
          >
            <Plus class="w-3 h-3 text-emerald-400" />
            <span>Add Header</span>
          </button>
        </div>

        <div v-for="(h, idx) in customHeaders" :key="idx" class="flex items-center gap-2">
          <input
            v-model="h.key"
            type="text"
            placeholder="Header-Key"
            class="w-1/3 bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
          />
          <input
            v-model="h.value"
            type="text"
            placeholder="Header-Value"
            class="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
          />
          <button
            type="button"
            class="p-1 text-zinc-500 hover:text-rose-400"
            @click="removeCustomHeader(idx)"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Error banner if any -->
      <div
        v-if="errorMessage"
        class="p-3 rounded bg-rose-950/30 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2"
      >
        <AlertCircle class="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Dispatch Action Button -->
      <div class="pt-2 flex justify-end">
        <Button
          variant="primary"
          size="sm"
          :loading="isReplaying"
          @click="handleDispatch"
        >
          <Send class="w-3.5 h-3.5" />
          <span>Dispatch Replay</span>
        </Button>
      </div>
    </div>

    <!-- Latest Replay Result Banner -->
    <div
      v-if="latestReplay"
      :class="[
        'rounded border p-4 space-y-2 transition-all',
        latestReplay.responseStatus >= 200 && latestReplay.responseStatus < 300
          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
          : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
      ]"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <ReplayStatusBadge
            :status="latestReplay.responseStatus"
            :latency-ms="latestReplay.latencyMs"
          />
          <span class="text-xs font-semibold text-zinc-100">
            {{ latestReplay.responseStatus >= 200 && latestReplay.responseStatus < 300 ? 'Target Acknowledged' : 'Dispatch Failed or Rejected' }}
          </span>
        </div>

        <span class="text-[11px] font-mono text-zinc-500">
          Roundtrip {{ latestReplay.latencyMs }}ms
        </span>
      </div>

      <div v-if="latestReplay.responseBody" class="pt-1">
        <span class="text-[10px] text-zinc-500 uppercase tracking-wider font-sans block mb-1">
          Target Response Preview
        </span>
        <pre
          class="p-2 rounded bg-zinc-950/80 border border-zinc-800 text-zinc-300 text-xs font-mono whitespace-pre-wrap break-all max-h-48 overflow-y-auto"
        ><code>{{ latestReplay.responseBody }}</code></pre>
      </div>
    </div>

    <!-- Replay Execution History Table -->
    <ReplayHistoryTable :replays="replaysList" />
  </div>
</template>
