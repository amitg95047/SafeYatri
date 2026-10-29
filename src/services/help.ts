import type { AppUser } from "./auth";
import type { Incident } from "../types";
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
  utility?: "whatsapp" | "share" | "copy";
}
export function answerHelp(
  input: string,
  user: AppUser,
  reports: Incident[],
): HelpReply {
  const q = input.toLowerCase();
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
  if (/emergency|112|sos/.test(q))
    return {
      text: "For an emergency in India, use the 112 call button in the header. It opens your phone dialler. This chat does not contact emergency services.",
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
      text: "An independently approved report earns 50 points once. Reopening or approving again cannot earn extra points. The Free plan includes one favourite journey. Plus features are planned; no payments are enabled.",
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
  return {
    text: "I’m Yatri Help, a free guided assistant. I can help with your account, email verification, reporting, report status, admin reviews, destinations, rewards and sharing. I use app information and prepared guidance, not a live AI model or official road feeds.",
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
