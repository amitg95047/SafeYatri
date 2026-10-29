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
  fetchJourneyRoute,
  zoneTouchesRoute,
  type JourneyRoute,
  type Point,
} from "../services/journey";
import type { RoadZone } from "../types";
export interface JourneyInfo {
  loading: boolean;
  error: string;
  distance: number;
  duration: number;
  zones: RoadZone[];
  points?: Point[];
}
function ZonePopup({ zone: z }: { zone: RoadZone }) {
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
    </>
  );
}
export function ZoneLayers({
  zones,
  onSelect,
}: {
  zones: RoadZone[];
  onSelect?: (zone: RoadZone) => void;
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
                <ZonePopup zone={z} />
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
                <ZonePopup zone={z} />
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
}: {
  from: string;
  to: string;
  requestKey: number;
  zones: RoadZone[];
  onInfo: (info: JourneyInfo) => void;
}) {
  const map = useMap();
  const [route, setRoute] = useState<JourneyRoute | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const start = PLACES.find((p) => p.name === from),
    end = PLACES.find((p) => p.name === to);
  useEffect(() => {
    setRoute(null);
    setError("");
    if (!start || !end || start.name === end.name) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let timedOut = false;
    const timer = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 12000);
    setLoading(true);
    map.fitBounds(
      [
        [start.lat, start.lng],
        [end.lat, end.lng],
      ],
      { padding: [35, 35], maxZoom: 12 },
    );
    void fetchJourneyRoute(
      [start.lat, start.lng],
      [end.lat, end.lng],
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setRoute(result);
          map.fitBounds(L.latLngBounds(result.points), {
            padding: [35, 35],
            maxZoom: 12,
          });
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted || timedOut)
          setError(
            timedOut
              ? "Road routing timed out. Only the selected places are shown."
              : `${e instanceof Error ? e.message : "Road routing failed."} Only the selected places are shown.`,
          );
      })
      .finally(() => {
        clearTimeout(timer);
        if (!controller.signal.aborted || timedOut) setLoading(false);
      });
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [from, to, map, requestKey]);
  const nearby = useMemo(
    () => (route ? zones.filter((z) => zoneTouchesRoute(z, route.points)) : []),
    [route, zones],
  );
  useEffect(() => {
    onInfo({
      loading,
      error,
      distance: route?.distance || 0,
      duration: route?.duration || 0,
      zones: nearby,
      points: route?.points || [],
    });
  }, [loading, error, route, nearby, onInfo]);
  const icon = (label: string) =>
    L.divIcon({
      className: "journey-endpoint",
      html: `<span>${label}</span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  return (
    <>
      <ZoneLayers zones={zones} />
      {route && (
        <Polyline
          positions={route.points}
          pathOptions={{ color: "#183e38", weight: 5, opacity: 0.9 }}
        />
      )}
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
