<<<<<<< HEAD
import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  AlertTriangle,
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  Bell,
  PhoneCall,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  CloudRain,
  Compass,
  FileText,
  Filter,
  Flag,
  LocateFixed,
  LogIn,
  LogOut,
  Map as MapIcon,
  MapPin,
  Menu,
  MessageSquare,
  Mountain,
  Navigation,
  Plus,
  Route,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  UserRound,
  Users,
  Wifi,
  WifiOff,
  RefreshCw,
  X,
} from "lucide-react";
import type {
  Incident,
  IncidentType,
  RoadStatus,
  ReviewStatus,
  RoadZone,
} from "./types";
import { clearDraft, loadDraft, saveDraft } from "./services/storage";
import {
  completeRedirectSignIn,
  emailSignIn,
  googleSignIn,
  resetPassword,
  refreshVerification,
  logOut,
  watchUser,
  type AppUser,
} from "./services/auth";
import { firebaseReady } from "./services/firebase";
import { CameraCapture } from "./components/CameraCapture";
import { JourneyLayers, type JourneyInfo } from "./components/JourneyLayers";
import { JourneySummary } from "./components/JourneySummary";
import { BlockageFeed } from "./components/BlockageFeed";
import { TravelKit } from "./components/TravelKit";
import type { SyncMetadata } from "./services/offline";
import { ZoneEditor } from "./components/ZoneEditor";
import { zoneTouchesRoute } from "./services/journey";
import { mergeZones, ZONE_COLORS, ZONE_LABELS } from "./data/zones";
import { watchZones } from "./services/zones";
import { HelpPanel, SupportMenu } from "./components/HelpPanel";
import { AccountPage, TravellerDashboard } from "./components/AccountDashboard";
import type { AppScreen } from "./services/help";
import { VerificationNotice } from "./components/VerificationNotice";
import { Membership } from "./components/Membership";
import { PLACES, REGION_CORRIDORS } from "./data/places";
import { prepareCameraPhoto } from "./services/media";
import { createReport, reviewReport, watchReports } from "./services/reports";
=======
import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { AlertTriangle, ArrowDownUp, ArrowLeft, ArrowRight, Bell, Check, CheckCircle2, ChevronDown, CircleHelp, Clock3, CloudRain, Compass, FileText, Filter, Flag, LocateFixed, LogIn, LogOut, Map as MapIcon, MapPin, Menu, MessageSquare, Mountain, Navigation, Plus, Route, ShieldCheck, SlidersHorizontal, Upload, UserRound, Users, X } from 'lucide-react';
import type { Incident, IncidentType, RoadStatus, ReviewStatus, WeatherAdvisory } from './types';
import { clearDraft, getLastSync, loadDraft, loadIncidents, saveDraft } from './services/storage';
import { demoSignIn, demoSignOut, DEMO_ADMIN_EMAIL, type DemoUser } from './services/auth';
import { prepareDemoPhoto } from './services/media';
import { createReport, reviewReport } from './services/reports';
>>>>>>> 3361aa4154425a8c6e1712ef2bf88f55419d7048

const SEED: Incident[] = [
 { id:'demo-1', corridor:'NH-10 · Siliguri–Gangtok', title:'Rockfall debris near Rangpo bend', type:'Landslide', status:'orange', review:'pending', location:'Rangpo approach, NH-10', description:'Fictional demo report: small rocks reported on the shoulder after rain. Not independently verified.', observedAt:'2026-10-29T00:35:00+05:30', lat:27.1767, lng:88.5332, reporter:'demo.traveller@example.com', fictional:true, decisionHistory:[] },
 { id:'demo-2', corridor:'NH-10 · Siliguri–Gangtok', title:'Heavy rain and reduced visibility', type:'Heavy rain', status:'yellow', review:'verified', location:'Sevoke Road, near Coronation Bridge', description:'Fictional demo advisory: reduced visibility and wet surface. Drive slowly and follow official directions.', observedAt:'2026-10-28T22:10:00+05:30', lat:26.8992, lng:88.4783, reporter:'demo.traveller@example.com', fictional:true, decisionHistory:[{action:'verified',by:DEMO_ADMIN_EMAIL,at:'2026-10-28T22:40:00+05:30',note:'Demo reviewer decision'}] },
 { id:'demo-3', corridor:'NH-10 · Siliguri–Gangtok', title:'Road surface reported clear', type:'Road damage', status:'green', review:'verified', location:'Melli junction', description:'Fictional demo report. Green means no current issue is recorded here, not a guarantee of safety.', observedAt:'2026-10-28T18:25:00+05:30', lat:27.1056, lng:88.4517, reporter:'demo.traveller@example.com', fictional:true, decisionHistory:[] },
 { id:'demo-4', corridor:'NH-10 · Siliguri–Gangtok', title:'Insufficient recent information', type:'Other', status:'white', review:'pending', location:'Tista Bazaar stretch', description:'Fictional demo placeholder. No recent verified observations are available for this point.', observedAt:'2026-10-28T13:00:00+05:30', lat:27.0712, lng:88.4065, reporter:'demo.traveller@example.com', fictional:true, decisionHistory:[] },
 { id:'demo-5', corridor:'NH-10 · Siliguri–Gangtok', title:'Road blockage reported near bridge', type:'Blocked road', status:'red', review:'verified', location:'Lower Rangpo road section', description:'Fictional demo incident to demonstrate a confirmed blockage. Avoid this segment and check official local updates.', observedAt:'2026-10-28T20:00:00+05:30', lat:27.1711, lng:88.5201, reporter:'demo.traveller@example.com', fictional:true, decisionHistory:[{action:'verified',by:DEMO_ADMIN_EMAIL,at:'2026-10-28T20:15:00+05:30',note:'Fictional review example'}] }
];
const COLORS: Record<RoadStatus,string> = {red:'#dc2626',orange:'#ea580c',yellow:'#eab308',green:'#16a34a',white:'#cbd5e1'};
const STATUS_LABEL: Record<RoadStatus,string> = {red:'Blocked / landslide',orange:'Unverified report',yellow:'Caution',green:'No issue reported',white:'Insufficient data'};
const REVIEW_LABEL: Record<ReviewStatus,string> = {pending:'Pending review',verified:'Verified',rejected:'Rejected',clarification:'Needs clarification'};
const CORRIDORS = ['NH-10 · Siliguri–Gangtok','NH-2 · Dimapur–Kohima','NH-6 · Jowai–Silchar','NH-37 · Guwahati–Jorhat','NH-715 · Kaziranga corridor'];
const ADVISORIES: WeatherAdvisory[] = [{id:'wx1',title:'Demo weather note · Sikkim foothills',source:'Demo placeholder — replace with IMD / official source',expiresAt:'2026-10-29T08:00:00+05:30',detail:'Rain may reduce visibility. This is a fictional demo advisory, not a live forecast.'}];
const initialUser = (): DemoUser | null => { try { return JSON.parse(localStorage.getItem('safeyatra.demo.user') || 'null') as DemoUser | null; } catch { return null; } };
function pinIcon(status: RoadStatus) { return L.divIcon({ className:'incident-pin-wrap', html:`<span class="incident-pin" style="background:${COLORS[status]}"><span></span></span>`, iconSize:[24,24], iconAnchor:[12,12] }); }
function statusClass(status: RoadStatus) { return `status status-${status}`; }
function MapClick({onPick}:{onPick:(lat:number,lng:number)=>void}) { useMapEvents({click(e){onPick(e.latlng.lat,e.latlng.lng);}}); return null; }
function App() {
<<<<<<< HEAD
  const [user, setUser] = useState<AppUser | null>(null);
  const [screen, setScreen] = useState<AppScreen>("dashboard");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [corridor, setCorridor] = useState(CORRIDORS[0]);
  const [view, setView] = useState<"map" | "list">("map");
  const [filter, setFilter] = useState<RoadStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [from, setFrom] = useState("Siliguri");
  const [to, setTo] = useState("Gangtok");
  const [routeMessage, setRouteMessage] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [selectedRouteId, setSelectedRouteId] = useState<string>();
  const [reportsSync, setReportsSync] = useState<SyncMetadata>({ syncedAt: null, source: "cache", cacheAvailable: false });
  const [zonesSync, setZonesSync] = useState<SyncMetadata>({ syncedAt: null, source: "cache", cacheAvailable: false });
  const [journey, setJourney] = useState({
    from: "Siliguri",
    to: "Gangtok",
    revision: 0,
  });
  const [savedZones, setSavedZones] = useState<RoadZone[]>([]);
  const [showDemoZones, setShowDemoZones] = useState(true);
  const [minute, setMinute] = useState(Date.now());
  const [journeyInfo, setJourneyInfo] = useState<JourneyInfo>({
    loading: false,
    error: "",
    distance: 0,
    duration: 0,
    zones: [],
  });
  const zones = useMemo(
    () => mergeZones(savedZones, showDemoZones, minute),
    [savedZones, showDemoZones, minute],
  );
  useEffect(() => {
    const timer = window.setInterval(() => setMinute(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const updateConnection = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => { window.removeEventListener("online", updateConnection); window.removeEventListener("offline", updateConnection); };
  }, []);
  useEffect(() => {
    setSavedZones([]);
    setZonesSync({ syncedAt: null, source: "cache", cacheAvailable: false });
    if (!user) {
      return;
    }
    return watchZones(setSavedZones, (e) =>
      setToast(`Could not load admin zones: ${e.message}`),
      setZonesSync,
    );
  }, [user?.uid]);
  useEffect(() => {
    if (journey.revision > 0 && screen === "explore")
      document
        .getElementById("journey-map")
        ?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
          block: "start",
        });
  }, [journey.revision]);
  const [reportType, setReportType] = useState<IncidentType>("Landslide");
  const [reportDesc, setReportDesc] = useState("");
  const [reportLocation, setReportLocation] = useState("");
  const [reportTime, setReportTime] = useState(localTime());
  const [reportLat, setReportLat] = useState<number | null>(null);
  const [reportLng, setReportLng] = useState<number | null>(null);
  const [photo, setPhoto] = useState<string | undefined>();
  const [photoName, setPhotoName] = useState("");
  const [reportError, setReportError] = useState("");
  const [reportSuccess, setReportSuccess] = useState("");
  const [uploading, setUploading] = useState(false);
  const [recentOnly, setRecentOnly] = useState(true);
  const [reviewFilter, setReviewFilter] = useState<"pending" | "all">(
    "pending",
  );
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewBusy, setReviewBusy] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [toast, setToast] = useState("");
  useEffect(() => {
    const d = user
      ? loadDraft<{
          type: IncidentType;
          description: string;
          location: string;
          observedAt: string;
          lat: number | null;
          lng: number | null;
        }>()
      : null;
    setReportType(d?.type || "Landslide");
    setReportDesc(d?.description || "");
    setReportLocation(d?.location || "");
    setReportTime(d?.observedAt || localTime());
    setReportLat(d?.lat ?? null);
    setReportLng(d?.lng ?? null);
    setPhoto(undefined);
    setPhotoName("");
    setReportError("");
  }, [user?.uid]);
  useEffect(() => {
    if (screen === "report" && user)
      saveDraft({
        type: reportType,
        description: reportDesc,
        location: reportLocation,
        observedAt: reportTime,
        lat: reportLat,
        lng: reportLng,
      });
  }, [
    screen,
    reportType,
    reportDesc,
    reportLocation,
    reportTime,
    reportLat,
    reportLng,
    photo,
    photoName,
  ]);
  useEffect(() => {
    void completeRedirectSignIn().catch((error) =>
      setAuthError(
        error instanceof Error
          ? error.message
          : "Google sign-in could not complete.",
      ),
    );
  }, []);
  useEffect(() => watchUser(setUser), []);
  useEffect(() => {
    setJourneyInfo({ loading: false, error: "", distance: 0, duration: 0, zones: [] });
    setFrom("Siliguri"); setTo("Gangtok"); setJourney({ from: "Siliguri", to: "Gangtok", revision: 0 });
    setSelected(null);
    if (user) {
      setScreen(user.role === "reviewer" ? "review" : "dashboard");
      setReviewNotes({});
      setChatOpen(false);
      setSelectedRouteId(undefined);
      try {
        const saved = JSON.parse(localStorage.getItem(`safeyatri.lastJourney.${user.uid}`) || "null");
        if (saved && PLACES.some((p) => p.name === saved.from) && PLACES.some((p) => p.name === saved.to) && saved.from !== saved.to) {
          setFrom(saved.from); setTo(saved.to); setJourney({ from: saved.from, to: saved.to, revision: 0 });
        }
      } catch { /* Start with the default journey if storage is unavailable. */ }
    }
  }, [user?.uid]);
  useEffect(() => {
    setIncidents([]);
    setReportsSync({ syncedAt: null, source: "cache", cacheAvailable: false });
    if (!user) {
      return;
    }
    return watchReports(setIncidents, (e) =>
      setToast(`Could not load reports: ${e.message}`),
      setReportsSync,
    );
  }, [user?.uid]);
  const checkedZones = useMemo(() => Array.from(new Map([
    ...journeyInfo.zones,
    ...(journeyInfo.alternatives || []).flatMap((r) => r.zones),
  ].map((z) => [z.id, z])).values()), [journeyInfo.zones, journeyInfo.alternatives]);
  const relatedReports = useMemo(() => incidents.filter((i) => {
    const paths = journeyInfo.alternatives?.map((r) => r.points) || (journeyInfo.points?.length ? [journeyInfo.points] : []);
    return paths.length ? paths.some((points) => zoneTouchesRoute({ ...i, radiusMeters: 2500 }, points, 0)) || checkedZones.some((z) => !z.isDemo && z.status === "closed" && zoneTouchesRoute(z, [[i.lat, i.lng]], 500)) : i.corridor === corridor;
  }), [incidents, journeyInfo.alternatives, journeyInfo.points, checkedZones, corridor]);
  const visible = useMemo(
    () =>
      relatedReports.filter(
        (i) =>
          (!recentOnly || Date.now() - Date.parse(i.observedAt) < 86400000) &&
          (filter === "all" || i.status === filter) &&
          `${i.title} ${i.location} ${i.description}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [
      relatedReports,
      corridor,
      filter,
      search,
      recentOnly,
      journeyInfo.points,
      minute,
    ],
  );
  const active = visible.find((i) => i.id === selected) || visible[0];
  const myReports = incidents.filter(
    (i) => i.reporterId === user?.uid && !i.fictional,
  );
  const pending = incidents.filter(
    (i) => i.review === "pending" || i.review === "clarification",
  );
  const counts = (Object.keys(COLORS) as RoadStatus[]).map((status) => ({
    status,
    count: relatedReports.filter(
      (i) =>
        i.status === status &&
        (!recentOnly || Date.now() - Date.parse(i.observedAt) < 86400000),
    ).length,
  }));
  const closureCount = checkedZones.filter((z) => !z.isDemo && z.status === "closed").length;
  const chatReportIds = journeyInfo.points?.length ? incidents.filter((r) => zoneTouchesRoute({ ...r, radiusMeters: 2500 }, journeyInfo.points!, 0)).map((r) => r.id) : undefined;
  const refreshJourney = () => { setSelectedRouteId(undefined); setJourney((j) => ({ ...j, revision: j.revision + 1 })); };
  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setUploading(true);
    try {
      await emailSignIn(
        authEmail,
        authPassword,
        authName,
        authMode === "signup",
      );
      setAuthPassword("");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setUploading(false);
    }
  };
  const signOut = async () => {
    try {
      clearDraft();
      await logOut();
      setScreen("explore");
      setAuthEmail("");
      setAuthPassword("");
      setPhoto(undefined);
    } catch (e) {
      setToast(String(e));
    }
  };
  const chooseGPS = () => {
    setReportError("");
    if (!navigator.geolocation) {
      setReportError(
        "Location is unavailable in this browser. Choose a point on the map instead.",
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setReportLat(p.coords.latitude);
        setReportLng(p.coords.longitude);
        setReportLocation(
          `GPS location (${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)})`,
        );
        setToast("GPS location added");
      },
      () =>
        setReportError(
          "Could not access GPS. Allow location permission or choose a point on the map.",
        ),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  const pickLocation = (lat: number, lng: number) => {
    setReportLat(lat);
    setReportLng(lng);
    setReportLocation(`Map point (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
    setToast("Map location selected");
  };
  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportError("");
    if (uploading) return;
    if (!user) {
      setReportError("Sign in before submitting a report.");
      return;
    }
    if (!reportLocation.trim() || reportLat === null || reportLng === null) {
      setReportError("Choose a location using GPS or the map.");
      return;
    }
    if (reportDesc.trim().length < 12 || reportDesc.length > 1000) {
      setReportError("Description must be 12–1000 characters.");
      return;
    }
    if (!photo) {
      setReportError("Capture a live camera photo before submitting.");
      return;
    }
    setUploading(true);
    if (!user.verified) {
      try {
        const refreshed = await refreshVerification();
        setUser(refreshed);
        if (!refreshed.verified) {
          setUploading(false);
          setReportError(
            "Verify your email first. Use Resend verification email above, open the link in your inbox or Spam, then click I’ve verified my email. Your report stays here.",
          );
          return;
        }
      } catch (error) {
        setUploading(false);
        setReportError(
          error instanceof Error
            ? error.message
            : "Could not check verification. Try again.",
        );
        return;
      }
    }
    const observed = new Date(reportTime).getTime();
    if (
      !Number.isFinite(observed) ||
      observed > Date.now() + 60000 ||
      observed < Date.now() - 86400000
    ) {
      setUploading(false);
      setReportError("Observation time must be within the last 24 hours.");
      return;
    }
    setUploading(true);
    try {
      const id = crypto.randomUUID();
      const url = await prepareCameraPhoto(photo);
      const report: Incident = {
        id,
        corridor,
        title: `${reportType} report`,
        type: reportType,
        status: "orange",
        review: "pending",
        location: reportLocation,
        description: reportDesc.trim(),
        observedAt: new Date(observed).toISOString(),
        lat: reportLat,
        lng: reportLng,
        photo: url,
        reporter: user.email,
        decisionHistory: [],
      };
      await createReport(report);
      clearDraft();
      setReportDesc("");
      setPhoto(undefined);
      setPhotoName("");
      setToast("Report submitted. Earn 50 points when an admin verifies it.");
      setScreen("mine");
    } catch (e) {
      setReportError(
        e instanceof Error
          ? e.message
          : "Submission failed. Your draft is retained.",
      );
    } finally {
      setUploading(false);
    }
  };
  const decide = async (id: string, action: ReviewStatus) => {
    if (reviewBusy) return;
    setReviewBusy(id);
    try {
      await reviewReport(id, action, reviewNotes[id] || "");
      setReviewNotes((previous) => ({ ...previous, [id]: "" }));
      setToast(`Review saved: ${action}`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Review failed.");
    } finally {
      setReviewBusy(null);
    }
  };
  if (!user)
    return (
      <div className="auth-shell">
        <a className="emergency-call auth-emergency" href="tel:112" aria-label="Call emergency number 112"><PhoneCall size={17}/><span>Emergency · 112</span></a>
        <div className="auth-art">
          <div className="auth-brand">
            <span className="brand-mark">
              <Mountain size={24} />
            </span>
            <span>
              safe<span className="brand-light">Yatri</span>
            </span>
          </div>
          <div className="auth-message">
            <span className="eyebrow">NORTHEAST INDIA · ROAD AWARENESS</span>
            <h1>
              Know the Road.
              <br />
              <em>Travel with Confidence.</em>
            </h1>
            <p>
              Community-powered road observations to help you make more informed
              journeys through the hills.
            </p>
            <div className="auth-pills">
              <span>
                <ShieldCheck size={15} /> Review-aware reports
              </span>
              <span>
                <MapPin size={15} /> Corridor intelligence
              </span>
            </div>
          </div>
          <div className="auth-art-footer">
            Explore 80+ hill towns and gateways across the Northeast
          </div>
        </div>
        <div className="auth-panel">
          <div className="auth-card">
            <div className="mobile-auth-brand">
              <span className="brand-mark">
                <Mountain size={22} />
              </span>
              <strong>safeYatri</strong>
            </div>
            <span className="eyebrow">YOUR JOURNEY STARTS HERE</span>
            <h2>
              {authMode === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="muted">
              {authMode === "login"
                ? "Sign in to explore road updates and report conditions."
                : "Join travellers sharing timely road observations."}
            </p>
            <form onSubmit={signIn} className="stack-form">
              {authMode === "signup" && (
                <label>
                  Full name
                  <input
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Your name"
                    required
                  />
                </label>
              )}
              <label>
                Email address
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  minLength={6}
                  required
                  autoComplete={
                    authMode === "login" ? "current-password" : "new-password"
                  }
                />
              </label>
              {authError && <div className="error-box">{authError}</div>}
              <button
                className="btn btn-primary btn-wide"
                type="submit"
                disabled={uploading || !firebaseReady}
              >
                <LogIn size={17} />
                {authMode === "login" ? "Sign in" : "Create account"}
                <ArrowRight size={17} />
              </button>
            </form>
            <div className="auth-divider">
              <span>OR CONTINUE WITH</span>
            </div>
            <button
              className="btn btn-outline btn-wide"
              disabled={uploading || !firebaseReady}
              onClick={async () => {
                try {
                  await googleSignIn();
                } catch (e) {
                  setAuthError(
                    e instanceof Error ? e.message : "Google sign-in failed.",
                  );
                }
              }}
            >
              <span className="google-g">G</span> Continue with Google
            </button>
            <button
              className="text-link"
              onClick={async () => {
                try {
                  await resetPassword(authEmail);
                  setAuthError("Password reset email sent. Check your inbox.");
                } catch (e) {
                  setAuthError(
                    e instanceof Error
                      ? e.message
                      : "Could not reset password.",
                  );
                }
              }}
            >
              Forgot password?
            </button>
            <p className="auth-switch">
              {authMode === "login"
                ? "New to safeYatri?"
                : "Already have an account?"}{" "}
              <button
                onClick={() => {
                  setAuthMode(authMode === "login" ? "signup" : "login");
                  setAuthError("");
                }}
              >
                {authMode === "login" ? "Create account" : "Sign in"}
              </button>
            </p>
            <div className="demo-admin-note">
              <ShieldCheck size={17} />
              <div>
                <strong>
                  {firebaseReady
                    ? "Secure Firebase sign-in"
                    : "Firebase connection needed"}
                </strong>
                <span>
                  {firebaseReady
                    ? "Only the verified owner of the configured admin email can review reports."
                    : "Connect your Firebase project in .env.local to enable login and signup."}
                </span>
              </div>
            </div>
            <p className="auth-legal">
              Camera evidence is required for reports. Approved contributions
              earn 50 community points. Points have no cash value.
            </p>
          </div>
        </div>
      </div>
    );
  return (
    <div
      className={`app-shell ${user.role === "reviewer" ? "admin-workspace" : "traveller-workspace"}`}
    >
      <header className="topbar">
        <button
          className="mobile-menu icon-btn"
          aria-label="Open navigation"
          onClick={() => setMobileNav(!mobileNav)}
        >
          <Menu size={20} />
        </button>
        <button
          className="brand-button"
          onClick={() =>
            setScreen(user.role === "reviewer" ? "review" : "dashboard")
          }
        >
          <span className="brand-mark">
            <Mountain size={21} />
          </span>
          <span className="brand-word">
            safe<span>Yatri</span>
          </span>
        </button>
        <div className="topbar-center">
          <span className="live-dot" />{" "}
          <span>
            {user.role === "reviewer"
              ? "ADMIN CONTROL CENTRE"
              : "YOUR NORTHEAST TRAVEL COMPANION"}
          </span>
        </div>
        <div className="topbar-right">
          <a
            className="emergency-call"
            href="tel:112"
            aria-label="Call emergency number 112"
            title="Emergency assistance · dial 112"
          >
            <PhoneCall size={17} />
            <span>112</span>
          </a>
          <button
            className="icon-btn notification-btn"
            title={`${closureCount} known closures on checked routes`}
            aria-label={`View route advisories: ${closureCount} known closures`}
            onClick={() => { setScreen("explore"); setToast(closureCount ? `${closureCount} known closure(s) on checked road options. See blockage cards and compare routes.` : "No mapped closures found for the checked routes. Check official advisories before departure."); }}
          >
            <Bell size={18} />
            {closureCount > 0 && <i />}
          </button>
          <button
            className="user-chip account-trigger"
            onClick={() => setScreen("account")}
            aria-label={`My account: ${user.email}`}
          >
            <span className="avatar">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="user-identity">
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </span>
            <span className="role-label">
              {user.role === "reviewer" ? "Admin" : "Traveller"}
            </span>
          </button>
          <button className="icon-btn" title="Sign out" onClick={signOut}>
            <LogOut size={17} />
          </button>
        </div>
      </header>
      <div className="app-body">
        <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
          <div className="sidebar-label">
            {user.role === "reviewer"
              ? "ADMIN WORKSPACE"
              : "TRAVELLER WORKSPACE"}
          </div>
          {user.role !== "reviewer" && (
            <button
              className={`nav-link ${screen === "dashboard" ? "nav-active" : ""}`}
              onClick={() => {
                setScreen("dashboard");
                setMobileNav(false);
              }}
            >
              <UserRound size={18} />
              My dashboard
            </button>
          )}
          <button
            className={`nav-link ${screen === "explore" ? "nav-active" : ""}`}
            onClick={() => {
              setScreen("explore");
              setMobileNav(false);
            }}
          >
            <Compass size={18} /> Explore roads
          </button>
          <button
            className={`nav-link ${screen === "report" ? "nav-active" : ""}`}
            onClick={() => {
              setScreen("report");
              setMobileNav(false);
            }}
          >
            <Plus size={18} /> Report an incident
          </button>
          <button
            className={`nav-link ${screen === "mine" ? "nav-active" : ""}`}
            onClick={() => {
              setScreen("mine");
              setMobileNav(false);
            }}
          >
            <FileText size={18} /> My reports{" "}
            <span className="nav-count">{myReports.length}</span>
          </button>
          {user.role === "reviewer" && (
            <>
              <div className="sidebar-label sidebar-label-spaced">
                REVIEW TOOLS
              </div>
              <button
                className={`nav-link ${screen === "zones" ? "nav-active" : ""}`}
                onClick={() => {
                  setScreen("zones");
                  setMobileNav(false);
                }}
              >
                <MapIcon size={18} />
                Zone control
              </button>
              <button
                className={`nav-link ${screen === "review" ? "nav-active" : ""}`}
                onClick={() => {
                  setScreen("review");
                  setMobileNav(false);
                }}
              >
                <ShieldCheck size={18} /> Admin dashboard{" "}
                <span className="nav-count pending-count">
                  {pending.length}
                </span>
              </button>
            </>
          )}
          <button
            className={`nav-link ${screen === "membership" ? "nav-active" : ""}`}
            onClick={() => {
              setScreen("membership");
              setMobileNav(false);
            }}
          >
            <Users size={18} /> Rewards & membership
          </button>
          <button
            className={`nav-link ${screen === "account" ? "nav-active" : ""}`}
            onClick={() => {
              setScreen("account");
              setMobileNav(false);
            }}
          >
            <UserRound size={18} />
            My account
          </button>
          <SupportMenu
            onChat={() => {
              setChatOpen(true);
              setMobileNav(false);
            }}
            onMessage={setToast}
          />
          <div className="sidebar-bottom">
            <div className="side-help-icon">
              <ShieldCheck size={18} />
            </div>
            <strong>Road reports, reviewed.</strong>
            <p>
              Community observations are not a substitute for official traffic
              or weather instructions.
            </p>
            <button
              className="text-link"
              onClick={() =>
                setToast(
                  "In production, connect verified official sources and publish their expiry times.",
                )
              }
            >
              How status works <ArrowRight size={14} />
            </button>
            <div className="sidebar-footer">
              <span className="online-dot" style={{ background: !online ? "#c59342" : reportsSync.source === "live" ? "#33a479" : "#a0ada6" }}/> {!online ? "Offline · saved data" : reportsSync.source === "live" ? "Community data synced" : "Waiting for sync"}{" "}
              <span>v0.1</span>
            </div>
          </div>
        </aside>
        {mobileNav && (
          <button
            className="mobile-nav-backdrop"
            aria-label="Close navigation"
            onClick={() => setMobileNav(false)}
          />
        )}
        <main className="main-content">
          <section className={`connection-banner ${!online || reportsSync.source === "cache" || zonesSync.source === "cache" ? "connection-cached" : ""}`} aria-label="Connection and data freshness" role="status">
            {online ? <Wifi size={17}/> : <WifiOff size={18}/>}
            <div><strong>{!online ? "You’re offline · last-synced information" : reportsSync.source === "cache" || zonesSync.source === "cache" ? "Showing saved information while reconnecting" : "Connected · community observations synced"}</strong>
              <span>Reports: {reportsSync.syncedAt ? new Date(reportsSync.syncedAt).toLocaleString("en-IN") : "no saved snapshot"} · Zones: {zonesSync.syncedAt ? new Date(zonesSync.syncedAt).toLocaleString("en-IN") : "no saved snapshot"}{!online ? ". Saved photos and route details remain available; map tiles may be unavailable." : ""}</span>
              {online && reportsSync.source === "live" && !reportsSync.cacheAvailable && <span>Device storage is unavailable or full; report details cannot be saved for offline use.</span>}
            </div>
            <button className="btn btn-outline btn-small" disabled={!online || journeyInfo.loading} onClick={() => { setScreen("explore"); refreshJourney(); }}><RefreshCw size={14}/>Refresh route</button>
          </section>
          {screen === "account" && <AccountPage user={user} />}
          {screen === "dashboard" && (
            <TravellerDashboard
              user={user}
              reports={incidents}
              onNavigate={setScreen}
            />
          )}
          {!user.verified && (
            <VerificationNotice
              user={user}
              onVerified={(verifiedUser) => {
                setUser(verifiedUser);
                setReportError("");
                setToast("Email verified. You can submit your report now.");
              }}
            />
          )}
          {screen === "zones" &&
            (user.role === "reviewer" ? (
              <ZoneEditor saved={savedZones} onSaved={setToast} />
            ) : (
              <div className="empty-large">
                <h2>Administrator access required</h2>
                <p>Only the administrator can change zone advisories.</p>
              </div>
            ))}
          {screen === "membership" && (
            <Membership user={user} from={from} to={to} />
          )}
          {screen === "explore" && (
            <>
              <div className="page-heading explore-heading mountain-heading">
                <div>
                  <span className="eyebrow">A LITTLE CLARITY. A BETTER JOURNEY.</span>
                  <h1>The hills are calling.</h1>
                  <p>
                    Find your way through the Northeast with route options,
                    community updates and a little more peace of mind.
                  </p>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => setScreen("report")}
                >
                  <Plus size={17} /> Report a road issue
                </button>
              </div>
              <datalist id="northeast-places">
                {PLACES.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.state}
                  </option>
                ))}
              </datalist>
              <div className="journey-card">
                <div className="journey-icon">
                  <Route size={20} />
                </div>
                <div className="journey-fields">
                  <label>
                    STARTING POINT
                    <div className="input-with-icon">
                      <MapPin size={16} />
                      <input
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        list="northeast-places"
                        aria-label="Starting point"
                        placeholder="Where from?"
                      />
                    </div>
                  </label>
                  <button
                    className="swap-btn"
                    aria-label="Swap start and destination"
                    onClick={() => {
                      setFrom(to);
                      setTo(from);
                      setRouteMessage("");
                    }}
                  >
                    <ArrowDownUp size={17} />
                  </button>
                  <label>
                    DESTINATION
                    <div className="input-with-icon">
                      <Navigation size={16} />
                      <input
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        list="northeast-places"
                        aria-label="Destination"
                        placeholder="Where to?"
                      />
                    </div>
                  </label>
                </div>
                <button
                  className="btn btn-dark"
                  onClick={() => {
                    const a = PLACES.find(
                        (p) =>
                          p.name.toLowerCase() === from.trim().toLowerCase(),
                      ),
                      b = PLACES.find(
                        (p) => p.name.toLowerCase() === to.trim().toLowerCase(),
                      );
                    if (!a || !b) {
                      setRouteMessage(
                        "Choose both places from the Northeast suggestions.",
                      );
                      return;
                    }
                    if (a.name === b.name) {
                      setRouteMessage("Choose a different destination.");
                      return;
                    }
                    setFrom(a.name);
                    setTo(b.name);
                    setSelectedRouteId(undefined);
                    setJourneyInfo({ loading: true, error: "", distance: 0, duration: 0, zones: [] });
                    try { localStorage.setItem(`safeyatri.lastJourney.${user.uid}`, JSON.stringify({ from: a.name, to: b.name })); } catch { /* Journey remains usable in memory. */ }
                    setJourney((previous) => ({
                      from: a.name,
                      to: b.name,
                      revision: previous.revision + 1,
                    }));
                    setView("map");
                    setSelected(null);
                    setRouteMessage(
                      `${a.name}, ${a.state} → ${b.name}, ${b.state}. Comparing road options against mapped blockages.`,
                    );
                  }}
                >
                  <Route size={16} /> Check journey
                </button>
              </div>
              {routeMessage && (
                <div className="route-message">
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(journey.from)}&destination=${encodeURIComponent(journey.to)}&travelmode=driving`}
                  >
                    Compare directions in Google Maps ↗
                  </a>
                  <Navigation size={16} />
                  {routeMessage} External directions may use different roads; check the marked closures.
                  <button
                    onClick={() => setRouteMessage("")}
                    aria-label="Dismiss"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
              <div className="zone-visibility">
                <label>
                  <input
                    type="checkbox"
                    checked={showDemoZones}
                    onChange={(e) => setShowDemoZones(e.target.checked)}
                  />
                  Show demo zones
                </label>
                <span>
                  {showDemoZones
                    ? "Dashed zones are fictional examples, not live warnings."
                    : "Demo examples hidden."}{" "}
                  Solid zones are administrator advisories.
                </span>
              </div>
              <JourneySummary
                from={journey.from}
                to={journey.to}
                info={journeyInfo}
                offline={!online}
                onSelectRoute={setSelectedRouteId}
                onMessage={setToast}
              />
              <BlockageFeed zones={checkedZones} reports={incidents} offline={!online || reportsSync.source === "cache" || zonesSync.source === "cache"} onReport={(report) => { setSelected(report.id); setRecentOnly(false); setFilter("all"); setSearch(""); window.setTimeout(() => document.querySelector(".selected-detail")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" }), 100); }}/>
              <div className="summary-strip">
                {counts.map((c) => (
                  <button
                    className={`summary-item ${filter === c.status ? "summary-selected" : ""}`}
                    key={c.status}
                    onClick={() =>
                      setFilter(filter === c.status ? "all" : c.status)
                    }
                  >
                    <span
                      className="summary-dot"
                      style={{
                        background: COLORS[c.status],
                        border:
                          c.status === "white"
                            ? "1px solid #94a3b8"
                            : undefined,
                      }}
                    />
                    <span className="summary-label">
                      {STATUS_LABEL[c.status]}
                    </span>
                    <strong>{c.count}</strong>
                  </button>
                ))}
              </div>
              <div className="explore-toolbar">
                <div className="corridor-select">
                  <label htmlFor="corridor">ROAD CORRIDOR</label>
                  <div>
                    <Route size={17} />
                    <select
                      id="corridor"
                      value={corridor}
                      onChange={(e) => {
                        setCorridor(e.target.value);
                        setSelected(null);
                        const [start, end] = e.target.value
                          .split(" · ")[1]
                          .split("–");
                        const startPlace = PLACES.find(
                          (p) =>
                            p.name === start || p.name.startsWith(start + " ("),
                        );
                        const endPlace = PLACES.find(
                          (p) =>
                            p.name === end || p.name.startsWith(end + " ("),
                        );
                        if (startPlace && endPlace) {
                          setFrom(startPlace.name);
                          setTo(endPlace.name);
                          setRouteMessage("");
                        }
                      }}
                    >
                      {CORRIDORS.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown size={15} />
                  </div>
                </div>
                <div className="toolbar-actions">
                  <label className="freshness-toggle">
                    <input
                      type="checkbox"
                      checked={recentOnly}
                      onChange={(e) => setRecentOnly(e.target.checked)}
                    />
                    Last 24 hours
                  </label>
                  <div className="search-box">
                    <Filter size={16} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search road reports"
                      aria-label="Search road reports"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        aria-label="Clear search"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <div className="view-switch">
                    <button
                      className={view === "map" ? "view-active" : ""}
                      onClick={() => setView("map")}
                    >
                      <MapIcon size={15} /> Map
                    </button>
                    <button
                      className={view === "list" ? "view-active" : ""}
                      onClick={() => setView("list")}
                    >
                      <SlidersHorizontal size={15} /> List
                    </button>
                  </div>
                </div>
              </div>
              <div
                className={`explore-layout ${view === "list" ? "list-layout" : ""}`}
              >
                <section className="map-section" id="journey-map">
                  <div className="map-top-label">
                    <span>
                      <span className="live-dot" /> {journey.from} →{" "}
                      {journey.to}{" "}
                      <span className="map-muted">· Journey map</span>
                    </span>
                    <span className="map-layer-label">
                      <MapPin size={13} /> Admin zones & reports
                    </span>
                  </div>
                  <div className="map-frame">
                    <MapContainer
                      center={[27.12, 88.48]}
                      zoom={9}
                      scrollWheelZoom={true}
                      className="leaflet-map"
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <JourneyLayers
                        from={journey.from}
                        to={journey.to}
                        requestKey={journey.revision}
                        zones={zones}
                        incidents={incidents}
                        selectedRouteId={selectedRouteId}
                        onInfo={setJourneyInfo}
                      />
                      {visible.map((i) => (
                        <Marker
                          key={i.id}
                          position={[i.lat, i.lng]}
                          icon={pinIcon(i.status)}
                          eventHandlers={{ click: () => setSelected(i.id) }}
                        >
                          <Popup>
                            <strong>{i.title}</strong>
                            <br />
                            {STATUS_LABEL[i.status]}
                            <br />
                            <small>
                              {i.fictional
                                ? "Fictional demo incident"
                                : i.location}
                            </small>
                            {i.photo && <img className="popup-evidence" src={i.photo} alt={`Submitted road evidence at ${i.location}`}/>}
                            <p>{i.description}</p>
                            <small>{REVIEW_LABEL[i.review]} · {new Date(i.observedAt).toLocaleString("en-IN")}</small>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                    <div className="map-key zone-key">
                      <span><i style={{ background: "#dc4b50" }}/>Blocked road section</span>
                      <span><i style={{ background: "#0f8a7c" }}/>Selected route</span>
                      {Object.entries(ZONE_LABELS).map(([status, label]) => (
                        <span key={status}>
                          <i
                            style={{
                              background:
                                ZONE_COLORS[status as keyof typeof ZONE_COLORS],
                            }}
                          />
                          {label}
                        </span>
                      ))}
                    </div>
                    <div className="map-instruction">
                      <MapPin size={14} /> Tap a zone or marker for details
                    </div>
                  </div>
                  <div className="map-footnote">
                    <AlertTriangle size={15} />
                    <span>
                      Reports are observations, not live navigation. Green is
                      not guaranteed safe; no reports means insufficient data.
                    </span>
                  </div>
                </section>
                <aside className="details-panel">
                  <div className="details-heading">
                    <div>
                      <span className="eyebrow">CHECKED ROUTE UPDATES</span>
                      <h3>
                        Road observations <span>{visible.length}</span>
                      </h3>
                    </div>
                    <button
                      className="icon-btn small"
                      title="Clear status filter"
                      onClick={() => setFilter("all")}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="incident-list">
                    {visible.length === 0 ? (
                      <div className="empty-state">
                        <CircleHelp size={27} />
                        <strong>No matching reports</strong>
                        <p>
                          No matching reports are available for these filters.
                          This is not evidence that the road is safe.
                        </p>
                        <button
                          className="btn btn-outline btn-small"
                          onClick={() => {
                            setFilter("all");
                            setSearch("");
                          }}
                        >
                          Clear filters
                        </button>
                      </div>
                    ) : (
                      visible.map((i) => (
                        <button
                          key={i.id}
                          className={`incident-row ${selected === i.id ? "incident-selected" : ""}`}
                          onClick={() => setSelected(i.id)}
                        >
                          <span
                            className="incident-row-dot"
                            style={{
                              background: COLORS[i.status],
                              border:
                                i.status === "white"
                                  ? "1px solid #94a3b8"
                                  : undefined,
                            }}
                          />
                          <span className="incident-row-content">
                            <strong>{i.title}</strong>
                            <span>
                              <MapPin size={12} />
                              {i.location}
                            </span>
                            <span>
                              <Clock3 size={12} />
                              {new Date(i.observedAt).toLocaleString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span className="incident-tags">
                              <i className={statusClass(i.status)}>
                                {STATUS_LABEL[i.status]}
                              </i>
                              <i className={`review-tag review-${i.review}`}>
                                {REVIEW_LABEL[i.review]}
                              </i>
                            </span>
                          </span>
                          <ArrowRight className="row-arrow" size={16} />
                        </button>
                      ))
                    )}
                  </div>
                  {active && (
                    <div className="selected-detail">
                      <div className="selected-detail-top">
                        <span className={statusClass(active.status)}>
                          {STATUS_LABEL[active.status]}
                        </span>
                        <span className={`review-tag review-${active.review}`}>
                          {REVIEW_LABEL[active.review]}
                        </span>
                      </div>
                      {active.photo && (
                        <img
                          className="detail-photo"
                          src={active.photo}
                          alt="Submitted road evidence"
                        />
                      )}
                      <h4>{active.title}</h4>
                      <p className="detail-location">
                        <MapPin size={14} />
                        {active.location}
                      </p>
                      <p className="detail-description">{active.description}</p>
                      {Date.now() - Date.parse(active.observedAt) >=
                        86400000 && (
                        <div className="fictional-note">
                          Older than 24 hours · conditions may have changed.
                        </div>
                      )}
                      <div className="detail-meta">
                        <span>
                          <Clock3 size={14} />
                          Observed{" "}
                          {new Date(active.observedAt).toLocaleString("en-IN")}
                        </span>
                        <span>
                          <ShieldCheck size={14} />
                          {active.review === "verified"
                            ? "Reviewer confirmed"
                            : active.review === "pending"
                              ? "Awaiting verification"
                              : REVIEW_LABEL[active.review]}
                        </span>
                      </div>
                      {active.fictional && (
                        <div className="fictional-note">
                          <AlertTriangle size={14} /> Fictional incident for
                          interface demonstration only.
                        </div>
                      )}
                      <button
                        className="btn btn-outline btn-wide"
                        onClick={() => {
                          setReportLocation(active.location);
                          setReportLat(active.lat);
                          setReportLng(active.lng);
                          setScreen("report");
                        }}
                      >
                        <Flag size={15} /> Report an update here
                      </button>
                    </div>
                  )}
                </aside>
              </div>
              <TravelKit uid={user.uid} from={journey.from} to={journey.to}/>
              <section className="advisory-card">
                <div className="advisory-icon">
                  <CloudRain size={20} />
                </div>
                <div className="advisory-content">
                  <div className="advisory-title">
                    Weather advisories{" "}
                    <span className="advisory-separate">
                      SEPARATE FROM ROAD REPORTS
                    </span>
                  </div>
                  <div className="advisory-line">
                    <strong>
                      Check the official forecast before departure
                    </strong>
                    <span>
                      Live weather is not connected. Consult official district
                      notices for closures and permits.
                    </span>
                    <a
                      href="https://mausam.imd.gov.in/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      India Meteorological Department ↗
                    </a>
                  </div>
                </div>
              </section>
            </>
          )}
          {screen === "report" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">HELP OTHER TRAVELLERS</span>
                  <h1>Report a road incident</h1>
                  <p>
                    Share what you observed, where and when. Reports start
                    unverified until reviewed.
                  </p>
                </div>
                <span className="draft-pill">
                  <Check size={14} /> Text draft saves on this device
                </span>
              </div>
              <form className="report-grid" onSubmit={submitReport}>
                <div className="form-card">
                  <div className="section-title">
                    <span className="step-number">01</span>
                    <div>
                      <h3>What did you observe?</h3>
                      <p>Describe the condition you saw first-hand.</p>
                    </div>
                  </div>
                  <label>
                    Road corridor
                    <select
                      value={corridor}
                      onChange={(e) => setCorridor(e.target.value)}
                    >
                      {CORRIDORS.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <small>
                      Select the road where you observed this incident.
                    </small>
                  </label>
                  <label>
                    Incident type
                    <select
                      value={reportType}
                      onChange={(e) =>
                        setReportType(e.target.value as IncidentType)
                      }
                    >
                      {[
                        "Blocked road",
                        "Landslide",
                        "Road damage",
                        "Heavy rain",
                        "Flooding",
                        "Fallen tree",
                        "Other",
                      ].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Observation date and time
                    <input
                      type="datetime-local"
                      value={reportTime}
                      onChange={(e) => setReportTime(e.target.value)}
                      required
                    />
                    <small>
                      Use the time you observed the road, not the time you are
                      submitting.
                    </small>
                  </label>
                  <label>
                    Location description
                    <input
                      value={reportLocation}
                      onChange={(e) => setReportLocation(e.target.value)}
                      placeholder="e.g. 2 km before Rangpo bridge"
                      required
                    />
                  </label>
                  <div className="location-actions">
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={chooseGPS}
                    >
                      <LocateFixed size={16} /> Use my GPS
                    </button>
                    <span>or click any point on the map</span>
                  </div>
                  <div className="report-map">
                    <MapContainer
                      center={
                        reportLat !== null && reportLng !== null
                          ? [reportLat, reportLng]
                          : [27.12, 88.48]
                      }
                      zoom={8}
                      scrollWheelZoom
                      className="leaflet-map"
                    >
                      <TileLayer
                        attribution="&copy; OpenStreetMap contributors"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {reportLat !== null && reportLng !== null && (
                        <Marker
                          position={[reportLat, reportLng]}
                          icon={pinIcon("orange")}
                        />
                      )}
                      <ReportMapFocus lat={reportLat} lng={reportLng} />
                      <MapClick onPick={pickLocation} />
                    </MapContainer>
                    <div className="map-select-hint">
                      <MapPin size={14} />
                      {reportLat !== null && reportLng !== null
                        ? `${reportLat.toFixed(5)}, ${reportLng.toFixed(5)}`
                        : "Tap the map to choose incident location"}
                    </div>
                  </div>
                  <label>
                    Description
                    <textarea
                      value={reportDesc}
                      onChange={(e) => setReportDesc(e.target.value)}
                      rows={4}
                      maxLength={1000}
                      minLength={12}
                      placeholder="What did you see? Include road direction, visible hazards and any useful details…"
                      required
                    />
                    <small>
                      {reportDesc.length}/1000 characters · Minimum 12
                      characters
                    </small>
                  </label>
                </div>
                <div className="form-card evidence-card">
                  <div className="section-title">
                    <span className="step-number">02</span>
                    <div>
                      <h3>Add evidence</h3>
                      <p>
                        A live camera photo is required. No gallery uploads.
                      </p>
                    </div>
                  </div>
                  <CameraCapture
                    onCapture={(value) => {
                      setPhoto(value);
                      setPhotoName(
                        `Camera · ${new Date().toLocaleTimeString("en-IN")}`,
                      );
                      setReportTime(localTime());
                    }}
                  />
                  {photo && (
                    <div className="upload-zone">
                      <img
                        className="upload-preview"
                        src={photo}
                        alt="Live camera evidence preview"
                      />
                      <strong>{photoName}</strong>
                    </div>
                  )}
                  {photo && (
                    <button
                      type="button"
                      className="text-link remove-photo"
                      onClick={() => {
                        setPhoto(undefined);
                        setPhotoName("");
                      }}
                    >
                      <X size={14} /> Remove photo
                    </button>
                  )}
                  <div className="privacy-note">
                    <ShieldCheck size={17} />
                    <span>
                      <strong>Share responsibly</strong> Avoid photographing
                      identifiable people or private details. Photos are
                      uploaded to Firebase for incident review. Avoid faces and
                      vehicle plates.
                    </span>
                  </div>
                  <div className="review-flow">
                    <span className="flow-icon">
                      <FileText size={16} />
                    </span>
                    <div>
                      <strong>Submitted → Pending review</strong>
                      <p>
                        A reviewer will confirm, reject or request
                        clarification. Your report is not treated as verified
                        yet.
                      </p>
                    </div>
                  </div>
                  {reportError && (
                    <div className="error-box">{reportError}</div>
                  )}
                  {reportSuccess && (
                    <div className="success-box">
                      <CheckCircle2 size={17} />
                      {reportSuccess}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary btn-wide"
                    disabled={uploading}
                  >
                    <Flag size={17} /> Submit report <ArrowRight size={17} />
                  </button>
                  <p className="form-footnote">
                    Text drafts stay on this device. Camera evidence is not
                    saved in drafts; recapture after refresh.
                  </p>
                </div>
              </form>
            </>
          )}
          {screen === "mine" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">YOUR CONTRIBUTIONS</span>
                  <h1>My reports</h1>
                  <p>
                    Track review progress and see what happens after submission.
                  </p>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => setScreen("report")}
                >
                  <Plus size={17} /> New report
                </button>
              </div>
              <div className="mine-stats">
                <div>
                  <span>Total submissions</span>
                  <strong>{myReports.length}</strong>
                </div>
                <div>
                  <span>Pending review</span>
                  <strong>
                    {
                      myReports.filter(
                        (r) =>
                          r.review === "pending" ||
                          r.review === "clarification",
                      ).length
                    }
                  </strong>
                </div>
                <div>
                  <span>Confirmed</span>
                  <strong>
                    {myReports.filter((r) => r.review === "verified").length}
                  </strong>
                </div>
              </div>
              {myReports.length === 0 ? (
                <div className="empty-large">
                  <div className="empty-illustration">
                    <FileText size={30} />
                  </div>
                  <h3>Your reports will appear here</h3>
                  <p>
                    You haven't submitted a report yet. Help other travellers by
                    sharing a current road observation.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={() => setScreen("report")}
                  >
                    <Plus size={17} /> Create your first report
                  </button>
                </div>
              ) : (
                <div className="my-report-list">
                  {myReports.map((r) => (
                    <article className="my-report-card" key={r.id}>
                      <div
                        className="my-report-icon"
                        style={{
                          color: COLORS[r.status],
                          background: `${COLORS[r.status]}18`,
                        }}
                      >
                        <Flag size={20} />
                      </div>
                      <div className="my-report-body">
                        <div className="my-report-title">
                          <h3>{r.title}</h3>
                          <span className={`review-tag review-${r.review}`}>
                            {REVIEW_LABEL[r.review]}
                          </span>
                        </div>
                        <p>
                          <MapPin size={14} />
                          {r.location}
                        </p>
                        <p>
                          <Clock3 size={14} />
                          Observed{" "}
                          {new Date(r.observedAt).toLocaleString("en-IN")}
                        </p>
                        <p className="my-report-description">{r.description}</p>
                        {r.photo && (
                          <img
                            src={r.photo}
                            className="my-report-photo"
                            alt="Your submitted evidence"
                          />
                        )}
                        {r.decisionHistory.length > 0 && (
                          <div className="history-mini">
                            <strong>Latest update</strong>
                            <span>
                              {r.decisionHistory[0].action} ·{" "}
                              {new Date(r.decisionHistory[0].at).toLocaleString(
                                "en-IN",
                              )}
                              {r.decisionHistory[0].note
                                ? ` — ${r.decisionHistory[0].note}`
                                : ""}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className={statusClass(r.status)}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
          {screen === "review" && (
            <>
              {user.role !== "reviewer" ? (
                <div className="empty-large">
                  <ShieldCheck size={34} />
                  <h3>Administrator access required</h3>
                  <p>
                    Only accounts with a verified administrator email can review
                    reports.
                  </p>
                </div>
              ) : (
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">
                        ADMIN ONLY · COMMUNITY SAFETY WORKFLOW
                      </span>
                      <h1>Admin dashboard</h1>
                      <p>
                        Inspect evidence, make a decision and keep a transparent
                        review history.
                      </p>
                    </div>
                    <div className="reviewer-identity">
                      <span className="avatar">
                        <ShieldCheck size={17} />
                      </span>
                      <span>
                        <strong>Administrator</strong>
                        <small>{user.email}</small>
                      </span>
                    </div>
                  </div>
                  <div className="review-metrics">
                    <div>
                      <span className="metric-icon metric-orange">
                        <Clock3 size={18} />
                      </span>
                      <span>
                        Awaiting review<strong>{pending.length}</strong>
                      </span>
                    </div>
                    <div>
                      <span className="metric-icon metric-green">
                        <CheckCircle2 size={18} />
                      </span>
                      <span>
                        Confirmed
                        <strong>
                          {
                            incidents.filter((i) => i.review === "verified")
                              .length
                          }
                        </strong>
                      </span>
                    </div>
                    <div>
                      <span className="metric-icon metric-blue">
                        <MessageSquare size={18} />
                      </span>
                      <span>
                        Clarification
                        <strong>
                          {
                            incidents.filter(
                              (i) => i.review === "clarification",
                            ).length
                          }
                        </strong>
                      </span>
                    </div>
                  </div>
                  <div className="review-toolbar">
                    <div>
                      <h3>Incident queue</h3>
                      <p>
                        Confirm accurate reports to award 50 points once. Your
                        own reports can be reviewed without earning points.
                      </p>
                    </div>
                    <div className="view-switch">
                      <button
                        className={
                          reviewFilter === "pending" ? "view-active" : ""
                        }
                        onClick={() => setReviewFilter("pending")}
                      >
                        Needs action
                      </button>
                      <button
                        className={reviewFilter === "all" ? "view-active" : ""}
                        onClick={() => setReviewFilter("all")}
                      >
                        All reports
                      </button>
                    </div>
                  </div>
                  <div className="review-list">
                    {(reviewFilter === "pending" ? pending : incidents)
                      .length === 0 ? (
                      <div className="empty-state">
                        <CheckCircle2 size={28} />
                        <strong>Review queue is clear</strong>
                        <p>
                          No reports need review right now. This is a workflow
                          status, not a road-safety claim.
                        </p>
                      </div>
                    ) : (
                      (reviewFilter === "pending" ? pending : incidents).map(
                        (r) => (
                          <article className="review-card" key={r.id}>
                            <div className="review-card-main">
                              <div className="review-card-title">
                                <div>
                                  <span className={statusClass(r.status)}>
                                    {STATUS_LABEL[r.status]}
                                  </span>
                                  <span
                                    className={`review-tag review-${r.review}`}
                                  >
                                    {REVIEW_LABEL[r.review]}
                                  </span>
                                </div>
                                <span className="review-id">{r.id}</span>
                              </div>
                              <h3>{r.title}</h3>
                              <p className="review-location">
                                <MapPin size={14} />
                                {r.location} · {r.corridor}
                              </p>
                              <p>{r.description}</p>
                              {r.photo ? (
                                <img
                                  className="review-evidence"
                                  src={r.photo}
                                  alt="Incident evidence"
                                />
                              ) : (
                                <div className="no-evidence">
                                  <Upload size={16} />
                                  No photo attached
                                </div>
                              )}
                              <div className="review-meta">
                                <span>
                                  <UserRound size={14} />
                                  {r.reporter}
                                </span>
                                <span>
                                  <Clock3 size={14} />
                                  Observed{" "}
                                  {new Date(r.observedAt).toLocaleString(
                                    "en-IN",
                                  )}
                                </span>
                                {r.fictional && (
                                  <span className="fictional-label">
                                    Fictional demo incident
                                  </span>
                                )}
                              </div>
                              <div className="decision-history">
                                <strong>Decision history</strong>
                                {r.decisionHistory.length === 0 ? (
                                  <span>No decisions recorded yet.</span>
                                ) : (
                                  r.decisionHistory.map((h, idx) => (
                                    <span key={`${h.at}-${idx}`}>
                                      <CheckCircle2 size={13} />
                                      {h.action} by {h.by} ·{" "}
                                      {new Date(h.at).toLocaleString("en-IN")}
                                      {h.note ? ` — ${h.note}` : ""}
                                    </span>
                                  ))
                                )}
                              </div>
                              <label className="review-note-label">
                                Reviewer note (optional)
                                <textarea
                                  value={reviewNotes[r.id] || ""}
                                  onChange={(e) =>
                                    setReviewNotes((previous) => ({
                                      ...previous,
                                      [r.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="Reason, clarification requested or evidence checked…"
                                  maxLength={1000}
                                  rows={2}
                                />
                              </label>
                              {r.reporterId === user.uid && (
                                <p className="self-review-note">
                                  This is your own report. You can review it,
                                  but no reward points will be awarded.
                                </p>
                              )}
                              <fieldset
                                className="review-actions"
                                disabled={Boolean(reviewBusy)}
                              >
                                <button
                                  className="btn btn-success"
                                  onClick={() => decide(r.id, "verified")}
                                >
                                  <CheckCircle2 size={16} /> Confirm report
                                </button>
                                <button
                                  className="btn btn-outline"
                                  onClick={() => decide(r.id, "clarification")}
                                >
                                  <MessageSquare size={16} /> Request
                                  clarification
                                </button>
                                <button
                                  className="btn btn-danger-outline"
                                  onClick={() => decide(r.id, "rejected")}
                                >
                                  <X size={16} /> Reject
                                </button>
                                {r.review !== "pending" && (
                                  <button
                                    className="btn btn-outline"
                                    onClick={() => decide(r.id, "pending")}
                                  >
                                    <ArrowLeft size={16} /> Reopen
                                  </button>
                                )}
                              </fieldset>
                            </div>
                          </article>
                        ),
                      )
                    )}
                  </div>
                </>
              )}
            </>
          )}
          <footer className="app-footer">
            <span>© 2026 safeYatri · Northeast road community</span>
            <span>Map data © OpenStreetMap contributors</span>
            <span>Live reports powered by Firebase</span>
          </footer>
        </main>
      </div>
      <HelpPanel
        user={user}
        reports={incidents}
        context={{ from: journey.from, to: journey.to, distance: journeyInfo.distance, duration: journeyInfo.duration, zones: journeyInfo.zones, alternatives: journeyInfo.alternatives, syncedAt: journeyInfo.syncedAt, offline: !online, source: journeyInfo.source, reportsSyncedAt: reportsSync.syncedAt || undefined, zonesSyncedAt: zonesSync.syncedAt || undefined, reportsSource: reportsSync.source, zonesSource: zonesSync.source, loading: journeyInfo.loading, reportIds: chatReportIds }}
        open={chatOpen}
        onOpen={setChatOpen}
        onNavigate={(next) => {
          setScreen(next);
          setMobileNav(false);
        }}
      />
      {toast && (
        <div className="toast">
          <CheckCircle2 size={17} />
          {toast}
          <button
            onClick={() => setToast("")}
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
=======
 const [user,setUser] = useState<DemoUser|null>(initialUser);
 const [screen,setScreen] = useState<'explore'|'report'|'mine'|'review'>('explore');
 const [authMode,setAuthMode] = useState<'login'|'signup'>('login');
 const [authEmail,setAuthEmail] = useState(''); const [authPassword,setAuthPassword] = useState(''); const [authName,setAuthName] = useState(''); const [authError,setAuthError] = useState('');
 const [incidents,setIncidents] = useState<Incident[]>(()=>loadIncidents(SEED));
 const [selected,setSelected] = useState<string|null>('demo-1');
 const [corridor,setCorridor] = useState(CORRIDORS[0]); const [view,setView] = useState<'map'|'list'>('map');
 const [filter,setFilter] = useState<RoadStatus|'all'>('all'); const [search,setSearch] = useState(''); const [mobileNav,setMobileNav] = useState(false);
 const [from,setFrom] = useState('Siliguri'); const [to,setTo] = useState('Gangtok'); const [routeMessage,setRouteMessage] = useState('');
 const [reportType,setReportType] = useState<IncidentType>('Landslide'); const [reportDesc,setReportDesc] = useState(''); const [reportLocation,setReportLocation] = useState(''); const [reportTime,setReportTime] = useState(new Date().toISOString().slice(0,16)); const [reportLat,setReportLat] = useState<number|null>(null); const [reportLng,setReportLng] = useState<number|null>(null); const [photo,setPhoto] = useState<string|undefined>(); const [photoName,setPhotoName] = useState(''); const [reportError,setReportError] = useState(''); const [reportSuccess,setReportSuccess] = useState(''); const [uploading,setUploading] = useState(false);
 const [reviewFilter,setReviewFilter] = useState<'pending'|'all'>('pending'); const [reviewNote,setReviewNote] = useState(''); const [toast,setToast] = useState('');
 useEffect(()=>{ if(screen==='report'){ const d=loadDraft<{type:IncidentType;description:string;location:string;observedAt:string;lat:number|null;lng:number|null;photo?:string;photoName:string}>(); if(d){setReportType(d.type||'Landslide');setReportDesc(d.description||'');setReportLocation(d.location||'');setReportTime(d.observedAt||new Date().toISOString().slice(0,16));setReportLat(d.lat??null);setReportLng(d.lng??null);setPhoto(d.photo);setPhotoName(d.photoName||'');}} },[screen]);
 useEffect(()=>{if(screen==='report') saveDraft({type:reportType,description:reportDesc,location:reportLocation,observedAt:reportTime,lat:reportLat,lng:reportLng,photo,photoName});},[screen,reportType,reportDesc,reportLocation,reportTime,reportLat,reportLng,photo,photoName]);
 const visible = useMemo(()=>incidents.filter(i=>i.corridor===corridor && (filter==='all'||i.status===filter) && `${i.title} ${i.location} ${i.description}`.toLowerCase().includes(search.toLowerCase())),[incidents,corridor,filter,search]);
 const active = incidents.find(i=>i.id===selected) || visible[0];
 const myReports = incidents.filter(i=>i.reporter===user?.email && !i.fictional);
 const pending = incidents.filter(i=>i.review==='pending'||i.review==='clarification');
 const counts = (Object.keys(COLORS) as RoadStatus[]).map(status=>({status,count:incidents.filter(i=>i.corridor===corridor&&i.status===status).length}));
 const lastSync = getLastSync();
 const signIn = (e:React.FormEvent)=>{e.preventDefault();setAuthError('');try{setUser(demoSignIn(authEmail,authPassword,authName));setScreen('explore');}catch(err){setAuthError(err instanceof Error?err.message:'Could not sign in.');}};
 const signOut=()=>{demoSignOut();setUser(null);setScreen('explore');setAuthEmail('');setAuthPassword('');};
 const chooseGPS=()=>{setReportError('');if(!navigator.geolocation){setReportError('Location is unavailable in this browser. Choose a point on the map instead.');return;}navigator.geolocation.getCurrentPosition(p=>{setReportLat(p.coords.latitude);setReportLng(p.coords.longitude);setReportLocation(`GPS location (${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)})`);setToast('GPS location added');},()=>setReportError('Could not access GPS. Allow location permission or choose a point on the map.'),{enableHighAccuracy:true,timeout:10000});};
 const pickLocation=(lat:number,lng:number)=>{setReportLat(lat);setReportLng(lng);setReportLocation(`Map point (${lat.toFixed(5)}, ${lng.toFixed(5)})`);setToast('Map location selected');};
 const onPhoto=async(file?:File)=>{if(!file)return;setUploading(true);setReportError('');try{setPhoto(await prepareDemoPhoto(file));setPhotoName(file.name);}catch(e){setReportError(e instanceof Error?e.message:'Photo upload failed.');}finally{setUploading(false);}};
 const submitReport=(e:React.FormEvent)=>{e.preventDefault();setReportError('');setReportSuccess('');if(!reportLocation.trim()||reportLat===null||reportLng===null){setReportError('Choose your location using GPS or the map.');return;}if(reportDesc.trim().length<12){setReportError('Please add a description of at least 12 characters.');return;}const now=new Date().toISOString();const report:Incident={id:`r-${Date.now()}`,corridor,title:`${reportType} report`,type:reportType,status:reportType==='Heavy rain'?'yellow':'orange',review:'pending',location:reportLocation,description:reportDesc.trim(),observedAt:new Date(reportTime).toISOString(),lat:reportLat,lng:reportLng,photo,reporter:user!.email,decisionHistory:[{action:'submitted',by:user!.email,at:now,note:'Awaiting reviewer decision'}]};setIncidents(prev=>createReport(prev,report));setSelected(report.id);clearDraft();setReportDesc('');setPhoto(undefined);setPhotoName('');setReportSuccess('Report submitted to the demo review queue.');setScreen('mine');};
 const decide=(id:string,action:ReviewStatus)=>{setIncidents(prev=>reviewReport(prev,id,action,user?.email||DEMO_ADMIN_EMAIL,reviewNote));setReviewNote('');setToast(`Report ${action==='verified'?'confirmed':action==='rejected'?'rejected':action==='clarification'?'sent back for clarification':'updated'}`);};
 if(!user) return <div className="auth-shell"><div className="auth-art"><div className="auth-brand"><span className="brand-mark"><Mountain size={24}/></span><span>Safe<span className="brand-light">Yatra</span></span></div><div className="auth-message"><span className="eyebrow">NORTHEAST INDIA · ROAD AWARENESS</span><h1>Know the Road.<br/><em>Travel with Confidence.</em></h1><p>Community-powered road observations to help you make more informed journeys through the hills.</p><div className="auth-pills"><span><ShieldCheck size={15}/> Review-aware reports</span><span><MapPin size={15}/> Corridor intelligence</span></div></div><div className="auth-art-footer">A demo experience · Fictional incidents clearly labelled</div></div><div className="auth-panel"><div className="auth-card"><div className="mobile-auth-brand"><span className="brand-mark"><Mountain size={22}/></span><strong>SafeYatra</strong></div><span className="eyebrow">YOUR JOURNEY STARTS HERE</span><h2>{authMode==='login'?'Welcome back':'Create your account'}</h2><p className="muted">{authMode==='login'?'Sign in to explore road updates and report conditions.':'Join travellers sharing timely road observations.'}</p><form onSubmit={signIn} className="stack-form">{authMode==='signup'&&<label>Full name<input value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="Your name" required/></label>}<label>Email address<input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email"/></label><label>Password<input type="password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="At least 6 characters" minLength={6} required autoComplete={authMode==='login'?'current-password':'new-password'}/></label>{authError&&<div className="error-box">{authError}</div>}<button className="btn btn-primary btn-wide" type="submit"><LogIn size={17}/>{authMode==='login'?'Sign in':'Create account'}<ArrowRight size={17}/></button></form><div className="auth-divider"><span>OR CONTINUE WITH</span></div><button className="btn btn-outline btn-wide" onClick={()=>{setAuthEmail(authEmail||'traveller@example.com');setAuthPassword('demo123');setAuthError('Google sign-in requires Firebase configuration. For the demo, enter an email and any password with 6+ characters.');}}><span className="google-g">G</span> Google sign-in <span className="small-tag">Demo UI</span></button><p className="auth-switch">{authMode==='login'?"New to Safe Yatra?":"Already have an account?"} <button onClick={()=>{setAuthMode(authMode==='login'?'signup':'login');setAuthError('');}}>{authMode==='login'?'Create account':'Sign in'}</button></p><div className="demo-admin-note"><ShieldCheck size={17}/><div><strong>Reviewer demo access</strong><span>Use {DEMO_ADMIN_EMAIL} to preview the reviewer dashboard. Any password of 6+ characters works in demo mode.</span></div></div><p className="auth-legal">Demo authentication only. Do not use a real password. Production sign-in and reviewer permissions require Firebase Auth and backend security rules.</p></div></div></div>;
 return <div className="app-shell"><header className="topbar"><button className="mobile-menu icon-btn" aria-label="Open navigation" onClick={()=>setMobileNav(!mobileNav)}><Menu size={20}/></button><button className="brand-button" onClick={()=>setScreen('explore')}><span className="brand-mark"><Mountain size={21}/></span><span className="brand-word">Safe<span>Yatra</span></span></button><div className="topbar-center"><span className="live-dot"/> <span>ROAD AWARENESS NETWORK</span><span className="demo-chip">DEMO MODE</span></div><div className="topbar-right"><button className="icon-btn notification-btn" title="Advisories" onClick={()=>setToast('Weather advisories are separate from road incident reports.')}><Bell size={18}/><i/></button><div className="user-chip"><span className="avatar">{user.name.slice(0,1).toUpperCase()}</span><span className="user-name">{user.name}</span><span className="role-label">{user.role==='reviewer'?'Reviewer':'Traveller'}</span></div><button className="icon-btn" title="Sign out" onClick={signOut}><LogOut size={17}/></button></div></header>
 <div className="app-body"><aside className={`sidebar ${mobileNav?'sidebar-open':''}`}><div className="sidebar-label">WORKSPACE</div><button className={`nav-link ${screen==='explore'?'nav-active':''}`} onClick={()=>{setScreen('explore');setMobileNav(false)}}><Compass size={18}/> Explore roads</button><button className={`nav-link ${screen==='report'?'nav-active':''}`} onClick={()=>{setScreen('report');setMobileNav(false)}}><Plus size={18}/> Report an incident</button><button className={`nav-link ${screen==='mine'?'nav-active':''}`} onClick={()=>{setScreen('mine');setMobileNav(false)}}><FileText size={18}/> My reports <span className="nav-count">{myReports.length}</span></button>{user.role==='reviewer'&&<><div className="sidebar-label sidebar-label-spaced">REVIEW TOOLS</div><button className={`nav-link ${screen==='review'?'nav-active':''}`} onClick={()=>{setScreen('review');setMobileNav(false)}}><ShieldCheck size={18}/> Review dashboard <span className="nav-count pending-count">{pending.length}</span></button></>}<div className="sidebar-bottom"><div className="side-help-icon"><ShieldCheck size={18}/></div><strong>Road reports, reviewed.</strong><p>Community observations are not a substitute for official traffic or weather instructions.</p><button className="text-link" onClick={()=>setToast('In production, connect verified official sources and publish their expiry times.')}>How status works <ArrowRight size={14}/></button><div className="sidebar-footer"><span className="online-dot"/> Local demo storage <span>v0.1</span></div></div></aside>
 <main className="main-content">{screen==='explore'&&<><div className="page-heading explore-heading"><div><span className="eyebrow">PLAN WITH BETTER INFORMATION</span><h1>Explore the roads</h1><p>Road observations across Northeast India. Always check official advisories before departure.</p></div><button className="btn btn-primary" onClick={()=>setScreen('report')}><Plus size={17}/> Report a road issue</button></div><div className="journey-card"><div className="journey-icon"><Route size={20}/></div><div className="journey-fields"><label>STARTING POINT<div className="input-with-icon"><MapPin size={16}/><input value={from} onChange={e=>setFrom(e.target.value)} aria-label="Starting point" placeholder="Where from?"/></div></label><button className="swap-btn" aria-label="Swap start and destination" onClick={()=>{setFrom(to);setTo(from);setRouteMessage('')}}><ArrowDownUp size={17}/></button><label>DESTINATION<div className="input-with-icon"><Navigation size={16}/><input value={to} onChange={e=>setTo(e.target.value)} aria-label="Destination" placeholder="Where to?"/></div></label></div><button className="btn btn-dark" onClick={()=>{if(!from.trim()||!to.trim()){setRouteMessage('Enter both a start and destination.');return;}setRouteMessage(`Journey selected: ${from} → ${to}. Route planning is a demo; inspect each road segment and official updates.`);}}><Route size={16}/> Check journey</button></div>{routeMessage&&<div className="route-message"><Navigation size={16}/>{routeMessage}<button onClick={()=>setRouteMessage('')} aria-label="Dismiss"><X size={15}/></button></div>}<div className="summary-strip">{counts.map(c=><button className={`summary-item ${filter===c.status?'summary-selected':''}`} key={c.status} onClick={()=>setFilter(filter===c.status?'all':c.status)}><span className="summary-dot" style={{background:COLORS[c.status],border:c.status==='white'?'1px solid #94a3b8':undefined}}/><span className="summary-label">{STATUS_LABEL[c.status]}</span><strong>{c.count}</strong></button>)}</div><div className="explore-toolbar"><div className="corridor-select"><label htmlFor="corridor">ROAD CORRIDOR</label><div><Route size={17}/><select id="corridor" value={corridor} onChange={e=>{setCorridor(e.target.value);setSelected(null)}}>{CORRIDORS.map(c=><option key={c}>{c}</option>)}</select><ChevronDown size={15}/></div></div><div className="toolbar-actions"><div className="search-box"><Filter size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search road reports" aria-label="Search road reports"/>{search&&<button onClick={()=>setSearch('')} aria-label="Clear search"><X size={14}/></button>}</div><div className="view-switch"><button className={view==='map'?'view-active':''} onClick={()=>setView('map')}><MapIcon size={15}/> Map</button><button className={view==='list'?'view-active':''} onClick={()=>setView('list')}><SlidersHorizontal size={15}/> List</button></div></div></div><div className={`explore-layout ${view==='list'?'list-layout':''}`}><section className="map-section"><div className="map-top-label"><span><span className="live-dot"/> {corridor.split(' · ')[0]} <span className="map-muted">· Sample corridor</span></span><span className="map-layer-label"><MapPin size={13}/> Incident reports</span></div><div className="map-frame"><MapContainer center={[27.12,88.48]} zoom={9} scrollWheelZoom={true} className="leaflet-map"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><Polyline positions={[[26.9,88.45],[27.02,88.43],[27.1,88.45],[27.17,88.52],[27.2,88.57]]} pathOptions={{color:'#94a3b8',weight:7,opacity:.45}}/><Polyline positions={[[26.9,88.45],[27.02,88.43],[27.1,88.45],[27.17,88.52],[27.2,88.57]]} pathOptions={{color:'#0f766e',weight:3,opacity:.9}}/>{visible.map(i=><Marker key={i.id} position={[i.lat,i.lng]} icon={pinIcon(i.status)} eventHandlers={{click:()=>setSelected(i.id)}}><Popup><strong>{i.title}</strong><br/>{STATUS_LABEL[i.status]}<br/><small>{i.fictional?'Fictional demo incident':i.location}</small></Popup></Marker>)}<MapClick onPick={pickLocation}/></MapContainer><div className="map-key"><span><i style={{background:COLORS.red}}/> Red</span><span><i style={{background:COLORS.orange}}/> Orange</span><span><i style={{background:COLORS.yellow}}/> Yellow</span><span><i style={{background:COLORS.green}}/> Green</span><span><i style={{background:COLORS.white,border:'1px solid #94a3b8'}}/> White</span></div><div className="map-instruction"><MapPin size={14}/> Select a marker for report details</div></div><div className="map-footnote"><AlertTriangle size={15}/><span>Map segments are illustrative. Green does not mean guaranteed safe; white means insufficient data.</span></div></section><aside className="details-panel"><div className="details-heading"><div><span className="eyebrow">CORRIDOR UPDATES</span><h3>Road observations <span>{visible.length}</span></h3></div><button className="icon-btn small" title="Clear status filter" onClick={()=>setFilter('all')}><X size={16}/></button></div><div className="incident-list">{visible.length===0?<div className="empty-state"><CircleHelp size={27}/><strong>No matching reports</strong><p>No matching reports are available for these filters. This is not evidence that the road is safe.</p><button className="btn btn-outline btn-small" onClick={()=>{setFilter('all');setSearch('')}}>Clear filters</button></div>:visible.map(i=><button key={i.id} className={`incident-row ${selected===i.id?'incident-selected':''}`} onClick={()=>setSelected(i.id)}><span className="incident-row-dot" style={{background:COLORS[i.status],border:i.status==='white'?'1px solid #94a3b8':undefined}}/><span className="incident-row-content"><strong>{i.title}</strong><span><MapPin size={12}/>{i.location}</span><span><Clock3 size={12}/>{new Date(i.observedAt).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span><span className="incident-tags"><i className={statusClass(i.status)}>{STATUS_LABEL[i.status]}</i><i className={`review-tag review-${i.review}`}>{REVIEW_LABEL[i.review]}</i></span></span><ArrowRight className="row-arrow" size={16}/></button>)}</div>{active&&<div className="selected-detail"><div className="selected-detail-top"><span className={statusClass(active.status)}>{STATUS_LABEL[active.status]}</span><span className={`review-tag review-${active.review}`}>{REVIEW_LABEL[active.review]}</span></div>{active.photo&&<img className="detail-photo" src={active.photo} alt="Submitted road evidence"/>}<h4>{active.title}</h4><p className="detail-location"><MapPin size={14}/>{active.location}</p><p className="detail-description">{active.description}</p><div className="detail-meta"><span><Clock3 size={14}/>Observed {new Date(active.observedAt).toLocaleString('en-IN')}</span><span><ShieldCheck size={14}/>{active.review==='verified'?'Reviewer confirmed':active.review==='pending'?'Awaiting verification':REVIEW_LABEL[active.review]}</span></div>{active.fictional&&<div className="fictional-note"><AlertTriangle size={14}/> Fictional incident for interface demonstration only.</div>}<button className="btn btn-outline btn-wide" onClick={()=>{setReportLocation(active.location);setReportLat(active.lat);setReportLng(active.lng);setScreen('report')}}><Flag size={15}/> Report an update here</button></div>}</aside></div><section className="advisory-card"><div className="advisory-icon"><CloudRain size={20}/></div><div className="advisory-content"><div className="advisory-title">Weather advisories <span className="advisory-separate">SEPARATE FROM ROAD REPORTS</span></div>{ADVISORIES.map(a=><div key={a.id} className="advisory-line"><strong>{a.title}</strong><span>{a.detail}</span><small>Source: {a.source} · Expires {new Date(a.expiresAt).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</small></div>)}</div></section></>}
 {screen==='report'&&<><div className="page-heading"><div><span className="eyebrow">HELP OTHER TRAVELLERS</span><h1>Report a road incident</h1><p>Share what you observed, where and when. Reports start unverified until reviewed.</p></div><span className="draft-pill"><Check size={14}/> Draft saves on this device</span></div><form className="report-grid" onSubmit={submitReport}><div className="form-card"><div className="section-title"><span className="step-number">01</span><div><h3>What did you observe?</h3><p>Describe the condition you saw first-hand.</p></div></div><label>Incident type<select value={reportType} onChange={e=>setReportType(e.target.value as IncidentType)}>{['Blocked road','Landslide','Road damage','Heavy rain','Flooding','Fallen tree','Other'].map(t=><option key={t}>{t}</option>)}</select></label><label>Observation date and time<input type="datetime-local" value={reportTime} onChange={e=>setReportTime(e.target.value)} required/><small>Use the time you observed the road, not the time you are submitting.</small></label><label>Location description<input value={reportLocation} onChange={e=>setReportLocation(e.target.value)} placeholder="e.g. 2 km before Rangpo bridge" required/></label><div className="location-actions"><button type="button" className="btn btn-outline" onClick={chooseGPS}><LocateFixed size={16}/> Use my GPS</button><span>or click any point on the map</span></div><div className="report-map"><MapContainer center={reportLat!==null&&reportLng!==null?[reportLat,reportLng]:[27.12,88.48]} zoom={8} scrollWheelZoom className="leaflet-map"><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>{reportLat!==null&&reportLng!==null&&<Marker position={[reportLat,reportLng]} icon={pinIcon('orange')}/> }<MapClick onPick={pickLocation}/></MapContainer><div className="map-select-hint"><MapPin size={14}/>{reportLat!==null&&reportLng!==null?`${reportLat.toFixed(5)}, ${reportLng.toFixed(5)}`:'Tap the map to choose incident location'}</div></div><label>Description<textarea value={reportDesc} onChange={e=>setReportDesc(e.target.value)} rows={4} minLength={12} placeholder="What did you see? Include road direction, visible hazards and any useful details…" required/><small>{reportDesc.length}/1000 characters · Minimum 12 characters</small></label></div><div className="form-card evidence-card"><div className="section-title"><span className="step-number">02</span><div><h3>Add evidence</h3><p>A photo can help reviewers assess the report.</p></div></div><label className="upload-zone">{photo?<><img className="upload-preview" src={photo} alt="Selected road evidence preview"/><strong>{photoName||'Photo selected'}</strong><span>Choose another photo</span></>:<><span className="upload-icon"><Upload size={22}/></span><strong>{uploading?'Preparing photo…':'Upload a road photo'}</strong><span>JPG, PNG or WEBP · Max 5 MB</span></>}<input type="file" accept="image/*" onChange={e=>onPhoto(e.target.files?.[0])} disabled={uploading}/></label>{photo&&<button type="button" className="text-link remove-photo" onClick={()=>{setPhoto(undefined);setPhotoName('')}}><X size={14}/> Remove photo</button>}<div className="privacy-note"><ShieldCheck size={17}/><span><strong>Share responsibly</strong> Avoid photographing identifiable people or private details. Demo photos stay in this browser's local storage.</span></div><div className="review-flow"><span className="flow-icon"><FileText size={16}/></span><div><strong>Submitted → Pending review</strong><p>A reviewer will confirm, reject or request clarification. Your report is not treated as verified yet.</p></div></div>{reportError&&<div className="error-box">{reportError}</div>}{reportSuccess&&<div className="success-box"><CheckCircle2 size={17}/>{reportSuccess}</div>}<button type="submit" className="btn btn-primary btn-wide" disabled={uploading}><Flag size={17}/> Submit report <ArrowRight size={17}/></button><p className="form-footnote">Your draft is saved locally. It will remain on this device if you refresh or submission fails.</p></div></form></>}
 {screen==='mine'&&<><div className="page-heading"><div><span className="eyebrow">YOUR CONTRIBUTIONS</span><h1>My reports</h1><p>Track review progress and see what happens after submission.</p></div><button className="btn btn-primary" onClick={()=>setScreen('report')}><Plus size={17}/> New report</button></div><div className="mine-stats"><div><span>Total submissions</span><strong>{myReports.length}</strong></div><div><span>Pending review</span><strong>{myReports.filter(r=>r.review==='pending'||r.review==='clarification').length}</strong></div><div><span>Confirmed</span><strong>{myReports.filter(r=>r.review==='verified').length}</strong></div></div>{myReports.length===0?<div className="empty-large"><div className="empty-illustration"><FileText size={30}/></div><h3>Your reports will appear here</h3><p>You haven't submitted a report in this demo account yet. Help other travellers by sharing a current road observation.</p><button className="btn btn-primary" onClick={()=>setScreen('report')}><Plus size={17}/> Create your first report</button></div>:<div className="my-report-list">{myReports.map(r=><article className="my-report-card" key={r.id}><div className="my-report-icon" style={{color:COLORS[r.status],background:`${COLORS[r.status]}18`}}><Flag size={20}/></div><div className="my-report-body"><div className="my-report-title"><h3>{r.title}</h3><span className={`review-tag review-${r.review}`}>{REVIEW_LABEL[r.review]}</span></div><p><MapPin size={14}/>{r.location}</p><p><Clock3 size={14}/>Observed {new Date(r.observedAt).toLocaleString('en-IN')}</p><p className="my-report-description">{r.description}</p>{r.photo&&<img src={r.photo} className="my-report-photo" alt="Your submitted evidence"/>}{r.decisionHistory.length>0&&<div className="history-mini"><strong>Latest update</strong><span>{r.decisionHistory[0].action} · {new Date(r.decisionHistory[0].at).toLocaleString('en-IN')}{r.decisionHistory[0].note?` — ${r.decisionHistory[0].note}`:''}</span></div>}</div><span className={statusClass(r.status)}>{STATUS_LABEL[r.status]}</span></article>)}</div>}</>}
 {screen==='review'&&<>{user.role!=='reviewer'?<div className="empty-large"><ShieldCheck size={34}/><h3>Reviewer access required</h3><p>Only the configured demo reviewer can access this view. Production permissions must be enforced by backend security rules.</p></div>:<><div className="page-heading"><div><span className="eyebrow">COMMUNITY SAFETY WORKFLOW</span><h1>Reviewer dashboard</h1><p>Inspect evidence, make a decision and keep a transparent review history.</p></div><div className="reviewer-identity"><span className="avatar"><ShieldCheck size={17}/></span><span><strong>Demo reviewer</strong><small>{user.email}</small></span></div></div><div className="review-metrics"><div><span className="metric-icon metric-orange"><Clock3 size={18}/></span><span>Awaiting review<strong>{pending.length}</strong></span></div><div><span className="metric-icon metric-green"><CheckCircle2 size={18}/></span><span>Confirmed<strong>{incidents.filter(i=>i.review==='verified').length}</strong></span></div><div><span className="metric-icon metric-blue"><MessageSquare size={18}/></span><span>Clarification<strong>{incidents.filter(i=>i.review==='clarification').length}</strong></span></div></div><div className="review-toolbar"><div><h3>Incident queue</h3><p>Fictional examples are labelled. Real demo submissions persist locally.</p></div><div className="view-switch"><button className={reviewFilter==='pending'?'view-active':''} onClick={()=>setReviewFilter('pending')}>Needs action</button><button className={reviewFilter==='all'?'view-active':''} onClick={()=>setReviewFilter('all')}>All reports</button></div></div><div className="review-list">{(reviewFilter==='pending'?pending:incidents).length===0?<div className="empty-state"><CheckCircle2 size={28}/><strong>Review queue is clear</strong><p>No reports need review right now. This is a workflow status, not a road-safety claim.</p></div>:(reviewFilter==='pending'?pending:incidents).map(r=><article className="review-card" key={r.id}><div className="review-card-main"><div className="review-card-title"><div><span className={statusClass(r.status)}>{STATUS_LABEL[r.status]}</span><span className={`review-tag review-${r.review}`}>{REVIEW_LABEL[r.review]}</span></div><span className="review-id">{r.id}</span></div><h3>{r.title}</h3><p className="review-location"><MapPin size={14}/>{r.location} · {r.corridor}</p><p>{r.description}</p>{r.photo?<img className="review-evidence" src={r.photo} alt="Incident evidence"/>:<div className="no-evidence"><Upload size={16}/>No photo attached</div>}<div className="review-meta"><span><UserRound size={14}/>{r.reporter}</span><span><Clock3 size={14}/>Observed {new Date(r.observedAt).toLocaleString('en-IN')}</span>{r.fictional&&<span className="fictional-label">Fictional demo incident</span>}</div><div className="decision-history"><strong>Decision history</strong>{r.decisionHistory.length===0?<span>No decisions recorded yet.</span>:r.decisionHistory.map((h,idx)=><span key={`${h.at}-${idx}`}><CheckCircle2 size={13}/>{h.action} by {h.by} · {new Date(h.at).toLocaleString('en-IN')}{h.note?` — ${h.note}`:''}</span>)}</div><label className="review-note-label">Reviewer note (optional)<textarea value={selected===r.id?reviewNote:''} onFocus={()=>setSelected(r.id)} onChange={e=>{setSelected(r.id);setReviewNote(e.target.value)}} placeholder="Reason, clarification requested or evidence checked…" rows={2}/></label><div className="review-actions"><button className="btn btn-success" onClick={()=>decide(r.id,'verified')}><CheckCircle2 size={16}/> Confirm report</button><button className="btn btn-outline" onClick={()=>decide(r.id,'clarification')}><MessageSquare size={16}/> Request clarification</button><button className="btn btn-danger-outline" onClick={()=>decide(r.id,'rejected')}><X size={16}/> Reject</button>{r.review!=='pending'&&<button className="btn btn-outline" onClick={()=>decide(r.id,'pending')}><ArrowLeft size={16}/> Reopen</button>}</div></div></article>)}</div></>}</>}
 <footer className="app-footer"><span>© 2026 Safe Yatra · Demo frontend</span><span>Map data © OpenStreetMap contributors</span><span>{lastSync?`Last local save: ${new Date(lastSync).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`:'Changes save to this browser'}</span></footer></main></div>{toast&&<div className="toast"><CheckCircle2 size={17}/>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss notification"><X size={15}/></button></div>}</div>;
>>>>>>> 3361aa4154425a8c6e1712ef2bf88f55419d7048
}
export default App;
