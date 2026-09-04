"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const POLL_INTERVAL_MS = 60_000;

/**
 * Other participants' checklist changes only reach this page on a fresh
 * server render. Poll for them instead of requiring a manual reload -
 * `router.refresh()` re-runs the server components in place, so open forms
 * and scroll position are preserved.
 */
export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
