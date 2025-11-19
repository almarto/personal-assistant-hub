import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';

import { renderWithRouter } from '../test-utils';

describe('Routes Integration', () => {
  it('should navigate to dashboard and show dashboard content', async () => {
    renderWithRouter(['/dashboard']);

    // Check if dashboard content is displayed
    expect(
      screen.getByText('Welcome to Personal Assistant Hub')
    ).toBeInTheDocument();
    expect(screen.getByText('Your Tools')).toBeInTheDocument();

    // Check if sidebar exists (should be rendered by Layout)
    const sidebar = screen.queryByTestId('main-menu');
    expect(sidebar).toBeInTheDocument();

    // Check if dashboard link exists in sidebar
    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveTextContent('📊');
    expect(dashboardLink).toHaveTextContent('Dashboard');
  });

  it('should navigate to baby-tracker when clicking the sidebar link', async () => {
    const user = userEvent.setup();
    renderWithRouter(['/dashboard']); // Start at dashboard where sidebar exists

    // Wait for the dashboard to load and verify we start at the dashboard
    expect(await screen.findByText('Your Tools')).toBeInTheDocument();

    // Find and click the Baby Tracker link in the sidebar
    const babyTrackerLink = screen.getByRole('link', {
      name: /Baby Tracker/i,
    });
    expect(babyTrackerLink).toHaveTextContent('👶');
    expect(babyTrackerLink).toHaveTextContent('Baby Tracker');
    expect(babyTrackerLink).toBeInTheDocument();

    await user.click(babyTrackerLink);

    // Verify we navigated to the coming soon page
    expect(
      await screen.findByRole('heading', { name: 'Baby Tracker' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'This tool is currently under development and will be available soon.'
      )
    ).toBeInTheDocument();
  });

  it('should show dashboard link in sidebar when on dashboard page', async () => {
    renderWithRouter(['/dashboard']);

    // Wait for dashboard to load
    expect(await screen.findByText('Your Tools')).toBeInTheDocument();

    // Check if dashboard link exists in sidebar
    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveTextContent('📊');
    expect(dashboardLink).toHaveTextContent('Dashboard');
  });
});
