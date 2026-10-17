<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
import { X } from 'lucide-vue-next';

const props = defineProps<{
  modelValue: boolean;
  title: string;
  description?: string;
  maxWidth?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'close'): void;
}>();

function close() {
  emit('update:modelValue', false);
  emit('close');
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.modelValue) {
    close();
  }
}

watch(
  () => props.modelValue,
  (val) => {
    if (typeof document !== 'undefined') {
      if (val) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  }
);

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeydown);
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown);
    document.body.style.overflow = '';
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        @click.self="close"
      >
        <div
          class="relative w-full rounded border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden flex flex-col"
          :style="{ maxWidth: maxWidth || '480px' }"
          @click.stop
        >
          <!-- Modal Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/90">
            <div>
              <h3 class="text-sm font-semibold text-zinc-100 tracking-tight">
                {{ title }}
              </h3>
              <p v-if="description" class="text-xs text-zinc-400 mt-0.5">
                {{ description }}
              </p>
            </div>

            <button
              type="button"
              class="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              @click="close"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Modal Body -->
          <div class="p-5 overflow-y-auto max-h-[80vh]">
            <slot />
          </div>

          <!-- Modal Footer if slotted -->
          <div
            v-if="$slots.footer"
            class="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-zinc-800 bg-zinc-950/50"
          >
            <slot name="footer" :close="close" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
