import { auth } from "./firebase";
function key() {
  return `safeyatra.draft.${auth?.currentUser?.uid || "guest"}`;
}
export function saveDraft(draft: unknown) {
  try {
    localStorage.setItem(key(), JSON.stringify(draft));
  } catch {
    /* Reporting remains available when device storage is full. */
  }
}
export function loadDraft<T>(): T | null {
  try {
    const raw = localStorage.getItem(key());
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
export function clearDraft() {
  try {
    localStorage.removeItem(key());
  } catch {
    /* No persisted draft to remove. */
  }
}
