import React, { useState } from 'react';

import { auth } from '../../main';

import styles from './RegisterForm.module.css';

interface RegisterFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onError,
}) => {
  const [email, setEmail] = useState('');
  const [invitationToken, setInvitationToken] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !invitationToken.trim() || !deviceName.trim()) {
      setError('All fields are required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Register user with WebAuthn (handled internally by AuthService)
      await auth.authService.register({
        email,
        invitationToken,
        deviceName,
      });

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

  return (
    <form onSubmit={handleSubmit} className={styles.registerForm}>
      <h2>Create Account</h2>
      <p>Register with your invitation token and create a passkey</p>

      {error && (
        <div className={styles.errorMessage} role="alert">
          {error}
        </div>
      )}

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

      <div className="form-group">
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

      <div className="form-group">
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

      <button
        type="submit"
        disabled={
          isLoading ||
          !email.trim() ||
          !invitationToken.trim() ||
          !deviceName.trim()
        }
        className={`${styles.registerButton} ${isLoading ? styles.loading : ''}`}
      >
        {isLoading ? 'Creating account...' : 'Create Account with Passkey'}
      </button>
    </form>
  );
};
