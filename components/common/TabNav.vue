<script setup lang="ts">
import type { Component } from 'vue';

export interface TabItem {
  id: string;
  label: string;
  icon?: Component;
  count?: number;
}

defineProps<{
  tabs: TabItem[];
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', id: string): void;
}>();
</script>

<template>
  <div class="flex items-center gap-1 border-b border-zinc-800 bg-zinc-950/40 px-3 overflow-x-auto no-scrollbar select-none">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      :class="[
        'flex items-center gap-2 py-2.5 px-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap',
        modelValue === tab.id
          ? 'border-emerald-500 text-zinc-100 bg-zinc-900/40'
          : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/20'
      ]"
      @click="emit('update:modelValue', tab.id)"
    >
      <component :is="tab.icon" v-if="tab.icon" class="w-3.5 h-3.5" />
      <span>{{ tab.label }}</span>
      <span
        v-if="tab.count !== undefined"
        :class="[
          'px-1.5 py-0.2 text-[10px] rounded-full font-mono',
          modelValue === tab.id ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-400'
        ]"
      >
        {{ tab.count }}
      </span>
    </button>
  </div>
</template>
