import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { renderWithRouter } from '../test-utils';

describe('Dashboard Page', () => {
  it('should render the dashboard with welcome message and all tool cards', () => {
    renderWithRouter(['/dashboard']);

    // Check welcome message
    expect(
      screen.getByText('Welcome to Personal Assistant Hub')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Your personal productivity tools in one place')
    ).toBeInTheDocument();

    // Check "Your Tools" section
    expect(screen.getByText('Your Tools')).toBeInTheDocument();

    // Check all tool cards are rendered (using more specific queries to avoid duplicates)
    expect(
      screen.getByText(
        'Track feeding, sleeping, and development milestones for your little one.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Monitor your workouts, progress, and fitness goals.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Keep track of motorcycle maintenance, rides, and expenses.'
      )
    ).toBeInTheDocument();

    // Check that we have the expected number of tool cards by checking unique descriptions
    const toolDescriptions = [
      'Track feeding, sleeping, and development milestones for your little one.',
      'Monitor your workouts, progress, and fitness goals.',
      'Keep track of motorcycle maintenance, rides, and expenses.',
    ];

    toolDescriptions.forEach(description => {
      expect(screen.getByText(description)).toBeInTheDocument();
    });

    // Check cards container is present
    expect(screen.getByTestId('cards-container')).toBeInTheDocument();
  });
});
