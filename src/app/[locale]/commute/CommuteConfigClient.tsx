"use client";

import { useState, useTransition } from "react";

import {
  addCommuteRouteAction,
  deleteCommuteRouteAction,
  saveCommuteConfigAction,
  verifyRouteLiveTimeAction,
} from "@/app/actions/commute";
import type { CommuteConfigDetail, CommuteRouteDetail } from "@/lib/services/commute/config";
import type { LatLng } from "@/lib/services/commute/types";

interface Props {
  initialConfig: CommuteConfigDetail | null;
}

function parseLatLng(value: string): LatLng | null {
  const parts = value.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) {
    return null;
  }
  return { lat: parts[0], lng: parts[1] };
}

function formatLatLng(point: LatLng): string {
  return `${point.lat}, ${point.lng}`;
}

export function CommuteConfigClient({ initialConfig }: Props) {
  const [config, setConfig] = useState(initialConfig);
  const [name, setName] = useState(initialConfig?.name ?? "");
  const [origin, setOrigin] = useState(initialConfig ? formatLatLng(initialConfig.origin) : "");
  const [destination, setDestination] = useState(initialConfig ? formatLatLng(initialConfig.destination) : "");
  const [configError, setConfigError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSaveConfig() {
    const originPoint = parseLatLng(origin);
    const destinationPoint = parseLatLng(destination);
    if (!originPoint || !destinationPoint || !name.trim()) {
      setConfigError("Fill in a name and both coordinates as \"lat, lng\"");
      return;
    }
    setConfigError(null);
    startTransition(async () => {
      const result = await saveCommuteConfigAction({ name, origin: originPoint, destination: destinationPoint });
      if (!result.success) {
        setConfigError(result.error ?? "Failed to save");
        return;
      }
      setConfig((current) => ({
        id: current?.id ?? "",
        name,
        origin: originPoint,
        destination: destinationPoint,
        routes: current?.routes ?? [],
      }));
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2 rounded border border-gray-200 p-4">
        <h2 className="font-medium">Origin &amp; destination</h2>
        <input
          className="rounded border border-gray-300 p-2"
          placeholder="Name (e.g. School run)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="rounded border border-gray-300 p-2"
          placeholder="Origin lat, lng"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
        />
        <input
          className="rounded border border-gray-300 p-2"
          placeholder="Destination lat, lng"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
        {configError && <p className="text-sm text-red-600">{configError}</p>}
        <button
          className="self-start rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          onClick={handleSaveConfig}
          disabled={isPending}
        >
          Save
        </button>
      </section>

      {config && (
        <RouteList
          origin={config.origin}
          destination={config.destination}
          routes={config.routes}
          onRoutesChange={(routes) => setConfig((current) => (current ? { ...current, routes } : current))}
        />
      )}
    </div>
  );
}

interface RouteListProps {
  origin: LatLng;
  destination: LatLng;
  routes: CommuteRouteDetail[];
  onRoutesChange: (routes: CommuteRouteDetail[]) => void;
}

function RouteList({ origin, destination, routes, onRoutesChange }: RouteListProps) {
  const [newName, setNewName] = useState("");
  const [newWaypoints, setNewWaypoints] = useState("");
  const [newMultiplier, setNewMultiplier] = useState("");
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function parseWaypointsInput(value: string): LatLng[] | null {
    const points = value
      .split(";")
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .map(parseLatLng);
    if (points.length === 0 || points.some((point) => point === null)) {
      return null;
    }
    return points as LatLng[];
  }

  function handleVerify() {
    const waypoints = parseWaypointsInput(newWaypoints);
    if (!waypoints) {
      setError("Enter at least one waypoint as \"lat, lng\", separated by ;");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await verifyRouteLiveTimeAction({ origin, destination, waypoints });
      if (!result.success) {
        setVerifyResult(null);
        setError(result.error);
        return;
      }
      setVerifyResult(`Live: ${Math.round(result.liveMinutes)} min (typical: ${Math.round(result.typicalMinutes)} min)`);
    });
  }

  function handleAdd() {
    const waypoints = parseWaypointsInput(newWaypoints);
    if (!waypoints || !newName.trim()) {
      setError("Enter a name and at least one waypoint");
      return;
    }
    const distrustMultiplier = newMultiplier.trim() ? Number(newMultiplier) : undefined;
    setError(null);
    startTransition(async () => {
      const result = await addCommuteRouteAction({ name: newName, waypoints, distrustMultiplier });
      if (!result.success) {
        setError(result.error ?? "Failed to add route");
        return;
      }
      setNewName("");
      setNewWaypoints("");
      setNewMultiplier("");
      setVerifyResult(null);
      onRoutesChange([...routes, result.route]);
    });
  }

  function handleDelete(routeId: string) {
    startTransition(async () => {
      const result = await deleteCommuteRouteAction(routeId);
      if (!result.success) {
        setError(result.error ?? "Failed to delete route");
        return;
      }
      onRoutesChange(routes.filter((route) => route.id !== routeId));
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded border border-gray-200 p-4">
      <h2 className="font-medium">Routes</h2>

      <ul className="flex flex-col gap-2">
        {routes.map((route) => (
          <li key={route.id} className="flex items-center justify-between rounded border border-gray-100 p-2">
            <span>
              {route.name} — {route.waypoints.length} waypoint(s)
              {route.distrustMultiplier ? ` (×${route.distrustMultiplier} buffer)` : ""}
            </span>
            <button className="text-sm text-red-600" onClick={() => handleDelete(route.id)} disabled={isPending}>
              Delete
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
        <input
          className="rounded border border-gray-300 p-2"
          placeholder="Route name (e.g. Fast)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <input
          className="rounded border border-gray-300 p-2"
          placeholder="Waypoints: lat, lng; lat, lng"
          value={newWaypoints}
          onChange={(e) => setNewWaypoints(e.target.value)}
        />
        <input
          className="rounded border border-gray-300 p-2"
          placeholder="Distrust multiplier (optional, e.g. 1.25)"
          value={newMultiplier}
          onChange={(e) => setNewMultiplier(e.target.value)}
        />
        {verifyResult && <p className="text-sm text-gray-700">{verifyResult}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            className="rounded border border-gray-400 px-4 py-2 disabled:opacity-50"
            onClick={handleVerify}
            disabled={isPending}
          >
            Verify live time
          </button>
          <button
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            onClick={handleAdd}
            disabled={isPending}
          >
            Add route
          </button>
        </div>
      </div>
    </section>
  );
}
