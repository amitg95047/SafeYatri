import type { Incident, RoadZone } from "../types";

export type Point = [number, number];
export interface JourneyRoute {
  points: Point[];
  distance: number;
  duration: number;
}
export interface JourneyRoutes {
  routes: JourneyRoute[];
  syncedAt: string;
  source: "live" | "cache";
  warning?: string;
}
export interface BlockedSegment {
  points: Point[];
  zone: RoadZone;
}
export interface RouteOption extends JourneyRoute {
  id: string;
  label: string;
  zones: RoadZone[];
  blockedZones: RoadZone[];
  cautionZones: RoadZone[];
  blocked: boolean;
  recommended: boolean;
  blockedSegments: BlockedSegment[];
}

const CACHE_KEY = "safeyatri:road-routes:v2";
const MAX_CACHED_ROUTES = 8;
const MAX_POINTS = 40000;
type CacheEntry = { key: string; routes: JourneyRoute[]; syncedAt: string };
const routeCache = new Map<string, CacheEntry>();
const keyFor = (start: Point, end: Point) => `${start.join(",")}:${end.join(",")}`;
const validPoint = (point: unknown): point is Point =>
  Array.isArray(point) && point.length === 2 &&
  Number.isFinite(point[0]) && Number.isFinite(point[1]) &&
  Math.abs(point[0]) <= 90 && Math.abs(point[1]) <= 180;
function validRoute(value: unknown): value is JourneyRoute {
  if (!value || typeof value !== "object") return false;
  const route = value as JourneyRoute;
  return Number.isFinite(route.distance) && route.distance > 0 &&
    route.distance < 30000000 && Number.isFinite(route.duration) &&
    route.duration > 0 && route.duration < 10000000 &&
    Array.isArray(route.points) && route.points.length >= 2 &&
    route.points.length <= MAX_POINTS && route.points.every(validPoint);
}
function validEntry(value: unknown): value is CacheEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as CacheEntry;
  const at = Date.parse(entry.syncedAt);
  return typeof entry.key === "string" && entry.key.length < 160 &&
    Number.isFinite(at) && at <= Date.now() + 60000 &&
    Array.isArray(entry.routes) && entry.routes.length >= 1 &&
    entry.routes.length <= 3 && entry.routes.every(validRoute);
}
function storedRoutes(): CacheEntry[] {
  try {
    const raw = globalThis.localStorage?.getItem(CACHE_KEY);
    if (!raw || raw.length > 6000000) return [];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value)
      ? value.slice(0, MAX_CACHED_ROUTES).filter(validEntry)
      : [];
  } catch {
    return [];
  }
}
export function readCachedJourney(start: Point, end: Point): JourneyRoutes | null {
  const key = keyFor(start, end);
  const entry = routeCache.get(key) ?? storedRoutes().find((item) => item.key === key);
  if (!entry || !validEntry(entry)) return null;
  return { routes: entry.routes, syncedAt: entry.syncedAt, source: "cache" };
}
function cacheRoutes(start: Point, end: Point, routes: JourneyRoute[], syncedAt: string) {
  const entry = { key: keyFor(start, end), routes, syncedAt };
  routeCache.delete(entry.key);
  routeCache.set(entry.key, entry);
  while (routeCache.size > MAX_CACHED_ROUTES)
    routeCache.delete(routeCache.keys().next().value!);
  try {
    const existing = storedRoutes().filter((item) => item.key !== entry.key);
    const entries = [entry, ...existing].slice(0, MAX_CACHED_ROUTES);
    // Large journeys can exceed a browser's quota. Keep the newest route first.
    while (entries.length) {
      try {
        globalThis.localStorage?.setItem(CACHE_KEY, JSON.stringify(entries));
        break;
      } catch {
        entries.pop();
      }
    }
  } catch { /* Routing stays usable when storage is unavailable. */ }
}

export async function fetchJourneyRoutes(
  start: Point,
  end: Point,
  signal: AbortSignal,
  zones: RoadZone[] = [],
): Promise<JourneyRoutes> {
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  if (!validPoint(start) || !validPoint(end)) throw new Error("Invalid journey places.");
  const cached = readCachedJourney(start, end);
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    if (cached) return { ...cached, warning: "Offline — showing the last synced road route. Conditions may have changed." };
    throw new Error("You’re offline and this journey has not been saved on this device. Connect and check it once first.");
  }
  // Keep cancellation separate from the service timeout so an old journey cannot update the map.
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 12000);
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?alternatives=3&overview=full&geometries=geojson&steps=false`,
      { signal: controller.signal },
    );
    if (!response.ok) throw new Error("Road routing is temporarily unavailable.");
    const result = await response.json();
    if (result.code !== "Ok" || !Array.isArray(result.routes) || !result.routes.length)
      throw new Error("No driving route was returned for these places.");
    const routes: JourneyRoute[] = result.routes.slice(0, 3).map((route: { distance: number; duration: number; geometry?: { coordinates?: unknown[] } }) => ({
      distance: route.distance,
      duration: route.duration,
      points: route.geometry?.coordinates?.map((coordinate) => {
        if (!Array.isArray(coordinate) || coordinate.length < 2) return [NaN, NaN] as Point;
        return [coordinate[1], coordinate[0]] as Point;
      }) ?? [],
    }));
    if (!routes.every(validRoute)) throw new Error("Invalid route geometry.");
    const closures = zones.filter((z) => !z.isDemo && z.active && z.status === "closed" && Date.parse(z.expiresAt) > Date.now());
    if (closures.length && routes.every((r) => closures.some((z) => zoneTouchesRoute(z, r.points)))) {
      const first = closures.find((z) => zoneTouchesRoute(z, routes[0].points));
      // Try two bounded road-service detours, then validate every returned segment again.
      // Waypoints are search hints, never fabricated road geometry.
      if (first && !zoneTouchesRoute(first, [start]) && !zoneTouchesRoute(first, [end])) {
        const scaleX = 111320 * Math.cos(first.lat * Math.PI / 180);
        const dx = (end[1] - start[1]) * scaleX, dy = (end[0] - start[0]) * 111320;
        const length = Math.hypot(dx, dy) || 1;
        const offset = Math.min(35000, first.radiusMeters + 8000);
        const candidates: Point[] = [-1, 1].map((side) => [
          first.lat + side * dx / length * offset / 111320,
          first.lng - side * dy / length * offset / scaleX,
        ]);
        const detours = await Promise.allSettled(candidates.map(async (via) => {
          const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${via[1]},${via[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&steps=false`,
            { signal: controller.signal },
          );
          if (!response.ok) return null;
          const data = await response.json();
          const raw = data.code === "Ok" ? data.routes?.[0] : null;
          const route = raw && {
            points: raw.geometry?.coordinates?.map((p: number[]) => [p[1], p[0]]),
            distance: raw.distance, duration: raw.duration,
          };
          return validRoute(route) && route.distance <= Math.min(routes[0].distance * 3, routes[0].distance + 150000) &&
            !closures.some((z) => zoneTouchesRoute(z, route.points)) ? route : null;
        }));
        for (const result of detours) {
          if (result.status === "fulfilled" && result.value && routes.length < 3) routes.push(result.value);
        }
        // Keep the original route plus the best unblocked detours when the original response already had three blocked choices.
        const successful = detours.flatMap((r) => r.status === "fulfilled" && r.value ? [r.value] : []);
        if (successful.length && !routes.some((r) => !closures.some((z) => zoneTouchesRoute(z, r.points))))
          routes.splice(1, 2, ...successful.slice(0, 2));
      }
    }
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const syncedAt = new Date().toISOString();
    cacheRoutes(start, end, routes, syncedAt);
    return { routes, syncedAt, source: "live" };
  } catch (error) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    if (cached) return { ...cached, warning: "Route refresh unavailable — showing the last synced road route. Conditions may have changed." };
    if (controller.signal.aborted) throw new Error("Road routing timed out. No saved route is available on this device.");
    throw error;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}
// Compatibility wrapper for callers that only need the original driving route.
export async function fetchJourneyRoute(start: Point, end: Point, signal: AbortSignal): Promise<JourneyRoute> {
  return (await fetchJourneyRoutes(start, end, signal)).routes[0];
}

// Distance to the entire road polyline, including between sparse geometry points.
export function zoneTouchesRoute(
  zone: Pick<RoadZone, "lat" | "lng" | "radiusMeters">,
  points: Point[],
  bufferMeters = 500,
): boolean {
  if (!points.length) return false;
  const cos = Math.cos((zone.lat * Math.PI) / 180);
  const scale = 111320;
  const projected = points.map(([lat, lng]) => [
    (lng - zone.lng) * scale * cos,
    (lat - zone.lat) * scale,
  ]);
  const radius = zone.radiusMeters + bufferMeters;
  if (projected.length === 1) return Math.hypot(...projected[0]) <= radius;
  return projected.slice(1).some((b, i) => {
    const a = projected[i];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, -(a[0] * dx + a[1] * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(a[0] + t * dx, a[1] + t * dy) <= radius;
  });
}

// Clip the road to each closure circle, rather than colouring the entire route red.
export function blockedRouteSegments(points: Point[], zones: RoadZone[], bufferMeters = 500): BlockedSegment[] {
  const segments: BlockedSegment[] = [];
  for (const zone of zones.filter((z) => z.status === "closed")) {
    const scaleX = 111320 * Math.cos(zone.lat * Math.PI / 180);
    const radius = zone.radiusMeters + bufferMeters;
    let current: Point[] = [];
    const finish = () => {
      if (current.length >= 2) segments.push({ points: current, zone });
      current = [];
    };
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const x = (a[1] - zone.lng) * scaleX, y = (a[0] - zone.lat) * 111320;
      const dx = (b[1] - a[1]) * scaleX, dy = (b[0] - a[0]) * 111320;
      const aa = dx * dx + dy * dy;
      if (!aa) continue;
      const bb = 2 * (x * dx + y * dy), cc = x * x + y * y - radius * radius;
      const discriminant = bb * bb - 4 * aa * cc;
      if (discriminant < 0) { finish(); continue; }
      const sqrt = Math.sqrt(discriminant);
      const lo = Math.max(0, (-bb - sqrt) / (2 * aa));
      const hi = Math.min(1, (-bb + sqrt) / (2 * aa));
      if (lo >= hi) { finish(); continue; }
      const interpolate = (t: number): Point => [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
      const first = interpolate(lo), last = interpolate(hi);
      if (current.length && lo > 0) finish();
      if (!current.length) current.push(first);
      current.push(last);
      if (hi < 1) finish();
    }
    finish();
  }
  return segments;
}

export function reportClosureZones(reports: Incident[], now = Date.now()): RoadZone[] {
  return reports.filter((r) => {
    const observed = Date.parse(r.observedAt);
    return !r.fictional && r.review === "verified" && r.status === "red" &&
      Number.isFinite(observed) && observed <= now && now - observed < 86400000 && validPoint([r.lat, r.lng]);
  }).map((r) => ({
    id: `report-${r.id}`, name: r.title || r.location, status: "closed" as const,
    lat: r.lat, lng: r.lng, radiusMeters: 250, note: r.description,
    active: true, isDemo: false, expiresAt: new Date(Date.parse(r.observedAt) + 86400000).toISOString(),
    updatedAt: r.observedAt, updatedBy: r.reporterId || "Community report",
  }));
}

export function rankJourneyRoutes(routes: JourneyRoute[], zones: RoadZone[], now = Date.now()): RouteOption[] {
  const active = zones.filter((z) => z.active && Date.parse(z.expiresAt) > now);
  const options = routes.map((route, i): RouteOption => {
    const nearby = active.filter((zone) => zoneTouchesRoute(zone, route.points));
    const blockedZones = nearby.filter((z) => !z.isDemo && z.status === "closed");
    const cautionZones = nearby.filter((z) => !z.isDemo && z.status === "caution");
    return {
      ...route, id: `route-${i}`, label: i === 0 ? "Main route" : `Alternative ${i}`,
      zones: nearby, blockedZones, cautionZones, blocked: blockedZones.length > 0,
      recommended: false, blockedSegments: blockedRouteSegments(route.points, blockedZones),
    };
  });
  options.sort((a, b) => Number(a.blocked) - Number(b.blocked) ||
    a.blockedZones.length - b.blockedZones.length || a.duration - b.duration);
  if (options[0] && !options[0].blocked) options[0].recommended = true;
  return options;
}
