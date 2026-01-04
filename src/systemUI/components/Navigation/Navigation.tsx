"use client";

import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Link, usePathname } from "@/i18n/routing";
import { authClient } from "@/lib/auth-client";
import { hasRole,Role } from "@/lib/types/roles";

import LanguageSwitcher from "../LanguageSwitcher/LanguageSwitcher";
import LogoutButton from "../LogoutButton/LogoutButton";
import styles from "./Navigation.module.css";

interface NavigationProps {
  showLogout?: boolean;
}

export default function Navigation({ showLogout = false }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { data: session } = authClient.useSession();
  const pathname = usePathname();
  const isAdminPage =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/en/admin") ||
    pathname.startsWith("/es/admin"); // Simple check, better to use localized path check if possible

  const t = useTranslations("Navigation");

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className={styles.container} ref={menuRef}>
      {/* Desktop Navigation */}
      <div className={styles.desktopNav}>
        {hasRole(session?.user?.role, Role.ADMIN) && !isAdminPage && (
          <Link href="/admin/users" className={styles.link}>
            {t("admin")}
          </Link>
        )}
        {session?.user && !hasRole(session?.user?.role, Role.ADMIN) && (
          <Link href="/profile" className={styles.link}>
            {t("profile")}
          </Link>
        )}
        <LanguageSwitcher />
        {showLogout && <LogoutButton />}
      </div>

      {/* Mobile Navigation */}
      <div className={styles.mobileNav}>
        <button
          className={styles.hamburger}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? t("closeMenu") : t("openMenu")}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {isOpen && (
          <div className={styles.mobileMenu}>
            {hasRole(session?.user?.role, Role.ADMIN) && !isAdminPage && (
              <div className={styles.mobileMenuItem}>
                <Link
                  href="/admin/users"
                  className={styles.link}
                  onClick={() => setIsOpen(false)}
                >
                  {t("admin")}
                </Link>
              </div>
            )}
            {session?.user && !hasRole(session?.user?.role, Role.ADMIN) && (
              <div className={styles.mobileMenuItem}>
                <Link
                  href="/profile"
                  className={styles.link}
                  onClick={() => setIsOpen(false)}
                >
                  {t("profile")}
                </Link>
              </div>
            )}
            <div className={styles.mobileMenuItem}>
              <LanguageSwitcher />
            </div>
            {showLogout && (
              <div className={styles.mobileMenuItem}>
                <LogoutButton />
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
