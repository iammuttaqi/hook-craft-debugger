<script setup lang="ts">
import { computed } from 'vue';
import { Radio, Copy, Check, Trash2, ArrowUpRight } from 'lucide-vue-next';
import type { Inbox } from '~/types/database';
import { useClipboard } from '~/composables/useClipboard';

const props = defineProps<{
  inbox: Inbox;
  isActive: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', slug: string): void;
  (e: 'delete', slug: string): void;
}>();

const { copy, isCopied } = useClipboard();

const ingressUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/inbox/${props.inbox.slug}`;
  }
  return `/api/inbox/${props.inbox.slug}`;
});

function handleCopy(e: MouseEvent) {
  e.stopPropagation();
  copy(ingressUrl.value);
}

function handleDelete(e: MouseEvent) {
  e.stopPropagation();
  if (confirm(`Delete inbox "${props.inbox.name}" and all captured events?`)) {
    emit('delete', props.inbox.slug);
  }
}
</script>

<template>
  <div
    :class="[
      'group relative p-3 rounded border transition-all cursor-pointer select-none',
      isActive
        ? 'bg-zinc-900 border-zinc-700 ring-1 ring-emerald-500/30'
        : 'bg-zinc-950/60 border-zinc-800/80 hover:bg-zinc-900/60 hover:border-zinc-700/60'
    ]"
    @click="emit('select', inbox.slug)"
  >
    <!-- Top Row: Name + Event count -->
    <div class="flex items-start justify-between gap-2 mb-1.5">
      <div class="flex items-center gap-2 min-w-0">
        <span
          :class="[
            'w-2 h-2 rounded-full shrink-0 transition-colors',
            isActive ? 'bg-emerald-400 ring-4 ring-emerald-500/20' : 'bg-zinc-600 group-hover:bg-zinc-500'
          ]"
        />
        <h4 class="text-xs font-semibold text-zinc-200 truncate tracking-tight">
          {{ inbox.name }}
        </h4>
      </div>

      <span
        :class="[
          'px-1.5 py-0.5 text-[10px] font-mono rounded font-medium shrink-0',
          isActive
            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
            : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
        ]"
      >
        {{ inbox.eventCount || 0 }}
      </span>
    </div>

    <!-- Slug & Ingress preview -->
    <div class="flex items-center justify-between text-[11px] font-mono text-zinc-500 pl-4">
      <span class="truncate max-w-[160px] text-zinc-400">
        {{ inbox.slug }}
      </span>

      <!-- Action buttons -->
      <div class="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          title="Copy Ingress URL"
          class="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          @click="handleCopy"
        >
          <Check v-if="isCopied" class="w-3.5 h-3.5 text-emerald-400" />
          <Copy v-else class="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          title="Delete Inbox"
          class="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
          @click="handleDelete"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Active rules indicator if not default -->
    <div
      v-if="inbox.mockStatusCode !== 200 || inbox.mockDelayMs > 0"
      class="mt-2 pt-2 border-t border-zinc-800/60 flex items-center gap-2 text-[10px] text-amber-400/90 font-mono"
    >
      <span v-if="inbox.mockStatusCode !== 200">HTTP {{ inbox.mockStatusCode }}</span>
      <span v-if="inbox.mockStatusCode !== 200 && inbox.mockDelayMs > 0">•</span>
      <span v-if="inbox.mockDelayMs > 0">+{{ inbox.mockDelayMs }}ms delay</span>
    </div>
  </div>
</template>
