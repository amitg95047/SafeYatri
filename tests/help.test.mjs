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
const { answerHelp, WHATSAPP_URL, SITE_URL } = await import(
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
