import React, { useState } from 'react';

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
  /**
   * Whether to show password toggle for password inputs
   */
  showPasswordToggle?: boolean;
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
      showPasswordToggle = false,
      className,
      id,
      type,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId =
      id || `input-${Math.random().toString(36).substring(2, 11)}`;
    const hasError = state === 'error' || !!errorMessage;
    const displayText = hasError ? errorMessage : helperText;

    const isPasswordInput = type === 'password';
    const shouldShowToggle = isPasswordInput && showPasswordToggle;
    const inputType = shouldShowToggle && showPassword ? 'text' : type;

    const inputClasses = [
      styles.input,
      styles[size],
      hasError && styles.error,
      state === 'success' && styles.success,
      icon && styles.withIcon,
      shouldShowToggle && styles.withPasswordToggle,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const togglePassword = () => {
      setShowPassword(!showPassword);
    };

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
            type={inputType}
            className={inputClasses}
            required={required}
            {...props}
          />
          {shouldShowToggle && (
            <button
              type='button'
              className={styles.passwordToggle}
              onClick={togglePassword}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg
                  width='20'
                  height='20'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <path d='M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24' />
                  <line x1='1' y1='1' x2='23' y2='23' />
                </svg>
              ) : (
                <svg
                  width='20'
                  height='20'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
                  <circle cx='12' cy='12' r='3' />
                </svg>
              )}
            </button>
          )}
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
