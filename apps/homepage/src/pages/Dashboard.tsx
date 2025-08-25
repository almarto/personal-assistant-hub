import React from 'react';

import { DashboardGrid } from '../components/dashboard/DashboardGrid';

import styles from './Dashboard.module.css';

export const Dashboard: React.FC = () => {
  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Welcome to Personal Assistant Hub</h1>
        <p className={styles.subtitle}>
          Your centralized hub for personal productivity tools
        </p>
      </div>
      <DashboardGrid />
    </div>
  );
};
