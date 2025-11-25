import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, Sparkles, Loader2, Gamepad2, History, Eye } from 'lucide-react';
import { TRANSLATIONS } from './constants';
import { Language, GameGenre, GameHistoryItem, GameControl } from './types';
import LanguageSelector from './components/LanguageSelector';
import Footer from './components/Footer';
import GameDisplay from './components/GameDisplay';
import HistorySidebar from './components/HistorySidebar';
import PreviewModal from './components/PreviewModal';
import { generateGameCode, generateGamePreview } from './services/geminiService';

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>(Language.ENGLISH);
  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState<GameGenre>(GameGenre.ANY);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Current Active Game State
  const [activeGame, setActiveGame] = useState<{
    id: string;
    code: string;
    prompt: string;
    controls: GameControl[];
    rating?: number;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [history, setHistory] = useState<GameHistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  // Ref to hold the current prompt value for the interval to access without closure issues
  const promptRef = useRef(prompt);

  const t = TRANSLATIONS[language];
  const isRTL = language === Language.HEBREW;

  // Update ref whenever prompt changes
  useEffect(() => {
    promptRef.current = prompt;
  }, [prompt]);

  // Load saved prompt on mount
  useEffect(() => {
    const savedPrompt = localStorage.getItem('dr_game_prompt_autosave');
    if (savedPrompt) {
      setPrompt(savedPrompt);
    }
  }, []);

  // Auto-save prompt every 30 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      localStorage.setItem('dr_game_prompt_autosave', promptRef.current);
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, []);

  // Load history from local storage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('dr_game_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem('dr_game_history', JSON.stringify(history));
  }, [history]);

  const handlePreview = async () => {
    if (!prompt.trim()) return;
    setIsPreviewLoading(true);
    setError(null);
    try {
      const imageUrl = await generateGamePreview(prompt, genre);
      setPreviewImage(imageUrl);
      setShowPreview(true);
    } catch (err: any) {
      console.error(err);
      setError(t.error); // Or a specific preview error if you want
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    // Close preview if open
    setShowPreview(false);
    
    setIsLoading(true);
    setError(null);
    try {
      const { html: code, controls } = await generateGameCode(prompt, genre);
      
      const newGameId = crypto.randomUUID();
      
      setActiveGame({
        id: newGameId,
        code,
        prompt,
        controls,
        rating: 0
      });
      
      // Add to history
      const newItem: GameHistoryItem = {
        id: newGameId,
        timestamp: Date.now(),
        prompt: prompt,
        genre: genre,
        code: code,
        controls: controls,
        rating: 0
      };
      
      setHistory(prev => [newItem, ...prev]);

    } catch (err: any) {
      console.error(err);
      if (err.message === 'SAFETY_ERROR') {
        setError(t.errorSafety);
      } else {
        setError(t.error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRateGame = (rating: number) => {
    if (!activeGame) return;

    // Update active game UI
    setActiveGame(prev => prev ? { ...prev, rating } : null);

    // Update history storage
    setHistory(prev => prev.map(item => 
      item.id === activeGame.id ? { ...item, rating } : item
    ));
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleSelectHistoryItem = (item: GameHistoryItem) => {
    setActiveGame({
      id: item.id,
      code: item.code,
      prompt: item.prompt,
      controls: item.controls || [],
      rating: item.rating || 0
    });
    setIsHistoryOpen(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await readFile(file);
    }
  };

  const readFile = (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setPrompt((prev) => prev + (prev ? '\n\n' : '') + text);
        resolve();
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        await readFile(file);
      }
    }
  }, []);

  return (
    <div className={`min-h-screen flex flex-col bg-background text-slate-100 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* Navbar */}
      <nav className="w-full px-6 py-4 flex justify-between items-center bg-slate-900/50 backdrop-blur border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
            <Gamepad2 className="text-white" size={24} />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 tracking-tight hidden md:block">
            {t.title}
          </h1>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm font-medium"
          >
            <History size={18} />
            <span className="hidden md:inline">{t.openHistory}</span>
          </button>
          <LanguageSelector currentLanguage={language} onLanguageChange={setLanguage} />
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
        
        {/* Background Gradients */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[128px] pointer-events-none" />

        <div className="w-full max-w-3xl z-10 text-center space-y-8">
          
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight">
              {t.title}
            </h2>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
              {t.subtitle}
            </p>
          </div>

          <div 
            className={`
              relative group rounded-2xl p-1 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-800 
              focus-within:from-primary focus-within:to-secondary transition-all duration-300 shadow-2xl
              ${isDragOver ? 'ring-2 ring-primary scale-[1.02]' : ''}
            `}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <div className="bg-surface rounded-xl p-6 relative overflow-hidden">
              
              {/* Controls Header within box */}
              <div className="flex justify-between items-center mb-4">
                 <div className="text-xs text-slate-500 font-mono tracking-wide uppercase">AI Game Generator</div>
                 <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-400">{t.genreLabel}:</label>
                    <select 
                      value={genre}
                      onChange={(e) => setGenre(e.target.value as GameGenre)}
                      className="bg-slate-800 border border-slate-700 text-slate-200 rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-primary outline-none hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      {Object.values(GameGenre).map(g => (
                        <option key={g} value={g}>{t.genres[g]}</option>
                      ))}
                    </select>
                 </div>
              </div>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t.placeholder}
                className="w-full h-40 bg-transparent border-none resize-none focus:ring-0 text-slate-100 placeholder-slate-500 text-lg leading-relaxed scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
              />
              
              <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-700/50 pt-4">
                <div className="relative">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".txt,.md,.json,text/*"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
                  >
                    <Upload size={16} />
                    <span>{t.dragDrop} <span className="text-slate-600 px-1">{t.or}</span> <span className="underline decoration-slate-600 hover:decoration-white underline-offset-2">Click to upload</span></span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePreview}
                    disabled={isLoading || isPreviewLoading || !prompt.trim()}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700"
                  >
                    {isPreviewLoading ? <Loader2 className="animate-spin" size={20} /> : <Eye size={20} />}
                    <span className="hidden sm:inline">{t.previewBtn}</span>
                  </button>

                  <button
                    onClick={handleGenerate}
                    disabled={isLoading || !prompt.trim()}
                    className={`
                      flex items-center gap-2 px-8 py-3 rounded-lg font-bold text-white shadow-lg transition-all
                      ${isLoading || !prompt.trim() 
                        ? 'bg-slate-700 cursor-not-allowed opacity-50' 
                        : 'bg-gradient-to-r from-primary to-secondary hover:shadow-primary/25 hover:scale-105 active:scale-95'
                      }
                    `}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        {t.generating}
                      </>
                    ) : (
                      <>
                        <Sparkles size={20} />
                        {t.generateBtn}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            {isDragOver && (
              <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-dashed border-primary z-20 pointer-events-none">
                <div className="bg-background/80 p-4 rounded-xl text-primary font-bold shadow-xl">
                  Drop it like it's hot!
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-200 animate-in fade-in slide-in-from-top-2 text-left">
              <span className="font-bold block mb-1">Error:</span>
              {error}
            </div>
          )}
        </div>
      </main>

      <Footer t={t} />

      <HistorySidebar 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectGame={handleSelectHistoryItem}
        onDeleteGame={handleDeleteHistoryItem}
        t={t}
        isRTL={isRTL}
      />

      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        imageSrc={previewImage}
        onGenerate={handleGenerate}
        isLoading={isLoading}
        t={t}
      />

      {activeGame && (
        <GameDisplay 
          code={activeGame.code} 
          prompt={activeGame.prompt}
          gameId={activeGame.id}
          controls={activeGame.controls}
          rating={activeGame.rating}
          onClose={() => setActiveGame(null)} 
          onRate={handleRateGame}
          t={t}
          isRTL={isRTL}
        />
      )}
    </div>
  );
};

export default App;