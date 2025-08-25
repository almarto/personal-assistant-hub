import React from 'react';

import styles from './Header.module.css';

export const Header: React.FC = () => {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <h1>Personal Assistant Hub</h1>
        </div>
        <nav className={styles.nav}>
          <button className={styles.profileButton}>Profile</button>
        </nav>
      </div>
    </header>
  );
};
