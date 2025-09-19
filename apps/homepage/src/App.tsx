import React from 'react';
import { Route, Routes } from 'react-router-dom';

import { AuthGuard } from './components/auth';
import { Layout } from './components/layout/Layout';
import { SimpleLayout } from './components/layout/SimpleLayout';
import { AuthPage } from './pages/AuthPage';
import { ComingSoon } from './pages/ComingSoon';
import { Dashboard } from './pages/Dashboard';
import { Homepage } from './pages/Homepage';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthGuard>
      <SimpleLayout>{children}</SimpleLayout>
    </AuthGuard>
  );
};

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path='/' element={<Homepage />} />
      <Route path='/auth' element={<AuthPage />} />

      {/* Protected routes */}
      <Route
        path='/dashboard'
        element={
          <AuthGuard>
            <Layout />
          </AuthGuard>
        }
      >
        <Route index element={<Dashboard />} />
      </Route>
      <Route
        path='/baby-tracker'
        element={
          <ProtectedRoute>
            <ComingSoon />
          </ProtectedRoute>
        }
      />
      <Route
        path='/gym-tracker'
        element={
          <ProtectedRoute>
            <ComingSoon />
          </ProtectedRoute>
        }
      />
      <Route
        path='/moto-tracker'
        element={
          <ProtectedRoute>
            <ComingSoon />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};
