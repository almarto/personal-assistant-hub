import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

import styles from './Modal.module.css';

export interface ModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;
  /**
   * Function to call when the modal should be closed
   */
  onClose: () => void;
  /**
   * The title of the modal
   */
  title?: string;
  /**
   * The size of the modal
   */
  size?: 'small' | 'medium' | 'large' | 'extraLarge';
  /**
   * Whether to show the close button
   */
  showCloseButton?: boolean;
  /**
   * Whether clicking the overlay should close the modal
   */
  closeOnOverlayClick?: boolean;
  /**
   * Whether pressing escape should close the modal
   */
  closeOnEscape?: boolean;
  /**
   * The content of the modal
   */
  children: React.ReactNode;
  /**
   * Footer content (typically buttons)
   */
  footer?: React.ReactNode;
}

/**
 * Modal component for displaying content in an overlay
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'medium',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  children,
  footer,
}) => {
  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  const modalClasses = [styles.modal, styles[size]].filter(Boolean).join(' ');

  const modalContent = (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={modalClasses} role='dialog' aria-modal='true'>
        {(title || showCloseButton) && (
          <div className={styles.header}>
            {title && <h2 className={styles.title}>{title}</h2>}
            {showCloseButton && (
              <button
                className={styles.closeButton}
                onClick={onClose}
                aria-label='Close modal'
              >
                <svg
                  width='24'
                  height='24'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                >
                  <line x1='18' y1='6' x2='6' y2='18'></line>
                  <line x1='6' y1='6' x2='18' y2='18'></line>
                </svg>
              </button>
            )}
          </div>
        )}
        <div className={styles.content}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

Modal.displayName = 'Modal';
