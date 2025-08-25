import React from 'react';

import styles from './Button.module.css';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * The visual style variant of the button
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  /**
   * The size of the button
   */
  size?: 'small' | 'medium' | 'large';
  /**
   * Whether the button should take the full width of its container
   */
  fullWidth?: boolean;
  /**
   * Whether the button is in a loading state
   */
  loading?: boolean;
  /**
   * The content of the button
   */
  children: React.ReactNode;
}

/**
 * Button component for user interactions
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'medium',
      fullWidth = false,
      loading = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const buttonClasses = [
      styles.button,
      styles[variant],
      styles[size],
      fullWidth && styles.fullWidth,
      loading && styles.loading,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        className={buttonClasses}
        disabled={disabled || loading}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
