import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect } from 'vitest';

import { AuthGuard } from '../../components/auth/AuthGuard';
import { Layout } from '../../components/layout/Layout';
import { Dashboard } from '../../pages/Dashboard';

describe('Dashboard Route Structure', () => {
  it('should render Layout with Dashboard as nested route', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
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
        </Routes>
      </MemoryRouter>
    );

    // Check if dashboard content is displayed
    expect(
      screen.getByText('Welcome to Personal Assistant Hub')
    ).toBeInTheDocument();
    expect(screen.getByText('Your Tools')).toBeInTheDocument();

    // Check if sidebar exists (should be rendered by Layout)
    const sidebar = screen.getByTestId('main-menu');
    expect(sidebar).toBeInTheDocument();

    // Check if dashboard link exists in sidebar
    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveTextContent('📊');
    expect(dashboardLink).toHaveTextContent('Dashboard');

    // Check if other navigation links exist
    const babyTrackerLink = screen.getByRole('link', { name: /Baby Tracker/i });
    expect(babyTrackerLink).toBeInTheDocument();
    expect(babyTrackerLink).toHaveTextContent('👶');
    expect(babyTrackerLink).toHaveTextContent('Baby Tracker');
  });
});
