import React from 'react';

import { Button } from '../Button';
import { Card } from '../Card';
import './ToolCard.module.css';

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
      className="ui-toolCard"
      onClick={!isDisabled ? onClick : undefined}
    >
      <div className="ui-toolCard-icon">{icon}</div>
      <h3 className="ui-toolCard-title">{title}</h3>
      <p className="ui-toolCard-description">{description}</p>
      <div className="ui-toolCard-button">
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
