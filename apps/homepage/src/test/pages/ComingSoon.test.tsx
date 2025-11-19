import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { renderWithRouter } from '../test-utils';

describe('ComingSoon Page', () => {
  it('should render the coming soon page with correct content for baby-tracker', () => {
    renderWithRouter(['/baby-tracker']);

    // Check the tool name is displayed
    expect(
      screen.getByRole('heading', { name: 'Baby Tracker' })
    ).toBeInTheDocument();

    // Check the construction icon
    expect(screen.getByText('🚧')).toBeInTheDocument();

    // Check the main message
    expect(
      screen.getByText(
        'This tool is currently under development and will be available soon.'
      )
    ).toBeInTheDocument();

    // Check the sub message
    expect(
      screen.getByText('Check back later for updates!')
    ).toBeInTheDocument();
  });

  it('should render the coming soon page with correct content for gym-tracker', () => {
    renderWithRouter(['/gym-tracker']);

    // Check the tool name is displayed
    expect(
      screen.getByRole('heading', { name: 'Gym Tracker' })
    ).toBeInTheDocument();

    // Check the construction icon
    expect(screen.getByText('🚧')).toBeInTheDocument();

    // Check the main message
    expect(
      screen.getByText(
        'This tool is currently under development and will be available soon.'
      )
    ).toBeInTheDocument();

    // Check the sub message
    expect(
      screen.getByText('Check back later for updates!')
    ).toBeInTheDocument();
  });
});
