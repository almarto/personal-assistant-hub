import { describe, expect, it } from "vitest";

import { pickRecommendedRoute } from "./decision";
import type { RouteMinutes } from "./types";

function route(
  id: string,
  liveMinutes: number,
  typicalMinutes: number,
  distrustMultiplier?: number
): RouteMinutes {
  return { id, label: id, liveMinutes, typicalMinutes, distrustMultiplier };
}

describe("pickRecommendedRoute (route with its own distrust multiplier)", () => {
  it("picks Fast when it has a clear margin over the buffered comparison", () => {
    const routes = [route("long", 42, 42), route("mid", 32, 32), route("fast", 22, 22, 1.25)];
    expect(pickRecommendedRoute(routes)).toBe("fast");
  });

  it("picks Mid when Fast is jammed enough that its buffered time loses", () => {
    const routes = [route("long", 42, 42), route("mid", 32, 32), route("fast", 35, 22, 1.25)];
    expect(pickRecommendedRoute(routes)).toBe("mid");
  });

  it("picks Long when the shared segment jam drags both Mid and Fast down", () => {
    const routes = [route("long", 42, 42), route("mid", 55, 32), route("fast", 50, 22, 1.25)];
    expect(pickRecommendedRoute(routes)).toBe("long");
  });

  it("favors Mid on an exact tie at the buffer boundary", () => {
    // fast.live (24) * 1.25 === mid.live (30) exactly
    const routes = [route("long", 42, 42), route("mid", 30, 30), route("fast", 24, 24, 1.25)];
    expect(pickRecommendedRoute(routes)).toBe("mid");
  });
});

describe("pickRecommendedRoute (no distrust multiplier set)", () => {
  it("picks whichever route has the lower live minutes, unadjusted", () => {
    const routes = [route("route-a", 30, 25), route("route-b", 28, 28)];
    expect(pickRecommendedRoute(routes)).toBe("route-b");
  });

  it("picks the route that's normally slower once the other one jams", () => {
    const routes = [route("route-a", 25, 20), route("route-b", 40, 30)];
    expect(pickRecommendedRoute(routes)).toBe("route-a");

    const jammedRoutes = [route("route-a", 45, 20), route("route-b", 30, 30)];
    expect(pickRecommendedRoute(jammedRoutes)).toBe("route-b");
  });
});

describe("pickRecommendedRoute edge cases", () => {
  it("throws on an empty route list", () => {
    expect(() => pickRecommendedRoute([])).toThrow("empty");
  });
});
