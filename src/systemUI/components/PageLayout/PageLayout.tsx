import React from "react";
import { Link } from "@/i18n/routing";
import Navigation from "@/systemUI/components/Navigation/Navigation";
import styles from "./PageLayout.module.css";

interface PageLayoutProps {
  children: React.ReactNode;
  headerContent?: React.ReactNode;
  showLogo?: boolean;
}

export const PageLayout = ({
  children,
  headerContent,
  showLogo = true,
}: PageLayoutProps) => {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        {showLogo ? (
          <Link href="/" className={styles.logo}>
            Baby Food Tracker
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
