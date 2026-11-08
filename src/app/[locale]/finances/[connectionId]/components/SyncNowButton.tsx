"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { syncNowAction } from "@/app/actions/finances";

import styles from "../page.module.css";

type SyncState = Awaited<ReturnType<typeof syncNowAction>> | null;

function SubmitButton() {
  const t = useTranslations("Finances.detail");
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={styles.syncButton} disabled={pending}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4" />
      </svg>
      {pending ? t("syncing") : t("syncNow")}
    </button>
  );
}

/** Temporary manual sync until the scheduled job exists. */
export function SyncNowButton({ connectionId }: { connectionId: string }) {
  const t = useTranslations("Finances.detail");
  const [state, formAction] = useActionState<SyncState, FormData>(
    (_previous, formData) => syncNowAction(formData),
    null
  );

  return (
    <form action={formAction} className={styles.syncForm}>
      <input type="hidden" name="connectionId" value={connectionId} />
      <SubmitButton />
      {state && !state.success && (
        <p role="alert" className={styles.syncError} title={state.error}>
          {t("syncFailed", { error: state.error })}
        </p>
      )}
    </form>
  );
}
