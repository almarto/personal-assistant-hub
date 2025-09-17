import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';

import { Sidebar } from '../../../components/layout/Sidebar';

describe('Sidebar', () => {
  it('should render navigation links', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar />
      </MemoryRouter>
    );

    // Check if sidebar navigation exists
    const sidebar = screen.getByTestId('main-menu');
    expect(sidebar).toBeInTheDocument();

    // Check if navigation links are present
    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    expect(dashboardLink).toHaveTextContent('📊');
    expect(dashboardLink).toHaveTextContent('Dashboard');
    expect(dashboardLink).toBeInTheDocument();

    const babyTrackerLink = screen.getByRole('link', { name: /Baby Tracker/i });
    expect(babyTrackerLink).toHaveTextContent('👶');
    expect(babyTrackerLink).toHaveTextContent('Baby Tracker');
    expect(babyTrackerLink).toBeInTheDocument();

    const gymTrackerLink = screen.getByRole('link', { name: /Gym Tracker/i });
    expect(gymTrackerLink).toHaveTextContent('💪');
    expect(gymTrackerLink).toHaveTextContent('Gym Tracker');
    expect(gymTrackerLink).toBeInTheDocument();

    const motoTrackerLink = screen.getByRole('link', { name: /Moto Tracker/i });
    expect(motoTrackerLink).toHaveTextContent('🏍️');
    expect(motoTrackerLink).toHaveTextContent('Moto Tracker');
    expect(motoTrackerLink).toBeInTheDocument();
  });

  it('should show active state for current route', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar />
      </MemoryRouter>
    );

    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    expect(dashboardLink).toHaveTextContent('📊');
    expect(dashboardLink).toHaveTextContent('Dashboard');
    expect(dashboardLink).toHaveClass('_active_24c364');
  });
});
