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
const { zoneTouchesRoute, mergeZones, DEMO_ZONES, fetchJourneyRoute } =
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
