import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import type { Incident, ReviewStatus, RoadStatus } from "../types";
export function watchReports(
  next: (items: Incident[]) => void,
  error: (e: Error) => void,
) {
  if (!db) return () => {};
  return onSnapshot(
    query(collection(db, "reports"), orderBy("observedAt", "desc")),
    (s) =>
      next(
        s.docs.map(
          (d) =>
            ({
              ...d.data(),
              id: d.id,
              observedAt: d.data().observedAt.toDate().toISOString(),
            }) as Incident,
        ),
      ),
    error,
  );
}
export async function createReport(report: Incident) {
  const user = auth?.currentUser;
  if (!db || !user) throw new Error("Sign in first.");
  await runTransaction(db, async (tx) => {
    const limit = doc(db!, "reportLimits", user.uid);
    const last = await tx.get(limit);
    if (last.exists() && Date.now() - last.data().lastAt.toMillis() < 60000)
      throw new Error("Wait one minute before another report.");
    tx.set(doc(db!, "reports", report.id), {
      ...report,
      observedAt: Timestamp.fromDate(new Date(report.observedAt)),
      reporter: user.email,
      reporterId: user.uid,
      rewardAwarded: false,
      status: "orange",
      review: "pending",
      decisionHistory: [
        {
          action: "submitted",
          by: user.email,
          at: new Date().toISOString(),
          note: "Awaiting admin review",
        },
      ],
    });
    tx.set(limit, { lastAt: serverTimestamp(), lastReportId: report.id });
  });
}
export async function reviewReport(
  id: string,
  action: ReviewStatus,
  note: string,
) {
  const user = auth?.currentUser;
  if (!db || !user) throw new Error("Sign in first.");
  await runTransaction(db, async (tx) => {
    const ref = doc(db!, "reports", id);
    const snapshot = await tx.get(ref);
    if (!snapshot.exists()) throw new Error("Report not found.");
    const report = snapshot.data();
    const award =
      action === "verified" &&
      !report.rewardAwarded &&
      report.reporterId !== user.uid;
    const profile = doc(db!, "users", report.reporterId);
    const account = award ? await tx.get(profile) : null;
    const status: RoadStatus =
      action === "verified"
        ? report.type === "Landslide" || report.type === "Blocked road"
          ? "red"
          : "yellow"
        : action === "rejected"
          ? "white"
          : "orange";
    tx.update(ref, {
      review: action,
      status,
      rewardAwarded: report.rewardAwarded || award,
      decisionHistory: [
        { action, by: user.email, at: new Date().toISOString(), note },
        ...report.decisionHistory,
      ].slice(0, 100),
    });
    if (award) {
      tx.set(profile, {
        points: (account?.data()?.points || 0) + 50,
        lastRewardReportId: id,
      });
      tx.set(doc(db!, "users", report.reporterId, "rewards", id), {
        points: 50,
        reportId: id,
        at: serverTimestamp(),
        reason: "Admin verified your incident",
      });
    }
  });
}
