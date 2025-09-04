import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';

import { renderWithRouter } from '../test-utils';

describe('Routes Integration', () => {
  it('should navigate to baby-tracker when clicking the sidebar link', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    // Verify we start at the dashboard
    expect(
      screen.getByText('Welcome to Personal Assistant Hub')
    ).toBeInTheDocument();

    // Find and click the Baby Tracker link in the sidebar
    const babyTrackerLink = screen.getByRole('link', {
      name: /👶 Baby Tracker/i,
    });
    expect(babyTrackerLink).toBeInTheDocument();

    await user.click(babyTrackerLink);

    // Verify we navigated to the coming soon page
    expect(screen.getByText('Baby Tracker')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This tool is currently under development and will be available soon.'
      )
    ).toBeInTheDocument();
  });

  it('should show active state for current route in sidebar', () => {
    renderWithRouter();

    // Find the Dashboard link and verify it has active styling
    const dashboardLink = screen.getByRole('link', { name: /📊 Dashboard/i });
    expect(dashboardLink).toBeInTheDocument();

    // The active class should be applied to the dashboard link when on home page
    // CSS modules generate class names like '_active_24c364', so we check if it contains 'active'
    expect(dashboardLink.className).toMatch(/active/);
  });
});
