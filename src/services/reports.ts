import type { Incident, ReviewStatus, RoadStatus } from '../types';
import { saveIncidents } from './storage';
export function createReport(items: Incident[], report: Incident): Incident[] { const next = [report, ...items]; saveIncidents(next); return next; }
export function reviewReport(items: Incident[], id: string, action: ReviewStatus, by: string, note = ''): Incident[] {
  const next = items.map(item => item.id !== id ? item : { ...item, review: action, status: action === 'verified' ? item.status : action === 'rejected' ? 'white' as RoadStatus : 'orange' as RoadStatus, decisionHistory: [{ action, by, at: new Date().toISOString(), note }, ...item.decisionHistory] });
  saveIncidents(next); return next;
}
