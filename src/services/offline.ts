import type { Incident, RoadZone } from "../types";

export type CacheKind = "reports" | "zones";
export interface SyncMetadata {
  syncedAt: string | null;
  source: "live" | "cache";
  cacheAvailable: boolean;
}
export interface CachedSnapshot<T> {
  version: 1;
  syncedAt: string;
  items: T[];
}
const PREFIX = "safeyatri.offline.v1.";
const MAX_CACHE_CHARS = 1900000;
const MAX_REPORTS = 100;
const MAX_PHOTOS = 12;
const MAX_ZONES = 300;
const isDate = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
const isPoint = (value: Record<string, unknown>) =>
  typeof value.lat === "number" && Number.isFinite(value.lat) && Math.abs(value.lat) <= 90 &&
  typeof value.lng === "number" && Number.isFinite(value.lng) && Math.abs(value.lng) <= 180;
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function validReport(value: unknown): value is Incident {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && typeof value.corridor === "string" &&
    typeof value.title === "string" && typeof value.location === "string" &&
    typeof value.description === "string" && typeof value.reporter === "string" &&
    ["red", "orange", "yellow", "green", "white"].includes(String(value.status)) &&
    ["pending", "verified", "rejected", "clarification"].includes(String(value.review)) &&
    ["Blocked road", "Landslide", "Road damage", "Heavy rain", "Flooding", "Fallen tree", "Other"].includes(String(value.type)) &&
    isDate(value.observedAt) && isPoint(value) && Array.isArray(value.decisionHistory) &&
    value.decisionHistory.every((entry) => isRecord(entry) && typeof entry.action === "string" && typeof entry.by === "string" && isDate(entry.at)) &&
    (value.photo === undefined || (typeof value.photo === "string" && value.photo.startsWith("data:image/jpeg;base64,") && value.photo.length <= 140000));
}
function validZone(value: unknown): value is RoadZone {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && typeof value.name === "string" &&
    typeof value.note === "string" && typeof value.active === "boolean" &&
    typeof value.isDemo === "boolean" && typeof value.updatedBy === "string" &&
    typeof value.updatedAt === "string" && (value.updatedAt === "" || isDate(value.updatedAt)) &&
    isDate(value.expiresAt) && isPoint(value) &&
    typeof value.radiusMeters === "number" && Number.isFinite(value.radiusMeters) &&
    value.radiusMeters >= 500 && value.radiusMeters <= 20000 &&
    ["closed", "caution", "clear", "unknown"].includes(String(value.status));
}
function key(uid: string, kind: CacheKind) {
  return `${PREFIX}${encodeURIComponent(uid)}.${kind}`;
}
export function readSnapshot<T>(uid: string, kind: CacheKind): CachedSnapshot<T> | null {
  if (!uid) return null;
  try {
    const raw = localStorage.getItem(key(uid, kind));
    if (!raw || raw.length > MAX_CACHE_CHARS) return null;
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data) || data.version !== 1 || !isDate(data.syncedAt) || !Array.isArray(data.items)) return null;
    const validate = kind === "reports" ? validReport : validZone;
    const limit = kind === "reports" ? MAX_REPORTS : MAX_ZONES;
    if (data.items.length > limit || !data.items.every(validate)) return null;
    return data as unknown as CachedSnapshot<T>;
  } catch {
    return null;
  }
}
export function writeSnapshot<T>(
  uid: string,
  kind: CacheKind,
  items: T[],
  syncedAt = new Date().toISOString(),
): CachedSnapshot<T> | null {
  if (!uid || !isDate(syncedAt)) return null;
  const validate = kind === "reports" ? validReport : validZone;
  // A malformed snapshot must never erase the last known valid information.
  if (!items.every(validate)) return null;
  let photoCount = 0;
  const bounded = items.slice(0, kind === "reports" ? MAX_REPORTS : MAX_ZONES).map((item) => {
    if (kind !== "reports") return item;
    const report = item as unknown as Incident;
    const keepPhoto = Boolean(report.photo) && photoCount++ < MAX_PHOTOS;
    return { ...report, photo: keepPhoto ? report.photo : undefined } as unknown as T;
  });
  let snapshot: CachedSnapshot<T> = { version: 1, syncedAt, items: bounded };
  try {
    let raw = JSON.stringify(snapshot);
    // Keep text observations even when a device cannot store photos.
    if (raw.length > MAX_CACHE_CHARS) {
      snapshot = { ...snapshot, items: bounded.map((item) => kind === "reports" ? { ...item, photo: undefined } : item) };
      raw = JSON.stringify(snapshot);
    }
    if (raw.length > MAX_CACHE_CHARS) return null;
    try {
      localStorage.setItem(key(uid, kind), raw);
    } catch {
      if (kind !== "reports" || !snapshot.items.some((item) => (item as Incident).photo)) return null;
      snapshot = { ...snapshot, items: bounded.map((item) => ({ ...item, photo: undefined })) };
      localStorage.setItem(key(uid, kind), JSON.stringify(snapshot));
    }
    return snapshot;
  } catch {
    // Private browsing or full storage must not break live observations.
    return null;
  }
}
export function clearOfflineData(uid: string) {
  for (const kind of ["reports", "zones"] as const) {
    try { localStorage.removeItem(key(uid, kind)); } catch { /* Storage can be unavailable. */ }
  }
}

/** Hydrate last confirmed data, then accept only server-backed replacements. */
export function createSnapshotReceiver<T>(
  uid: string,
  kind: CacheKind,
  next: (items: T[]) => void,
  onSync?: (metadata: SyncMetadata) => void,
) {
  const cached = readSnapshot<T>(uid, kind);
  let persisted = Boolean(cached);
  let lastSyncedAt = cached?.syncedAt || null;
  let currentItems = cached?.items;
  if (cached) next(cached.items);
  onSync?.({ syncedAt: lastSyncedAt, source: "cache", cacheAvailable: persisted });
  return (items: T[], metadata: { fromCache: boolean; hasPendingWrites: boolean }) => {
    if (metadata.fromCache || metadata.hasPendingWrites) {
      // Firestore's empty initial in-memory cache is not evidence of deletions.
      if (!currentItems && items.length && !metadata.hasPendingWrites) {
        currentItems = items;
        next(items);
      }
      onSync?.({ syncedAt: lastSyncedAt, source: "cache", cacheAvailable: persisted });
      return;
    }
    lastSyncedAt = new Date().toISOString();
    currentItems = items;
    persisted = Boolean(writeSnapshot(uid, kind, items, lastSyncedAt)) || persisted;
    next(items);
    onSync?.({ syncedAt: lastSyncedAt, source: "live", cacheAvailable: persisted });
  };
}
