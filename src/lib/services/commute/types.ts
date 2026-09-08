export type ProfileId = "alberto" | "patricia";

export type RouteId = string;

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteDefinition {
  id: RouteId;
  label: string;
  waypoints: LatLng[];
}

export interface DistrustRule {
  routeId: RouteId;
  multiplier: number;
}

export interface CommuteConfig {
  origin: LatLng;
  destination: LatLng;
  routes: RouteDefinition[];
  distrust?: DistrustRule;
}

export interface RouteLeg {
  durationSeconds: number;
  staticDurationSeconds: number;
}

export interface RouteMinutes {
  id: RouteId;
  label: string;
  liveMinutes: number;
  typicalMinutes: number;
}

export interface CommuteStatus {
  profile: ProfileId;
  generatedAt: string;
  routes: Array<{
    id: RouteId;
    label: string;
    liveMinutes: number;
    typicalMinutes: number;
  }>;
  recommended: RouteId;
  spokenText: string;
}
