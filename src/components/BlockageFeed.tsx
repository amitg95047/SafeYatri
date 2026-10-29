import { Camera, Clock3, MapPin, TriangleAlert } from "lucide-react";
import type { Incident, RoadZone } from "../types";
import { zoneTouchesRoute } from "../services/journey";

export function BlockageFeed({ zones, reports, offline, onReport }: {
  zones: RoadZone[];
  reports: Incident[];
  offline: boolean;
  onReport: (report: Incident) => void;
}) {
  const closures = zones.filter((z) => z.status === "closed");
  if (!closures.length) return null;
  return <section className="blockage-feed" aria-label="Blockages and route evidence">
    <div className="blockage-feed-heading"><div><span className="eyebrow">KNOW WHAT IS AHEAD</span><h3><TriangleAlert size={19}/>Blockages on checked routes <span>{closures.length}</span></h3></div><small>{offline ? "Saved observations · not live" : "Mapped advisories & community evidence"}</small></div>
    <div className="blockage-cards">{closures.map((z) => {
      const evidence = z.isDemo ? [] : reports.filter((r) => !r.fictional && r.review !== "rejected" && (z.id === `report-${r.id}` || zoneTouchesRoute(z, [[r.lat, r.lng]], 500))).slice(0, 6);
      return <article className={`blockage-card ${z.isDemo ? "blockage-demo" : ""}`} key={z.id}>
        <div className="blockage-title"><span className="blockage-status">{z.isDemo ? "DEMO · NOT LIVE" : "BLOCKED / AVOID"}</span><h4>{z.name}</h4></div>
        <p>{z.note}</p>
        <div className="blockage-meta"><span><MapPin size={12}/>{(z.radiusMeters / 1000).toFixed(2)} km affected area</span>{z.updatedAt && <span><Clock3 size={12}/>Updated {new Date(z.updatedAt).toLocaleString("en-IN")}</span>}</div>
        {!z.isDemo && <small className="blockage-expiry">{z.id.startsWith("report-") ? "Verified observation · approximate area. Included in route checks until" : "Admin advisory valid until"} {new Date(z.expiresAt).toLocaleString("en-IN")}. Expiry does not confirm reopening.</small>}
        {evidence.length ? <div className="blockage-evidence">{evidence.map((r) => <button key={r.id} onClick={() => onReport(r)} className="blockage-evidence-card">
          {r.photo ? <img loading="lazy" src={r.photo} alt={`Submitted road evidence at ${r.location}`}/> : <span className="evidence-no-photo"><Camera size={22}/>No saved photo</span>}
          <span><strong>{r.type} · {r.review === "verified" ? "Verified" : "Unverified"}</strong><small>{r.location}</small><small>{new Date(r.observedAt).toLocaleString("en-IN")}{Date.now() - Date.parse(r.observedAt) >= 86400000 ? " · Older than 24 h" : ""}</small><span>{r.description}</span><b>View full report →</b></span>
        </button>)}</div> : <div className="blockage-no-evidence"><Camera size={16}/>{z.isDemo ? "Illustrative zone only; no real incident evidence." : "No saved photo reports in this area. The closure advisory still applies."}</div>}
      </article>;
    })}</div>
  </section>;
}
