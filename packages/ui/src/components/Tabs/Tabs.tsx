import React, { ReactNode } from 'react';

import styles from './Tabs.module.css';

export interface TabItem {
  id: string;
  label: string;
  content?: ReactNode;
}

export interface TabsProps {
  /**
   * Array of tab items
   */
  items: TabItem[];
  /**
   * Currently active tab ID
   */
  activeTab: string;
  /**
   * Callback when tab is changed
   */
  onTabChange: (tabId: string) => void;
  /**
   * Additional CSS class
   */
  className?: string;
  /**
   * Size variant
   */
  size?: 'small' | 'medium' | 'large';
  /**
   * Style variant
   */
  variant?: 'default' | 'pills' | 'underline';
}

/**
 * Tabs component for navigation between different content sections
 */
export const Tabs: React.FC<TabsProps> = ({
  items,
  activeTab,
  onTabChange,
  className,
  size = 'medium',
  variant = 'default',
}) => {
  const tabsClasses = [styles.tabs, styles[size], styles[variant], className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={tabsClasses}>
      <div className={styles.tabList} role='tablist'>
        {items.map(item => (
          <button
            key={item.id}
            type='button'
            role='tab'
            aria-selected={activeTab === item.id}
            aria-controls={`tabpanel-${item.id}`}
            className={`${styles.tab} ${
              activeTab === item.id ? styles.active : ''
            }`}
            onClick={() => onTabChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {items.map(item => (
        <div
          key={item.id}
          id={`tabpanel-${item.id}`}
          role='tabpanel'
          aria-labelledby={`tab-${item.id}`}
          className={`${styles.tabPanel} ${
            activeTab === item.id ? styles.active : styles.hidden
          }`}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
};
