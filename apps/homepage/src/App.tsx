import React from 'react';
import { Routes, Route } from 'react-router-dom';

import { Layout } from './components/layout/Layout';
import { ComingSoon } from './pages/ComingSoon';
import { Dashboard } from './pages/Dashboard';

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="baby-tracker" element={<ComingSoon />} />
        <Route path="gym-tracker" element={<ComingSoon />} />
        <Route path="moto-tracker" element={<ComingSoon />} />
      </Route>
    </Routes>
  );
};
