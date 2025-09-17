import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';

import styles from './Auth.module.css';

type AuthMode = 'login' | 'register';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const navigate = useNavigate();

  const handleAuthSuccess = () => {
    // Redirect to dashboard after successful authentication
    navigate('/');
  };

  const handleAuthError = (error: string) => {
    console.error('Authentication error:', error);
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authContainer}>
        <div className={styles.authHeader}>
          <h1>Personal Assistant Hub</h1>
          <p>Your secure productivity companion</p>
        </div>

        <div className={styles.authTabs}>
          <button
            className={`${styles.authTab} ${mode === 'login' ? styles.active : ''}`}
            onClick={() => setMode('login')}
          >
            Sign In
          </button>
          <button
            className={`${styles.authTab} ${mode === 'register' ? styles.active : ''}`}
            onClick={() => setMode('register')}
          >
            Register
          </button>
        </div>

        <div className="auth-content">
          {mode === 'login' ? (
            <LoginForm
              onSuccess={handleAuthSuccess}
              onError={handleAuthError}
            />
          ) : (
            <RegisterForm
              onSuccess={handleAuthSuccess}
              onError={handleAuthError}
            />
          )}
        </div>

        <div className={styles.authFooter}>
          <p>
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => setMode('register')}
                >
                  Register here
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => setMode('login')}
                >
                  Sign in here
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
