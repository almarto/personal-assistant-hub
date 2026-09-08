import { describe, expect, it } from "vitest";

import { pickRecommendedRoute } from "./decision";
import type { DistrustRule, RouteMinutes } from "./types";

function route(id: string, liveMinutes: number, typicalMinutes: number): RouteMinutes {
  return { id, label: id, liveMinutes, typicalMinutes };
}

const ALBERTO_DISTRUST: DistrustRule = { routeId: "fast", multiplier: 1.25 };

describe("pickRecommendedRoute (Alberto — with a distrust rule)", () => {
  it("picks Fast when it has a clear margin over the buffered comparison", () => {
    const routes = [route("long", 42, 42), route("mid", 32, 32), route("fast", 22, 22)];
    expect(pickRecommendedRoute(routes, ALBERTO_DISTRUST)).toBe("fast");
  });

  it("picks Mid when Fast is jammed enough that its buffered time loses", () => {
    const routes = [route("long", 42, 42), route("mid", 32, 32), route("fast", 35, 22)];
    expect(pickRecommendedRoute(routes, ALBERTO_DISTRUST)).toBe("mid");
  });

  it("picks Long when the shared segment jam drags both Mid and Fast down", () => {
    const routes = [route("long", 42, 42), route("mid", 55, 32), route("fast", 50, 22)];
    expect(pickRecommendedRoute(routes, ALBERTO_DISTRUST)).toBe("long");
  });

  it("favors Mid on an exact tie at the buffer boundary", () => {
    // fast.live (24) * 1.25 === mid.live (30) exactly
    const routes = [route("long", 42, 42), route("mid", 30, 30), route("fast", 24, 24)];
    expect(pickRecommendedRoute(routes, ALBERTO_DISTRUST)).toBe("mid");
  });
});

describe("pickRecommendedRoute (Patricia — no distrust rule)", () => {
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
