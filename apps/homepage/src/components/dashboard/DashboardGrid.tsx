import { useTranslation } from '@personal-assistant-hub/i18n';
import { Grid, ToolCard } from '@personal-assistant-hub/ui';
import React from 'react';

import styles from './DashboardGrid.module.css';

const tools = [
  {
    titleKey: 'tools.babyTracker.title',
    descriptionKey: 'tools.babyTracker.description',
    icon: '👶',
    path: '/baby-tracker',
    status: 'coming-soon' as const,
  },
  {
    titleKey: 'tools.gymTracker.title',
    descriptionKey: 'tools.gymTracker.description',
    icon: '💪',
    path: '/gym-tracker',
    status: 'coming-soon' as const,
  },
  {
    titleKey: 'tools.motoTracker.title',
    descriptionKey: 'tools.motoTracker.description',
    icon: '🏍️',
    path: '/moto-tracker',
    status: 'coming-soon' as const,
  },
];

export const DashboardGrid: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{t('homepage.yourTools')}</h2>
      <Grid gap='large' minColumnWidth='300px' data-testid='cards-container'>
        {tools.map(tool => (
          <ToolCard
            key={tool.path}
            title={t(tool.titleKey)}
            description={t(tool.descriptionKey)}
            icon={tool.icon}
            status={tool.status}
          />
        ))}
      </Grid>
    </div>
  );
};
