import React from 'react';

import { Button } from '../Button';
import { Card } from '../Card';

import styles from './ToolCard.module.css';

export interface ToolCardProps {
  /**
   * The title of the tool
   */
  title: string;
  /**
   * The description of the tool
   */
  description: string;
  /**
   * The icon to display (emoji or icon component)
   */
  icon: React.ReactNode;
  /**
   * The status of the tool
   */
  status: 'available' | 'coming-soon';
  /**
   * Click handler for the card
   */
  onClick?: () => void;
  /**
   * Custom action button text
   */
  actionText?: string;
}

/**
 * ToolCard component for displaying tools in a dashboard
 */
export const ToolCard: React.FC<ToolCardProps> = ({
  title,
  description,
  icon,
  status,
  onClick,
  actionText,
}) => {
  const isDisabled = status === 'coming-soon';

  return (
    <Card
      variant={isDisabled ? 'disabled' : 'interactive'}
      hoverable={!isDisabled}
      noPadding
      className={styles.uiToolCard}
      onClick={!isDisabled ? onClick : undefined}
    >
      <div className={styles.uiToolCardIcon}>{icon}</div>
      <h3 className={styles.uiToolCardTitle}>{title}</h3>
      <p className={styles.uiToolCardDescription}>{description}</p>
      <div className={styles.uiToolCardButton}>
        <Button
          variant={isDisabled ? 'secondary' : 'primary'}
          disabled={isDisabled}
          fullWidth
          onClick={!isDisabled ? onClick : undefined}
        >
          {actionText || (isDisabled ? 'Coming Soon' : 'Open Tool')}
        </Button>
      </div>
    </Card>
  );
};

ToolCard.displayName = 'ToolCard';
