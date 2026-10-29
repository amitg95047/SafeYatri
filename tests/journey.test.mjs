import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
const bundled = await build({
  stdin: {
    contents:
      "export * from './src/services/journey.ts';export * from './src/data/zones.ts';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
});
const { zoneTouchesRoute, mergeZones, DEMO_ZONES, fetchJourneyRoute, fetchJourneyRoutes,
  rankJourneyRoutes, blockedRouteSegments, reportClosureZones, readCachedJourney } =
  await import(
    `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`
  );
const zone = { ...DEMO_ZONES[0], lat: 0, lng: 0, radiusMeters: 1000 };
test("zones intersect the segment between sparse road points", () => {
  assert.equal(
    zoneTouchesRoute(zone, [
      [-0.1, 0],
      [0.1, 0],
    ]),
    true,
  );
});
test("distant zones are excluded", () => {
  assert.equal(
    zoneTouchesRoute({ ...zone, lng: 0.1 }, [
      [-0.1, 0],
      [0.1, 0],
    ]),
    false,
  );
});
test("empty route has no zone matches", () => {
  assert.equal(zoneTouchesRoute(zone, []), false);
});
test("archived saved demo does not reappear from defaults", () => {
  assert.equal(
    mergeZones([{ ...DEMO_ZONES[0], active: false }]).some(
      (z) => z.id === DEMO_ZONES[0].id,
    ),
    false,
  );
});
test("expired zones are omitted", () => {
  assert.equal(
    mergeZones(
      [
        {
          ...zone,
          id: "expired",
          isDemo: false,
          expiresAt: new Date(0).toISOString(),
        },
      ],
      false,
    ).length,
    0,
  );
});
test("demo toggle retains real admin advisories", () => {
  const result = mergeZones([{ ...zone, id: "actual", isDemo: false }], false);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "actual");
});
test("road route response is converted from longitude-latitude to map coordinates", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      code: "Ok",
      routes: [
        {
          distance: 1200,
          duration: 120,
          geometry: {
            coordinates: [
              [88, 27],
              [89, 28],
            ],
          },
        },
      ],
    }),
  });
  try {
    const route = await fetchJourneyRoute(
      [27, 88],
      [28, 89],
      new AbortController().signal,
    );
    assert.deepEqual(route.points, [
      [27, 88],
      [28, 89],
    ]);
    assert.equal(route.distance, 1200);
  } finally {
    globalThis.fetch = original;
  }
});
test("missing road routes produce a clear failure, not a fabricated driving line", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ code: "NoRoute", routes: [] }),
  });
  try {
    await assert.rejects(
      () => fetchJourneyRoute([25, 91], [26, 92], new AbortController().signal),
      /No driving route/,
    );
  } finally {
    globalThis.fetch = original;
  }
});

const now = Date.now();
const closure = {
  ...zone, id: "real-closure", status: "closed", isDemo: false, active: true,
  expiresAt: new Date(now + 3600000).toISOString(),
};
const direct = { points: [[-0.1, 0], [0.1, 0]], distance: 22000, duration: 1000 };
const detour = { points: [[-0.1, 0], [0, 0.1], [0.1, 0]], distance: 30000, duration: 1600 };
test("a slower route avoiding real closures is recommended ahead of the blocked route", () => {
  const options = rankJourneyRoutes([direct, detour], [closure], now);
  assert.equal(options[0].id, "route-1");
  assert.equal(options[0].recommended, true);
  assert.equal(options[1].blocked, true);
  assert.equal(options[1].recommended, false);
});
test("demo closures do not block or change real route recommendations", () => {
  const options = rankJourneyRoutes([direct, detour], [{ ...closure, isDemo: true }], now);
  assert.equal(options[0].id, "route-0");
  assert.equal(options[0].blocked, false);
  assert.equal(options[0].zones.length, 1);
});
test("no route is called recommended when all returned routes are blocked", () => {
  const options = rankJourneyRoutes([direct, { ...direct, duration: 2000 }], [closure], now);
  assert.equal(options.every((r) => r.blocked && !r.recommended), true);
});
test("expired and inactive closures are omitted from ranking", () => {
  const options = rankJourneyRoutes([direct], [{ ...closure, expiresAt: new Date(0).toISOString() }, { ...closure, active: false }], now);
  assert.equal(options[0].blocked, false);
});
test("red road geometry is clipped to the closure boundary instead of the whole sparse segment", () => {
  const segments = blockedRouteSegments(direct.points, [closure], 0);
  assert.equal(segments.length, 1);
  const [a, b] = segments[0].points;
  assert.ok(Math.abs(a[0] + 1000 / 111320) < 1e-8);
  assert.ok(Math.abs(b[0] - 1000 / 111320) < 1e-8);
  assert.equal(a[1], 0);
  assert.equal(b[1], 0);
});
test("only recent verified genuine red reports become approximate closure hazards", () => {
  const report = { id: "r", lat: 0, lng: 0, title: "Rockfall", location: "Road", description: "Rockfall across road", review: "verified", status: "red", observedAt: new Date(now - 1000).toISOString() };
  const zones = reportClosureZones([
    report, { ...report, id: "pending", review: "pending" },
    { ...report, id: "fake", fictional: true },
    { ...report, id: "old", observedAt: new Date(now - 86400001).toISOString() },
    { ...report, id: "future", observedAt: new Date(now + 1000).toISOString() },
  ], now);
  assert.equal(zones.length, 1);
  assert.equal(zones[0].id, "report-r");
  assert.equal(zones[0].radiusMeters, 250);
});
test("successful routes persist with a sync timestamp and return the exact journey on network failure", async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  } });
  let requestedURL = "";
  globalThis.fetch = async (url) => {
    requestedURL = url;
    return { ok: true, json: async () => ({ code: "Ok", routes: [{ distance: 8000, duration: 700, geometry: { coordinates: [[91.1, 25.1], [91.2, 25.2]] } }] }) };
  };
  try {
    const live = await fetchJourneyRoutes([25.1, 91.1], [25.2, 91.2], new AbortController().signal);
    assert.equal(live.source, "live");
    assert.match(requestedURL, /alternatives=3/);
    assert.ok(values.size > 0);
    globalThis.fetch = async () => { throw new TypeError("Offline"); };
    const cached = await fetchJourneyRoutes([25.1, 91.1], [25.2, 91.2], new AbortController().signal);
    assert.equal(cached.source, "cache");
    assert.equal(cached.syncedAt, live.syncedAt);
    assert.deepEqual(cached.routes, live.routes);
    assert.match(cached.warning, /last synced/);
    assert.equal(readCachedJourney([25.2, 91.2], [25.1, 91.1]), null);
    const cancel = new AbortController();
    cancel.abort();
    await assert.rejects(() => fetchJourneyRoutes([25.1, 91.1], [25.2, 91.2], cancel.signal), { name: "AbortError" });
    values.set("safeyatri:road-routes:v2", JSON.stringify([{ key: "1,2:3,4", syncedAt: new Date().toISOString(), routes: [{ points: [[NaN, 2]], distance: 2, duration: 2 }] }]));
    assert.equal(readCachedJourney([1, 2], [3, 4]), null);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
    else delete globalThis.localStorage;
  }
});
test("a bounded detour is accepted only after its road geometry avoids every known closure", async () => {
  const original = globalThis.fetch;
  const base = { ...closure, lat: 25, lng: 90 };
  const start = [24.9, 90], end = [25.1, 90];
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    const coordinates = calls === 1 ? [[90, 24.9], [90, 25.1]] : [[90, 24.9], [90.15, 25], [90, 25.1]];
    return { ok: true, json: async () => ({ code: "Ok", routes: [{ distance: calls === 1 ? 22000 : 35000, duration: 2200, geometry: { coordinates } }] }) };
  };
  try {
    const result = await fetchJourneyRoutes(start, end, new AbortController().signal, [base]);
    assert.equal(calls, 3);
    const ranked = rankJourneyRoutes(result.routes, [base]);
    assert.equal(ranked[0].blocked, false);
    assert.equal(ranked.some((r) => r.blocked), true);
  } finally { globalThis.fetch = original; }
});
test("a cancelled request cannot cache a late response for a stale journey", async () => {
  const original = globalThis.fetch;
  let release;
  globalThis.fetch = () => new Promise((resolve) => { release = resolve; });
  try {
    const controller = new AbortController();
    const pending = fetchJourneyRoutes([23.1, 92.1], [23.2, 92.2], controller.signal);
    controller.abort();
    release({ ok: true, json: async () => ({ code: "Ok", routes: [{ distance: 8000, duration: 700, geometry: { coordinates: [[92.1, 23.1], [92.2, 23.2]] } }] }) });
    await assert.rejects(pending, { name: "AbortError" });
    assert.equal(readCachedJourney([23.1, 92.1], [23.2, 92.2]), null);
  } finally { globalThis.fetch = original; }
});
test("offline journeys without an exact saved match fail clearly without requesting a route", async () => {
  const originalFetch = globalThis.fetch;
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { onLine: false } });
  let fetched = false;
  globalThis.fetch = async () => { fetched = true; throw new Error("Should not fetch"); };
  try {
    await assert.rejects(() => fetchJourneyRoutes([22.1, 93.1], [22.2, 93.2], new AbortController().signal), /offline.*has not been saved/);
    assert.equal(fetched, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
    else delete globalThis.navigator;
  }
});
