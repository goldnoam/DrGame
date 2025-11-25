import React from 'react';
import { Globe } from 'lucide-react';
import { Language } from '../types';

interface LanguageSelectorProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ currentLanguage, onLanguageChange }) => {
  return (
    <div className="relative group">
      <button className="flex items-center space-x-2 bg-surface hover:bg-slate-700 transition-colors px-3 py-2 rounded-lg text-sm font-medium border border-slate-700">
        <Globe size={18} className="text-secondary" />
        <span className="uppercase">{currentLanguage}</span>
      </button>
      <div className="absolute right-0 mt-2 w-48 bg-surface border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <div className="py-1">
          {Object.values(Language).map((lang) => (
            <button
              key={lang}
              onClick={() => onLanguageChange(lang)}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-slate-700 ${
                currentLanguage === lang ? 'text-secondary font-bold' : 'text-slate-300'
              }`}
            >
              {lang === Language.ENGLISH && "English"}
              {lang === Language.HEBREW && "עברית (Hebrew)"}
              {lang === Language.CHINESE && "中文 (Chinese)"}
              {lang === Language.HINDI && "हिन्दी (Hindi)"}
              {lang === Language.FRENCH && "Français (French)"}
              {lang === Language.GERMAN && "Deutsch (German)"}
              {lang === Language.RUSSIAN && "Русский (Russian)"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LanguageSelector;