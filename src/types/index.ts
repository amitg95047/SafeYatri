export type RoadStatus = "red" | "orange" | "yellow" | "green" | "white";
export type ReviewStatus =
  "pending" | "verified" | "rejected" | "clarification";
export type IncidentType =
  | "Blocked road"
  | "Landslide"
  | "Road damage"
  | "Heavy rain"
  | "Flooding"
  | "Fallen tree"
  | "Other";
export interface Incident {
  id: string;
  corridor: string;
  title: string;
  type: IncidentType;
  status: RoadStatus;
  review: ReviewStatus;
  location: string;
  description: string;
  observedAt: string;
  lat: number;
  lng: number;
  photo?: string;
  reporter: string;
  reporterId?: string;
  rewardAwarded?: boolean;
  fictional?: boolean;
  decisionHistory: { action: string; by: string; at: string; note?: string }[];
}
export interface WeatherAdvisory {
  id: string;
  title: string;
  source: string;
  expiresAt: string;
  detail: string;
}

export type ZoneStatus = "closed" | "caution" | "clear" | "unknown";
export interface RoadZone {
  id: string;
  name: string;
  status: ZoneStatus;
  lat: number;
  lng: number;
  radiusMeters: number;
  note: string;
  active: boolean;
  isDemo: boolean;
  expiresAt: string;
  updatedAt: string;
  updatedBy: string;
}
