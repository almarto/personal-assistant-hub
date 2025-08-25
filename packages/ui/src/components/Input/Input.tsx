import React from 'react';

import styles from './Input.module.css';

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /**
   * The label for the input
   */
  label?: string;
  /**
   * Whether the input is required
   */
  required?: boolean;
  /**
   * The size of the input
   */
  size?: 'small' | 'medium' | 'large';
  /**
   * The state of the input
   */
  state?: 'default' | 'error' | 'success';
  /**
   * Helper text to display below the input
   */
  helperText?: string;
  /**
   * Error message to display below the input
   */
  errorMessage?: string;
  /**
   * Icon to display on the left side of the input
   */
  icon?: React.ReactNode;
}

/**
 * Input component for user text input
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      required = false,
      size = 'medium',
      state = 'default',
      helperText,
      errorMessage,
      icon,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = state === 'error' || !!errorMessage;
    const displayText = hasError ? errorMessage : helperText;

    const inputClasses = [
      styles.input,
      styles[size],
      hasError && styles.error,
      state === 'success' && styles.success,
      icon && styles.withIcon,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={styles.inputWrapper}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
            {required && <span className={styles.required}> *</span>}
          </label>
        )}
        <div className={styles.inputContainer}>
          {icon && <div className={styles.icon}>{icon}</div>}
          <input
            ref={ref}
            id={inputId}
            className={inputClasses}
            required={required}
            {...props}
          />
        </div>
        {displayText && (
          <div className={hasError ? styles.errorText : styles.helperText}>
            {displayText}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
