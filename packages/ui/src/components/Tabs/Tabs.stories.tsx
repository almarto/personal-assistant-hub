import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { Tabs, TabsProps } from './Tabs';

const meta: Meta<typeof Tabs> = {
  title: 'Components/Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    variant: {
      control: { type: 'select' },
      options: ['default', 'pills', 'underline'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const TabsWithState = (args: TabsProps) => {
  const [activeTab, setActiveTab] = useState(
    args.activeTab || args.items[0]?.id
  );

  return (
    <div style={{ width: '500px' }}>
      <Tabs {...args} activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export const Default: Story = {
  render: TabsWithState,
  args: {
    items: [
      {
        id: 'tab1',
        label: 'Tab 1',
        content: <div style={{ padding: '20px' }}>Content for Tab 1</div>,
      },
      {
        id: 'tab2',
        label: 'Tab 2',
        content: <div style={{ padding: '20px' }}>Content for Tab 2</div>,
      },
      {
        id: 'tab3',
        label: 'Tab 3',
        content: <div style={{ padding: '20px' }}>Content for Tab 3</div>,
      },
    ],
  },
};

export const Pills: Story = {
  render: TabsWithState,
  args: {
    variant: 'pills',
    items: [
      {
        id: 'signin',
        label: 'Sign In',
        content: (
          <div style={{ padding: '20px' }}>Sign in form would go here</div>
        ),
      },
      {
        id: 'register',
        label: 'Register',
        content: (
          <div style={{ padding: '20px' }}>Registration form would go here</div>
        ),
      },
    ],
  },
};

export const Underline: Story = {
  render: TabsWithState,
  args: {
    variant: 'underline',
    items: [
      {
        id: 'overview',
        label: 'Overview',
        content: <div style={{ padding: '20px' }}>Overview content</div>,
      },
      {
        id: 'details',
        label: 'Details',
        content: <div style={{ padding: '20px' }}>Details content</div>,
      },
      {
        id: 'settings',
        label: 'Settings',
        content: <div style={{ padding: '20px' }}>Settings content</div>,
      },
    ],
  },
};

export const Small: Story = {
  render: TabsWithState,
  args: {
    size: 'small',
    items: [
      {
        id: 'tab1',
        label: 'Small Tab 1',
        content: <div style={{ padding: '15px' }}>Small tab content</div>,
      },
      {
        id: 'tab2',
        label: 'Small Tab 2',
        content: <div style={{ padding: '15px' }}>Small tab content 2</div>,
      },
    ],
  },
};

export const Large: Story = {
  render: TabsWithState,
  args: {
    size: 'large',
    items: [
      {
        id: 'tab1',
        label: 'Large Tab 1',
        content: <div style={{ padding: '25px' }}>Large tab content</div>,
      },
      {
        id: 'tab2',
        label: 'Large Tab 2',
        content: <div style={{ padding: '25px' }}>Large tab content 2</div>,
      },
    ],
  },
};
