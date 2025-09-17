import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';

import { Layout } from '../../../components/layout/Layout';

describe('Layout', () => {
  it('should render sidebar and main content area', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );

    // Check if sidebar navigation exists
    const sidebar = screen.getByTestId('main-menu');
    expect(sidebar).toBeInTheDocument();

    // Check if main content area exists
    const mainContent = screen.getByRole('main');
    expect(mainContent).toBeInTheDocument();

    // Check if navigation links are present
    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    expect(dashboardLink).toBeInTheDocument();

    const babyTrackerLink = screen.getByRole('link', { name: /Baby Tracker/i });
    expect(babyTrackerLink).toBeInTheDocument();
  });
});
