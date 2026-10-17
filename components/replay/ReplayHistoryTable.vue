<script setup lang="ts">
import { ref } from 'vue';
import type { ReplayLog } from '~/types/database';
import ReplayStatusBadge from './ReplayStatusBadge.vue';
import { ChevronDown, ChevronRight, History } from 'lucide-vue-next';

defineProps<{
  replays: ReplayLog[];
}>();

const expandedId = ref<string | null>(null);

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id;
}

function formatDate(dateStr: string | Date) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
      <History class="w-3.5 h-3.5 text-zinc-400" />
      <span>Replay Execution History</span>
      <span class="text-zinc-500 font-mono text-[11px]">({{ replays.length }})</span>
    </div>

    <div
      v-if="replays.length > 0"
      class="rounded border border-zinc-800 bg-zinc-950 overflow-hidden text-xs font-mono"
    >
      <div class="divide-y divide-zinc-850">
        <div
          v-for="log in replays"
          :key="log.id"
          class="p-2.5 hover:bg-zinc-900/40 transition-colors"
        >
          <div
            class="flex items-center justify-between cursor-pointer select-none"
            @click="toggleExpand(log.id)"
          >
            <div class="flex items-center gap-2 min-w-0">
              <component
                :is="expandedId === log.id ? ChevronDown : ChevronRight"
                class="w-3.5 h-3.5 text-zinc-500 shrink-0"
              />
              <ReplayStatusBadge
                :status="log.responseStatus"
                :latency-ms="log.latencyMs"
              />
              <span class="text-zinc-300 truncate max-w-xs text-[11px]">
                {{ log.targetUrl }}
              </span>
            </div>

            <span class="text-[10px] text-zinc-500 shrink-0 pl-2">
              {{ formatDate(log.createdAt) }}
            </span>
          </div>

          <!-- Expanded details: response body preview and sent payload -->
          <div
            v-if="expandedId === log.id"
            class="mt-2.5 pt-2.5 border-t border-zinc-850 space-y-2 pl-5 text-[11px]"
          >
            <div>
              <span class="text-[10px] text-zinc-500 uppercase tracking-wider font-sans block mb-1">
                Target Response Body Preview
              </span>
              <pre
                class="p-2 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 whitespace-pre-wrap break-all overflow-x-auto max-h-40"
              ><code>{{ log.responseBody || '(empty body response)' }}</code></pre>
            </div>

            <div v-if="log.requestHeadersJson">
              <span class="text-[10px] text-zinc-500 uppercase tracking-wider font-sans block mb-1">
                Headers Dispatched
              </span>
              <pre
                class="p-2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 whitespace-pre-wrap break-all overflow-x-auto max-h-32 text-[10px]"
              ><code>{{ log.requestHeadersJson }}</code></pre>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else
      class="p-4 text-center text-xs text-zinc-500 rounded border border-dashed border-zinc-800 bg-zinc-950/40"
    >
      No replays dispatched for this event yet.
    </div>
  </div>
</template>
