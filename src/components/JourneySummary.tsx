import { Copy, Route, TriangleAlert } from "lucide-react";
import { ZONE_COLORS, ZONE_LABELS } from "../data/zones";
import type { JourneyInfo } from "./JourneyLayers";
export function JourneySummary({
  from,
  to,
  info,
  onMessage,
}: {
  from: string;
  to: string;
  info: JourneyInfo;
  onMessage: (message: string) => void;
}) {
  const actual = info.zones.filter((z) => !z.isDemo);
  const demo = info.zones.filter((z) => z.isDemo);
  return (
    <section className="journey-summary">
      <div className="journey-summary-heading">
        <div>
          <span className="eyebrow">SELECTED JOURNEY</span>
          <h3>
            <Route size={18} />
            {from} <span>→</span> {to}
          </h3>
        </div>
        <button
          className="btn btn-outline btn-small"
          disabled={info.loading}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                `${from} → ${to}\n${info.distance ? `${(info.distance / 1000).toFixed(0)} km · estimated ${Math.round(info.duration / 60)} min` : "Road route unavailable"}\n${info.zones.map((z) => `${z.isDemo ? "DEMO EXAMPLE" : "ADMIN ADVISORY"}: ${z.name} — ${ZONE_LABELS[z.status]}`).join("\n")}\nCommunity information, not a safety guarantee. Routing does not avoid marked zones automatically.`,
              );
              onMessage("Journey brief copied.");
            } catch {
              onMessage("Clipboard unavailable in this browser.");
            }
          }}
        >
          <Copy size={14} />
          Copy journey brief
        </button>
      </div>
      {info.loading ? (
        <p role="status">Finding the road route and checking mapped zones…</p>
      ) : info.error ? (
        <p className="route-unavailable" role="status">
          {info.error} Open directions for an alternative routing service.
        </p>
      ) : (
        info.distance > 0 && (
          <p className="route-facts">
            <strong>{(info.distance / 1000).toFixed(0)} km</strong>
            <span>
              Approx. {Math.floor(Math.round(info.duration / 60) / 60)} h{" "}
              {Math.round(info.duration / 60) % 60} min · OSRM road estimate ·
              traffic and closures not included
            </span>
          </p>
        )
      )}
      {actual.some((z) => z.status === "closed") && (
        <div className="zone-alert">
          <TriangleAlert size={17} />
          An admin-marked closed zone intersects this route. Check local
          directions before travelling.
        </div>
      )}
      <div className="route-zone-list">
        {info.zones.map((z) => (
          <span key={z.id} style={{ borderLeftColor: ZONE_COLORS[z.status] }}>
            <b>{z.isDemo ? "DEMO" : "ADMIN"}</b>
            {z.name}
            <small>{ZONE_LABELS[z.status]}</small>
          </span>
        ))}
      </div>
      {info.distance > 0 && (
        <p className="form-footnote">
          {actual.length} admin advisories · {demo.length} demo examples within
          zone radius + 500 m of the route. No matching zones means insufficient
          information. Routing does not automatically avoid marked zones.
        </p>
      )}
    </section>
  );
}
