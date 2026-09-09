"use client";

import { Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import {
  addCommuteRouteAction,
  createCommuteConfigAction,
  deleteCommuteConfigAction,
  deleteCommuteRouteAction,
  setDefaultCommuteConfigAction,
  updateCommuteConfigAction,
  verifyRouteLiveTimeAction,
} from "@/app/actions/commute";
import { useRouter } from "@/i18n/routing";
import type { CommuteConfigDetail, CommuteRouteDetail } from "@/lib/services/commute/config";
import type { LatLng } from "@/lib/services/commute/types";
import { Button } from "@/systemUI/components/Button/Button";
import { Card } from "@/systemUI/components/Card/Card";

import styles from "./CommuteConfigClient.module.css";

export type CommuteConfigClientProps =
  | { mode: "create" }
  | { mode: "edit"; config: CommuteConfigDetail };

const MIN_DISTRUST_MULTIPLIER = 1;

function parseLatLng(value: string): LatLng | null {
  const rawParts = value.split(",").map((part) => part.trim());
  // `Number("")` is 0, not NaN, so empty parts must be rejected up front:
  // otherwise "40.4168," would silently parse as { lat: 40.4168, lng: 0 }.
  if (rawParts.length !== 2 || rawParts.some((part) => part.length === 0)) {
    return null;
  }

  const [lat, lng] = rawParts.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  return { lat, lng };
}

function formatLatLng(point: LatLng): string {
  return `${point.lat}, ${point.lng}`;
}

export function CommuteConfigClient(props: CommuteConfigClientProps) {
  const t = useTranslations("Commute");
  const router = useRouter();

  const initial = props.mode === "edit" ? props.config : null;

  const [config, setConfig] = useState(initial);
  const [name, setName] = useState(initial?.name ?? "");
  const [origin, setOrigin] = useState(initial ? formatLatLng(initial.origin) : "");
  const [destination, setDestination] = useState(initial ? formatLatLng(initial.destination) : "");
  const [configError, setConfigError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSaveConfig() {
    const originPoint = parseLatLng(origin);
    const destinationPoint = parseLatLng(destination);
    if (!originPoint || !destinationPoint || !name.trim()) {
      setConfigError(t("invalidConfig"));
      return;
    }
    setConfigError(null);
    startTransition(async () => {
      if (props.mode === "create") {
        const result = await createCommuteConfigAction({ name, origin: originPoint, destination: destinationPoint });
        if (!result.success) {
          setConfigError(result.error ?? t("saveError"));
          return;
        }
        router.push(`/commute/${result.configId}`);
        return;
      }

      const result = await updateCommuteConfigAction(props.config.id, {
        name,
        origin: originPoint,
        destination: destinationPoint,
      });
      if (!result.success) {
        setConfigError(result.error ?? t("saveError"));
        return;
      }
      setConfig((current) =>
        current ? { ...current, name, origin: originPoint, destination: destinationPoint } : current
      );
    });
  }

  function handleSetDefault() {
    if (props.mode !== "edit") return;
    startTransition(async () => {
      const result = await setDefaultCommuteConfigAction(props.config.id);
      if (!result.success) {
        setConfigError(result.error ?? t("setDefaultError"));
        return;
      }
      setConfig((current) => (current ? { ...current, isDefault: true } : current));
    });
  }

  function handleDeleteConfig() {
    if (props.mode !== "edit") return;
    if (!window.confirm(t("confirmDeleteConfig"))) return;
    startTransition(async () => {
      const result = await deleteCommuteConfigAction(props.config.id);
      if (!result.success) {
        setConfigError(result.error ?? t("deleteConfigError"));
        return;
      }
      router.push("/commute");
    });
  }

  return (
    <div className={styles.sections}>
      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("originSection")}</h2>

        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="commute-name">{t("configName")}</label>
            <input
              id="commute-name"
              className={styles.input}
              placeholder={t("configNamePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="commute-origin">{t("origin")}</label>
            <input
              id="commute-origin"
              className={styles.input}
              placeholder={t("originPlaceholder")}
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="commute-destination">{t("destination")}</label>
            <input
              id="commute-destination"
              className={styles.input}
              placeholder={t("destinationPlaceholder")}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>

          {config?.isDefault && <p className={styles.defaultBadge}>{t("defaultBadge")}</p>}
          {configError && <p className={styles.error}>{configError}</p>}

          <div className={styles.actions}>
            <Button onClick={handleSaveConfig} disabled={isPending}>
              {t("save")}
            </Button>
            {props.mode === "edit" && !config?.isDefault && (
              <Button variant="outline" onClick={handleSetDefault} disabled={isPending} leftIcon={<Star size={16} />}>
                {t("makeDefault")}
              </Button>
            )}
            {props.mode === "edit" && (
              <Button variant="ghost" onClick={handleDeleteConfig} disabled={isPending} leftIcon={<Trash2 size={16} />}>
                {t("deleteConfig")}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {props.mode === "edit" && config && (
        <RouteList
          configId={config.id}
          routes={config.routes}
          onRoutesChange={(routes) => setConfig((current) => (current ? { ...current, routes } : current))}
        />
      )}
    </div>
  );
}

interface RouteListProps {
  configId: string;
  routes: CommuteRouteDetail[];
  onRoutesChange: (routes: CommuteRouteDetail[]) => void;
}

function RouteList({ configId, routes, onRoutesChange }: RouteListProps) {
  const t = useTranslations("Commute");

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
      setError(t("invalidWaypoints"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await verifyRouteLiveTimeAction(configId, { waypoints });
      if (!result.success) {
        setVerifyResult(null);
        setError(result.error);
        return;
      }
      setVerifyResult(
        t("verifyResult", {
          live: Math.round(result.liveMinutes),
          typical: Math.round(result.typicalMinutes),
        })
      );
    });
  }

  function handleAdd() {
    const waypoints = parseWaypointsInput(newWaypoints);
    if (!waypoints || !newName.trim()) {
      setError(t("invalidRoute"));
      return;
    }

    const rawMultiplier = newMultiplier.trim();
    let distrustMultiplier: number | undefined;
    if (rawMultiplier) {
      const parsed = Number(rawMultiplier);
      if (!Number.isFinite(parsed) || parsed < MIN_DISTRUST_MULTIPLIER) {
        setError(t("invalidMultiplier"));
        return;
      }
      distrustMultiplier = parsed;
    }

    setError(null);
    startTransition(async () => {
      const result = await addCommuteRouteAction(configId, {
        name: newName,
        waypoints,
        distrustMultiplier,
      });
      if (!result.success) {
        setError(result.error ?? t("addRouteError"));
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
      const result = await deleteCommuteRouteAction(routeId, configId);
      if (!result.success) {
        setError(result.error ?? t("deleteRouteError"));
        return;
      }
      onRoutesChange(routes.filter((route) => route.id !== routeId));
    });
  }

  return (
    <Card className={styles.section}>
      <h2 className={styles.sectionTitle}>{t("routesSection")}</h2>

      {routes.length === 0 ? (
        <p className={styles.emptyState}>{t("emptyRoutes")}</p>
      ) : (
        <ul className={styles.routeList}>
          {routes.map((route) => (
            <li key={route.id} className={styles.routeItem}>
              <div className={styles.routeInfo}>
                <span className={styles.routeName}>{route.name}</span>
                <span className={styles.routeMeta}>
                  {t("waypointCount", { count: route.waypoints.length })}
                  {route.distrustMultiplier
                    ? ` · ${t("bufferSuffix", { value: route.distrustMultiplier })}`
                    : ""}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(route.id)}
                disabled={isPending}
                leftIcon={<Trash2 size={16} />}
              >
                {t("delete")}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="commute-route-name">{t("routeName")}</label>
          <input
            id="commute-route-name"
            className={styles.input}
            placeholder={t("routeNamePlaceholder")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="commute-route-waypoints">{t("waypoints")}</label>
          <input
            id="commute-route-waypoints"
            className={styles.input}
            placeholder={t("waypointsPlaceholder")}
            value={newWaypoints}
            onChange={(e) => setNewWaypoints(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="commute-route-multiplier">{t("distrustMultiplier")}</label>
          <input
            id="commute-route-multiplier"
            className={styles.input}
            inputMode="decimal"
            placeholder={t("distrustMultiplierPlaceholder")}
            value={newMultiplier}
            onChange={(e) => setNewMultiplier(e.target.value)}
          />
        </div>

        {verifyResult && <p className={styles.result}>{verifyResult}</p>}
        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <Button variant="outline" onClick={handleVerify} disabled={isPending}>
            {t("verify")}
          </Button>
          <Button onClick={handleAdd} disabled={isPending}>
            {t("addRoute")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
