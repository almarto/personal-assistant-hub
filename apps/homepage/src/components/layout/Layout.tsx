import React from 'react';
import { Outlet } from 'react-router-dom';

import { Header } from './Header';
import styles from './Layout.module.css';
import { Sidebar } from './Sidebar';

export const Layout: React.FC = () => {
  return (
    <div className={styles.layout}>
      <Header />
      <div className={styles.main}>
        <Sidebar />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
