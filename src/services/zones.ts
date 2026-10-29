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
import { createSnapshotReceiver, type SyncMetadata } from "./offline";
export function watchZones(
  next: (zones: RoadZone[]) => void,
  error: (error: Error) => void,
  onSync?: (metadata: SyncMetadata) => void,
) {
  const uid = auth?.currentUser?.uid;
  if (!db || !uid) return () => {};
  const receive = createSnapshotReceiver(uid, "zones", next, onSync);
  return onSnapshot(
    collection(db, "zones"),
    { includeMetadataChanges: true },
    (snapshot) => {
      const items = snapshot.docs.map((document) => {
        const data = document.data();
        return {
          ...data,
          id: document.id,
          expiresAt: data.expiresAt.toDate().toISOString(),
          updatedAt: data.updatedAt?.toDate?.().toISOString() || "",
        } as RoadZone;
      });
      receive(items, snapshot.metadata);
    },
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
