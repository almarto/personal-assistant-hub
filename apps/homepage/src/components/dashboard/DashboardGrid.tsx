import React from 'react';

import styles from './DashboardGrid.module.css';
import { ToolCard } from './ToolCard';

const tools = [
  {
    title: 'Baby Tracker',
    description:
      'Track feeding, sleeping, and development milestones for your little one.',
    icon: '👶',
    path: '/baby-tracker',
    status: 'coming-soon' as const,
  },
  {
    title: 'Gym Tracker',
    description: 'Monitor your workouts, progress, and fitness goals.',
    icon: '💪',
    path: '/gym-tracker',
    status: 'coming-soon' as const,
  },
  {
    title: 'Moto Tracker',
    description: 'Keep track of motorcycle maintenance, rides, and expenses.',
    icon: '🏍️',
    path: '/moto-tracker',
    status: 'coming-soon' as const,
  },
];

export const DashboardGrid: React.FC = () => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Your Tools</h2>
      <div className={styles.grid}>
        {tools.map(tool => (
          <ToolCard
            key={tool.path}
            title={tool.title}
            description={tool.description}
            icon={tool.icon}
            path={tool.path}
            status={tool.status}
          />
        ))}
      </div>
    </div>
  );
};
