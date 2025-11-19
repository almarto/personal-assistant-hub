import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Card } from '../Card/Card';

import { Grid } from './Grid';

const meta: Meta<typeof Grid> = {
  title: 'Components/Grid',
  component: Grid,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    columns: {
      control: { type: 'select' },
      options: [1, 2, 3, 4, 'auto-fit'],
    },
    gap: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    minColumnWidth: {
      control: { type: 'text' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Sample content for grid items
const GridItem = ({ children, ...props }: { children: React.ReactNode }) => (
  <Card {...props}>
    <div style={{ padding: '1rem', textAlign: 'center' }}>{children}</div>
  </Card>
);

export const Default: Story = {
  args: {
    children: (
      <>
        <GridItem>Item 1</GridItem>
        <GridItem>Item 2</GridItem>
        <GridItem>Item 3</GridItem>
        <GridItem>Item 4</GridItem>
        <GridItem>Item 5</GridItem>
        <GridItem>Item 6</GridItem>
      </>
    ),
  },
};

export const TwoColumns: Story = {
  args: {
    columns: 2,
    children: (
      <>
        <GridItem>Column 1</GridItem>
        <GridItem>Column 2</GridItem>
        <GridItem>Column 1</GridItem>
        <GridItem>Column 2</GridItem>
      </>
    ),
  },
};

export const ThreeColumns: Story = {
  args: {
    columns: 3,
    children: (
      <>
        <GridItem>Item 1</GridItem>
        <GridItem>Item 2</GridItem>
        <GridItem>Item 3</GridItem>
        <GridItem>Item 4</GridItem>
        <GridItem>Item 5</GridItem>
        <GridItem>Item 6</GridItem>
      </>
    ),
  },
};

export const FourColumns: Story = {
  args: {
    columns: 4,
    children: (
      <>
        <GridItem>1</GridItem>
        <GridItem>2</GridItem>
        <GridItem>3</GridItem>
        <GridItem>4</GridItem>
        <GridItem>5</GridItem>
        <GridItem>6</GridItem>
        <GridItem>7</GridItem>
        <GridItem>8</GridItem>
      </>
    ),
  },
};

export const SmallGap: Story = {
  args: {
    gap: 'small',
    columns: 3,
    children: (
      <>
        <GridItem>Small Gap 1</GridItem>
        <GridItem>Small Gap 2</GridItem>
        <GridItem>Small Gap 3</GridItem>
        <GridItem>Small Gap 4</GridItem>
        <GridItem>Small Gap 5</GridItem>
        <GridItem>Small Gap 6</GridItem>
      </>
    ),
  },
};

export const LargeGap: Story = {
  args: {
    gap: 'large',
    columns: 2,
    children: (
      <>
        <GridItem>Large Gap 1</GridItem>
        <GridItem>Large Gap 2</GridItem>
        <GridItem>Large Gap 3</GridItem>
        <GridItem>Large Gap 4</GridItem>
      </>
    ),
  },
};

export const AutoFitCustomWidth: Story = {
  args: {
    columns: 'auto-fit',
    minColumnWidth: '200px',
    children: (
      <>
        <GridItem>Auto-fit 1</GridItem>
        <GridItem>Auto-fit 2</GridItem>
        <GridItem>Auto-fit 3</GridItem>
        <GridItem>Auto-fit 4</GridItem>
        <GridItem>Auto-fit 5</GridItem>
      </>
    ),
  },
};

export const ResponsiveCards: Story = {
  args: {
    columns: 'auto-fit',
    minColumnWidth: '250px',
    gap: 'medium',
    children: (
      <>
        <Card variant='interactive' hoverable>
          <div style={{ padding: '1.5rem' }}>
            <h3>Feature Card 1</h3>
            <p>This is a responsive card that adapts to screen size.</p>
          </div>
        </Card>
        <Card variant='interactive' hoverable>
          <div style={{ padding: '1.5rem' }}>
            <h3>Feature Card 2</h3>
            <p>Resize the viewport to see how the grid adapts.</p>
          </div>
        </Card>
        <Card variant='interactive' hoverable>
          <div style={{ padding: '1.5rem' }}>
            <h3>Feature Card 3</h3>
            <p>The minimum column width ensures readability.</p>
          </div>
        </Card>
        <Card variant='interactive' hoverable>
          <div style={{ padding: '1.5rem' }}>
            <h3>Feature Card 4</h3>
            <p>Perfect for dashboard layouts and content grids.</p>
          </div>
        </Card>
      </>
    ),
  },
};

export const SingleColumn: Story = {
  args: {
    columns: 1,
    children: (
      <>
        <GridItem>
          <h3>Single Column Layout</h3>
          <p>All items stack vertically in a single column.</p>
        </GridItem>
        <GridItem>
          <h3>Second Item</h3>
          <p>Useful for mobile layouts or narrow containers.</p>
        </GridItem>
        <GridItem>
          <h3>Third Item</h3>
          <p>Each item takes the full width available.</p>
        </GridItem>
      </>
    ),
  },
};
