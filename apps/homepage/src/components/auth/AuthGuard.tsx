import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useUserSession } from '@/hooks/auth';

import styles from './AuthGuard.module.css';
import type { AuthGuardProps } from './types';

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useUserSession();

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
    return <Navigate to='/auth' state={{ from: location.pathname }} replace />;
  }

  // Render protected content if authenticated
  return <>{children}</>;
};
