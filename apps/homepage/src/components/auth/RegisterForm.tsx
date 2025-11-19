import {
  Button,
  Input,
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
        await auth.registerPassword({
          email,
          password,
          invitationToken,
        });
      } else {
        await auth.registerPasskey({
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
        <div className={styles.errorMessage} role='alert'>
          {error}
        </div>
      )}

      <div className={`${styles.formContent} ${styles[`mode-${authMode}`]}`}>
        <Input
          id='email'
          type='email'
          label='Email'
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder='Enter your email'
          required
          disabled={isLoading}
          state={error && !email.trim() ? 'error' : 'default'}
        />

        <Input
          id='invitationToken'
          type='text'
          label='Invitation Token'
          value={invitationToken}
          onChange={e => setInvitationToken(e.target.value)}
          placeholder='Enter your invitation token'
          required
          disabled={isLoading}
          state={error && !invitationToken.trim() ? 'error' : 'default'}
        />

        {authMode === 'password' ? (
          <>
            <div className={styles.formGroup}>
              <Input
                id='password'
                type='password'
                label='Password'
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder='Create a strong password'
                required
                disabled={isLoading}
                showPasswordToggle
                state={
                  error && !isPasswordValid(password) ? 'error' : 'default'
                }
              />
              <PasswordStrengthIndicator password={password} />
            </div>

            <Input
              id='confirmPassword'
              type='password'
              label='Confirm Password'
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder='Confirm your password'
              required
              disabled={isLoading}
              state={
                confirmPassword && password !== confirmPassword
                  ? 'error'
                  : 'default'
              }
              errorMessage={
                confirmPassword && password !== confirmPassword
                  ? 'Passwords do not match'
                  : undefined
              }
            />
          </>
        ) : (
          <Input
            id='deviceName'
            type='text'
            label='Device Name'
            value={deviceName}
            onChange={e => setDeviceName(e.target.value)}
            placeholder='e.g., My Laptop'
            required
            disabled={isLoading}
            state={error && !deviceName.trim() ? 'error' : 'default'}
          />
        )}

        <Button
          type='submit'
          variant='primary'
          size='medium'
          fullWidth
          loading={isLoading}
          disabled={isLoading || !isFormValid()}
        >
          {authMode === 'password'
            ? 'Create Account with Password'
            : 'Create Account with Passkey'}
        </Button>

        <Button
          type='button'
          variant='outline'
          size='medium'
          fullWidth
          onClick={handleModeSwitch}
          disabled={isLoading}
        >
          {authMode === 'password'
            ? 'Use Passkey Instead'
            : 'Use Password Instead'}
        </Button>
      </div>
    </form>
  );
};
