import { useTranslation } from '@personal-assistant-hub/i18n';
import React from 'react';

import { DashboardGrid } from '../components/dashboard/DashboardGrid';

import styles from './Dashboard.module.css';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('homepage.welcome')}</h1>
        <p className={styles.subtitle}>{t('homepage.subtitle')}</p>
      </div>
      <DashboardGrid />
    </div>
  );
};
