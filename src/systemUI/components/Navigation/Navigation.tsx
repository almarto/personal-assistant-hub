'use client';

import { useState, useRef, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher';
import LogoutButton from '../LogoutButton/LogoutButton';
import styles from './Navigation.module.css';
import { useTranslations } from 'next-intl';

interface NavigationProps {
  showLogout?: boolean;
}

export default function Navigation({ showLogout = false }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const t = useTranslations('LanguageSwitcher');

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className={styles.container} ref={menuRef}>
      {/* Desktop Navigation */}
      <div className={styles.desktopNav}>
        <LanguageSwitcher />
        {showLogout && <LogoutButton />}
      </div>

      {/* Mobile Navigation */}
      <div className={styles.mobileNav}>
        <button 
          className={styles.hamburger}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {isOpen && (
          <div className={styles.mobileMenu}>
            <div className={styles.mobileMenuItem}>
              <span>{t('switcher')}</span>
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
