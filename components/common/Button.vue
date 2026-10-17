<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
    size?: 'xs' | 'sm' | 'md';
    disabled?: boolean;
    loading?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }>(),
  {
    variant: 'secondary',
    size: 'sm',
    disabled: false,
    loading: false,
    type: 'button'
  }
);

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

const buttonClass = computed(() => {
  const base =
    'relative inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 select-none disabled:opacity-50 disabled:cursor-not-allowed rounded';

  const sizeClasses = {
    xs: 'text-xs px-2 py-1 gap-1.5',
    sm: 'text-xs px-2.5 py-1.5 gap-2',
    md: 'text-sm px-3.5 py-2 gap-2'
  }[props.size];

  const variantClasses = {
    primary:
      'bg-emerald-500 text-zinc-950 font-semibold hover:bg-emerald-400 active:bg-emerald-600 shadow-sm border border-emerald-400/40',
    secondary:
      'bg-zinc-800 text-zinc-200 border border-zinc-700/80 hover:bg-zinc-700/80 hover:text-white active:bg-zinc-800 shadow-sm',
    ghost:
      'bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 active:bg-zinc-800/80 border border-transparent',
    danger:
      'bg-rose-950/40 text-rose-300 border border-rose-800/60 hover:bg-rose-900/50 hover:text-rose-200 active:bg-rose-950/70',
    outline:
      'bg-transparent text-zinc-300 border border-zinc-700 hover:bg-zinc-800/50 hover:border-zinc-600'
  }[props.variant];

  return `${base} ${sizeClasses} ${variantClasses}`;
});

function handleClick(e: MouseEvent) {
  if (!props.disabled && !props.loading) {
    emit('click', e);
  }
}
</script>

<template>
  <button :type="type" :class="buttonClass" :disabled="disabled || loading" @click="handleClick">
    <svg
      v-if="loading"
      class="animate-spin -ml-0.5 h-3.5 w-3.5 text-current shrink-0"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
    <slot />
  </button>
</template>
