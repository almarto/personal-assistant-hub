import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { auth } from '../../main';

import styles from './AuthGuard.module.css';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        setIsLoading(true);
        await auth.useAuthStore.getState().checkAuth();
        const { isAuthenticated } = auth.useAuthStore.getState();
        setIsAuthenticated(isAuthenticated);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthentication();
  }, []);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className={styles.authLoading}>
        <div className={styles.loadingSpinner}></div>
        <p>Checking authentication...</p>
      </div>
    );
  }

  // Redirect to auth page if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // Render protected content if authenticated
  return <>{children}</>;
};
