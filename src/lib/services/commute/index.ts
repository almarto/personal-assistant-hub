import { getCommuteConfigForUser, getGoogleRoutesApiKey } from "./config";
import { pickRecommendedRoute } from "./decision";
import { fetchRouteLegs } from "./google-routes";
import { buildSpokenText } from "./spoken-text";
import type { CommuteStatus, RouteLeg, RouteMinutes } from "./types";

function sumLive(legs: RouteLeg[]): number {
  return legs.reduce((total, leg) => total + leg.durationSeconds, 0) / 60;
}

function sumTypical(legs: RouteLeg[]): number {
  return legs.reduce((total, leg) => total + leg.staticDurationSeconds, 0) / 60;
}

export async function getCommuteStatus(userId: string): Promise<CommuteStatus | null> {
  const config = await getCommuteConfigForUser(userId);
  if (!config) {
    return null;
  }

  const apiKey = getGoogleRoutesApiKey();

  const routeMinutes: RouteMinutes[] = await Promise.all(
    config.routes.map(async (route) => {
      const legs = await fetchRouteLegs(
        { origin: config.origin, destination: config.destination, waypoints: route.waypoints },
        apiKey
      );
      return {
        id: route.id,
        label: route.label,
        liveMinutes: sumLive(legs),
        typicalMinutes: sumTypical(legs),
        distrustMultiplier: route.distrustMultiplier,
      };
    })
  );

  const recommended = pickRecommendedRoute(routeMinutes);
  const spokenText = buildSpokenText(routeMinutes, recommended);

  return {
    generatedAt: new Date().toISOString(),
    routes: routeMinutes.map(({ id, label, liveMinutes, typicalMinutes }) => ({ id, label, liveMinutes, typicalMinutes })),
    recommended,
    spokenText,
  };
}
