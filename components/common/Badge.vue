<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    variant?: 'default' | 'emerald' | 'rose' | 'amber' | 'blue' | 'purple' | 'zinc' | 'outline';
    size?: 'sm' | 'md';
  }>(),
  {
    variant: 'default',
    size: 'sm'
  }
);

const badgeClass = computed(() => {
  const base = 'inline-flex items-center font-mono font-medium tracking-tight rounded border transition-colors select-none';
  const sizeClasses = {
    sm: 'text-[11px] px-1.5 py-0.5 leading-none',
    md: 'text-xs px-2 py-0.75 leading-tight'
  }[props.size];

  const variantClasses = {
    default: 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    blue: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    purple: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    zinc: 'bg-zinc-900 text-zinc-400 border-zinc-800',
    outline: 'bg-transparent text-zinc-400 border-zinc-800'
  }[props.variant];

  return `${base} ${sizeClasses} ${variantClasses}`;
});
</script>

<template>
  <span :class="badgeClass">
    <slot />
  </span>
</template>
