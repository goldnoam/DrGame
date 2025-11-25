import React, { useState } from 'react';
import { X, Play, Trash2, Clock, FileText, Copy, Check, Star, AlertTriangle } from 'lucide-react';
import { Translation, GameHistoryItem } from '../types';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  history: GameHistoryItem[];
  onSelectGame: (game: GameHistoryItem) => void;
  onDeleteGame: (id: string) => void;
  t: Translation;
  isRTL: boolean;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ 
  isOpen, 
  onClose, 
  history, 
  onSelectGame, 
  onDeleteGame, 
  t,
  isRTL
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <div 
        className={`fixed top-0 bottom-0 z-50 w-full md:w-96 bg-slate-900 border-x border-slate-700 shadow-2xl transition-transform duration-300 ease-in-out transform ${
          isOpen 
            ? 'translate-x-0' 
            : isRTL ? 'translate-x-full' : 'translate-x-full' 
        } ${isRTL ? 'left-0' : 'right-0'}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Clock size={20} className="text-primary" />
              {t.historyTitle}
            </h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {history.length === 0 ? (
              <div className="text-center text-slate-500 mt-10">
                <FileText size={48} className="mx-auto mb-4 opacity-20" />
                <p>{t.historyEmpty}</p>
              </div>
            ) : (
              history.map((item) => (
                <div 
                  key={item.id}
                  className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-primary/50 transition-all group relative overflow-hidden"
                >
                  {/* Item Content */}
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-mono text-secondary px-2 py-0.5 bg-secondary/10 rounded">
                      {t.genres[item.genre]}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <p className="text-sm text-slate-300 mb-2 line-clamp-2 font-medium">
                    {item.prompt}
                  </p>

                  {/* Rating Display in History */}
                  <div className="flex items-center gap-1 mb-4 h-4">
                    {item.rating && item.rating > 0 ? (
                      Array.from({ length: 5 }).map((_, i) => (
                         <Star 
                           key={i} 
                           size={12} 
                           className={`${i < item.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-slate-700'}`} 
                         />
                      ))
                    ) : (
                      <span className="text-xs text-slate-600 italic">Unrated</span>
                    )}
                  </div>

                  {/* Actions / Confirmation */}
                  {deleteConfirmId === item.id ? (
                    <div className="flex items-center justify-between bg-red-900/20 p-2 rounded border border-red-500/30 animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex items-center text-xs text-red-200 font-medium">
                         <AlertTriangle size={14} className="mr-1.5" />
                         {t.confirmDelete}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteGame(item.id);
                            setDeleteConfirmId(null);
                          }}
                          className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition-colors"
                        >
                          {t.delete}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(null);
                          }}
                          className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded transition-colors"
                        >
                          {t.cancel}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onSelectGame(item)}
                        className="flex-1 flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary text-sm py-2 rounded transition-colors font-semibold"
                      >
                        <Play size={16} />
                        {t.play}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(item.prompt, item.id);
                        }}
                        className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                        title={copiedId === item.id ? t.copied : t.copyPrompt}
                      >
                         {copiedId === item.id ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(item.id);
                        }}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                        title={t.delete}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default HistorySidebar;