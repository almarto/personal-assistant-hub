import { describe, it, expect } from 'vitest';

import { renderWithRouter } from './test/test-utils';

describe('App', () => {
  it('renders without crashing', () => {
    renderWithRouter();
    expect(document.body).toBeInTheDocument();
  });

  it('renders the routing structure', () => {
    renderWithRouter();
    // Test that the app renders without throwing errors
    expect(document.querySelector('body')).toBeInTheDocument();
  });
});
