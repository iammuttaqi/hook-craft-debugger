<script setup lang="ts">
withDefaults(
  defineProps<{
    count?: number;
    height?: string;
  }>(),
  {
    count: 3,
    height: 'h-12'
  }
);
</script>

<template>
  <div class="space-y-2 w-full">
    <div
      v-for="i in count"
      :key="i"
      :class="['w-full rounded bg-zinc-900/80 border border-zinc-800/50 animate-pulse', height]"
    >
      <div class="h-full w-full flex items-center justify-between px-3">
        <div class="flex items-center gap-2 w-2/3">
          <div class="w-12 h-4 rounded bg-zinc-800"></div>
          <div class="w-1/2 h-3.5 rounded bg-zinc-800/70"></div>
        </div>
        <div class="w-12 h-3 rounded bg-zinc-800/50"></div>
      </div>
    </div>
  </div>
</template>
