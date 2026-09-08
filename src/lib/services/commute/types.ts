export type RouteId = string;

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteDefinition {
  id: RouteId;
  label: string;
  waypoints: LatLng[];
  distrustMultiplier?: number;
}

export interface CommuteConfig {
  origin: LatLng;
  destination: LatLng;
  routes: RouteDefinition[];
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
  distrustMultiplier?: number;
}

export interface CommuteStatus {
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
