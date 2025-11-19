import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';

const meta: Meta<typeof PasswordStrengthIndicator> = {
  title: 'Components/PasswordStrengthIndicator',
  component: PasswordStrengthIndicator,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A component that displays password strength with visual feedback and validation messages.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PasswordStrengthIndicator>;

export const VeryWeak: Story = {
  args: {
    password: '123',
  },
};

export const Weak: Story = {
  args: {
    password: 'password',
  },
};

export const Good: Story = {
  args: {
    password: 'Password1',
  },
};

export const Strong: Story = {
  args: {
    password: 'MyStr0ng!Pass',
  },
};

export const Empty: Story = {
  args: {
    password: '',
  },
};

export const Interactive: Story = {
  render: () => {
    const [password, setPassword] = useState('');

    return (
      <div style={{ maxWidth: '400px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor='password'
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'medium',
            }}
          >
            Password
          </label>
          <input
            id='password'
            type='password'
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder='Type a password to see strength feedback'
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '14px',
            }}
          />
        </div>
        <PasswordStrengthIndicator password={password} />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Interactive example showing real-time password strength validation.',
      },
    },
  },
};
