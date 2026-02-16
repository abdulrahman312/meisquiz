import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Globe } from 'lucide-react';

export const Footer: React.FC = () => {
  const { toggleLanguage, language } = useLanguage();
  
  return (
    <footer className="bg-white border-t border-slate-100 py-2 mt-auto" dir="ltr">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between gap-2">
        
        <div className="flex items-center gap-2">
          <img src="https://i.ibb.co/bgFrgXkW/meis.png" alt="MEIS Logo" className="w-5 h-5 opacity-80" />
          <div className="flex flex-col">
             <span className="text-[10px] md:text-xs font-bold text-slate-700 leading-tight">MEIS Staff Assessment Portall</span>
             <span className="text-[9px] md:text-[10px] text-slate-400 leading-tight">© {new Date().getFullYear()} All rights reserved</span>
          </div>
        </div>

        <button 
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors text-[10px] md:text-xs font-medium"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'English' : 'عربي'}</span>
        </button>

      </div>
    </footer>
  );
};