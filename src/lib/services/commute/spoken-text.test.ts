import { describe, expect, it } from "vitest";

import { buildSpokenText } from "./spoken-text";
import type { RouteMinutes } from "./types";

function route(id: string, label: string, liveMinutes: number, typicalMinutes: number): RouteMinutes {
  return { id, label, liveMinutes, typicalMinutes };
}

describe("buildSpokenText", () => {
  it("describes a normal win with no reason clause when nothing is jammed", () => {
    const routes = [route("long", "Long", 42, 42), route("mid", "Mid", 32, 32), route("fast", "Fast", 22, 22)];

    expect(buildSpokenText(routes, "fast")).toBe(
      "Take the Fast route today, 10 minutes faster than the Mid route and 20 minutes faster than the Long route."
    );
  });

  it("names a single jammed alternative", () => {
    const routes = [route("long", "Long", 42, 42), route("mid", "Mid", 32, 32), route("fast", "Fast", 35, 22)];

    expect(buildSpokenText(routes, "mid")).toBe(
      "Take the Mid route today — the Fast route currently has heavy traffic, 3 minutes faster than the Fast route and 10 minutes faster than the Long route."
    );
  });

  it("names multiple jammed alternatives", () => {
    const routes = [route("long", "Long", 42, 42), route("mid", "Mid", 55, 32), route("fast", "Fast", 50, 22)];

    expect(buildSpokenText(routes, "long")).toBe(
      "Take the Long route today — the Mid route and the Fast route currently have heavy traffic, 13 minutes faster than the Mid route and 8 minutes faster than the Fast route."
    );
  });

  it("handles a winner chosen despite a raw-lower competitor, with no jam reason", () => {
    const routes = [route("long", "Long", 42, 42), route("mid", "Mid", 30, 30), route("fast", "Fast", 24, 24)];

    expect(buildSpokenText(routes, "mid")).toBe(
      "Take the Mid route today, chosen over the Fast route, whose live estimate of 24 minutes tends to run worse than shown and 12 minutes faster than the Long route."
    );
  });

  it("works for a simple 2-route profile with no distrust nuance", () => {
    const routes = [route("route-a", "Route A", 45, 20), route("route-b", "Route B", 30, 30)];

    expect(buildSpokenText(routes, "route-b")).toBe(
      "Take the Route B route today — the Route A route currently has heavy traffic, 15 minutes faster than the Route A route."
    );
  });

  it("throws when the recommended id is not in the routes list", () => {
    const routes = [route("long", "Long", 42, 42)];
    expect(() => buildSpokenText(routes, "mid")).toThrow('"mid" not found');
  });
});
