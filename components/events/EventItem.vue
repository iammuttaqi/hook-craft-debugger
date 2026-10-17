<script setup lang="ts">
import { computed } from 'vue';
import type { CapturedEvent } from '~/types/database';
import Badge from '~/components/common/Badge.vue';
import { RefreshCw } from 'lucide-vue-next';

const props = defineProps<{
  event: CapturedEvent;
  isSelected: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', id: string): void;
}>();

const methodVariant = computed(() => {
  switch (props.event.method.toUpperCase()) {
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
  const code = props.event.responseStatus;
  if (code >= 200 && code < 300) return 'emerald';
  if (code >= 400 && code < 500) return 'amber';
  if (code >= 500) return 'rose';
  return 'default';
});

const sizeLabel = computed(() => {
  const bytes = props.event.rawBody ? new TextEncoder().encode(props.event.rawBody).length : 0;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
});

const relativeTime = computed(() => {
  const date = new Date(props.event.createdAt);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
});
</script>

<template>
  <div
    :class="[
      'p-3 rounded border transition-all cursor-pointer select-none space-y-1.5',
      isSelected
        ? 'bg-zinc-900 border-zinc-700 ring-1 ring-emerald-500/40 shadow-sm'
        : 'bg-zinc-950/40 border-zinc-850 hover:bg-zinc-900/40 hover:border-zinc-800'
    ]"
    @click="emit('select', event.id)"
  >
    <!-- Row 1: Badges + Timestamp -->
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-1.5">
        <Badge :variant="methodVariant" size="sm">
          {{ event.method }}
        </Badge>
        <Badge :variant="statusVariant" size="sm">
          {{ event.responseStatus }}
        </Badge>
        <span
          v-if="event._count?.replays || (event.replays && event.replays.length > 0)"
          class="inline-flex items-center gap-1 text-[10px] text-zinc-400 font-mono"
        >
          <RefreshCw class="w-2.5 h-2.5 text-zinc-500" />
          {{ event._count?.replays || event.replays?.length }}
        </span>
      </div>

      <span class="text-[11px] font-mono text-zinc-500 whitespace-nowrap">
        {{ relativeTime }}
      </span>
    </div>

    <!-- Row 2: Path & Size -->
    <div class="flex items-center justify-between text-xs text-zinc-400 font-mono">
      <span class="truncate text-zinc-300 font-normal">
        {{ event.path }}
      </span>
      <span class="text-[11px] text-zinc-500 shrink-0 pl-2">
        {{ sizeLabel }}
      </span>
    </div>
  </div>
</template>
