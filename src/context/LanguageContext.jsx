import React, { createContext, useState, useEffect } from 'react';
import en from '../locales/en.json';
import es from '../locales/es.json';

export const LanguageContext = createContext();

const translations = { en, es };

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('app-language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('app-language', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'es' : 'en'));
  };

  const t = (key, fallbackOrParams = {}) => {
    if (!key) return '';

    const getFromObj = (obj, path) => {
      const parts = path.split('.');
      let cur = obj;
      for (const p of parts) {
        if (!cur) return undefined;
        cur = cur[p];
      }
      return cur;
    };

    const toCamel = (str) => str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const toKebab = (str) => str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

    // 1. Try exact key in active language
    let val = getFromObj(translations[language], key);

    // 2. Try camelCase key version in active language
    if (val === undefined) {
      const camelKey = key.split('.').map(toCamel).join('.');
      val = getFromObj(translations[language], camelKey);
    }

    // 3. Try kebab-case key version in active language
    if (val === undefined) {
      const kebabKey = key.split('.').map(toKebab).join('.');
      val = getFromObj(translations[language], kebabKey);
    }

    // 4. Fallback to English (exact, camelCase, kebab-case)
    if (val === undefined) {
      val = getFromObj(translations['en'], key) ||
            getFromObj(translations['en'], key.split('.').map(toCamel).join('.')) ||
            getFromObj(translations['en'], key.split('.').map(toKebab).join('.'));
    }

    // 5. If still undefined, use fallback string or key
    if (val === undefined) {
      if (typeof fallbackOrParams === 'string') {
        val = fallbackOrParams;
      } else {
        val = key;
      }
    }

    if (typeof val === 'string' && fallbackOrParams && typeof fallbackOrParams === 'object') {
      return Object.entries(fallbackOrParams).reduce(
        (acc, [k, v]) => acc.replace(new RegExp(`{\\s*${k}\\s*}`, 'g'), v !== undefined ? v : ''),
        val
      );
    }

    return val;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
