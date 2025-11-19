import type { Preview } from '@storybook/react';
import { useEffect } from 'react';
import '../dist/index.css';

// Theme decorator to handle dark/light mode
const withTheme = (Story: any, context: any) => {
  const { theme } = context.globals;

  useEffect(() => {
    const body = document.body;
    if (theme === 'dark') {
      body.style.colorScheme = 'dark';
      body.style.backgroundColor = '#242424';
      body.style.color = 'rgba(255, 255, 255, 0.87)';
    } else {
      body.style.colorScheme = 'light';
      body.style.backgroundColor = '#ffffff';
      body.style.color = '#213547';
    }
  }, [theme]);

  return Story();
};

const preview: Preview = {
  decorators: [withTheme],
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#242424',
        },
      ],
    },
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'dark',
      toolbar: {
        title: 'Theme',
        icon: 'circle',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
