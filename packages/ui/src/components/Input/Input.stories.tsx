import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    state: {
      control: { type: 'select' },
      options: ['default', 'error', 'success'],
    },
    required: {
      control: { type: 'boolean' },
    },
    disabled: {
      control: { type: 'boolean' },
    },
    showPasswordToggle: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email',
    type: 'email',
  },
};

export const Required: Story = {
  args: {
    label: 'Full Name',
    placeholder: 'Enter your full name',
    required: true,
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Username',
    placeholder: 'Enter username',
    helperText: 'Must be at least 3 characters long',
  },
};

export const WithError: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email',
    type: 'email',
    state: 'error',
    errorMessage: 'Please enter a valid email address',
  },
};

export const Success: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email',
    type: 'email',
    state: 'success',
    value: 'user@example.com',
  },
};

export const Small: Story = {
  args: {
    label: 'Small Input',
    placeholder: 'Small size',
    size: 'small',
  },
};

export const Large: Story = {
  args: {
    label: 'Large Input',
    placeholder: 'Large size',
    size: 'large',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Input',
    placeholder: 'Cannot edit',
    disabled: true,
  },
};

export const WithIcon: Story = {
  args: {
    label: 'Search',
    placeholder: 'Search...',
    icon: (
      <svg
        width='16'
        height='16'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <circle cx='11' cy='11' r='8'></circle>
        <path d='m21 21-4.35-4.35'></path>
      </svg>
    ),
  },
};

export const Password: Story = {
  args: {
    label: 'Password',
    placeholder: 'Enter your password',
    type: 'password',
    showPasswordToggle: true,
  },
};

export const PasswordWithError: Story = {
  args: {
    label: 'Password',
    placeholder: 'Enter your password',
    type: 'password',
    showPasswordToggle: true,
    state: 'error',
    errorMessage: 'Password must be at least 8 characters long',
  },
};

export const PasswordRequired: Story = {
  args: {
    label: 'New Password',
    placeholder: 'Create a strong password',
    type: 'password',
    showPasswordToggle: true,
    required: true,
    helperText:
      'Must contain at least 8 characters, including uppercase, lowercase, number and special character',
  },
};

export const ConfirmPassword: Story = {
  args: {
    label: 'Confirm Password',
    placeholder: 'Re-enter your password',
    type: 'password',
    showPasswordToggle: true,
    required: true,
  },
};
