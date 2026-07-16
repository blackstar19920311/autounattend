import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { translations } from './translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem('app_lang') || 'hu';
    } catch (e) {
      return 'hu';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('app_lang', language);
    } catch (e) {}
  }, [language]);

  const t = useCallback((key) => {
    const dict = translations[language] || translations['hu'];
    return dict[key] || key;
  }, [language]);

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => prev === 'hu' ? 'en' : 'hu');
  }, []);

  const value = useMemo(() => ({ language, setLanguage, toggleLanguage, t }), [language, toggleLanguage, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  return useContext(LanguageContext);
};
