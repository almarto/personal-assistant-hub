import { useTranslation } from '@personal-assistant-hub/i18n';
import { LanguageSelector } from '@personal-assistant-hub/ui';
import React from 'react';

import styles from './Header.module.css';

export const Header: React.FC = () => {
  const { t } = useTranslation();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <h1>{t('homepage.title')}</h1>
        </div>
        <nav className={styles.nav}>
          <LanguageSelector />
          <button className={styles.profileButton}>
            {t('navigation.profile')}
          </button>
        </nav>
      </div>
    </header>
  );
};
