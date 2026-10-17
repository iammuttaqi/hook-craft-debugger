import { ref } from 'vue';

export function useClipboard() {
  const isCopied = ref(false);
  const copiedKey = ref<string | null>(null);
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  async function copy(text: string, key?: string): Promise<boolean> {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      isCopied.value = true;
      copiedKey.value = key || null;

      timeoutId = setTimeout(() => {
        isCopied.value = false;
        copiedKey.value = null;
      }, 2000);

      return true;
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      return false;
    }
  }

  return {
    isCopied,
    copiedKey,
    copy
  };
}
