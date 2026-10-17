<script setup lang="ts">
import { computed } from 'vue';
import Badge from '~/components/common/Badge.vue';
import { Clock } from 'lucide-vue-next';

const props = defineProps<{
  status: number;
  latencyMs: number;
}>();

const variant = computed(() => {
  if (props.status >= 200 && props.status < 300) return 'emerald';
  if (props.status >= 400 && props.status < 500) return 'amber';
  if (props.status >= 500 || props.status === 0) return 'rose';
  return 'default';
});

const label = computed(() => {
  if (props.status === 0) return '0 Network Fail';
  return `${props.status}`;
});
</script>

<template>
  <div class="inline-flex items-center gap-1.5 font-mono text-xs">
    <Badge :variant="variant" size="sm">
      {{ label }}
    </Badge>
    <span class="inline-flex items-center gap-0.5 text-[11px] text-zinc-400">
      <Clock class="w-3 h-3 text-zinc-500" />
      {{ latencyMs }}ms
    </span>
  </div>
</template>
