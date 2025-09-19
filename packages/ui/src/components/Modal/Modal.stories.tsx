import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { Button } from '../Button/Button';
import { Input } from '../Input/Input';

import { Modal } from './Modal';

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large', 'extraLarge'],
    },
    showCloseButton: {
      control: { type: 'boolean' },
    },
    closeOnOverlayClick: {
      control: { type: 'boolean' },
    },
    closeOnEscape: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Template component for interactive stories
const ModalTemplate = (args: typeof Default.args) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <Modal {...args} isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <p>This is the modal content. You can put any content here.</p>
      </Modal>
    </>
  );
};

export const Default: Story = {
  render: ModalTemplate,
  args: {
    title: 'Modal Title',
  },
};

export const WithFooter: Story = {
  render: (args: typeof Default.args) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
        <Modal
          {...args}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          footer={
            <>
              <Button variant='secondary' onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsOpen(false)}>Save</Button>
            </>
          }
        >
          <p>This modal has footer buttons.</p>
        </Modal>
      </>
    );
  },
  args: {
    title: 'Confirm Action',
  },
};

export const FormModal: Story = {
  render: (args: typeof Default.args) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Form Modal</Button>
        <Modal
          {...args}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          footer={
            <>
              <Button variant='secondary' onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsOpen(false)}>Submit</Button>
            </>
          }
        >
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <Input label='Name' placeholder='Enter your name' required />
            <Input
              label='Email'
              type='email'
              placeholder='Enter your email'
              required
            />
            <Input
              label='Message'
              placeholder='Enter your message'
              helperText='Optional message'
            />
          </div>
        </Modal>
      </>
    );
  },
  args: {
    title: 'Contact Form',
    size: 'medium',
  },
};

export const Small: Story = {
  render: ModalTemplate,
  args: {
    title: 'Small Modal',
    size: 'small',
  },
};

export const Large: Story = {
  render: ModalTemplate,
  args: {
    title: 'Large Modal',
    size: 'large',
  },
};

export const ExtraLarge: Story = {
  render: ModalTemplate,
  args: {
    title: 'Extra Large Modal',
    size: 'extraLarge',
  },
};

export const NoCloseButton: Story = {
  render: ModalTemplate,
  args: {
    title: 'No Close Button',
    showCloseButton: false,
  },
};

export const NoOverlayClose: Story = {
  render: ModalTemplate,
  args: {
    title: 'Click Overlay to Close Disabled',
    closeOnOverlayClick: false,
  },
};
