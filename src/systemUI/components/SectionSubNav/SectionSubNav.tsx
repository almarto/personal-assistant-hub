"use client";

import { Link, usePathname } from "@/i18n/routing";

import styles from "./SectionSubNav.module.css";

export interface SectionSubNavTab {
  label: string;
  href: string;
}

export function SectionSubNav({
  title,
  tabs,
}: {
  title?: string;
  tabs: SectionSubNavTab[];
}) {
  const pathname = usePathname();

  return (
    <div className={styles.container}>
      {title && <h1 className={styles.title}>{title}</h1>}
      <nav className={styles.tabs}>
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link key={tab.href} href={tab.href} className={styles.tab} data-active={isActive}>
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
