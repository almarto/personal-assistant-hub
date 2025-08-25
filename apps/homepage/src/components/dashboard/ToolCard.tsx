import { Button } from '@personal-assistant-hub/ui';
import React from 'react';
import { Link } from 'react-router-dom';

import styles from './ToolCard.module.css';

interface ToolCardProps {
  title: string;
  description: string;
  icon: string;
  path: string;
  status: 'available' | 'coming-soon';
}

export const ToolCard: React.FC<ToolCardProps> = ({
  title,
  description,
  icon,
  path,
  status,
}) => {
  const CardContent = (
    <div
      className={`${styles.card} ${status === 'coming-soon' ? styles.disabled : ''}`}
    >
      <div className={styles.icon}>{icon}</div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      {status === 'coming-soon' ? (
        <Button variant="secondary" disabled fullWidth>
          Coming Soon
        </Button>
      ) : (
        <Button variant="primary" fullWidth>
          Open Tool
        </Button>
      )}
    </div>
  );

  if (status === 'coming-soon') {
    return CardContent;
  }

  return (
    <Link to={path} className={styles.link}>
      {CardContent}
    </Link>
  );
};
