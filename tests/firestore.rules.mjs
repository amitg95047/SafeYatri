import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
const env = await initializeTestEnvironment({
  projectId: "demo-safeyatra",
  firestore: {
    host: "127.0.0.1",
    port: 8085,
    rules: readFileSync("firestore.rules", "utf8"),
  },
});
let passed = 0;
async function succeeds(name, operation) {
  await assertSucceeds(operation);
  passed++;
  console.log(`PASS ${name}`);
}
async function fails(name, operation) {
  await assertFails(operation);
  passed++;
  console.log(`PASS ${name}`);
}
const client = (uid, email = `${uid}@example.com`, verified = true) =>
  env
    .authenticatedContext(uid, { email, email_verified: verified })
    .firestore();
const admin = client("admin", "amitag3007@gmail.com");
const alice = client("alice");
const bob = client("bob");
const photo = "data:image/jpeg;base64," + "A".repeat(150);
function report(uid, id, extra = {}) {
  return {
    id,
    corridor: "NH-10 · Siliguri–Gangtok",
    title: "Landslide report",
    type: "Landslide",
    status: "orange",
    review: "pending",
    location: "Rangpo bridge",
    description: "Rocks have blocked the road.",
    observedAt: Timestamp.now(),
    lat: 27,
    lng: 88,
    photo,
    reporter: `${uid}@example.com`,
    reporterId: uid,
    rewardAwarded: false,
    decisionHistory: [
      {
        action: "submitted",
        by: `${uid}@example.com`,
        at: new Date().toISOString(),
      },
    ],
    ...extra,
  };
}
function submit(db, uid, id, extra = {}) {
  const batch = writeBatch(db);
  batch.set(doc(db, "reports", id), report(uid, id, extra));
  batch.set(doc(db, "reportLimits", uid), {
    lastAt: serverTimestamp(),
    lastReportId: id,
  });
  return batch.commit();
}
function decision(action, awarded = false) {
  return {
    review: action,
    status:
      action === "verified"
        ? "red"
        : action === "rejected"
          ? "white"
          : "orange",
    rewardAwarded: awarded,
    decisionHistory: [
      { action, by: "amitag3007@gmail.com", at: new Date().toISOString() },
    ],
  };
}
function award(db, id, uid, points) {
  const batch = writeBatch(db);
  batch.update(doc(db, "reports", id), decision("verified", true));
  batch.set(doc(db, "users", uid), { points, lastRewardReportId: id });
  batch.set(doc(db, "users", uid, "rewards", id), {
    points: 50,
    reportId: id,
    at: serverTimestamp(),
    reason: "Admin verified your incident",
  });
  return batch.commit();
}
try {
  await fails(
    "anonymous cannot read reports",
    getDoc(doc(env.unauthenticatedContext().firestore(), "reports/missing")),
  );
  await fails(
    "unverified users cannot submit",
    submit(
      client("unverified", "unverified@example.com", false),
      "unverified",
      "unverified-report",
    ),
  );
  const invalid = [
    [
      "future observation",
      { observedAt: Timestamp.fromMillis(Date.now() + 120000) },
    ],
    [
      "old observation",
      { observedAt: Timestamp.fromMillis(Date.now() - 90000000) },
    ],
    ["bad latitude", { lat: 91 }],
    ["bad longitude", { lng: -181 }],
    ["missing evidence", { photo: "" }],
    [
      "oversize evidence",
      { photo: "data:image/jpeg;base64," + "A".repeat(140000) },
    ],
    ["foreign reporter", { reporterId: "victim" }],
    ["forged email", { reporter: "victim@example.com" }],
    ["short description", { description: "short" }],
    ["oversize description", { description: "a".repeat(1001) }],
    ["forged verification", { review: "verified" }],
    ["forged reward flag", { rewardAwarded: true }],
    ["unexpected fields", { admin: true }],
    ["invalid incident type", { type: "Made up" }],
  ];
  for (let index = 0; index < invalid.length; index++) {
    const [name, extra] = invalid[index];
    const uid = `invalid${index}`;
    await fails(name, submit(client(uid), uid, `invalid-${index}`, extra));
  }
  await succeeds(
    "verified traveller submits photo report atomically",
    submit(alice, "alice", "report-first"),
  );
  await fails(
    "one-minute report interval enforced",
    submit(alice, "alice", "report-too-soon"),
  );
  await fails(
    "report without rate-limit document denied",
    setDoc(doc(bob, "reports/unthrottled"), report("bob", "unthrottled")),
  );
  await succeeds(
    "signed-in travellers read reports",
    getDoc(doc(bob, "reports/report-first")),
  );
  await fails(
    "traveller cannot review own report",
    updateDoc(doc(alice, "reports/report-first"), decision("verified", true)),
  );
  await fails(
    "traveller cannot alter points",
    setDoc(doc(alice, "users/alice"), {
      points: 99999,
      lastRewardReportId: "fake",
    }),
  );
  await fails(
    "unverified admin mailbox grants no review access",
    updateDoc(
      doc(
        client("impostor", "amitag3007@gmail.com", false),
        "reports/report-first",
      ),
      decision("rejected"),
    ),
  );
  await fails(
    "admin cannot confirm without atomic rewards",
    updateDoc(doc(admin, "reports/report-first"), decision("verified", true)),
  );
  await fails(
    "admin cannot award arbitrary points",
    award(admin, "report-first", "alice", 5000),
  );
  await succeeds(
    "admin confirmation awards exactly 50 points atomically",
    award(admin, "report-first", "alice", 50),
  );
  const account = await getDoc(doc(alice, "users/alice"));
  if (account.data().points !== 50) throw new Error("Wrong point total");
  passed++;
  await fails(
    "duplicate reward cannot be awarded",
    award(admin, "report-first", "alice", 100),
  );
  await succeeds(
    "admin can reopen without removing awarded marker",
    updateDoc(doc(admin, "reports/report-first"), decision("pending", true)),
  );
  await fails(
    "reopening cannot clear reward marker",
    updateDoc(doc(admin, "reports/report-first"), decision("pending", false)),
  );
  await succeeds(
    "reconfirmation preserves points without duplicate award",
    updateDoc(doc(admin, "reports/report-first"), decision("verified", true)),
  );
  await fails(
    "cross-account profile access denied",
    getDoc(doc(bob, "users/alice")),
  );
  await succeeds(
    "reporter reads own reward history",
    getDoc(doc(alice, "users/alice/rewards/report-first")),
  );
  await fails(
    "reward entries cannot be edited",
    updateDoc(doc(admin, "users/alice/rewards/report-first"), { points: 100 }),
  );
  await fails(
    "review cannot edit incident description",
    updateDoc(doc(admin, "reports/report-first"), {
      description: "Replaced content by admin",
    }),
  );
  await succeeds(
    "free user can pin one favourite",
    setDoc(doc(alice, "users/alice/journeys/favourite"), {
      from: "Shillong",
      to: "Sohra",
    }),
  );
  await fails(
    "second free favourite blocked",
    setDoc(doc(alice, "users/alice/journeys/second"), {
      from: "Gangtok",
      to: "Pelling",
    }),
  );
  await fails(
    "cross-account journey write denied",
    setDoc(doc(bob, "users/alice/journeys/favourite"), {
      from: "Gangtok",
      to: "Pelling",
    }),
  );
  await succeeds(
    "user can replace favourite",
    setDoc(doc(alice, "users/alice/journeys/favourite"), {
      from: "Gangtok",
      to: "Pelling",
    }),
  );
  await succeeds(
    "user can remove favourite",
    deleteDoc(doc(alice, "users/alice/journeys/favourite")),
  );
  await fails(
    "forged subscription denied",
    setDoc(doc(alice, "customers/alice/subscriptions/fake"), {
      status: "active",
    }),
  );
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(
      doc(ctx.firestore(), "reports/admin-own"),
      report("admin", "admin-own", { reporter: "amitag3007@gmail.com" }),
    );
  });
  await succeeds(
    "admin can review own submission without reward",
    updateDoc(doc(admin, "reports/admin-own"), decision("verified", false)),
  );
  await fails(
    "admin cannot award own report points",
    award(admin, "admin-own", "admin", 50),
  );
  const zone = {
    id: "zone-test",
    name: "Test advisory",
    status: "caution",
    lat: 27,
    lng: 88,
    radiusMeters: 2500,
    note: "Local knowledge",
    active: true,
    isDemo: true,
    expiresAt: Timestamp.fromMillis(Date.now() + 3600000),
    updatedAt: serverTimestamp(),
    updatedBy: "amitag3007@gmail.com",
  };
  await succeeds(
    "admin creates zone with no camera or report",
    setDoc(doc(admin, "zones/zone-test"), zone),
  );
  await succeeds(
    "traveller reads zones",
    getDoc(doc(alice, "zones/zone-test")),
  );
  await fails(
    "traveller cannot alter zone",
    updateDoc(doc(alice, "zones/zone-test"), {
      status: "clear",
      updatedAt: serverTimestamp(),
      updatedBy: "alice@example.com",
    }),
  );
  await fails(
    "unverified admin cannot create zone",
    setDoc(
      doc(
        client("fake-admin", "amitag3007@gmail.com", false),
        "zones/zone-test-2",
      ),
      { ...zone, id: "zone-test-2" },
    ),
  );
  await succeeds(
    "admin changes zone directly",
    updateDoc(doc(admin, "zones/zone-test"), {
      status: "closed",
      updatedAt: serverTimestamp(),
    }),
  );
  await succeeds(
    "admin archives zone",
    updateDoc(doc(admin, "zones/zone-test"), {
      active: false,
      updatedAt: serverTimestamp(),
    }),
  );
  await fails(
    "zone hard deletion blocked; archive instead",
    deleteDoc(doc(admin, "zones/zone-test")),
  );
  for (const [label, patch] of [
    ["oversized radius", { radiusMeters: 100000 }],
    ["bad latitude", { lat: 100 }],
    ["invalid status", { status: "guaranteed safe" }],
    [
      "unbounded expiry",
      { expiresAt: Timestamp.fromMillis(Date.now() + 10 * 86400000) },
    ],
    ["forged actor", { updatedBy: "another@example.com" }],
  ])
    await fails(
      `zone rejects ${label}`,
      setDoc(doc(admin, "zones/zone-invalid"), {
        ...zone,
        id: "zone-invalid",
        ...patch,
      }),
    );
  console.log(`${passed} Firestore security checks passed.`);
} finally {
  await env.cleanup();
}
