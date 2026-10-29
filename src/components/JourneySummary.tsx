import { Copy, Download, GitFork, Route, TriangleAlert, WifiOff } from "lucide-react";
import { ZONE_COLORS, ZONE_LABELS } from "../data/zones";
import type { JourneyInfo } from "./JourneyLayers";

function travelTime(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}
export function JourneySummary({ from, to, info, offline = false, onSelectRoute, onMessage }: {
  from: string; to: string; info: JourneyInfo; offline?: boolean;
  onSelectRoute?: (id: string) => void; onMessage: (message: string) => void;
}) {
  const options = info.alternatives || [];
  const current = options.find((r) => r.id === info.selectedRouteId);
  const actual = info.zones.filter((z) => !z.isDemo);
  const brief = () => [
    `safeYatri journey brief: ${from} → ${to}`,
    info.distance ? `${(info.distance / 1000).toFixed(1)} km · estimated ${travelTime(info.duration)}` : "Road route unavailable",
    `Selected option: ${current?.label || "Road route"}`,
    `Data: ${info.source === "cache" || offline ? "LAST SYNCED / NOT LIVE" : "Online road estimate"}${info.syncedAt ? ` · route fetched ${new Date(info.syncedAt).toLocaleString("en-IN")}` : ""}`,
    ...info.zones.map((z) => `${z.isDemo ? "DEMO EXAMPLE · NOT LIVE" : "ADVISORY"}: ${z.name} — ${ZONE_LABELS[z.status]}. ${z.note}`),
    ...options.map((r) => `${r.label}: ${(r.distance / 1000).toFixed(1)} km, ${travelTime(r.duration)}, ${r.blocked ? "intersects a known closure" : "no mapped closure intersection"}`),
    "OSRM estimates do not include live traffic. Only returned options are compared. Conditions and advisories can change; confirm closures, weather and permits locally before travelling. No matching closure is not a safety guarantee.",
  ].join("\n");
  return (
    <section className="journey-summary" aria-label="Journey route comparison">
      <div className="journey-summary-heading">
        <div><span className="eyebrow">YOUR ROUTE, AT A GLANCE</span><h3><Route size={18}/>{from} <span>→</span> {to}</h3></div>
        <div className="journey-brief-actions">
          <button className="btn btn-outline btn-small" disabled={info.loading || !info.distance} onClick={async () => {
            try { await navigator.clipboard.writeText(brief()); onMessage("Journey brief copied."); }
            catch { onMessage("Clipboard unavailable. Use Download brief to save a copy."); }
          }}><Copy size={14}/>Copy brief</button>
          <button className="btn btn-outline btn-small" disabled={info.loading || !info.distance} onClick={() => {
            const url = URL.createObjectURL(new Blob([brief()], { type: "text/plain;charset=utf-8" }));
            const a = document.createElement("a"); a.href = url; a.download = `safeYatri-${from}-${to}.txt`; a.click();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000); onMessage("Journey brief downloaded for offline reference.");
          }}><Download size={14}/>Download brief</button>
        </div>
      </div>
      {info.loading ? <p className="route-loading" role="status"><span className="route-spinner"/>Comparing road options and checking known closures…</p> : info.error ? <p className="route-unavailable" role="status">{info.error}</p> : null}
      {info.warning && <p className="route-unavailable" role="status">{info.warning}</p>}
      {info.distance > 0 && <div className="route-overview">
        <p className="route-facts"><strong>{(info.distance / 1000).toFixed(1)} <small>km</small></strong><span>{travelTime(info.duration)}<small>Approximate driving time · traffic not included</small></span></p>
        <span className={`sync-pill ${offline || info.source === "cache" ? "sync-cached" : ""}`}>{offline || info.source === "cache" ? <WifiOff size={13}/> : <Route size={13}/>}{info.source === "cache" || offline ? "Last-synced route" : "Online road estimate"}{info.syncedAt && <small>{new Date(info.syncedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</small>}</span>
      </div>}
      {!info.loading && current?.blocked && <div className="zone-alert" role="status"><TriangleAlert size={19}/><span><strong>This option intersects a known blockage.</strong> Affected road sections are red. {options.some((r) => !r.blocked) ? "Select the recommended option below to avoid mapped closures." : "No option avoiding known closures was found. Delay travel or confirm a detour locally."}</span></div>}
      {!info.loading && !current?.blocked && info.baselineBlocked && <div className="route-detour-note"><GitFork size={18}/><span>The original route has a blockage. The selected alternative avoids the mapped closure areas.</span></div>}
      {options.length > 0 && <div className="route-options" role="group" aria-label="Available road routes">{options.map((r) => <button key={r.id} className={`route-option ${r.id === info.selectedRouteId ? "route-option-selected" : ""} ${r.blocked ? "route-option-blocked" : ""}`} aria-pressed={r.id === info.selectedRouteId} onClick={() => onSelectRoute?.(r.id)} disabled={info.loading}>
        <span className="route-option-top"><strong><GitFork size={15}/>{r.label}</strong><span className={`route-option-tag ${r.blocked ? "is-blocked" : ""}`}>{r.blocked ? "Blocked section" : r.recommended ? "Recommended" : "Alternative"}</span></span>
        <span className="route-option-facts">{(r.distance / 1000).toFixed(1)} km <b>·</b> {travelTime(r.duration)}</span>
        <small>{r.blocked ? `${r.blockedZones.length} known closure${r.blockedZones.length === 1 ? "" : "s"} on this option` : "Avoids currently mapped closures"}{r.cautionZones.length ? ` · ${r.cautionZones.length} caution area(s)` : ""}</small>
      </button>)}</div>}
      <div className="route-zone-list">{info.zones.map((z) => <span key={z.id} style={{ borderLeftColor: ZONE_COLORS[z.status] }}><b>{z.isDemo ? "DEMO · NOT LIVE" : z.id.startsWith("report-") ? "VERIFIED REPORT" : "ADMIN ADVISORY"}</b>{z.name}<small>{ZONE_LABELS[z.status]}</small></span>)}</div>
      {info.distance > 0 && <p className="form-footnote">{actual.length} advisories on the selected option. Comparison uses returned road routes and mapped closures with a 500 m proximity buffer. No matched closure is not a safety guarantee.{info.zones.some((z) => z.isDemo) ? " Demo examples do not affect recommendations." : ""}</p>}
    </section>
  );
}
