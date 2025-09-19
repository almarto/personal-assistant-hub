import React from 'react';
import { Link } from 'react-router-dom';

import styles from './SimpleLayout.module.css';

interface SimpleLayoutProps {
  children: React.ReactNode;
}

export const SimpleLayout: React.FC<SimpleLayoutProps> = ({ children }) => {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.container}>
          <Link to='/' className={styles.logo}>
            Personal Assistant Hub
          </Link>
          <nav className={styles.nav}>
            <Link to='/dashboard' className={styles.navLink}>
              Dashboard
            </Link>
            <Link to='/auth' className={styles.navLink}>
              Iniciar Sesión
            </Link>
          </nav>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
};
