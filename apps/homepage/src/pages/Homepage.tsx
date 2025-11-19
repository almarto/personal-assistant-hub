import { useTranslation } from '@personal-assistant-hub/i18n';
import React from 'react';
import { Link } from 'react-router-dom';

import styles from './Homepage.module.css';

export const Homepage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className={styles.homepage}>
      <div className={styles.hero}>
        <div className={styles.container}>
          <h1 className={styles.title}>{t('homepage.title')}</h1>
          <p className={styles.subtitle}>
            Tu asistente personal para gestionar tu vida diaria de manera
            eficiente
          </p>
          <div className={styles.actions}>
            <Link to='/dashboard' className={styles.secondaryButton}>
              Ir al Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.features}>
        <div className={styles.container}>
          <h2 className={styles.featuresTitle}>Funcionalidades</h2>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>👶</div>
              <h3>Baby Tracker</h3>
              <p>Seguimiento completo del cuidado de tu bebé</p>
              <span className={styles.comingSoon}>Próximamente</span>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>💪</div>
              <h3>Gym Tracker</h3>
              <p>Registra y monitorea tus entrenamientos</p>
              <span className={styles.comingSoon}>Próximamente</span>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🏍️</div>
              <h3>Moto Tracker</h3>
              <p>Gestiona el mantenimiento de tu motocicleta</p>
              <span className={styles.comingSoon}>Próximamente</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
