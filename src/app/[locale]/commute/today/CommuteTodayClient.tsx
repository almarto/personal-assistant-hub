"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import type { CommuteStatusResult } from "@/app/actions/commute";
import { getCommuteStatusAction } from "@/app/actions/commute";
import { Link, useRouter } from "@/i18n/routing";
import type { CommuteConfigSummary } from "@/lib/services/commute/config";
import { Button } from "@/systemUI/components/Button/Button";
import { Card } from "@/systemUI/components/Card/Card";

import styles from "./CommuteTodayClient.module.css";

interface Props {
  configs: CommuteConfigSummary[];
  selectedConfigId: string | null;
  initialResult: CommuteStatusResult | null;
}

export function CommuteTodayClient({ configs, selectedConfigId, initialResult }: Props) {
  const t = useTranslations("Commute");
  const router = useRouter();

  const [result, setResult] = useState(initialResult);
  const [currentConfigId, setCurrentConfigId] = useState(selectedConfigId);
  const [isPending, startTransition] = useTransition();

  function fetchStatus(configId: string) {
    startTransition(async () => {
      const next = await getCommuteStatusAction(configId);
      setResult(next);
    });
  }

  function handleSelectConfig(configId: string) {
    setCurrentConfigId(configId);
    router.push(`/commute/today?config=${configId}`);
    fetchStatus(configId);
  }

  function handleRefresh() {
    if (currentConfigId) fetchStatus(currentConfigId);
  }

  if (configs.length === 0) {
    return (
      <Card className={styles.section}>
        <p className={styles.emptyState}>{t("emptyConfigsToday")}</p>
        <Link href="/commute/new">
          <Button>{t("newConfig")}</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className={styles.section}>
      <div className={styles.controls}>
        <select
          className={styles.select}
          value={currentConfigId ?? ""}
          onChange={(e) => handleSelectConfig(e.target.value)}
          disabled={isPending}
        >
          {configs.map((config) => (
            <option key={config.id} value={config.id}>
              {config.name}
              {config.isDefault ? ` (${t("defaultBadge")})` : ""}
            </option>
          ))}
        </select>
        <Button variant="outline" onClick={handleRefresh} disabled={isPending} leftIcon={<RefreshCw size={16} />}>
          {t("refresh")}
        </Button>
      </div>

      {result && !result.success && (
        <div className={styles.errorBlock}>
          <p className={styles.error}>{result.noRoutes ? t("noRoutesError") : result.error}</p>
          {result.noRoutes && currentConfigId && (
            <Link href={`/commute/${currentConfigId}`}>{t("addRouteLink")}</Link>
          )}
        </div>
      )}

      {result && result.success && (
        <>
          <p className={styles.spokenText}>{result.status.spokenText}</p>
          <ul className={styles.routeList}>
            {result.status.routes.map((route) => (
              <li
                key={route.id}
                className={
                  route.id === result.status.recommended
                    ? `${styles.routeItem} ${styles.recommended}`
                    : styles.routeItem
                }
              >
                <span className={styles.routeName}>{route.label}</span>
                <span className={styles.routeTimes}>
                  {t("liveMinutes", { minutes: Math.round(route.liveMinutes) })}
                  {" · "}
                  {t("typicalMinutes", { minutes: Math.round(route.typicalMinutes) })}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
