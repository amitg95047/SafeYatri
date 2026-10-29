import type { AppUser } from "./auth";
import type { Incident, RoadZone } from "../types";
import { PLACES } from "../data/places";
export type AppScreen =
  | "dashboard"
  | "explore"
  | "report"
  | "mine"
  | "review"
  | "membership"
  | "account"
  | "zones";
export interface HelpReply {
  text: string;
  action?: AppScreen;
  label?: string;
  utility?: "whatsapp" | "share" | "copy" | "brief";
  suggestions?: string[];
}
export interface HelpContext {
  from: string;
  to: string;
  distance?: number;
  duration?: number;
  zones?: RoadZone[];
  alternatives?: {
    id: string;
    distance: number;
    duration: number;
    blocked: boolean;
    recommended?: boolean;
  }[];
  syncedAt?: string;
  reportsSyncedAt?: string;
  zonesSyncedAt?: string;
  reportsSource?: "live" | "cache";
  zonesSource?: "live" | "cache";
  offline?: boolean;
  source?: "live" | "cache";
  loading?: boolean;
  reportIds?: string[];
}
function syncLabel(value?: string) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime())
    ? date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST"
    : "not available";
}
function journeyReports(reports: Incident[], context?: HelpContext) {
  if (!context?.distance) return [];
  const ids = new Set(context?.reportIds || []);
  return reports.filter((report) => ids.has(report.id) && !report.fictional && report.review !== "rejected");
}
export function journeyHelpBrief(context: HelpContext, reports: Incident[]) {
  const closures = (context.zones || []).filter((zone) => !zone.isDemo && zone.status === "closed");
  const evidence = journeyReports(reports, context);
  return [
    `safeYatri journey: ${context.from} → ${context.to}`,
    context.distance ? `${(context.distance / 1000).toFixed(0)} km · estimated ${Math.round((context.duration || 0) / 60)} min` : "Road geometry is not available for this journey.",
    `Route synced: ${syncLabel(context.syncedAt)}${context.source === "cache" || context.offline ? " (saved information)" : ""}`,
    `Mapped closures on selected route: ${closures.length}.`,
    ...closures.map((zone) => `${zone.id.startsWith("report-") ? "Verified community report" : "Admin advisory"} — ${zone.name}: ${zone.note}`),
    `Community data synced: ${syncLabel(context.reportsSyncedAt)}${context.reportsSource === "cache" || context.offline ? " (saved information)" : ""}`,
    `Admin zones synced: ${syncLabel(context.zonesSyncedAt)}${context.zonesSource === "cache" || context.offline ? " (saved information)" : ""}`,
    `Matching community observations: ${evidence.length}.`,
    ...evidence.slice(0, 5).map((report) => `${report.title || report.type} · ${report.location} · observed ${syncLabel(report.observedAt)} · ${report.review}`),
    "Estimates exclude live traffic. Saved data may be outdated; confirm closures with local authorities before travelling.",
  ].join("\n");
}
export function answerHelp(
  input: string,
  user: AppUser,
  reports: Incident[],
  context?: HelpContext,
): HelpReply {
  const q = input.toLowerCase().trim();
  if (/emergency|\b112\b|\bsos\b/.test(q))
    return {
      text: "For an emergency in India, use the 112 call button in the header. It opens your phone dialler. This chat does not contact emergency services. Stop in a safe place before using your phone.",
      suggestions: ["Travel checklist", "Offline information"],
    };
  if (/offline|no (?:internet|network|signal)|last sync|cached|lost (?:network|signal)|connection/.test(q))
    return {
      text: `${context?.offline ? "Your browser is offline." : "When the network drops, saved route geometry and the last synced route information can still be shown after a successful sync."} ${context?.syncedAt ? `The selected ${context.from} → ${context.to} route was last synced ${syncLabel(context.syncedAt)}.` : "There is no synced road route available for this selection yet; check it while connected first."} ${context?.reportsSyncedAt ? `Community data was last synced ${syncLabel(context.reportsSyncedAt)}${context.reportsSource === "cache" ? " and is currently shown from saved information" : ""}.` : "A saved route does not confirm that community observations are current."} ${context?.zonesSyncedAt ? `Admin zones were last synced ${syncLabel(context.zonesSyncedAt)}${context.zonesSource === "cache" ? " and are currently shown from saved information" : ""}. ` : ""}New closures may be missing. Map tiles and external directions need a connection unless already cached.`,
      action: "explore",
      label: "View saved journey",
      suggestions: ["Summarise my route", "Travel checklist"],
    };
  if (/checklist|pack|before (?:i |we )?(?:leave|travel)|prepare|essentials/.test(q))
    return {
      text: "Before you leave: check the route’s closure notices and observation times; save the journey brief; confirm local road and weather advisories; carry water, essential medicines and a charged power bank; tell a trusted person your route and arrival time; check fuel and any permits. In a blocked section, stop in a safe place and follow local authority directions. A suggested alternative still needs local confirmation.",
      suggestions: ["Copy journey brief", "Show blocked sections", "Offline information"],
    };
  if (/copy.*(?:journey|route|brief)|(?:journey|route|travel) brief|share.*(?:journey|route)/.test(q))
    return context
      ? {
          text: "Copy a travel brief with your selected route, sync time, admin closures and matching community observations to keep with your trip notes or share with your travel group.",
          utility: "brief",
          suggestions: ["Show route photos", "Travel checklist"],
        }
      : { text: "Choose a start and destination in Explore first, then ask me for a journey brief.", action: "explore", label: "Plan a journey" };
  if (/photo|picture|evidence|what (?:did|have) (?:people|travellers)|community (?:update|report|observation)/.test(q)) {
    const matching = journeyReports(reports, context);
    return {
      text: context?.distance && context?.reportIds
        ? matching.length
          ? `${matching.length} matching community observations for the selected ${context.from} → ${context.to} road; ${matching.filter((report) => report.photo).length} include a photo. ${matching.slice(0, 3).map((report) => `${report.title || report.type} at ${report.location} (${report.review}, observed ${syncLabel(report.observedAt)})`).join("; ")}. Open the route evidence cards to inspect photos and descriptions. Pending observations have not been approved.${context.offline || context.reportsSource === "cache" ? " You are viewing saved community data; newer reports may be missing." : ""}`
          : "There are no matching community observations in the loaded data for this route. This does not establish that the road is clear. Check local notices before travelling."
        : "Check a journey in Explore to match community photos and observations to that route. The evidence cards show the observation time, review status and description; an uploaded photo is not proof that conditions are current.",
      action: "explore",
      label: "View route evidence",
      suggestions: ["Show blocked sections", "Offline information"],
    };
  }
  if (context && /alternative|alternate|detour|blocked|closure|closed|road status|summari[sz]e|my route|my journey|this route|selected route/.test(q)) {
    const closed = (context.zones || []).filter((zone) => !zone.isDemo && zone.status === "closed");
    const demo = (context.zones || []).filter((zone) => zone.isDemo && zone.status === "closed");
    const options = context.alternatives || [];
    const preferred = options.find((option) => option.recommended && !option.blocked) || options.find((option) => !option.blocked);
    const alternativeText = preferred
      ? `The best available candidate avoiding mapped closures is approximately ${(preferred.distance / 1000).toFixed(0)} km / ${Math.round(preferred.duration / 60)} min. Select it in the route options. It is not a confirmed safe or open road.`
      : options.length
        ? "No returned route avoids all mapped closures. Do not continue through a closure; check with local authorities for an available diversion."
        : "No alternative road geometry is available yet. Check the journey while connected to request route options.";
    return {
      text: `${context.from} → ${context.to}: ${context.loading ? "route options are still loading." : context.distance ? `${(context.distance / 1000).toFixed(0)} km, approximately ${Math.round((context.duration || 0) / 60)} min.` : "road geometry is unavailable."} ${closed.length ? `${closed.length} mapped ${closed.length === 1 ? "closure intersects" : "closures intersect"} the selected road: ${closed.map((zone) => `${zone.name} (${zone.id.startsWith("report-") ? "verified community report" : "admin advisory"})`).join(", ")}.` : context.distance ? "No mapped closure intersects the selected road; this is not a safety clearance." : "Closures cannot be matched without road geometry."} ${demo.length ? `${demo.length} closed demo ${demo.length === 1 ? "example is" : "examples are"} shown separately and do not describe live conditions. ` : ""}${alternativeText} ${context.syncedAt ? `Route synced ${syncLabel(context.syncedAt)}${context.source === "cache" || context.offline ? "; saved geometry may be outdated" : ""}.` : ""}${context.offline || context.reportsSource === "cache" || context.zonesSource === "cache" ? " Closure matching includes last-synced observations or advisories; newer closures may be missing." : ""}`,
      action: "explore",
      label: "Compare route options",
      suggestions: ["Show route photos", "Copy journey brief", "Travel checklist"],
    };
  }
  if (!context && /alternative|alternate|detour|blocked|summari[sz]e|my route|my journey/.test(q))
    return {
      text: "Check a journey in Explore first. I can then explain which mapped admin closures touch its road, compare the returned alternatives and find matching community evidence. A route without a mapped closure still needs local confirmation.",
      action: "explore",
      label: "Check a journey",
      suggestions: ["Offline information", "Travel checklist"],
    };
  if (/zone/.test(q))
    return user.role === "reviewer"
      ? {
          text: "Use Zone control to click a centre on the map, choose a radius and status, and publish directly. No photo or report approval is needed. Keep demonstration zones marked as demo examples.",
          action: "zones",
          label: "Open zone control",
        }
      : {
          text: "Plan a journey to view administrator advisories and clearly labelled demo zones. Zone colours are guidance, not a guarantee of safety.",
          action: "explore",
          label: "See journey zones",
        };
  if (/email|mail|account|profile|login/.test(q))
    return {
      text: `You are signed in as ${user.name} (${user.email}). Email: ${user.verified ? "verified" : "awaiting verification"}. Access: ${user.role === "reviewer" ? "administrator" : "traveller"}.`,
      action: "account",
      label: "Open my account",
    };
  if (/verif|resend/.test(q))
    return {
      text: user.verified
        ? "Your email is verified. You can submit a camera report."
        : "Use Resend verification email in the banner above, open the link in your inbox or Spam, then click I’ve verified my email. You can stay signed in.",
      action: user.verified ? "report" : "account",
      label: user.verified ? "Report an incident" : "Check my account",
    };
  if (/admin|approve|review|reject/.test(q))
    return user.role === "reviewer"
      ? {
          text: `There are ${reports.filter((r) => r.review === "pending" || r.review === "clarification").length} reports awaiting action. Inspect the photo, location and observation time before approving. You can review your own reports, but they do not earn reward points.`,
          action: "review",
          label: "Open admin dashboard",
        }
      : {
          text: "Only the verified administrator can approve reports. You can submit an incident and track the review in My reports.",
          action: "mine",
          label: "Track my reports",
        };
  if (/point|reward|subscription|plus|member/.test(q))
    return {
      text: "An independently approved report earns 50 points once. Reopening or approving again cannot earn extra points. Free includes one favourite journey, closure-aware route comparison, a downloadable journey brief, a checklist saved on this device and a limited cache of reports and photos for lost signal. Paid Plus subscriptions and personal alerts are still planned; no payments are enabled.",
      action: "membership",
      label: "Open rewards",
    };
  if (/my report|report status|submission/.test(q)) {
    const mine = reports.filter((r) => r.reporterId === user.uid);
    return {
      text: `You have ${mine.length} reports: ${mine.filter((r) => r.review === "verified").length} approved, ${mine.filter((r) => r.review === "pending" || r.review === "clarification").length} awaiting action and ${mine.filter((r) => r.review === "rejected").length} rejected.`,
      action: "mine",
      label: "View my reports",
    };
  }
  if (/landslide|incident|camera|submit|report/.test(q))
    return {
      text: "Stop in a safe place. Choose the road corridor, add the incident location, a description and a recent observation time, then capture a live camera photo. Verified travellers can submit; only the admin can approve. I cannot submit or verify a report on your behalf.",
      action: "report",
      label: "Open report form",
    };
  if (/safe|weather|closed|closure|emergency|road status/.test(q))
    return {
      text: "I cannot confirm live road safety, weather or emergency conditions. Check official district notices and the IMD forecast. Community reports can be incomplete or outdated. For an immediate danger, contact local emergency services.",
      action: "explore",
      label: "See community observations",
    };
  const matches = PLACES.filter(
    (p) =>
      q.includes(p.name.toLowerCase()) || q.includes(p.state.toLowerCase()),
  );
  if (matches.length)
    return {
      text: `Explore ${matches
        .slice(0, 8)
        .map((p) => `${p.name} (${p.state})`)
        .join(
          ", ",
        )}. Select places in the journey planner; Open directions launches Google Maps. Permits and closures must be checked locally.`,
      action: "explore",
      label: "Plan a journey",
    };
  if (/place|route|journey|destination|hill/.test(q))
    return {
      text: "Choose from 81 Northeast destinations and nearby gateways, including Tawang, Ziro, Shillong, Sohra, Gangtok, Pelling, Haflong and Ukhrul. Type a town into the start or destination suggestions.",
      action: "explore",
      label: "Explore destinations",
    };
  if (/share|copy|whatsapp|support/.test(q))
    return {
      text: "Use the action below or the Need help menu. WhatsApp opens an external chat; you choose what to send.",
      utility: /copy/.test(q) ? "copy" : /share/.test(q) ? "share" : "whatsapp",
    };
  if (/^(hi|hello|hey|namaste)\b/.test(q))
    return {
      text: `Hi ${user.name.split(" ")[0]}! ${context ? `Planning ${context.from} → ${context.to}? I can explain its mapped closures, compare route options and help you inspect community evidence.` : "Where are you headed? Choose a journey in Explore and I can explain its mapped closures and community observations."} I also help with reports, your account and a travel checklist.`,
      suggestions: ["Summarise my route", "Travel checklist", "My report status"],
    };
  if (/thank|great|helpful/.test(q))
    return { text: "You’re welcome. Check observation times before setting off, and keep your journey brief handy if signal drops.", suggestions: ["Copy journey brief", "Travel checklist"] };
  return {
    text: "I’m Yatri Help, a free guided assistant. I can explain your selected route, mapped closures, alternatives, photos, offline information, travel preparations and your account. I use app information and prepared guidance, not a live AI model or official road feeds. Try one of the suggestions below.",
    suggestions: ["Summarise my route", "Show route photos", "Offline information", "Travel checklist"],
  };
}
export const SITE_URL = "https://safeyatra-767eb.firebaseapp.com";
export const WHATSAPP_URL = "https://wa.me/919341176771";
export async function copySiteLink() {
  if (!navigator.clipboard?.writeText)
    throw new Error(`Clipboard is unavailable. Copy this address: ${SITE_URL}`);
  await navigator.clipboard.writeText(SITE_URL);
}
export async function shareSite() {
  if (navigator.share) {
    try {
      await navigator.share({
        title: "safeYatri",
        text: "Community road observations for Northeast journeys.",
        url: SITE_URL,
      });
      return "Share options opened.";
    } catch (error) {
      if ((error as { name?: string }).name === "AbortError") return "";
      throw error;
    }
  }
  await copySiteLink();
  return "Website link copied. Share it with your travel group.";
}
