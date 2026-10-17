<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{
  icon?: Component;
  title: string;
  description?: string;
}>();
</script>

<template>
  <div class="flex flex-col items-center justify-center text-center p-8 rounded border border-dashed border-zinc-800/80 bg-zinc-950/40">
    <div v-if="icon" class="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
      <component :is="icon" class="w-5 h-5 text-zinc-400" />
    </div>

    <h4 class="text-sm font-medium text-zinc-200 mb-1 tracking-tight">
      {{ title }}
    </h4>

    <p v-if="description" class="text-xs text-zinc-400 max-w-sm leading-relaxed mb-4">
      {{ description }}
    </p>

    <div v-if="$slots.default" class="mt-1 w-full max-w-md">
      <slot />
    </div>
  </div>
</template>
