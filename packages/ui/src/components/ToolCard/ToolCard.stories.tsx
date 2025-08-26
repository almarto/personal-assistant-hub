import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Grid } from '../Grid/Grid';

import { ToolCard } from './ToolCard';

const meta: Meta<typeof ToolCard> = {
  title: 'Components/ToolCard',
  component: ToolCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: { type: 'select' },
      options: ['available', 'coming-soon'],
    },
    icon: {
      control: { type: 'text' },
    },
    onClick: { action: 'clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Analytics Dashboard',
    description: 'View comprehensive analytics and insights for your projects.',
    icon: '📊',
    status: 'available',
  },
};

export const ComingSoon: Story = {
  args: {
    title: 'AI Assistant',
    description: 'Get intelligent suggestions and automated code reviews.',
    icon: '🤖',
    status: 'coming-soon',
  },
};

export const CustomAction: Story = {
  args: {
    title: 'Deploy Project',
    description: 'Deploy your application to production with one click.',
    icon: '🚀',
    status: 'available',
    actionText: 'Deploy Now',
  },
};

export const LongDescription: Story = {
  args: {
    title: 'Advanced Configuration',
    description:
      'Configure advanced settings, environment variables, build processes, deployment pipelines, and monitoring tools for your application.',
    icon: '⚙️',
    status: 'available',
  },
};

export const ToolGrid: Story = {
  render: () => (
    <Grid columns={3} gap="medium">
      <ToolCard
        title="Code Editor"
        description="Edit and manage your code with syntax highlighting and IntelliSense."
        icon="💻"
        status="available"
        onClick={() => console.log('Code Editor clicked')}
      />
      <ToolCard
        title="Database Manager"
        description="Manage your databases, run queries, and view data relationships."
        icon="🗄️"
        status="available"
        onClick={() => console.log('Database Manager clicked')}
      />
      <ToolCard
        title="API Testing"
        description="Test your APIs, manage endpoints, and validate responses."
        icon="🔌"
        status="available"
        onClick={() => console.log('API Testing clicked')}
      />
      <ToolCard
        title="Performance Monitor"
        description="Monitor application performance, track metrics, and identify bottlenecks."
        icon="📈"
        status="coming-soon"
      />
      <ToolCard
        title="Security Scanner"
        description="Scan your code for security vulnerabilities and compliance issues."
        icon="🔒"
        status="coming-soon"
      />
      <ToolCard
        title="Team Collaboration"
        description="Collaborate with your team, share code, and manage project tasks."
        icon="👥"
        status="available"
        actionText="Join Team"
        onClick={() => console.log('Team Collaboration clicked')}
      />
    </Grid>
  ),
  parameters: {
    layout: 'padded',
  },
};

export const DifferentIcons: Story = {
  render: () => (
    <Grid columns={2} gap="medium">
      <ToolCard
        title="File Manager"
        description="Organize and manage your project files and folders."
        icon="📁"
        status="available"
      />
      <ToolCard
        title="Terminal"
        description="Access command line interface and run shell commands."
        icon="⌨️"
        status="available"
      />
      <ToolCard
        title="Git Integration"
        description="Manage version control, commits, and repository operations."
        icon="🌿"
        status="available"
      />
      <ToolCard
        title="Package Manager"
        description="Install, update, and manage project dependencies."
        icon="📦"
        status="available"
      />
    </Grid>
  ),
  parameters: {
    layout: 'padded',
  },
};

export const StatusComparison: Story = {
  render: () => (
    <Grid columns={2} gap="large">
      <ToolCard
        title="Available Tool"
        description="This tool is ready to use and fully functional."
        icon="✅"
        status="available"
        onClick={() => console.log('Available tool clicked')}
      />
      <ToolCard
        title="Coming Soon Tool"
        description="This tool is under development and will be available soon."
        icon="🚧"
        status="coming-soon"
      />
    </Grid>
  ),
  parameters: {
    layout: 'padded',
  },
};
