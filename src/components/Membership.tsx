import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { db } from "../services/firebase";
import type { AppUser } from "../services/auth";
export function Membership({
  user,
  from,
  to,
}: {
  user: AppUser;
  from: string;
  to: string;
}) {
  const [points, setPoints] = useState(0),
    [message, setMessage] = useState("");
  const [journeys, setJourneys] = useState<
    { id: string; from: string; to: string }[]
  >([]);
  const [rewards, setRewards] = useState<
    { id: string; points: number; at: string }[]
  >([]);
  useEffect(() => {
    if (!db) return;
    const stops = [
      onSnapshot(
        doc(db, "users", user.uid),
        (s) => setPoints(s.data()?.points || 0),
        (e) => setMessage(e.message),
      ),
      onSnapshot(
        collection(db, "users", user.uid, "journeys"),
        (s) =>
          setJourneys(
            s.docs.map(
              (d) =>
                ({ id: d.id, ...d.data() }) as {
                  id: string;
                  from: string;
                  to: string;
                },
            ),
          ),
        (e) => setMessage(e.message),
      ),
      onSnapshot(
        collection(db, "users", user.uid, "rewards"),
        (s) =>
          setRewards(
            s.docs.map(
              (d) =>
                ({
                  id: d.id,
                  ...d.data(),
                  at: (d.data().at?.toDate?.() || new Date()).toISOString(),
                }) as { id: string; points: number; at: string },
            ),
          ),
        (e) => setMessage(e.message),
      ),
    ];
    return () => stops.forEach((stop) => stop());
  }, [user.uid]);
  const save = async () => {
    if (!db) return;
    try {
      await setDoc(doc(db, "users", user.uid, "journeys", "favourite"), {
        from,
        to,
      });
      setMessage("Favourite journey saved across your devices.");
    } catch (e) {
      setMessage(String(e));
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">TRAVEL WELL · CONTRIBUTE WELL</span>
          <h1>Rewards & membership</h1>
          <p>
            Road reports, community points and a favourite journey are free.
          </p>
        </div>
      </div>
      <div className="mine-stats">
        <div>
          <span>Community points</span>
          <strong>{points}</strong>
        </div>
        <div>
          <span>Per approved report</span>
          <strong>+50</strong>
        </div>
        <div>
          <span>Your membership</span>
          <strong>Free</strong>
        </div>
      </div>
      <div className="membership-grid">
        <article className="form-card">
          <span className="eyebrow">AVAILABLE NOW</span>
          <h2>safeYatri Free</h2>
          <p>₹0 · no subscription required</p>
          <ul>
            <li>Browse community road reports</li>
            <li>Explore 81 Northeast destinations and gateways</li>
            <li>Submit live camera evidence</li>
            <li>Earn 50 points per independently approved report</li>
            <li>Pin one favourite journey across devices</li>
          </ul>
          <p>
            Points recognise helpful contributions and have no cash value. Each
            report earns points once, including after reopening.
          </p>
        </article>
        <article className="form-card">
          <span className="eyebrow">PLANNED SUBSCRIPTION</span>
          <h2>safeYatri Plus</h2>
          <p>Proposed extra features · checkout unavailable</p>
          <ul>
            <li>Multiple saved journeys</li>
            <li>Personal route alerts</li>
            <li>Downloadable travel summaries</li>
          </ul>
          <button className="btn btn-outline" disabled>
            Coming later · no payments enabled
          </button>
          <p className="form-footnote">
            These Plus features are planned. The project stays on Firebase's
            free Spark plan; paid subscription processing is not connected.
          </p>
        </article>
      </div>
      {message && (
        <div className="route-message" role="status">
          {message}
        </div>
      )}
      <section className="form-card">
        <h3>Your favourite journey</h3>
        <p>
          Choose a journey in Explore roads, then pin it here. Saving replaces
          your previous favourite.
        </p>
        <button className="btn btn-primary" onClick={save}>
          Pin {from} → {to}
        </button>
        {journeys.map((j) => (
          <div className="saved-journey" key={j.id}>
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(j.from)}&destination=${encodeURIComponent(j.to)}&travelmode=driving`}
            >
              {j.from} → {j.to} ↗
            </a>
            <button
              className="text-link"
              onClick={async () => {
                try {
                  await deleteDoc(
                    doc(db!, "users", user.uid, "journeys", j.id),
                  );
                } catch (e) {
                  setMessage(String(e));
                }
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </section>
      <section className="form-card">
        <h3>Points history</h3>
        {rewards.length === 0 ? (
          <p>Your first approved incident starts your points history.</p>
        ) : (
          rewards
            .sort((a, b) => b.at.localeCompare(a.at))
            .map((r) => (
              <p key={r.id}>
                +{r.points} · Report verified ·{" "}
                {new Date(r.at).toLocaleString("en-IN")}
              </p>
            ))
        )}
      </section>
    </>
  );
}
