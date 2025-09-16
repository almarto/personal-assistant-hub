import { useTranslation } from '@personal-assistant-hub/i18n';
import React from 'react';
import { useLocation } from 'react-router-dom';

import styles from './ComingSoon.module.css';

export const ComingSoon: React.FC = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const tool = location.pathname.replace('/', '');

  const toolNameKeys: Record<string, string> = {
    'baby-tracker': 'tools.babyTracker.title',
    'gym-tracker': 'tools.gymTracker.title',
    'moto-tracker': 'tools.motoTracker.title',
  };

  const toolNameKey = tool
    ? toolNameKeys[tool] || 'common.tool'
    : 'common.tool';

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>{t(toolNameKey)}</h1>
        <div className={styles.icon}>🚧</div>
        <p className={styles.message}>{t('comingSoon.message')}</p>
        <p className={styles.submessage}>{t('comingSoon.submessage')}</p>
      </div>
    </div>
  );
};
