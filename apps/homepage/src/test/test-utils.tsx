import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import '@personal-assistant-hub/i18n';
import { App } from '../App';

// Custom render function for testing with routes
export const renderWithRouter = (
  initialEntries: string[] = ['/'],
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult => {
  const Wrapper = () => (
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>
  );

  return render(<Wrapper />, options);
};

// Re-export everything
export * from '@testing-library/react';
