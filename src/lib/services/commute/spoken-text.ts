import type { RouteId, RouteMinutes } from "./types";

const JAM_RATIO_THRESHOLD = 1.15;

function round(value: number): number {
  return Math.round(value);
}

function isJammed(route: RouteMinutes): boolean {
  return route.liveMinutes > route.typicalMinutes * JAM_RATIO_THRESHOLD;
}

// Comparisons are listed closest-competitor-first: ascending by how much
// live time separates each other route from the winner (can be negative
// when "winner" is only ahead after the distrust buffer, in which case
// that route sorts first too).
function byGapAscending(winner: RouteMinutes) {
  return (a: RouteMinutes, b: RouteMinutes) =>
    (a.liveMinutes - winner.liveMinutes) - (b.liveMinutes - winner.liveMinutes);
}

function describeComparison(winner: RouteMinutes, other: RouteMinutes): string {
  if (winner.liveMinutes <= other.liveMinutes) {
    return `${round(other.liveMinutes - winner.liveMinutes)} minutes faster than the ${other.label} route`;
  }
  return `chosen over the ${other.label} route, whose live estimate of ${round(other.liveMinutes)} minutes tends to run worse than shown`;
}

function reasonFor(winner: RouteMinutes, routes: RouteMinutes[]): string {
  const jammedOthers = routes
    .filter((route) => route.id !== winner.id && isJammed(route))
    .sort(byGapAscending(winner));
  if (jammedOthers.length === 0) {
    return "";
  }

  const names = jammedOthers.map((route) => `the ${route.label} route`).join(" and ");
  const verb = jammedOthers.length > 1 ? "have" : "has";
  return ` — ${names} currently ${verb} heavy traffic`;
}

export function buildSpokenText(routes: RouteMinutes[], recommended: RouteId): string {
  const winner = routes.find((route) => route.id === recommended);
  if (!winner) {
    throw new Error(`Recommended route "${recommended}" not found in routes list`);
  }

  const others = routes.filter((route) => route.id !== recommended).sort(byGapAscending(winner));
  const comparisons = others.map((other) => describeComparison(winner, other)).join(" and ");
  const reason = reasonFor(winner, routes);

  return `Take the ${winner.label} route today${reason}, ${comparisons}.`;
}
