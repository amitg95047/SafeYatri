import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { MapPin, Plus, Save } from "lucide-react";
import { DEMO_ZONES, ZONE_LABELS, mergeZones } from "../data/zones";
import { saveZone } from "../services/zones";
import { ZoneLayers } from "./JourneyLayers";
import type { RoadZone, ZoneStatus } from "../types";
const empty = (): RoadZone => ({
  id: crypto.randomUUID(),
  name: "",
  status: "caution",
  lat: 26.5,
  lng: 92,
  radiusMeters: 2500,
  note: "",
  active: true,
  isDemo: true,
  expiresAt: "",
  updatedAt: "",
  updatedBy: "",
});
function Pick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}
function EditorFocus({ draft, picked }: { draft: RoadZone; picked: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (picked)
      map.fitBounds(
        L.latLng(draft.lat, draft.lng).toBounds(draft.radiusMeters * 2 + 1500),
        { padding: [25, 25], maxZoom: 12, animate: false },
      );
  }, [draft.lat, draft.lng, draft.radiusMeters, picked, map]);
  return null;
}
export function ZoneEditor({
  saved,
  onSaved,
}: {
  saved: RoadZone[];
  onSaved: (message: string) => void;
}) {
  const [draft, setDraft] = useState<RoadZone>(empty);
  const [picked, setPicked] = useState(false);
  const [hours, setHours] = useState(24);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const choices = useMemo(() => {
    const result = new Map(DEMO_ZONES.map((z) => [z.id, z]));
    saved.forEach((z) => result.set(z.id, z));
    return [...result.values()];
  }, [saved]);
  const visible = mergeZones(saved);
  const edit = (zone: RoadZone) => {
    setDraft({ ...zone });
    setPicked(true);
    setError("");
    setHours(24);
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!picked || draft.name.trim().length < 3) {
      setError("Name the zone and click its centre on the map.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await saveZone({
        ...draft,
        name: draft.name.trim(),
        expiresAt: new Date(Date.now() + hours * 3600000).toISOString(),
      });
      onSaved(
        draft.active
          ? "Zone published. Journey maps update automatically."
          : "Zone archived. It no longer appears on journey maps.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save zone.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMIN MAP WORKSPACE</span>
          <h1>Zone control</h1>
          <p>
            Create and update advisories directly from your knowledge. No
            camera, report or extra approval is required.
          </p>
        </div>
        <button
          className="btn btn-outline"
          onClick={() => {
            setDraft(empty());
            setPicked(false);
            setError("");
          }}
        >
          <Plus size={17} />
          New zone
        </button>
      </div>
      <div className="zone-editor-layout">
        <section className="zone-editor-map">
          <MapContainer
            center={[26.6, 91.5]}
            zoom={6}
            className="leaflet-map"
            scrollWheelZoom
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <EditorFocus draft={draft} picked={picked} />
            <ZoneLayers zones={visible} onSelect={edit} />
            <Pick
              onPick={(lat, lng) => {
                setDraft((previous) => ({ ...previous, lat, lng }));
                setPicked(true);
              }}
            />
            <ZoneLayers
              zones={
                picked
                  ? [{ ...draft, id: "editing-preview", isDemo: true }]
                  : []
              }
            />
          </MapContainer>
          <div className="zone-map-caption">
            <MapPin size={15} />
            Click a map point to position the zone. Click an existing circle to
            edit it. Dashed circles are demo examples.
          </div>
        </section>
        <form
          className="form-card zone-editor-form"
          onSubmit={save}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              (e.target as HTMLElement).tagName === "SELECT"
            )
              e.preventDefault();
          }}
        >
          <span className="eyebrow">
            {picked ? "ZONE DETAILS" : "CHOOSE A MAP POINT"}
          </span>
          <label>
            Edit existing zone
            <select
              value={choices.some((z) => z.id === draft.id) ? draft.id : ""}
              onChange={(e) => {
                const zone = choices.find((z) => z.id === e.target.value);
                if (zone) edit(zone);
              }}
            >
              <option value="">New zone</option>
              {choices.map((z) => (
                <option value={z.id} key={z.id}>
                  {z.name}
                  {!z.active ? " · archived" : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Zone name
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              minLength={3}
              maxLength={100}
              required
              placeholder="e.g. Rangpo bridge approach"
            />
          </label>
          <label>
            Road status
            <select
              value={draft.status}
              onChange={(e) =>
                setDraft({ ...draft, status: e.target.value as ZoneStatus })
              }
            >
              {Object.entries(ZONE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Radius · {(draft.radiusMeters / 1000).toFixed(1)} km
            <input
              type="range"
              min={500}
              max={20000}
              step={100}
              value={draft.radiusMeters}
              onChange={(e) =>
                setDraft({ ...draft, radiusMeters: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Advisory note
            <textarea
              rows={3}
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              maxLength={1000}
              placeholder="Reason, restrictions and useful local knowledge"
            />
          </label>
          <label>
            Valid for
            <select
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
            >
              {[1, 6, 24, 72, 168].map((h) => (
                <option key={h} value={h}>
                  {h} hours
                </option>
              ))}
            </select>
            <small>
              Saving renews the expiry. Expired zones leave journey maps
              automatically.
            </small>
          </label>
          <label className="zone-checkbox">
            <input
              type="checkbox"
              checked={draft.isDemo}
              onChange={(e) => setDraft({ ...draft, isDemo: e.target.checked })}
            />
            Demo example · clearly labelled, not a live advisory
          </label>
          <label className="zone-checkbox">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
            />
            Active on journey maps (turn off to archive)
          </label>
          <small>
            {picked
              ? `${draft.lat.toFixed(5)}, ${draft.lng.toFixed(5)}`
              : "No centre selected yet"}
          </small>
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="btn btn-primary btn-wide"
          >
            <Save size={17} />
            {busy ? "Saving…" : "Publish zone"}
          </button>
          <p className="form-footnote">
            Admin advisories are community information. A clear zone is not a
            guarantee that the road is safe.
          </p>
        </form>
      </div>
    </>
  );
}
