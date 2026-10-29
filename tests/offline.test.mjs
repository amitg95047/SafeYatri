import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const bundled = await build({ entryPoints: ["src/services/offline.ts"], bundle: true, write: false, platform: "node", format: "esm" });
const { readSnapshot, writeSnapshot, createSnapshotReceiver, clearOfflineData } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
const at = "2026-10-29T05:00:00.000Z";
const report = {
  id: "report-1", corridor: "NH 10", title: "Blocked road", type: "Blocked road", status: "red", review: "verified",
  location: "Rangpo", description: "Rockfall reported on road", observedAt: at, lat: 27.17, lng: 88.53,
  reporter: "traveller@example.com", reporterId: "traveller", decisionHistory: [], photo: "data:image/jpeg;base64,/9j/photo",
};
function memoryStorage() {
  const values = new Map();
  return { values, getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}
test("offline data is scoped to the signed-in UID and can be removed per account", () => {
  globalThis.localStorage = memoryStorage();
  writeSnapshot("alice", "reports", [report], at);
  assert.equal(readSnapshot("alice", "reports").items[0].id, "report-1");
  assert.equal(readSnapshot("bob", "reports"), null);
  writeSnapshot("bob", "reports", [], at);
  clearOfflineData("alice");
  assert.equal(readSnapshot("alice", "reports"), null);
  assert.deepEqual(readSnapshot("bob", "reports").items, []);
});
test("malformed and oversized persisted data is ignored without breaking startup", () => {
  const storage = globalThis.localStorage = memoryStorage();
  const key = "safeyatri.offline.v1.alice.reports";
  for (const raw of ["{broken", JSON.stringify({ version: 1, syncedAt: at, items: [{ id: "missing-fields" }] }), "x".repeat(1900001)]) {
    storage.values.set(key, raw);
    assert.equal(readSnapshot("alice", "reports"), null);
  }
});
test("an empty initial Firestore cache cannot erase the saved snapshot", () => {
  globalThis.localStorage = memoryStorage();
  writeSnapshot("alice", "reports", [report], at);
  const delivered = [], metadata = [];
  const receive = createSnapshotReceiver("alice", "reports", (items) => delivered.push(items), (sync) => metadata.push(sync));
  receive([], { fromCache: true, hasPendingWrites: false });
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0][0].id, report.id);
  assert.equal(metadata.at(-1).syncedAt, at);
  assert.equal(metadata.at(-1).source, "cache");
  assert.equal(readSnapshot("alice", "reports").items.length, 1);
});
test("confirmed empty server results persist deletions and update freshness", () => {
  globalThis.localStorage = memoryStorage();
  writeSnapshot("alice", "reports", [report], at);
  const delivered = [], metadata = [];
  const receive = createSnapshotReceiver("alice", "reports", (items) => delivered.push(items), (sync) => metadata.push(sync));
  receive([], { fromCache: false, hasPendingWrites: false });
  assert.deepEqual(delivered.at(-1), []);
  assert.deepEqual(readSnapshot("alice", "reports").items, []);
  assert.equal(metadata.at(-1).source, "live");
  assert.ok(metadata.at(-1).syncedAt);
});
test("pending local writes and cache events never advance last server sync", () => {
  globalThis.localStorage = memoryStorage();
  writeSnapshot("alice", "reports", [report], at);
  const metadata = [];
  const receive = createSnapshotReceiver("alice", "reports", () => {}, (sync) => metadata.push(sync));
  receive([], { fromCache: false, hasPendingWrites: true });
  assert.equal(metadata.at(-1).syncedAt, at);
  assert.equal(metadata.at(-1).source, "cache");
  assert.equal(readSnapshot("alice", "reports").items.length, 1);
});
test("quota failure falls back to text observations without photos", () => {
  const storage = memoryStorage();
  globalThis.localStorage = { ...storage, setItem: (key, value) => {
    if (value.includes("data:image/jpeg")) throw new Error("QuotaExceededError");
    storage.setItem(key, value);
  } };
  const cached = writeSnapshot("alice", "reports", [report], at);
  assert.equal(cached.items[0].photo, undefined);
  assert.equal(readSnapshot("alice", "reports").items[0].description, report.description);
});
test("full or disabled device storage preserves live delivery and old valid data", () => {
  const storage = globalThis.localStorage = memoryStorage();
  writeSnapshot("alice", "reports", [report], at);
  storage.setItem = () => { throw new Error("Storage unavailable"); };
  const delivered = [];
  const receive = createSnapshotReceiver("alice", "reports", (items) => delivered.push(items));
  receive([], { fromCache: false, hasPendingWrites: false });
  assert.deepEqual(delivered.at(-1), []);
  assert.equal(readSnapshot("alice", "reports").items[0].id, report.id);
});
test("bounded snapshots retain recent text reports with at most twelve photos", () => {
  globalThis.localStorage = memoryStorage();
  const reports = Array.from({ length: 150 }, (_, index) => ({ ...report, id: `report-${index}` }));
  writeSnapshot("alice", "reports", reports, at);
  const cached = readSnapshot("alice", "reports");
  assert.equal(cached.items.length, 100);
  assert.equal(cached.items.filter((item) => item.photo).length, 12);
});
test("malformed replacement snapshots preserve previous valid snapshot", () => {
  globalThis.localStorage = memoryStorage();
  writeSnapshot("alice", "reports", [report], at);
  assert.equal(writeSnapshot("alice", "reports", [{ ...report, lat: NaN }], at), null);
  assert.equal(readSnapshot("alice", "reports").items[0].id, report.id);
});
test("service worker ignores third-party tiles, Firebase helper paths and API requests", async () => {
  const listeners = new Map();
  const source = await readFile("public/sw.js", "utf8");
  vm.runInNewContext(source, { URL, self: { location: { origin: "https://safeyatri.example" }, addEventListener: (type, fn) => listeners.set(type, fn) } });
  const urls = ["https://tile.openstreetmap.org/1/2/3.png", "https://router.project-osrm.org/route/v1/driving/1,2;3,4", "https://safeyatri.example/__/auth/handler", "https://safeyatri.example/api/reports", "https://safeyatri.example/?token=secret"];
  for (const url of urls) {
    let intercepted = false;
    listeners.get("fetch")({ request: { url, method: "GET", mode: "cors" }, respondWith: () => { intercepted = true; } });
    assert.equal(intercepted, false, url);
  }
});
test("worker installation saves the shell, built assets and local mountain backgrounds for offline navigation", async () => {
  const listeners = new Map(), stored = new Map();
  const fixtures = new Map([
    ["/", '<script src="/assets/app.js"></script><link href="/assets/app.css" rel="stylesheet">'],
    ["/index.html", '<script src="/assets/app.js"></script><link href="/assets/app.css" rel="stylesheet">'],
    ["/assets/app.js", "app source"],
    ["/assets/app.css", 'body{background:url(/mountains.webp)}a{background:url(https://external.example/picture.jpg)}'],
    ["/mountains.webp", "mountain image"],
  ]);
  const normalize = (url) => new URL(typeof url === "string" ? url : url.url, "https://safeyatri.example").pathname;
  const cache = {
    add: async (url) => { const path = normalize(url); assert.ok(fixtures.has(path), path); stored.set(path, new Response(fixtures.get(path))); },
    addAll: async (urls) => { await Promise.all(urls.map((url) => cache.add(url))); },
    match: async (url) => stored.get(normalize(url))?.clone(),
  };
  const source = await readFile("public/sw.js", "utf8");
  vm.runInNewContext(source, {
    URL, Response, Set,
    self: { location: { origin: "https://safeyatri.example" }, addEventListener: (type, fn) => listeners.set(type, fn), skipWaiting: async () => {} },
    caches: { open: async () => cache },
    fetch: async () => { throw new Error("Offline"); },
  });
  let installation;
  listeners.get("install")({ waitUntil: (work) => { installation = work; } });
  await installation;
  assert.ok(stored.has("/assets/app.js"));
  assert.ok(stored.has("/mountains.webp"));
  assert.equal(stored.size, 5);
  let navigation;
  listeners.get("fetch")({ request: { url: "https://safeyatri.example/", method: "GET", mode: "navigate" }, respondWith: (response) => { navigation = response; } });
  assert.match(await (await navigation).text(), /assets\/app.js/);
});
