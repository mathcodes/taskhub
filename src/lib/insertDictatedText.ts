/**
 * Insert speech-to-text into the focused field so React controlled inputs update.
 * Returns false if the active element cannot accept text.
 */
export function insertDictatedTextIntoFocusedField(text: string): boolean {
  if (typeof document === "undefined") return false;
  const raw = document.activeElement;
  if (!raw) return false;

  const el =
    raw instanceof HTMLInputElement || raw instanceof HTMLTextAreaElement
      ? raw
      : raw instanceof HTMLElement && raw.isContentEditable
        ? raw
        : null;
  if (!el) return false;

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    const next = before + text + after;
    const proto =
      el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    desc?.set?.call(el, next);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    const pos = start + text.length;
    requestAnimationFrame(() => {
      try {
        el.setSelectionRange(pos, pos);
      } catch {
        /* readonly inputs */
      }
    });
    el.focus();
    return true;
  }

  if (el.isContentEditable) {
    el.focus();
    try {
      document.execCommand("insertText", false, text);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}
