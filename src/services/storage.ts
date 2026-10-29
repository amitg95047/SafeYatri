import type { Incident } from '../types';
const KEY = 'safeyatra.demo.incidents.v1';
export function loadIncidents(seed: Incident[]): Incident[] {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw) as Incident[]; } catch { /* recover using seed only for local demo storage corruption */ }
  localStorage.setItem(KEY, JSON.stringify(seed)); return seed;
}
export function saveIncidents(items: Incident[]) { localStorage.setItem(KEY, JSON.stringify(items)); localStorage.setItem('safeyatra.demo.lastSync', new Date().toISOString()); }
export function getLastSync() { return localStorage.getItem('safeyatra.demo.lastSync'); }
export function saveDraft(draft: unknown) { localStorage.setItem('safeyatra.report.draft', JSON.stringify(draft)); }
export function loadDraft<T>() : T | null { try { const raw = localStorage.getItem('safeyatra.report.draft'); return raw ? JSON.parse(raw) as T : null; } catch { return null; } }
export function clearDraft() { localStorage.removeItem('safeyatra.report.draft'); }
