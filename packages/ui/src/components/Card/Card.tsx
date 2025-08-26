import React from 'react';

import './Card.module.css';

export interface CardProps extends React.ComponentPropsWithoutRef<'div'> {
  /**
   * The visual style variant of the card
   */
  variant?: 'default' | 'interactive' | 'disabled';
  /**
   * Whether the card should have hover effects
   */
  hoverable?: boolean;
  /**
   * Whether to remove default padding (useful for custom layouts)
   */
  noPadding?: boolean;
  /**
   * The content of the card
   */
  children: React.ReactNode;
}

/**
 * Card component for displaying content in a contained layout
 */
export const Card = React.forwardRef<React.ElementRef<'div'>, CardProps>(
  (
    {
      variant = 'default',
      hoverable = false,
      noPadding = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const cardClasses = [
      'ui-card',
      variant !== 'default' && `ui-card-${variant}`,
      hoverable && 'ui-card-hoverable',
      noPadding && 'ui-card-noPadding',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={cardClasses} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
