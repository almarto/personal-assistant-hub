import { Button, Tabs } from '@personal-assistant-hub/ui';
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

  const tabItems = [
    {
      id: 'login',
      label: 'Sign In',
      content: (
        <LoginForm onSuccess={handleAuthSuccess} onError={handleAuthError} />
      ),
    },
    {
      id: 'register',
      label: 'Register',
      content: (
        <RegisterForm onSuccess={handleAuthSuccess} onError={handleAuthError} />
      ),
    },
  ];

  return (
    <div className={styles.authPage}>
      <div className={styles.authContainer}>
        <div className={styles.authHeader}>
          <h1>Personal Assistant Hub</h1>
          <p>Your secure productivity companion</p>
        </div>

        <Tabs
          items={tabItems}
          activeTab={mode}
          onTabChange={tabId => setMode(tabId as AuthMode)}
          variant='default'
          size='medium'
        />

        <div className={styles.authFooter}>
          <p>
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <Button
                  variant='ghost'
                  size='small'
                  onClick={() => setMode('register')}
                >
                  Register here
                </Button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Button
                  variant='ghost'
                  size='small'
                  onClick={() => setMode('login')}
                >
                  Sign in here
                </Button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
