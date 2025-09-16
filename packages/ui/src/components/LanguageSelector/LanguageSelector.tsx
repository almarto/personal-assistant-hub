import { useLanguage } from '@personal-assistant-hub/i18n';
import React, { useState } from 'react';

import './LanguageSelector.module.css';

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
    <div className={'container'}>
      <button
        className={`button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={'flag'}>{currentLang.flag}</span>
      </button>
      {isOpen && (
        <div className={'dropdown'}>
          {availableLanguages.map(lang => (
            <button
              key={lang.code}
              className={`dropdownItem ${
                currentLanguage === lang.code ? 'active' : ''
              }`}
              onClick={() => handleLanguageChange(lang.code)}
            >
              <span className={'flag'}>{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

LanguageSelector.displayName = 'LanguageSelector';
