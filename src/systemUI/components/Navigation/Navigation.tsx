"use client";

import { Menu, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { useAppRoles } from "@/hooks/use-app-roles";
import { Link, usePathname } from "@/i18n/routing";
import { authClient } from "@/lib/auth-client";
import { APP_ROLE, isAdmin as checkIsAdmin } from "@/lib/types/roles";

import LanguageSwitcher from "../LanguageSwitcher/LanguageSwitcher";
import LogoutButton from "../LogoutButton/LogoutButton";
import styles from "./Navigation.module.css";

interface NavigationProps {
  showLogout?: boolean;
}

export default function Navigation({ showLogout = false }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { appRoles, isLoading: appRolesLoading } = useAppRoles();
  const pathname = usePathname();
  const isAdminPage =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/en/admin") ||
    pathname.startsWith("/es/admin"); // Simple check, better to use localized path check if possible

  const isAdmin = checkIsAdmin(session?.user?.role);
  const isImpersonating = !!session?.session?.impersonatedBy;
  const isFriendsZoneOnly =
    !isAdmin && appRoles.length === 1 && appRoles[0] === APP_ROLE.FRIENDS_ZONE;

  const showAdminLink = isAdmin && !isAdminPage;
  const showProfileLink =
    session?.user && !isAdmin && !appRolesLoading && !isFriendsZoneOnly;
  const showLogoutBtn = showLogout;

  const onlyLanguageSwitcher =
    !showAdminLink && !showProfileLink && !showLogoutBtn && !isImpersonating;

  const t = useTranslations("Navigation");

  const handleStopImpersonating = async () => {
    await authClient.admin.stopImpersonating();
    router.push("/");
    router.refresh();
  };

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
        {isImpersonating && (
          <button
            type="button"
            className={styles.impersonationLink}
            onClick={handleStopImpersonating}
          >
            {t("stopImpersonating")}
          </button>
        )}
        {showAdminLink && (
          <Link href="/admin/users" className={styles.link}>
            {t("admin")}
          </Link>
        )}
        {showProfileLink && (
          <Link href="/profile" className={styles.link}>
            {t("profile")}
          </Link>
        )}
        <LanguageSwitcher />
        {showLogoutBtn && <LogoutButton />}
      </div>

      {/* Mobile Navigation */}
      <div className={styles.mobileNav}>
        {onlyLanguageSwitcher ? (
          <LanguageSwitcher />
        ) : (
          <>
            <button
              className={styles.hamburger}
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? t("closeMenu") : t("openMenu")}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {isOpen && (
              <div className={styles.mobileMenu}>
                {isImpersonating && (
                  <div className={styles.mobileMenuItem}>
                    <button
                      type="button"
                      className={styles.impersonationLink}
                      onClick={() => {
                        setIsOpen(false);
                        handleStopImpersonating();
                      }}
                    >
                      {t("stopImpersonating")}
                    </button>
                  </div>
                )}
                {showAdminLink && (
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
                {showProfileLink && (
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
                {showLogoutBtn && (
                  <div className={styles.mobileMenuItem}>
                    <LogoutButton />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </nav>
  );
}
