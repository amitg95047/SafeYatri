import type { RoadZone } from "../types";
export type Point = [number, number];
export interface JourneyRoute {
  points: Point[];
  distance: number;
  duration: number;
}
const routeCache = new Map<string, { route: JourneyRoute; at: number }>();
export async function fetchJourneyRoute(
  start: Point,
  end: Point,
  signal: AbortSignal,
): Promise<JourneyRoute> {
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  const key = `${start.join(",")}:${end.join(",")}`;
  const cached = routeCache.get(key);
  if (cached && Date.now() - cached.at < 1800000) return cached.route;
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&steps=false`,
    { signal },
  );
  if (!response.ok) throw new Error("Road routing is temporarily unavailable.");
  const result = await response.json();
  const route = result.routes?.[0];
  if (
    result.code !== "Ok" ||
    !route?.geometry?.coordinates?.length ||
    !Number.isFinite(route.distance) ||
    !Number.isFinite(route.duration)
  )
    throw new Error("No driving route was returned for these places.");
  const points: Point[] = route.geometry.coordinates.map(
    ([lng, lat]: number[]) => [lat, lng],
  );
  if (
    points.some(
      ([lat, lng]) =>
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        Math.abs(lat) > 90 ||
        Math.abs(lng) > 180,
    )
  )
    throw new Error("Invalid route geometry.");
  const resultRoute = {
    points,
    distance: route.distance,
    duration: route.duration,
  };
  if (routeCache.size >= 20) routeCache.delete(routeCache.keys().next().value!);
  routeCache.set(key, { route: resultRoute, at: Date.now() });
  return resultRoute;
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
    const dx = b[0] - a[0],
      dy = b[1] - a[1];
    const t = Math.max(
      0,
      Math.min(1, -(a[0] * dx + a[1] * dy) / (dx * dx + dy * dy || 1)),
    );
    return Math.hypot(a[0] + t * dx, a[1] + t * dy) <= radius;
  });
}
