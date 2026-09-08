import type { DistrustRule, RouteId, RouteMinutes } from "./types";

export function adjustedMinutes(route: RouteMinutes, distrust?: DistrustRule): number {
  if (distrust && route.id === distrust.routeId) {
    return route.liveMinutes * distrust.multiplier;
  }
  return route.liveMinutes;
}

export function pickRecommendedRoute(routes: RouteMinutes[], distrust?: DistrustRule): RouteId {
  if (routes.length === 0) {
    throw new Error("Cannot pick a recommended route from an empty list");
  }

  let best = routes[0];
  let bestAdjusted = adjustedMinutes(best, distrust);

  for (const route of routes.slice(1)) {
    const candidateAdjusted = adjustedMinutes(route, distrust);
    if (candidateAdjusted < bestAdjusted) {
      best = route;
      bestAdjusted = candidateAdjusted;
    }
  }

  return best.id;
}
