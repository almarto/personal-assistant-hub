import { useLanguage } from '@personal-assistant-hub/i18n';
import React, { useState } from 'react';

import styles from './LanguageSelector.module.css';

export interface LanguageSelectorProps {}

export const LanguageSelector: React.FC<LanguageSelectorProps> = () => {
  const { switchLanguage, currentLanguage, availableLanguages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = (languageCode: string) => {
    switchLanguage(languageCode);
    setIsOpen(false);
  };

  const currentLang =
    availableLanguages.find(lang => lang.code === currentLanguage) ||
    availableLanguages[0];

  return (
    <div className={styles.container}>
      <button
        className={`${styles.button} ${isOpen ? styles.open : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.flag}>{currentLang.flag}</span>
      </button>
      {isOpen && (
        <div className={styles.dropdown}>
          {availableLanguages.map(lang => (
            <button
              key={lang.code}
              className={`${styles.dropdownItem} ${
                currentLanguage === lang.code ? styles.active : ''
              }`}
              onClick={() => handleLanguageChange(lang.code)}
            >
              <span className={styles.flag}>{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

LanguageSelector.displayName = 'LanguageSelector';
