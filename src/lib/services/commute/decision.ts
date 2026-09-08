import type { RouteId, RouteMinutes } from "./types";

export function adjustedMinutes(route: RouteMinutes): number {
  return route.liveMinutes * (route.distrustMultiplier ?? 1);
}

export function pickRecommendedRoute(routes: RouteMinutes[]): RouteId {
  if (routes.length === 0) {
    throw new Error("Cannot pick a recommended route from an empty list");
  }

  let best = routes[0];
  let bestAdjusted = adjustedMinutes(best);

  for (const route of routes.slice(1)) {
    const candidateAdjusted = adjustedMinutes(route);
    if (candidateAdjusted < bestAdjusted) {
      best = route;
      bestAdjusted = candidateAdjusted;
    }
  }

  return best.id;
}
