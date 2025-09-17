import { useTranslation } from '@personal-assistant-hub/i18n';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

import styles from './Sidebar.module.css';

const navigationItems = [
  { path: '/dashboard', labelKey: 'navigation.dashboard', icon: '📊' },
  { path: '/baby-tracker', labelKey: 'navigation.babyTracker', icon: '👶' },
  { path: '/gym-tracker', labelKey: 'navigation.gymTracker', icon: '💪' },
  { path: '/moto-tracker', labelKey: 'navigation.motoTracker', icon: '🏍️' },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav} data-testid="main-menu">
        <ul className={styles.navList}>
          {navigationItems.map(item => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`${styles.navLink} ${
                  location.pathname === item.path ? styles.active : ''
                }`}
              >
                <span className={styles.icon}>{item.icon}</span>
                <span className={styles.label}>{t(item.labelKey)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};
