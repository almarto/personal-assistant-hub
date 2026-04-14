import React from "react";

import { Link } from "@/i18n/routing";
import Navigation from "@/systemUI/components/Navigation/Navigation";

import styles from "./PageLayout.module.css";

interface PageLayoutProps {
  children: React.ReactNode;
  headerContent?: React.ReactNode;
  showLogo?: boolean;
  theme?: "hub" | "baby" | "schedule" | "admin" | "profile";
}

export const PageLayout = ({
  children,
  headerContent,
  showLogo = true,
  theme = "hub",
}: PageLayoutProps) => {
  return (
    <div className={styles.container} data-theme={theme}>
      <header className={styles.header}>
        {showLogo ? (
          <Link href="/" className={styles.logo}>
            Personal Assistant Hub
          </Link>
        ) : (
          <div className={styles.headerContent}>{headerContent}</div>
        )}
        <Navigation showLogout={true} />
      </header>
      <main>{children}</main>
    </div>
  );
};
