import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Button } from '../Button/Button';

import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'interactive', 'disabled'],
    },
    hoverable: {
      control: { type: 'boolean' },
    },
    noPadding: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div>
        <h3>Card Title</h3>
        <p>This is a basic card with default styling and padding.</p>
      </div>
    ),
  },
};

export const Interactive: Story = {
  args: {
    variant: 'interactive',
    hoverable: true,
    children: (
      <div>
        <h3>Interactive Card</h3>
        <p>This card has interactive styling and hover effects.</p>
        <p>Try hovering over it!</p>
      </div>
    ),
  },
};

export const Disabled: Story = {
  args: {
    variant: 'disabled',
    children: (
      <div>
        <h3>Disabled Card</h3>
        <p>This card appears disabled and cannot be interacted with.</p>
      </div>
    ),
  },
};

export const WithButton: Story = {
  args: {
    variant: 'interactive',
    hoverable: true,
    children: (
      <div>
        <h3>Card with Action</h3>
        <p>This card contains interactive elements like buttons.</p>
        <Button variant='primary'>Take Action</Button>
      </div>
    ),
  },
};

export const NoPadding: Story = {
  args: {
    noPadding: true,
    children: (
      <div style={{ padding: '2rem', backgroundColor: '#f0f0f0' }}>
        <h3>Custom Layout Card</h3>
        <p>This card has no default padding, allowing for custom layouts.</p>
        <p>The gray background shows the custom padding applied.</p>
      </div>
    ),
  },
};

export const LongContent: Story = {
  args: {
    children: (
      <div>
        <h3>Card with Long Content</h3>
        <p>
          This card demonstrates how the component handles longer content. Lorem
          ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
          tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
          veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex
          ea commodo consequat.
        </p>
        <p>
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
          dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
          proident, sunt in culpa qui officia deserunt mollit anim id est
          laborum.
        </p>
      </div>
    ),
  },
};

export const MinimalContent: Story = {
  args: {
    children: <p>Minimal card content</p>,
  },
};
