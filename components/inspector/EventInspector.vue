<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  FileText,
  Code2,
  Terminal,
  ShieldCheck,
  Send,
  Copy,
  Check,
  Clock,
  Globe,
  Radio
} from 'lucide-vue-next';
import { useHookCraft } from '~/composables/useHookCraft';
import { useClipboard } from '~/composables/useClipboard';
import { useCurlGenerator } from '~/composables/useCurlGenerator';
import Badge from '~/components/common/Badge.vue';
import TabNav, { type TabItem } from '~/components/common/TabNav.vue';
import HeadersTab from './HeadersTab.vue';
import JsonPayloadTab from './JsonPayloadTab.vue';
import RawPayloadTab from './RawPayloadTab.vue';
import SignatureVerifierTab from './SignatureVerifierTab.vue';
import ReplayTab from './ReplayTab.vue';
import EmptyState from '~/components/common/EmptyState.vue';

const { activeEvent } = useHookCraft();
const { copy, isCopied } = useClipboard();
const { generateCurl } = useCurlGenerator();

const activeTab = ref('json');

const headerCount = computed(() => {
  if (!activeEvent.value || !activeEvent.value.headersJson) return 0;
  try {
    return Object.keys(JSON.parse(activeEvent.value.headersJson)).length;
  } catch {
    return 0;
  }
});

const replayCount = computed(() => {
  if (!activeEvent.value) return 0;
  return activeEvent.value._count?.replays || activeEvent.value.replays?.length || 0;
});

const inspectorTabs = computed<TabItem[]>(() => [
  { id: 'json', label: 'Formatted JSON', icon: Code2 },
  { id: 'raw', label: 'Raw Payload', icon: FileText },
  { id: 'headers', label: 'Headers', icon: Terminal, count: headerCount.value },
  { id: 'verifier', label: 'Signature Verifier', icon: ShieldCheck },
  { id: 'replay', label: 'Replay & Forward', icon: Send, count: replayCount.value }
]);

const fullUrl = computed(() => {
  if (!activeEvent.value) return '';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  return `${origin}${activeEvent.value.path}`;
});

const methodVariant = computed(() => {
  if (!activeEvent.value) return 'default';
  switch (activeEvent.value.method.toUpperCase()) {
    case 'POST':
      return 'emerald';
    case 'PUT':
    case 'PATCH':
      return 'blue';
    case 'DELETE':
      return 'rose';
    default:
      return 'zinc';
  }
});

const statusVariant = computed(() => {
  if (!activeEvent.value) return 'default';
  const code = activeEvent.value.responseStatus;
  if (code >= 200 && code < 300) return 'emerald';
  if (code >= 400 && code < 500) return 'amber';
  if (code >= 500) return 'rose';
  return 'default';
});

const formattedDate = computed(() => {
  if (!activeEvent.value) return '';
  const d = new Date(activeEvent.value.createdAt);
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
});

function copyCurl() {
  if (activeEvent.value) {
    const curlCommand = generateCurl(activeEvent.value);
    copy(curlCommand);
  }
}
</script>

<template>
  <div class="h-full flex flex-col bg-zinc-950 overflow-hidden">
    <!-- Active Event Inspector -->
    <template v-if="activeEvent">
      <!-- Header Bar with Metadata & cURL Export -->
      <div class="p-3.5 border-b border-zinc-800 bg-zinc-950/90 shrink-0 space-y-2">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2 min-w-0">
            <Badge :variant="methodVariant" size="md">
              {{ activeEvent.method }}
            </Badge>
            <Badge :variant="statusVariant" size="md">
              {{ activeEvent.responseStatus }}
            </Badge>
            <span class="font-mono text-xs text-zinc-200 truncate select-all">
              {{ fullUrl }}
            </span>
          </div>

          <!-- Actions: Copy as cURL -->
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border border-zinc-700 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 transition-colors select-none shrink-0"
            @click="copyCurl"
          >
            <Check v-if="isCopied" class="w-3.5 h-3.5 text-emerald-400" />
            <Terminal v-else class="w-3.5 h-3.5 text-zinc-400" />
            <span>{{ isCopied ? 'cURL Copied' : 'Copy cURL' }}</span>
          </button>
        </div>

        <!-- Meta Subtitle -->
        <div class="flex items-center gap-4 text-[11px] font-mono text-zinc-500">
          <span class="flex items-center gap-1">
            <Clock class="w-3 h-3 text-zinc-600" />
            {{ formattedDate }}
          </span>
          <span v-if="activeEvent.clientIp" class="flex items-center gap-1">
            <Globe class="w-3 h-3 text-zinc-600" />
            IP: {{ activeEvent.clientIp }}
          </span>
          <span>
            ID: {{ activeEvent.id }}
          </span>
        </div>
      </div>

      <!-- Tab Navigation -->
      <TabNav
        v-model="activeTab"
        :tabs="inspectorTabs"
      />

      <!-- Tab Content Area -->
      <div class="flex-1 overflow-y-auto p-4">
        <JsonPayloadTab
          v-if="activeTab === 'json'"
          :parsed-json="activeEvent.parsedJson"
          :raw-body="activeEvent.rawBody"
          @switch-tab="(tab) => activeTab = tab"
        />

        <RawPayloadTab
          v-else-if="activeTab === 'raw'"
          :raw-body="activeEvent.rawBody"
        />

        <HeadersTab
          v-else-if="activeTab === 'headers'"
          :headers-json="activeEvent.headersJson"
        />

        <SignatureVerifierTab
          v-else-if="activeTab === 'verifier'"
          :event="activeEvent"
        />

        <ReplayTab
          v-else-if="activeTab === 'replay'"
          :event="activeEvent"
        />
      </div>
    </template>

    <!-- Empty Inspector Placeholder -->
    <div v-else class="h-full flex items-center justify-center p-8">
      <EmptyState
        :icon="Radio"
        title="No webhook selected"
        description="Select an inbound webhook from the live stream to inspect headers, payload bytes, cryptographic signatures, or replay to localhost."
      />
    </div>
  </div>
</template>
