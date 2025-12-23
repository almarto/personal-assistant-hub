"use client";

import { useLocale } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

import { usePathname, useRouter } from "@/i18n/routing";

import styles from "./LanguageSwitcher.module.css";

const LOCALE_FLAGS: Record<string, string> = {
  en: "🇺🇸",
  es: "🇪🇸",
};

const LOCALES = ["en", "es"];

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const switchLocale = (nextLocale: string) => {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
      setIsOpen(false);
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const otherLocales = LOCALES.filter((l) => l !== locale);

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change language"
        disabled={isPending}
      >
        {LOCALE_FLAGS[locale]}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {otherLocales.map((l) => (
            <button
              key={l}
              className={styles.option}
              onClick={() => switchLocale(l)}
              title={l === "en" ? "English" : "Español"}
            >
              {LOCALE_FLAGS[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
