import type { RouteId, RouteMinutes } from "./types";

const JAM_RATIO_THRESHOLD = 1.15;

function round(value: number): number {
  return Math.round(value);
}

function isJammed(route: RouteMinutes): boolean {
  return route.liveMinutes > route.typicalMinutes * JAM_RATIO_THRESHOLD;
}

function describeComparison(winner: RouteMinutes, other: RouteMinutes): string {
  if (winner.liveMinutes <= other.liveMinutes) {
    return `${round(other.liveMinutes - winner.liveMinutes)} minutes faster than the ${other.label} route`;
  }
  return `chosen over the ${other.label} route, whose live estimate of ${round(other.liveMinutes)} minutes tends to run worse than shown`;
}

function reasonFor(winner: RouteMinutes, routes: RouteMinutes[]): string {
  const jammedOthers = routes.filter((route) => route.id !== winner.id && isJammed(route));
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

  const others = routes.filter((route) => route.id !== recommended);

  // Separate by comparison type: "chosen over" vs "faster"
  const chosenOver = others.filter((other) => other.liveMinutes < winner.liveMinutes);
  const faster = others.filter((other) => other.liveMinutes >= winner.liveMinutes);

  // For "faster" routes, separate by jam status
  const jammedFaster = faster.filter((route) => isJammed(route));
  const nonJammedFaster = faster.filter((route) => !isJammed(route));

  // Sort non-jammed faster by difference ascending
  nonJammedFaster.sort((a, b) => {
    const diffA = a.liveMinutes - winner.liveMinutes;
    const diffB = b.liveMinutes - winner.liveMinutes;
    return diffA - diffB;
  });

  // Combine in order: chosenOver, jammedFaster, nonJammedFaster
  const sortedOthers = [...chosenOver, ...jammedFaster, ...nonJammedFaster];

  const comparisons = sortedOthers.map((other) => describeComparison(winner, other)).join(" and ");
  const reason = reasonFor(winner, routes);

  return `Take the ${winner.label} route today${reason}, ${comparisons}.`;
}
