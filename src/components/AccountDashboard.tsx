import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  Mail,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { AppUser } from "../services/auth";
import type { Incident } from "../types";
import type { AppScreen } from "../services/help";
export function AccountPage({ user }: { user: AppUser }) {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR SAFEYATRI IDENTITY</span>
          <h1>My account</h1>
          <p>Your registered email and account access, in one place.</p>
        </div>
      </div>
      <section className="account-card">
        <div className="account-avatar">
          {user.name.slice(0, 1).toUpperCase()}
        </div>
        <h2>{user.name}</h2>
        <a className="account-email" href={`mailto:${user.email}`}>
          <Mail size={19} />
          {user.email}
        </a>
        <span
          className={`identity-status ${user.verified ? "identity-verified" : ""}`}
        >
          {user.verified ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
          Email {user.verified ? "verified" : "awaiting verification"}
        </span>
        <dl className="account-details">
          <div>
            <dt>
              <UserRound size={16} />
              Account access
            </dt>
            <dd>
              {user.role === "reviewer"
                ? "Administrator · incident review"
                : "Traveller · reporting & journeys"}
            </dd>
          </div>
          <div>
            <dt>
              <ShieldCheck size={16} />
              Account ID
            </dt>
            <dd>{user.uid}</dd>
          </div>
        </dl>
        <p className="form-footnote">
          {user.role === "reviewer"
            ? "Inspect evidence in Admin dashboard to approve, reject or request clarification."
            : "Verified travellers can report incidents. You do not need admin access to submit a landslide report."}
        </p>
      </section>
    </>
  );
}
export function TravellerDashboard({
  user,
  reports,
  onNavigate,
}: {
  user: AppUser;
  reports: Incident[];
  onNavigate: (screen: AppScreen) => void;
}) {
  const mine = reports.filter((r) => r.reporterId === user.uid);
  return (
    <>
      <section className="welcome-card">
        <span className="eyebrow">YOUR NEXT JOURNEY, BETTER INFORMED</span>
        <h1>Welcome back, {user.name.split(" ")[0]}.</h1>
        <p>Explore the hills. Share what you see. Help the next traveller.</p>
        <div className="welcome-actions">
          <button
            className="btn btn-primary"
            onClick={() => onNavigate("explore")}
          >
            Plan a journey <ArrowRight size={17} />
          </button>
          <button
            className="btn btn-outline"
            onClick={() => onNavigate("report")}
          >
            Report an incident
          </button>
        </div>
        <span className="welcome-mountains" aria-hidden="true">
          △
        </span>
      </section>
      <div className="identity-strip">
        <Mail size={18} />
        <span>
          <small>SIGNED IN AS</small>
          <strong>{user.email}</strong>
        </span>
        <button className="text-link" onClick={() => onNavigate("account")}>
          My account →
        </button>
      </div>
      <div className="mine-stats">
        <div>
          <span>Your reports</span>
          <strong>{mine.length}</strong>
        </div>
        <div>
          <span>Awaiting review</span>
          <strong>
            {
              mine.filter(
                (r) => r.review === "pending" || r.review === "clarification",
              ).length
            }
          </strong>
        </div>
        <div>
          <span>Approved</span>
          <strong>{mine.filter((r) => r.review === "verified").length}</strong>
        </div>
      </div>
      <div className="dashboard-grid">
        <section className="form-card">
          <span className="eyebrow">YOUR CONTRIBUTIONS</span>
          <h2>Latest reports</h2>
          {mine.length === 0 ? (
            <p>
              Your first observation can help someone else. Capture real
              evidence only when you have stopped safely.
            </p>
          ) : (
            mine.slice(0, 3).map((r) => (
              <div className="dashboard-report" key={r.id}>
                <FileText size={18} />
                <div>
                  <strong>{r.title}</strong>
                  <small>
                    {r.location} · {r.review}
                  </small>
                </div>
              </div>
            ))
          )}
          <button className="text-link" onClick={() => onNavigate("mine")}>
            View all my reports →
          </button>
        </section>
        <section className="form-card dashboard-discover">
          <MapPin size={25} />
          <h2>81 places. One Northeast.</h2>
          <p>
            From Tawang’s mountain roads to Shillong’s misty bends, discover
            hill towns and gateways across eight states.
          </p>
          <div className="destination-chips">
            <span>Tawang</span>
            <span>Ziro</span>
            <span>Shillong</span>
            <span>Pelling</span>
          </div>
          <button
            className="btn btn-outline"
            onClick={() => onNavigate("explore")}
          >
            Explore destinations
          </button>
        </section>
      </div>
    </>
  );
}
