import React from 'react';

import styles from './Grid.module.css';

export interface GridProps extends React.ComponentPropsWithoutRef<'div'> {
  /**
   * The number of columns (responsive)
   */
  columns?: 1 | 2 | 3 | 4 | 'auto-fit';
  /**
   * The gap between grid items
   */
  gap?: 'small' | 'medium' | 'large';
  /**
   * Minimum width for auto-fit columns
   */
  minColumnWidth?: string;
  /**
   * The content of the grid
   */
  children: React.ReactNode;
}

/**
 * Grid component for responsive layouts
 */
export const Grid = React.forwardRef<React.ElementRef<'div'>, GridProps>(
  (
    {
      columns = 'auto-fit',
      gap = 'medium',
      minColumnWidth = '300px',
      className,
      children,
      ...props
    },
    ref
  ) => {
    const gridClasses = [
      styles.uiGrid,
      styles[`uiGridGap${gap.charAt(0).toUpperCase() + gap.slice(1)}`],
      typeof columns === 'number'
        ? styles[`uiGridColumns${columns}`]
        : styles.uiGridAutoFit,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const gridStyle =
      columns === 'auto-fit'
        ? ({ '--min-column-width': minColumnWidth } as React.CSSProperties)
        : undefined;

    return (
      <div ref={ref} className={gridClasses} style={gridStyle} {...props}>
        {children}
      </div>
    );
  }
);

Grid.displayName = 'Grid';
