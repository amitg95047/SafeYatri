import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Circle,
  CircleMarker,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { PLACES } from "../data/places";
import { ZONE_COLORS, ZONE_LABELS } from "../data/zones";
import {
  fetchJourneyRoutes,
  readCachedJourney,
  rankJourneyRoutes,
  reportClosureZones,
  blockedRouteSegments,
  zoneTouchesRoute,
  type JourneyRoutes,
  type RouteOption,
  type Point,
} from "../services/journey";
import type { Incident, RoadZone } from "../types";
export interface JourneyInfo {
  loading: boolean;
  error: string;
  distance: number;
  duration: number;
  zones: RoadZone[];
  points?: Point[];
  alternatives?: RouteOption[];
  selectedRouteId?: string;
  syncedAt?: string;
  source?: "live" | "cache";
  warning?: string;
  baselineBlocked?: boolean;
}
function ClosureEvidence({ zone, incidents }: { zone: RoadZone; incidents?: Incident[] }) {
  if (zone.isDemo || zone.status !== "closed") return null;
  const reports = (incidents ?? []).filter((r) => !r.fictional && r.review !== "rejected" &&
    (zone.id === `report-${r.id}` || zoneTouchesRoute(zone, [[r.lat, r.lng]], 500))).slice(0, 2);
  return <>{reports.map((r) => <div key={r.id}>
    <p><strong>{r.type}</strong> · {r.review === "verified" ? "Verified" : "Unverified"}<br/><small>Observed {new Date(r.observedAt).toLocaleString("en-IN")}</small></p>
    {r.photo && <img className="popup-evidence" loading="lazy" src={r.photo} alt={`Submitted road evidence at ${r.location}`}/>}
    <p>{r.description.slice(0, 180)}{r.description.length > 180 ? "…" : ""}</p>
  </div>)}</>;
}
function ZonePopup({ zone: z, incidents }: { zone: RoadZone; incidents?: Incident[] }) {
  return (
    <>
      <strong>{z.name}</strong>
      <p>
        {ZONE_LABELS[z.status]} · {(z.radiusMeters / 1000).toFixed(1)} km radius
      </p>
      <b>{z.isDemo ? "DEMO EXAMPLE · NOT LIVE" : "ADMIN ADVISORY"}</b>
      <p>{z.note}</p>
      {!z.isDemo && (
        <small>
          Updated {new Date(z.updatedAt).toLocaleString("en-IN")} · Expires{" "}
          {new Date(z.expiresAt).toLocaleString("en-IN")}
        </small>
      )}
      <ClosureEvidence zone={z} incidents={incidents}/>
    </>
  );
}
export function ZoneLayers({
  zones,
  onSelect,
  incidents,
}: {
  zones: RoadZone[];
  onSelect?: (zone: RoadZone) => void;
  incidents?: Incident[];
}) {
  return (
    <>
      {zones.map((z) => {
        const events = onSelect
          ? {
              click: (e: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(e.originalEvent);
                onSelect(z);
              },
            }
          : undefined;
        return (
          <Fragment key={z.id}>
            <Circle
              center={[z.lat, z.lng]}
              radius={z.radiusMeters}
              pathOptions={{
                color: ZONE_COLORS[z.status],
                fillOpacity: z.isDemo ? 0.12 : 0.2,
                weight: 2,
                dashArray: z.isDemo ? "6 5" : undefined,
              }}
              eventHandlers={events}
            >
              <Popup>
                <ZonePopup zone={z} incidents={incidents}/>
              </Popup>
            </Circle>
            <CircleMarker
              center={[z.lat, z.lng]}
              radius={5}
              pathOptions={{
                color: "#fff",
                weight: 1.5,
                fillColor: ZONE_COLORS[z.status],
                fillOpacity: 1,
              }}
              eventHandlers={events}
            >
              <Popup>
                <ZonePopup zone={z} incidents={incidents}/>
              </Popup>
            </CircleMarker>
          </Fragment>
        );
      })}
    </>
  );
}
export function JourneyLayers({
  from,
  to,
  zones,
  onInfo,
  requestKey,
  selectedRouteId,
  incidents,
}: {
  from: string;
  to: string;
  requestKey: number;
  zones: RoadZone[];
  onInfo: (info: JourneyInfo) => void;
  selectedRouteId?: string;
  incidents?: Incident[];
}) {
  const map = useMap();
  const journeyKey = `${from}:${to}`;
  const [storedResult, setStoredResult] = useState<{ key: string; data: JourneyRoutes } | null>(null);
  const [fetchKey, setFetchKey] = useState(journeyKey);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [networkRevision, setNetworkRevision] = useState(0);
  const [hazardTime, setHazardTime] = useState(Date.now());
  const result = storedResult?.key === journeyKey ? storedResult.data : null;
  const displayLoading = loading || fetchKey !== journeyKey;
  const displayError = fetchKey === journeyKey ? error : "";
  const start = PLACES.find((p) => p.name === from),
    end = PLACES.find((p) => p.name === to);
  useEffect(() => {
    const changed = () => setNetworkRevision((previous) => previous + 1);
    const timer = window.setInterval(() => setHazardTime(Date.now()), 60000);
    window.addEventListener("online", changed);
    window.addEventListener("offline", changed);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", changed);
      window.removeEventListener("offline", changed);
    };
  }, []);
  const activeZones = useMemo(() => zones.filter((z) => z.active && Date.parse(z.expiresAt) > Date.now()), [zones, hazardTime]);
  const hazards = useMemo(() => [...activeZones, ...reportClosureZones(incidents ?? [], Date.now())], [activeZones, incidents, hazardTime]);
  const closureKey = hazards.filter((z) => !z.isDemo && z.status === "closed").map((z) => `${z.id}:${z.updatedAt}:${z.lat}:${z.lng}:${z.radiusMeters}`).sort().join("|");
  useEffect(() => {
    setFetchKey(journeyKey);
    setStoredResult(null);
    setError("");
    if (!start || !end || start.name === end.name) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let disposed = false;
    setLoading(true);
    map.fitBounds(
      [
        [start.lat, start.lng],
        [end.lat, end.lng],
      ],
      { padding: [35, 35], maxZoom: 12 },
    );
    const cached = readCachedJourney([start.lat, start.lng], [end.lat, end.lng]);
    if (cached) setStoredResult({ key: journeyKey, data: cached });
    void fetchJourneyRoutes(
      [start.lat, start.lng],
      [end.lat, end.lng],
      controller.signal,
      hazards,
    )
      .then((result) => {
        if (!disposed) setStoredResult({ key: journeyKey, data: result });
      })
      .catch((e) => {
        if (!disposed)
          setError(
            `${e instanceof Error ? e.message : "Road routing failed."} Only the selected places are shown.`,
          );
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
      controller.abort();
    };
  }, [from, to, map, requestKey, closureKey, networkRevision]);
  const options = useMemo(
    () => rankJourneyRoutes(result?.routes ?? [], hazards),
    [result, hazards],
  );
  const route = options.find((r) => r.id === selectedRouteId) ?? options[0];
  useEffect(() => {
    if (route) map.fitBounds(L.latLngBounds(route.points), { padding: [35, 35], maxZoom: 12 });
  }, [route?.id, result, map]);
  useEffect(() => {
    onInfo({
      loading: displayLoading,
      error: displayError,
      distance: route?.distance || 0,
      duration: route?.duration || 0,
      zones: route?.zones ?? [],
      points: route?.points || [],
      alternatives: options,
      selectedRouteId: route?.id,
      syncedAt: result?.syncedAt,
      source: result?.source,
      warning: result?.warning,
      baselineBlocked: options.find((r) => r.id === "route-0")?.blocked ?? false,
    });
  }, [displayLoading, displayError, route, options, result, onInfo]);
  const icon = (label: string) =>
    L.divIcon({
      className: "journey-endpoint",
      html: `<span>${label}</span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  return (
    <>
      <ZoneLayers zones={activeZones} incidents={incidents}/>
      {options.filter((option) => option.id !== route?.id).map((option) => (
        <Polyline key={option.id} positions={option.points} pathOptions={{ color: "#879eaf", weight: 4, opacity: 0.55, dashArray: "8 7" }}>
          <Popup>{option.label} · {(option.distance / 1000).toFixed(0)} km{option.blocked ? " · Blocked section" : " · No mapped closure found"}</Popup>
        </Polyline>
      ))}
      {route && (
        <Polyline
          positions={route.points}
          pathOptions={{ color: route.blocked ? "#647a8c" : "#238d9b", weight: 6, opacity: 0.95 }}
        />
      )}
      {options.flatMap((option) => option.blockedSegments.map((segment, i) => (
        <Polyline key={`${option.id}:${segment.zone.id}:${i}`} positions={segment.points} pathOptions={{ color: "#dc3e4f", weight: option.id === route?.id ? 8 : 6, opacity: 0.95 }}>
          <Popup><strong>Blocked road section · {segment.zone.name}</strong><p>{segment.zone.note}</p><small>{segment.zone.id.startsWith("report-") ? "Verified community report · approximate location" : "Admin advisory"} · {new Date(segment.zone.updatedAt).toLocaleString("en-IN")}</small><ClosureEvidence zone={segment.zone} incidents={incidents}/></Popup>
        </Polyline>
      )))}
      {route && blockedRouteSegments(route.points, route.zones.filter((z) => z.isDemo)).map((segment, i) => (
        <Polyline key={`demo:${segment.zone.id}:${i}`} positions={segment.points} pathOptions={{ color: "#c64848", weight: 7, dashArray: "6 7" }}>
          <Popup><strong>Demo blocked road example</strong><p>{segment.zone.name} · not a live closure</p></Popup>
        </Polyline>
      ))}
      {start && (
        <Marker position={[start.lat, start.lng]} icon={icon("A")}>
          <Popup>Start: {start.name}</Popup>
        </Marker>
      )}
      {end && (
        <Marker position={[end.lat, end.lng]} icon={icon("B")}>
          <Popup>Destination: {end.name}</Popup>
        </Marker>
      )}
    </>
  );
}
