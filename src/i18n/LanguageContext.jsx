import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { translations } from './translations';
import { extraTranslations } from './extraTranslations';

const LanguageContext = createContext();

// Az extra fordítások CSAK a hiányzó kulcsokat pótolják – a translations.js
// meglévő bejegyzései elsőbbséget kapnak.
const DICTIONARIES = {
  hu: { ...(extraTranslations.hu || {}), ...(translations.hu || {}) },
  en: { ...(extraTranslations.en || {}), ...(translations.en || {}) },
};

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
    // Tartsuk szinkronban a dokumentum nyelvét a választott nyelvvel.
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = useCallback(
    (key) => {
      const dict = DICTIONARIES[language] || DICTIONARIES.hu;
      const value = dict[key];
      if (value === undefined && import.meta.env?.DEV) {
        console.warn(`[i18n] Hiányzó fordítási kulcs: ${key}`);
      }
      return value ?? key;
    },
    [language]
  );

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === 'hu' ? 'en' : 'hu'));
  }, []);

  const value = useMemo(() => ({ language, setLanguage, toggleLanguage, t }), [language, toggleLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => {
  return useContext(LanguageContext);
};
