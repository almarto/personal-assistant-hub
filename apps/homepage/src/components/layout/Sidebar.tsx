import React from 'react';
import { Link, useLocation } from 'react-router-dom';

import styles from './Sidebar.module.css';

const navigationItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/baby-tracker', label: 'Baby Tracker', icon: '👶' },
  { path: '/gym-tracker', label: 'Gym Tracker', icon: '💪' },
  { path: '/moto-tracker', label: 'Moto Tracker', icon: '🏍️' },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
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
                <span className={styles.label}>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};
