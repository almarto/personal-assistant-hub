"use client";

import { Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { deleteCommuteConfigAction, setDefaultCommuteConfigAction } from "@/app/actions/commute";
import { Link } from "@/i18n/routing";
import type { CommuteConfigSummary } from "@/lib/services/commute/config";
import { Button } from "@/systemUI/components/Button/Button";
import { Card } from "@/systemUI/components/Card/Card";

import styles from "./CommuteConfigListClient.module.css";

interface Props {
  configs: CommuteConfigSummary[];
}

export function CommuteConfigListClient({ configs: initialConfigs }: Props) {
  const t = useTranslations("Commute");
  const [configs, setConfigs] = useState(initialConfigs);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSetDefault(configId: string) {
    startTransition(async () => {
      const result = await setDefaultCommuteConfigAction(configId);
      if (!result.success) {
        setError(result.error ?? t("setDefaultError"));
        return;
      }
      setConfigs((current) => current.map((c) => ({ ...c, isDefault: c.id === configId })));
    });
  }

  function handleDelete(configId: string) {
    if (!window.confirm(t("confirmDeleteConfig"))) return;
    startTransition(async () => {
      const result = await deleteCommuteConfigAction(configId);
      if (!result.success) {
        setError(result.error ?? t("deleteConfigError"));
        return;
      }
      setConfigs((current) => current.filter((c) => c.id !== configId));
    });
  }

  return (
    <Card className={styles.section}>
      <div className={styles.headerRow}>
        <h2 className={styles.sectionTitle}>{t("configsSection")}</h2>
        <Link href="/commute/new">
          <Button size="sm">{t("newConfig")}</Button>
        </Link>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {configs.length === 0 ? (
        <p className={styles.emptyState}>{t("emptyConfigs")}</p>
      ) : (
        <ul className={styles.configList}>
          {configs.map((config) => (
            <li key={config.id} className={styles.configItem}>
              <Link href={`/commute/${config.id}`} className={styles.configLink}>
                <span className={styles.configName}>{config.name}</span>
                {config.isDefault && <span className={styles.defaultBadge}>{t("defaultBadge")}</span>}
              </Link>
              <div className={styles.configActions}>
                {!config.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetDefault(config.id)}
                    disabled={isPending}
                    leftIcon={<Star size={16} />}
                  >
                    {t("makeDefault")}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(config.id)}
                  disabled={isPending}
                  leftIcon={<Trash2 size={16} />}
                >
                  {t("delete")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
