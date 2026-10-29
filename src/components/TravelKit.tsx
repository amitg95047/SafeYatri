import { useEffect, useState } from "react";
import { Backpack, CheckCircle2 } from "lucide-react";
const items = ["Download your journey brief", "Check district notices & required permits", "Share your itinerary with someone you trust", "Pack water, a first-aid kit & a power bank", "Check fuel and plan daylight travel"];
export function TravelKit({ uid, from, to }: { uid: string; from: string; to: string }) {
  const key = `safeyatri.checklist.${uid}.${from}.${to}`;
  const [checked, setChecked] = useState<number[]>([]);
  useEffect(() => { try { const value = JSON.parse(localStorage.getItem(key) || "[]"); setChecked(Array.isArray(value) ? value.filter((i) => Number.isInteger(i) && i >= 0 && i < items.length) : []); } catch { setChecked([]); } }, [key]);
  return <section className="travel-kit"><div><span className="eyebrow">A LITTLE PREPARATION GOES A LONG WAY</span><h3><Backpack size={20}/>Your departure checklist</h3><p>Saved on this device for {from} → {to}.</p><span className="checklist-progress"><CheckCircle2 size={15}/>{checked.length} of {items.length} ready</span></div><div className="checklist-items">{items.map((item, i) => <label key={item} className={checked.includes(i) ? "checklist-done" : ""}><input type="checkbox" checked={checked.includes(i)} onChange={() => { const next = checked.includes(i) ? checked.filter((v) => v !== i) : [...checked, i]; setChecked(next); try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Checklist stays usable in memory. */ } }}/><span>{item}</span></label>)}</div></section>;
}
