"use client";

import { useTranslations } from "next-intl";
import { useRef } from "react";

import { Link } from "@/i18n/routing";

import styles from "../page.module.css";

export interface CarouselCard {
  id: string;
  title: string;
  /** Secondary line, e.g. the masked IBAN. */
  subtitle: string | null;
  balance: string | null;
  note: string;
  href: string;
}

interface AccountCarouselProps {
  allCard: Omit<CarouselCard, "id">;
  accounts: CarouselCard[];
  selectedAccountId: string | null;
}

function Card({
  card,
  selected,
}: {
  card: Omit<CarouselCard, "id">;
  selected: boolean;
}) {
  const t = useTranslations("Finances.detail");
  return (
    <Link
      href={card.href}
      aria-current={selected ? "true" : undefined}
      className={`${styles.accountCard} ${selected ? styles.accountCardSelected : ""}`}
      scroll={false}
    >
      <span className={styles.accountCardTop}>
        <span className={styles.accountTitle}>{card.title}</span>
        {card.subtitle && (
          <span className={styles.accountSubtitle}>{card.subtitle}</span>
        )}
      </span>
      <span className={styles.accountBalance}>
        {card.balance ?? t("noBalance")}
      </span>
      <span className={styles.accountNote}>{card.note}</span>
    </Link>
  );
}

export function AccountCarousel({
  allCard,
  accounts,
  selectedAccountId,
}: AccountCarouselProps) {
  const t = useTranslations("Finances.detail");
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollByCard(direction: 1 | -1) {
    const track = trackRef.current;
    const card = track?.firstElementChild;
    if (!track || !(card instanceof HTMLElement)) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    track.scrollBy({
      left: direction * (card.offsetWidth + gap),
      behavior: "smooth",
    });
  }

  return (
    <section className={styles.accountsSection}>
      <div className={styles.accountsHeader}>
        <h2 className={styles.accountsHeading}>
          {t("accountsHeading", { count: accounts.length })}
        </h2>
        <div className={styles.scrollButtons}>
          <button
            type="button"
            className={styles.scrollButton}
            aria-label={t("previousAccounts")}
            onClick={() => scrollByCard(-1)}
          >
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
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.scrollButton}
            aria-label={t("nextAccounts")}
            onClick={() => scrollByCard(1)}
          >
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
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
      <div className={styles.accountsRow}>
        <div className={styles.pinnedCard}>
          <Card card={allCard} selected={selectedAccountId === null} />
        </div>
        <div className={styles.trackWrap}>
          <div ref={trackRef} className={styles.track}>
            {accounts.map((account) => (
              <Card
                key={account.id}
                card={account}
                selected={account.id === selectedAccountId}
              />
            ))}
          </div>
          <div className={styles.trackFade} aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
