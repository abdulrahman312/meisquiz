import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../translations';

type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: keyof typeof translations['en']) => string;
  formatNumber: (num: number) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to Arabic
  const [language, setLanguage] = useState<Language>('ar');

  useEffect(() => {
    // Update document direction and lang attribute
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    
    // Update Body Font Family
    if (language === 'ar') {
      document.body.classList.add('font-arabic');
      document.body.classList.remove('font-sans');
    } else {
      document.body.classList.add('font-sans');
      document.body.classList.remove('font-arabic');
    }
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'ar' ? 'en' : 'ar');
  };

  const t = (key: keyof typeof translations['en']) => {
    return translations[language][key] || key;
  };

  const formatNumber = (num: number) => {
    if (language === 'en') return num.toString();
    return num.toString().replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t, formatNumber, isRTL: language === 'ar' }}>
      {children}
    </LanguageContext.Provider>
  );
};