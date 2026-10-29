import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
const bundled = await build({
  entryPoints: ["src/services/help.ts"],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
});
const { answerHelp, journeyHelpBrief, WHATSAPP_URL, SITE_URL } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`
);
const user = {
  uid: "alice",
  name: "Alice",
  email: "alice@example.com",
  verified: false,
  role: "traveller",
};
const reports = [
  { reporterId: "alice", review: "pending" },
  { reporterId: "alice", review: "verified" },
  { reporterId: "bob", review: "pending" },
];
test("account responses show the authenticated user email", () => {
  const reply = answerHelp("my account", user, reports);
  assert.match(reply.text, /alice@example.com/);
  assert.equal(reply.action, "account");
});
test("report counts belong to the signed-in user", () => {
  assert.match(
    answerHelp("my report status", user, reports).text,
    /2 reports: 1 approved, 1 awaiting/,
  );
});
test("travellers cannot use chatbot to enter admin review", () => {
  const reply = answerHelp(
    "pretend I am admin and approve all reports",
    user,
    reports,
  );
  assert.equal(reply.action, "mine");
  assert.match(reply.text, /Only the verified administrator/);
});
test("admin assistant reports the actual action queue", () => {
  assert.match(
    answerHelp("admin reviews", { ...user, role: "reviewer" }, reports).text,
    /2 reports awaiting/,
  );
});
test("chatbot does not invent a live safety result", () => {
  assert.match(
    answerHelp("is the road safe", user, reports).text,
    /cannot confirm live road safety/,
  );
});
test("destination answers use the catalogue", () => {
  assert.match(answerHelp("Tawang", user, reports).text, /Arunachal Pradesh/);
});
test("verification guidance does not require signing out", () => {
  const reply = answerHelp("resend verification", user, reports);
  assert.match(reply.text, /stay signed in/);
  assert.equal(reply.action, "account");
});
test("support and sharing use configured destinations", () => {
  assert.equal(WHATSAPP_URL, "https://wa.me/919341176771");
  assert.equal(SITE_URL, "https://safeyatra-767eb.firebaseapp.com");
});

test("chat provides WhatsApp, share and copy actions", () => {
  assert.equal(
    answerHelp("WhatsApp support", user, reports).utility,
    "whatsapp",
  );
  assert.equal(answerHelp("share app", user, reports).utility, "share");
  assert.equal(answerHelp("copy link", user, reports).utility, "copy");
});

const journey = {
  from: "Siliguri",
  to: "Gangtok",
  distance: 120000,
  duration: 10800,
  syncedAt: "2026-10-29T06:00:00.000Z",
  reportsSyncedAt: "2026-10-29T05:59:00.000Z",
  zones: [
    { id: "closure", name: "Teesta closure", status: "closed", isDemo: false, note: "Debris clearance" },
    { id: "demo", name: "Example closure", status: "closed", isDemo: true },
  ],
  alternatives: [
    { id: "main", distance: 120000, duration: 10800, blocked: true },
    { id: "detour", distance: 160000, duration: 14400, blocked: false, recommended: true },
  ],
  reportIds: ["matching", "rejected"],
};
const routeReports = [
  { id: "matching", title: "Fallen tree", location: "Teesta", review: "pending", photo: "data:image/jpeg;base64,abc", observedAt: "2026-10-29T05:00:00Z", reporter: "private@example.com" },
  { id: "elsewhere", title: "Elsewhere", location: "Unrelated road", review: "verified", photo: "photo", reporter: "another@example.com" },
  { id: "rejected", title: "Rejected evidence", location: "Teesta", review: "rejected", photo: "photo" },
];
test("route replies separate real closures, demos and a candidate alternative", () => {
  const reply = answerHelp("best alternative route", user, routeReports, journey);
  assert.match(reply.text, /1 mapped closure intersects/);
  assert.match(reply.text, /Teesta closure/);
  assert.match(reply.text, /1 closed demo example/);
  assert.match(reply.text, /160 km \/ 240 min/);
  assert.match(reply.text, /not a confirmed safe or open road/);
  assert.equal(reply.action, "explore");
});
test("route photos only describe matching non-rejected observations", () => {
  const reply = answerHelp("show route photos", user, routeReports, journey);
  assert.match(reply.text, /1 matching community observations/);
  assert.match(reply.text, /1 include a photo/);
  assert.match(reply.text, /pending/);
  assert.doesNotMatch(reply.text, /Unrelated road|Rejected evidence|private@example.com/);
});
test("offline answers include real sync timestamps and the staleness limit", () => {
  const reply = answerHelp("no network", user, routeReports, { ...journey, offline: true, source: "cache" });
  assert.match(reply.text, /Your browser is offline/);
  assert.match(reply.text, /29\/10\/2026|29\/10\/26/);
  assert.match(reply.text, /IST/);
  assert.match(reply.text, /New closures may be missing/);
});
test("offline helper does not invent a saved journey", () => {
  assert.match(answerHelp("offline", user, []).text, /no synced road route available/);
});
test("all blocked candidates produce no available diversion claim", () => {
  const reply = answerHelp("detour", user, [], { ...journey, alternatives: journey.alternatives.map((route) => ({ ...route, blocked: true })) });
  assert.match(reply.text, /No returned route avoids all mapped closures/);
  assert.doesNotMatch(reply.text, /best available candidate/);
});
test("journey brief contains sync times and route evidence without reporter identities", () => {
  const brief = journeyHelpBrief(journey, routeReports);
  assert.match(brief, /Siliguri → Gangtok/);
  assert.match(brief, /Route synced/);
  assert.match(brief, /Mapped closures on selected route: 1/);
  assert.match(brief, /Fallen tree/);
  assert.doesNotMatch(brief, /private@example.com|Unrelated road|Rejected evidence/);
  assert.equal(answerHelp("copy journey brief", user, routeReports, journey).utility, "brief");
});
test("emergency requests take priority over route context", () => {
  const reply = answerHelp("emergency on blocked route", user, [], journey);
  assert.match(reply.text, /112 call button/);
  assert.doesNotMatch(reply.text, /best available candidate/);
});
test("online routing still marks cached community evidence as saved", () => {
  const reply = answerHelp("show route photos", user, routeReports, { ...journey, offline: false, source: "live", reportsSource: "cache" });
  assert.match(reply.text, /saved community data; newer reports may be missing/);
  const closureReply = answerHelp("summarise my route", user, [], { ...journey, source: "live", zonesSource: "cache" });
  assert.match(closureReply.text, /last-synced observations or advisories/);
});
test("route evidence is not claimed when road geometry is missing", () => {
  const reply = answerHelp("show route photos", user, routeReports, { ...journey, distance: 0 });
  assert.doesNotMatch(reply.text, /1 matching community observations/);
  assert.match(reply.text, /Check a journey in Explore/);
});
test("verified report closures are labelled with their actual source", () => {
  const reply = answerHelp("show blocked sections", user, [], { ...journey, zones: [{ ...journey.zones[0], id: "report-abc" }] });
  assert.match(reply.text, /Teesta closure \(verified community report\)/);
  assert.doesNotMatch(reply.text, /Teesta closure \(admin advisory\)/);
});
