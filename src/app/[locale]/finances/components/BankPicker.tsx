"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import { Link } from "@/i18n/routing";
import type { Aspsp, PsuType } from "@/lib/services/finances/types";
import { PSU_TYPE } from "@/lib/services/finances/types";

import { bankKey, countryName } from "../format";
import { BankLogo } from "./BankLogo";
import styles from "./BankPicker.module.css";

const ALL_COUNTRIES = "all";

interface BankPickerProps {
  banks: Aspsp[];
  /** `bankKey` of every bank the user already connected. */
  connectedKeys: string[];
  action: (formData: FormData) => Promise<void>;
  /** Shows a cancel link next to the submit button. */
  cancelHref?: string;
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const t = useTranslations("Finances.picker");
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={styles.connect}
      disabled={disabled || pending}
    >
      {pending ? t("connecting") : t("connect")}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </button>
  );
}

export function BankPicker({
  banks,
  connectedKeys,
  action,
  cancelHref,
}: BankPickerProps) {
  const t = useTranslations("Finances.picker");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState<string>(ALL_COUNTRIES);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [psuType, setPsuType] = useState<PsuType>(PSU_TYPE.PERSONAL);

  const connected = new Set(connectedKeys);
  const countries = [...new Set(banks.map((bank) => bank.country))]
    .map((code) => ({ code, name: countryName(code, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));

  const search = query.trim().toLocaleLowerCase(locale);
  const visible = banks.filter(
    (bank) =>
      (country === ALL_COUNTRIES || bank.country === country) &&
      (!search || bank.name.toLocaleLowerCase(locale).includes(search))
  );
  const groups = countries
    .map((entry) => ({
      ...entry,
      banks: visible
        .filter((bank) => bank.country === entry.code)
        .sort((a, b) => a.name.localeCompare(b.name, locale)),
    }))
    .filter((group) => group.banks.length > 0);

  const selected = banks.find((bank) => bankKey(bank) === selectedKey) ?? null;
  const summary = selected
    ? t(psuType === PSU_TYPE.PERSONAL ? "summaryPersonal" : "summaryBusiness", {
        bank: selected.name,
      })
    : t("chooseBank");

  return (
    <form action={action} className={styles.picker}>
      <input type="hidden" name="aspspName" value={selected?.name ?? ""} />
      <input
        type="hidden"
        name="aspspCountry"
        value={selected?.country ?? ""}
      />
      <input type="hidden" name="psuType" value={psuType} />

      <div className={styles.filters}>
        <label className={styles.search}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <span className={styles.visuallyHidden}>{t("searchLabel")}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className={styles.searchInput}
          />
        </label>
        <div
          className={styles.chips}
          role="group"
          aria-label={t("searchLabel")}
        >
          {[{ code: ALL_COUNTRIES, name: t("allCountries") }, ...countries].map(
            (entry) => (
              <button
                key={entry.code}
                type="button"
                aria-pressed={country === entry.code}
                className={styles.chip}
                onClick={() => setCountry(entry.code)}
              >
                {entry.name}
              </button>
            )
          )}
        </div>
        <span className={styles.count}>
          {t("resultCount", { count: visible.length })}
        </span>
      </div>

      <div className={styles.list}>
        {groups.length === 0 && (
          <p className={styles.empty}>{t("noResults")}</p>
        )}
        {groups.map((group) => (
          <div key={group.code} className={styles.group}>
            <span className={styles.groupTitle}>{group.name}</span>
            {group.banks.map((bank) => {
              const key = bankKey(bank);
              const isConnected = connected.has(key);
              const isSelected = key === selectedKey;
              return (
                <button
                  key={key}
                  type="button"
                  className={styles.bank}
                  aria-pressed={isSelected}
                  disabled={isConnected}
                  onClick={() => setSelectedKey(key)}
                >
                  <BankLogo name={bank.name} logo={bank.logo} size={38} />
                  <span className={styles.bankName}>{bank.name}</span>
                  {isConnected && (
                    <span className={styles.connectedTag}>
                      {t("connected")}
                    </span>
                  )}
                  {isSelected && (
                    <span className={styles.check} aria-hidden="true">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <div className={styles.footerRow}>
          <span className={styles.footerLabel}>{t("accountType")}</span>
          <div className={styles.segmented}>
            {[PSU_TYPE.PERSONAL, PSU_TYPE.BUSINESS].map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={psuType === type}
                className={styles.segment}
                onClick={() => setPsuType(type)}
              >
                {t(type)}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.footerRow}>
          <span className={styles.summary}>{summary}</span>
          <div className={styles.actions}>
            {cancelHref && (
              <Link href={cancelHref} className={styles.cancel}>
                {t("cancel")}
              </Link>
            )}
            <SubmitButton disabled={!selected} />
          </div>
        </div>
      </div>
    </form>
  );
}
