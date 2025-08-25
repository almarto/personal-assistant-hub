import React from 'react';
import { useParams } from 'react-router-dom';

import styles from './ComingSoon.module.css';

export const ComingSoon: React.FC = () => {
  const { tool } = useParams<{ tool: string }>();

  const toolNames: Record<string, string> = {
    'baby-tracker': 'Baby Tracker',
    'gym-tracker': 'Gym Tracker',
    'moto-tracker': 'Moto Tracker',
  };

  const toolName = tool ? toolNames[tool] || 'Tool' : 'Tool';

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>{toolName}</h1>
        <div className={styles.icon}>🚧</div>
        <p className={styles.message}>
          This tool is currently under development and will be available soon.
        </p>
        <p className={styles.submessage}>Check back later for updates!</p>
      </div>
    </div>
  );
};
