import type { RoadZone, ZoneStatus } from "../types";
export const ZONE_COLORS: Record<ZoneStatus, string> = {
  closed: "#c64848",
  caution: "#bd8425",
  clear: "#23856a",
  unknown: "#7c8795",
};
export const ZONE_LABELS: Record<ZoneStatus, string> = {
  closed: "Closed / avoid",
  caution: "Caution",
  clear: "No restriction recorded",
  unknown: "Information needed",
};
const samples: [string, string, ZoneStatus, number, number, number][] = [
  ["demo-sevoke", "Sevoke bend example", "caution", 26.9, 88.47, 2300],
  ["demo-rangpo", "Rangpo example", "closed", 27.177, 88.533, 2200],
  ["demo-gangtok", "Gangtok approach example", "clear", 27.3, 88.59, 1800],
  ["demo-shillong", "Shillong approach example", "caution", 25.65, 91.89, 3000],
  ["demo-sohra", "Sohra example", "unknown", 25.28, 91.73, 2200],
  ["demo-dirang", "Dirang example", "caution", 27.36, 92.24, 2600],
  ["demo-tawang", "Tawang approach example", "closed", 27.56, 91.87, 2200],
  ["demo-ziro", "Ziro valley example", "clear", 27.54, 93.83, 3000],
  ["demo-kohima", "Kohima example", "caution", 25.675, 94.108, 2200],
  ["demo-haflong", "Haflong example", "unknown", 25.17, 93.02, 2500],
];
export const DEMO_ZONES: RoadZone[] = samples.map(
  ([id, name, status, lat, lng, radiusMeters]) => ({
    id,
    name,
    status,
    lat,
    lng,
    radiusMeters,
    note: "Illustrative demo zone. This is not a live closure or safety advisory.",
    active: true,
    isDemo: true,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    updatedAt: "",
    updatedBy: "Demo example",
  }),
);
export function mergeZones(
  saved: RoadZone[],
  showDemo = true,
  now = Date.now(),
): RoadZone[] {
  const merged = new Map<string, RoadZone>(
    (showDemo ? DEMO_ZONES : []).map((z) => [z.id, z]),
  );
  saved.forEach((z) => merged.set(z.id, z));
  return [...merged.values()].filter(
    (z) => z.active && (showDemo || !z.isDemo) && Date.parse(z.expiresAt) > now,
  );
}
