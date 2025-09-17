import React, { useState } from 'react';

import { auth } from '../../main';

import styles from './LoginForm.module.css';

type AuthMode = 'password' | 'passkey';

interface LoginFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('password');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (authMode === 'password' && !password.trim()) {
      setError('Password is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (authMode === 'password') {
        await auth.passwordService.login({ email, password });
      } else {
        await auth.passkeyService.login({ email });
      }

      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
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
  };

  return (
    <form onSubmit={handleSubmit} className={styles.loginForm}>
      <div className={styles.header}>
        <h2>Sign In</h2>
        <p>
          {authMode === 'password'
            ? 'Enter your email and password to sign in'
            : 'Use your passkey to sign in securely'}
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

        {authMode === 'password' && (
          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={isLoading}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={
            isLoading ||
            !email.trim() ||
            (authMode === 'password' && !password.trim())
          }
          className={`${styles.loginButton} ${isLoading ? styles.loading : ''}`}
        >
          {isLoading
            ? 'Signing in...'
            : authMode === 'password'
              ? 'Sign in with Password'
              : 'Sign in with Passkey'}
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
