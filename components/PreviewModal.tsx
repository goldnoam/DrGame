import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { Translation } from '../types';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  onGenerate: () => void;
  isLoading: boolean;
  t: Translation;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ isOpen, onClose, imageSrc, onGenerate, isLoading, t }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoaded(false);
    }
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-4xl bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-700 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-20 pointer-events-none">
          <h3 className="text-white font-bold text-lg drop-shadow-md">{t.previewTitle}</h3>
          <button 
            onClick={onClose}
            className="pointer-events-auto p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Image Container */}
        <div className="aspect-video w-full bg-slate-950 flex items-center justify-center relative overflow-hidden group">
          
          {/* Loading Indicator */}
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-600">
              <Loader2 className="animate-spin" size={48} />
            </div>
          )}

          {/* Image with Fade-in and Hover Effect */}
          <img 
            src={imageSrc} 
            alt="Game Preview" 
            onLoad={() => setIsLoaded(true)}
            className={`
              w-full h-full object-contain transition-all duration-700 ease-out transform
              ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
              group-hover:scale-105
            `}
          />

          {/* Overlay Gradient */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent z-10">
             <p className="text-slate-200 text-sm text-center font-medium drop-shadow-md transform translate-y-0 transition-transform duration-300 group-hover:-translate-y-1">
               {t.previewSubtitle}
             </p>
          </div>
        </div>

        {/* Footer / Actions */}
        <div className="p-6 bg-slate-800 border-t border-slate-700 flex justify-end gap-3 z-20">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors font-medium"
          >
            {t.closePreview}
          </button>
          <button
            onClick={onGenerate}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white rounded-lg font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles size={18} />
            {t.generateFromPreview}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;