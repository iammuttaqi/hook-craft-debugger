<script setup lang="ts">
import { computed } from 'vue';
import { Radio, Terminal, Copy, Check } from 'lucide-vue-next';
import { useHookCraft } from '~/composables/useHookCraft';
import { useClipboard } from '~/composables/useClipboard';
import EventSearchBar from './EventSearchBar.vue';
import EventItem from './EventItem.vue';
import ShimmerSkeleton from '~/components/common/ShimmerSkeleton.vue';
import EmptyState from '~/components/common/EmptyState.vue';

const {
  activeInbox,
  filteredEvents,
  activeEventId,
  isLoadingEvents,
  selectEvent
} = useHookCraft();

const { copy, isCopied } = useClipboard();

const sampleCurl = computed(() => {
  if (!activeInbox.value) return '';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  return `curl -X POST "${origin}/api/inbox/${activeInbox.value.slug}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"event":"ping.test","timestamp":${Date.now()}}'`;
});

function copySampleCurl() {
  if (sampleCurl.value) {
    copy(sampleCurl.value);
  }
}
</script>

<template>
  <div class="h-full flex flex-col bg-zinc-950 border-r border-zinc-800 overflow-hidden">
    <!-- Search and Filter Bar -->
    <EventSearchBar />

    <!-- Stream body -->
    <div class="flex-1 overflow-y-auto p-3 space-y-2">
      <!-- Loading Skeletons -->
      <div v-if="isLoadingEvents && filteredEvents.length === 0" class="p-1">
        <ShimmerSkeleton :count="5" height="h-16" />
      </div>

      <!-- Events List -->
      <template v-else-if="filteredEvents.length > 0">
        <EventItem
          v-for="evt in filteredEvents"
          :key="evt.id"
          :event="evt"
          :is-selected="evt.id === activeEventId"
          @select="selectEvent"
        />
      </template>

      <!-- Empty State -->
      <EmptyState
        v-else-if="activeInbox"
        :icon="Radio"
        title="Listening for inbound webhooks"
        description="Send a test webhook to this inbox URL to view it live in the stream."
      >
        <div class="mt-2 text-left bg-zinc-900 border border-zinc-800 rounded p-2.5 font-mono text-[11px] text-zinc-300 relative group">
          <div class="flex items-center justify-between pb-1 text-[10px] text-zinc-500 uppercase tracking-wider font-sans border-b border-zinc-800/80 mb-2">
            <span>Quick Test Snippet</span>
            <button
              type="button"
              class="inline-flex items-center gap-1 text-zinc-400 hover:text-emerald-400 transition-colors"
              @click="copySampleCurl"
            >
              <Check v-if="isCopied" class="w-3 h-3 text-emerald-400" />
              <Copy v-else class="w-3 h-3" />
              <span>{{ isCopied ? 'Copied' : 'Copy' }}</span>
            </button>
          </div>
          <pre class="overflow-x-auto whitespace-pre leading-relaxed text-zinc-300"><code>{{ sampleCurl }}</code></pre>
        </div>
      </EmptyState>

      <!-- No Inbox Selected -->
      <EmptyState
        v-else
        :icon="Radio"
        title="No inbox selected"
        description="Select or create an inbox from the left sidebar to view its stream."
      />
    </div>
  </div>
</template>
