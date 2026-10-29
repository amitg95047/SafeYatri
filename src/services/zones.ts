import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import type { RoadZone } from "../types";
export function watchZones(
  next: (zones: RoadZone[]) => void,
  error: (error: Error) => void,
) {
  if (!db) return () => {};
  return onSnapshot(
    collection(db, "zones"),
    (snapshot) =>
      next(
        snapshot.docs.map(
          (d) =>
            ({
              ...d.data(),
              id: d.id,
              expiresAt: d.data().expiresAt.toDate().toISOString(),
              updatedAt: d.data().updatedAt?.toDate?.().toISOString() || "",
            }) as RoadZone,
        ),
      ),
    error,
  );
}
export async function saveZone(zone: RoadZone) {
  const user = auth?.currentUser;
  if (!db || !user) throw new Error("Sign in as administrator first.");
  await setDoc(doc(db, "zones", zone.id), {
    ...zone,
    expiresAt: Timestamp.fromDate(new Date(zone.expiresAt)),
    updatedAt: serverTimestamp(),
    updatedBy: user.email,
  });
}
