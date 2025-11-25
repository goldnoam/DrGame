import React from 'react';
import { Translation } from '../types';

interface FooterProps {
  t: Translation;
}

const Footer: React.FC<FooterProps> = ({ t }) => {
  return (
    <footer className="w-full py-6 mt-12 border-t border-slate-800 bg-slate-950/50 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-slate-500 text-sm gap-4">
        <div className="font-medium">{t.copyright}</div>
        <a 
          href="mailto:gold.noam@gmail.com" 
          className="hover:text-secondary transition-colors flex items-center gap-2"
        >
          {t.feedback}
        </a>
      </div>
    </footer>
  );
};

export default Footer;