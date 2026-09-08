import type { DistrustRule, ProfileId } from "./types";

export interface RouteSpec {
  id: string;
  label: string;
  waypointsEnvVar: string;
}

export interface ProfileSpec {
  id: ProfileId;
  originEnvVar: string;
  destinationEnvVar: string;
  routes: RouteSpec[];
  distrust?: DistrustRule;
  userIdEnvVar: string;
  apiKeyEnvVar: string;
}

export const PROFILES: ProfileSpec[] = [
  {
    id: "alberto",
    originEnvVar: "COMMUTE_ORIGIN_ALBERTO",
    destinationEnvVar: "COMMUTE_DESTINATION_ALBERTO",
    routes: [
      { id: "long", label: "Long", waypointsEnvVar: "COMMUTE_WAYPOINTS_ALBERTO_LONG" },
      { id: "mid", label: "Mid", waypointsEnvVar: "COMMUTE_WAYPOINTS_ALBERTO_MID" },
      { id: "fast", label: "Fast", waypointsEnvVar: "COMMUTE_WAYPOINTS_ALBERTO_FAST" },
    ],
    distrust: { routeId: "fast", multiplier: 1.25 },
    userIdEnvVar: "COMMUTE_USER_ID_ALBERTO",
    apiKeyEnvVar: "COMMUTE_API_KEY_ALBERTO",
  },
  {
    id: "patricia",
    originEnvVar: "COMMUTE_ORIGIN_PATRICIA",
    destinationEnvVar: "COMMUTE_DESTINATION_PATRICIA",
    routes: [
      { id: "route-a", label: "Route A", waypointsEnvVar: "COMMUTE_WAYPOINTS_PATRICIA_A" },
      { id: "route-b", label: "Route B", waypointsEnvVar: "COMMUTE_WAYPOINTS_PATRICIA_B" },
    ],
    userIdEnvVar: "COMMUTE_USER_ID_PATRICIA",
    apiKeyEnvVar: "COMMUTE_API_KEY_PATRICIA",
  },
];

export function getProfileSpec(id: ProfileId): ProfileSpec {
  const spec = PROFILES.find((profile) => profile.id === id);
  if (!spec) {
    throw new Error(`Unknown commute profile: ${id}`);
  }
  return spec;
}
