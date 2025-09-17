import {
  PasswordStrengthIndicator,
  isPasswordValid,
} from '@personal-assistant-hub/ui';
import React, { useState } from 'react';

import { auth } from '../../main';

import styles from './RegisterForm.module.css';

type AuthMode = 'password' | 'passkey';

interface RegisterFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onError,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitationToken, setInvitationToken] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('password');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !invitationToken.trim()) {
      setError('Email and invitation token are required');
      return;
    }

    if (authMode === 'password') {
      if (!password.trim()) {
        setError('Password is required');
        return;
      }
      if (!isPasswordValid(password)) {
        setError('Please ensure your password meets all requirements');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    } else {
      if (!deviceName.trim()) {
        setError('Device name is required for passkey registration');
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      if (authMode === 'password') {
        await auth.passwordService.register({
          email,
          password,
          invitationToken,
        });
      } else {
        await auth.passkeyService.register({
          email,
          invitationToken,
          deviceName,
        });
      }

      onSuccess?.();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeSwitch = () => {
    setAuthMode(authMode === 'password' ? 'passkey' : 'password');
    setError(null);
    setPassword('');
    setConfirmPassword('');
    setDeviceName('');
  };

  const isFormValid = () => {
    if (!email.trim() || !invitationToken.trim()) return false;

    if (authMode === 'password') {
      return isPasswordValid(password) && password === confirmPassword;
    } else {
      return deviceName.trim().length > 0;
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.registerForm}>
      <div className={styles.header}>
        <h2>Create Account</h2>
        <p>
          {authMode === 'password'
            ? 'Create your account with a secure password'
            : 'Register with your invitation token and create a passkey'}
        </p>
      </div>

      {error && (
        <div className={styles.errorMessage} role="alert">
          {error}
        </div>
      )}

      <div className={`${styles.formContent} ${styles[`mode-${authMode}`]}`}>
        <div className={styles.formGroup}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            disabled={isLoading}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="invitationToken">Invitation Token</label>
          <input
            id="invitationToken"
            type="text"
            value={invitationToken}
            onChange={e => setInvitationToken(e.target.value)}
            placeholder="Enter your invitation token"
            required
            disabled={isLoading}
          />
        </div>

        {authMode === 'password' ? (
          <>
            <div className={styles.formGroup}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Create a strong password"
                required
                disabled={isLoading}
              />
              <PasswordStrengthIndicator password={password} />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                disabled={isLoading}
              />
              {confirmPassword && password !== confirmPassword && (
                <div className={styles.passwordMismatch}>
                  Passwords do not match
                </div>
              )}
            </div>
          </>
        ) : (
          <div className={styles.formGroup}>
            <label htmlFor="deviceName">Device Name</label>
            <input
              id="deviceName"
              type="text"
              value={deviceName}
              onChange={e => setDeviceName(e.target.value)}
              placeholder="e.g., My Laptop"
              required
              disabled={isLoading}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !isFormValid()}
          className={`${styles.registerButton} ${isLoading ? styles.loading : ''}`}
        >
          {isLoading
            ? 'Creating account...'
            : authMode === 'password'
              ? 'Create Account with Password'
              : 'Create Account with Passkey'}
        </button>

        <button
          type="button"
          onClick={handleModeSwitch}
          disabled={isLoading}
          className={styles.switchModeButton}
        >
          {authMode === 'password'
            ? 'Use Passkey Instead'
            : 'Use Password Instead'}
        </button>
      </div>
    </form>
  );
};
