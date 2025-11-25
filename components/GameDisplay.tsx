
import React, { useEffect, useRef, useState } from 'react';
import { X, Maximize2, Minimize2, Share2, Check, Star, Gamepad2, MousePointer2, MousePointerClick, ArrowUp, Download, Pencil, RefreshCw, RotateCcw, FileCode, Save, Upload, Volume2, Music } from 'lucide-react';
import { Translation, GameControl } from '../types';

interface GameDisplayProps {
  code: string;
  prompt: string;
  gameId?: string; 
  controls?: GameControl[];
  rating?: number;
  onClose: () => void;
  onRate?: (rating: number) => void;
  onSave?: (id: string, code: string) => void;
  t: Translation;
  isRTL: boolean;
}

// Helper component for keyboard keys
interface KeyCapProps {
  children?: React.ReactNode;
  className?: string;
}

const KeyCap: React.FC<KeyCapProps> = ({ children, className = "" }) => (
  <div className={`
    flex items-center justify-center 
    bg-slate-700 border-t border-x border-slate-600 border-b-4 border-b-slate-900 
    rounded-md text-slate-100 font-mono font-bold shadow-lg select-none
    transition-all duration-200
    active:translate-y-1 active:border-b-0
    ${className}
  `}>
    {children}
  </div>
);

const GameDisplay: React.FC<GameDisplayProps> = ({ 
  code, 
  prompt, 
  gameId,
  controls = [], 
  rating: initialRating = 0,
  onClose, 
  onRate,
  onSave,
  t,
  isRTL
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showCopied, setShowCopied] = useState(false);
  const [showDownloaded, setShowDownloaded] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [currentRating, setCurrentRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  
  // New States for Actions
  const [showCodeCopied, setShowCodeCopied] = useState(false);
  const [showStateSaved, setShowStateSaved] = useState(false);
  const [showStateLoaded, setShowStateLoaded] = useState(false);
  const [showNoState, setShowNoState] = useState(false);

  // Editor State
  const [editableConfig, setEditableConfig] = useState<Record<string, any>>({});
  const [currentGameCode, setCurrentGameCode] = useState(code);

  useEffect(() => {
    setCurrentRating(initialRating || 0);
  }, [initialRating]);

  // Extract Config when code changes or modal opens
  useEffect(() => {
    // Attempt to extract window.GAME_CONFIG = { ... }
    const match = currentGameCode.match(/window\.GAME_CONFIG\s*=\s*(\{[\s\S]*?\});/);
    if (match && match[1]) {
      try {
        // Use Function constructor to safely evaluate the object literal (handles unquoted keys etc if strict JSON parse fails)
        // Note: In a production app, robust parsing is better, but this handles JS object notation best.
        // eslint-disable-next-line
        const config = new Function(`return ${match[1]}`)(); 
        setEditableConfig(config);
      } catch (e) {
        console.warn("Failed to parse GAME_CONFIG", e);
      }
    }
  }, [currentGameCode]);

  useEffect(() => {
    setIsIframeLoaded(false);
    if (iframeRef.current && currentGameCode) {
      const blob = new Blob([currentGameCode], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      iframeRef.current.src = url;

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [currentGameCode, refreshKey]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([currentGameCode], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dr-game-${gameId || Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setShowDownloaded(true);
      setTimeout(() => setShowDownloaded(false), 2000);
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  // Deprecated in favor of Quick Save for state, but kept if needed for props
  const handleSave = () => {
    if (onSave && gameId) {
      onSave(gameId, currentGameCode);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    }
  };

  const handleShare = async () => {
    const shareText = `Check out this game I created with Dr. Game AI!\n\nPrompt: ${prompt}`;
    const fileName = `dr-game-${gameId || Date.now()}.html`;
    const blob = new Blob([currentGameCode], { type: 'text/html' });
    const file = new File([blob], fileName, { type: 'text/html' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Dr. Game Creation',
          text: shareText,
        });
        return;
      } catch (err) {
        console.log('File share cancelled or failed', err);
      }
    } else if (navigator.share) {
       try {
        await navigator.share({
          title: 'Dr. Game Creation',
          text: shareText,
        });
        return;
      } catch (err) {
        console.log('Text share cancelled or failed', err);
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
      
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
      window.open(twitterUrl, '_blank');
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleRate = (score: number) => {
    setCurrentRating(score);
    if (onRate) onRate(score);
  };

  const handleConfigChange = (key: string, value: any) => {
    setEditableConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const applyConfigChanges = () => {
    try {
      // Re-serialize the config object to JSON
      const newConfigStr = JSON.stringify(editableConfig, null, 2);
      
      // Regex replace the old config in the code
      // We look for window.GAME_CONFIG = { ... }; 
      const newCode = currentGameCode.replace(
        /window\.GAME_CONFIG\s*=\s*(\{[\s\S]*?\});/, 
        `window.GAME_CONFIG = ${newConfigStr};`
      );
      
      setCurrentGameCode(newCode);
      
      // Reload iframe essentially happens via useEffect on currentGameCode change
    } catch (e) {
      console.error("Failed to apply config", e);
    }
  };

  const handleReset = () => {
    if (iframeRef.current?.contentWindow) {
      const win = iframeRef.current.contentWindow as any;
      try {
        if (typeof win.initGame === 'function') {
           win.initGame();
        } else {
           // If initGame missing, force hard reload
           setRefreshKey(k => k + 1);
        }
      } catch (e) {
         setRefreshKey(k => k + 1);
      }
    } else {
       setRefreshKey(k => k + 1);
    }
  };

  // --- New Action Handlers ---

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentGameCode)
      .then(() => {
        setShowCodeCopied(true);
        setTimeout(() => setShowCodeCopied(false), 2000);
      })
      .catch(err => {
        console.error("Failed to copy code to clipboard", err);
      });
  };

  const handleQuickSave = () => {
    if (!gameId) return;
    try {
      // Use gameId to save state specific to this game
      localStorage.setItem(`dr_game_state_${gameId}`, currentGameCode);
      setShowStateSaved(true);
      setTimeout(() => setShowStateSaved(false), 2000);
    } catch (e) {
      console.error("Failed to save state", e);
    }
  };

  const handleQuickLoad = () => {
    if (!gameId) return;
    const savedCode = localStorage.getItem(`dr_game_state_${gameId}`);
    if (savedCode) {
      setCurrentGameCode(savedCode);
      setShowStateLoaded(true);
      setTimeout(() => setShowStateLoaded(false), 2000);
    } else {
      setShowNoState(true);
      setTimeout(() => setShowNoState(false), 2000);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const renderControlIcon = (control: GameControl) => {
    switch (control.icon) {
      case 'wasd':
        return (
          <div className="flex flex-col items-center gap-1.5 p-1 group-hover:scale-110 group-hover:drop-shadow-lg transition-all duration-200">
             <KeyCap className="w-8 h-8 text-sm group-hover:bg-slate-600 transition-colors">W</KeyCap>
             <div className="flex gap-1.5">
               <KeyCap className="w-8 h-8 text-sm group-hover:bg-slate-600 transition-colors">A</KeyCap>
               <KeyCap className="w-8 h-8 text-sm group-hover:bg-slate-600 transition-colors">S</KeyCap>
               <KeyCap className="w-8 h-8 text-sm group-hover:bg-slate-600 transition-colors">D</KeyCap>
             </div>
          </div>
        );
      case 'arrows':
        return (
          <div className="flex flex-col items-center gap-1.5 p-1 group-hover:scale-110 group-hover:drop-shadow-lg transition-all duration-200">
             <KeyCap className="w-8 h-8 group-hover:bg-slate-600 transition-colors"><ArrowUp size={16} /></KeyCap>
             <div className="flex gap-1.5">
               <KeyCap className="w-8 h-8 group-hover:bg-slate-600 transition-colors"><ArrowUp size={16} className="-rotate-90" /></KeyCap>
               <KeyCap className="w-8 h-8 group-hover:bg-slate-600 transition-colors"><ArrowUp size={16} className="rotate-180" /></KeyCap>
               <KeyCap className="w-8 h-8 group-hover:bg-slate-600 transition-colors"><ArrowUp size={16} className="rotate-90" /></KeyCap>
             </div>
          </div>
        );
      case 'space':
        return <KeyCap className="h-8 w-24 text-xs uppercase tracking-wider group-hover:scale-105 group-hover:shadow-primary/50 transition-all duration-200">{t.controlIcons.space}</KeyCap>;
      case 'mouse':
        return (
          <div className="w-12 h-12 flex items-center justify-center bg-slate-800 rounded-xl border border-slate-600 shadow-md group-hover:scale-110 group-hover:border-primary/50 group-hover:shadow-lg transition-all duration-200">
             <MousePointer2 size={24} className="text-primary animate-pulse" />
          </div>
        );
      case 'click':
        return (
          <div className="w-12 h-12 flex items-center justify-center bg-slate-800 rounded-xl border border-slate-600 shadow-md relative group-hover:scale-110 group-hover:border-secondary/50 group-hover:shadow-lg transition-all duration-200">
             <MousePointerClick size={24} className="text-secondary" />
             <span className="absolute -top-1 -right-1 flex h-3 w-3">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
               <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary"></span>
             </span>
          </div>
        );
      default:
        return <KeyCap className="h-8 min-w-[32px] px-2 text-xs uppercase group-hover:scale-105 group-hover:shadow-primary/50 transition-all duration-200">{control.keyName || "?"}</KeyCap>;
    }
  };

  // Helper to determine input type
  const renderEditorInput = (key: string, value: any) => {
    const type = typeof value;
    const lowerKey = key.toLowerCase();
    
    // Volume Controls (Range Slider)
    if (type === 'number' && (lowerKey.includes('volume') || lowerKey.includes('gain'))) {
       return (
         <div className="flex items-center gap-2">
           <Volume2 size={16} className="text-slate-400" />
           <input 
             type="range" 
             min="0" 
             max="1" 
             step="0.05"
             value={value} 
             onChange={(e) => handleConfigChange(key, parseFloat(e.target.value))}
             className="flex-1 accent-primary h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
           />
           <span className="text-xs font-mono w-8 text-right text-slate-300">{(value * 100).toFixed(0)}%</span>
         </div>
       );
    }

    // Sound Type (Dropdown)
    if (type === 'string' && (lowerKey.includes('type') && (lowerKey.includes('sound') || lowerKey.includes('wave')))) {
       return (
        <div className="flex items-center gap-2">
          <Music size={16} className="text-slate-400" />
          <select 
            value={value} 
            onChange={(e) => handleConfigChange(key, e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="sine">Sine (Smooth)</option>
            <option value="square">Square (Retro)</option>
            <option value="sawtooth">Sawtooth (Sharp)</option>
            <option value="triangle">Triangle (Mellow)</option>
          </select>
        </div>
       );
    }
    
    if (type === 'number') {
      return (
        <input 
          type="number" 
          value={value} 
          onChange={(e) => handleConfigChange(key, parseFloat(e.target.value))}
          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-primary"
        />
      );
    }
    
    if (type === 'boolean') {
      return (
        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            checked={value} 
            onChange={(e) => handleConfigChange(key, e.target.checked)}
            className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-primary focus:ring-primary cursor-pointer"
          />
          <span className="text-sm text-slate-400">{value ? 'Enabled' : 'Disabled'}</span>
        </div>
      );
    }
    
    if (type === 'string') {
      // Color picker heuristic
      if (value.startsWith('#') && (value.length === 4 || value.length === 7)) {
        return (
          <div className="flex gap-2">
             <input 
              type="color" 
              value={value} 
              onChange={(e) => handleConfigChange(key, e.target.value)}
              className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
            />
            <input 
              type="text" 
              value={value} 
              onChange={(e) => handleConfigChange(key, e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white font-mono"
            />
          </div>
        );
      }
      return (
        <input 
          type="text" 
          value={value} 
          onChange={(e) => handleConfigChange(key, e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
        />
      );
    }

    if (Array.isArray(value) || type === 'object') {
       return (
        <textarea
          value={JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              handleConfigChange(key, JSON.parse(e.target.value));
            } catch (err) {
              // Allow typing invalid JSON temporarily
            }
          }}
          className="w-full h-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-300"
        />
       );
    }

    return null;
  };

  const getGroupedConfig = () => {
    const soundKeys = Object.keys(editableConfig).filter(k => 
      k.toLowerCase().includes('sound') || 
      k.toLowerCase().includes('music') || 
      k.toLowerCase().includes('volume') || 
      k.toLowerCase().includes('audio')
    );
    
    const gameKeys = Object.keys(editableConfig).filter(k => !soundKeys.includes(k));
    
    return { soundKeys, gameKeys };
  };

  const { soundKeys, gameKeys } = getGroupedConfig();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-fade-in">
      <div 
        ref={containerRef}
        className={`bg-black relative rounded-xl shadow-2xl overflow-hidden flex flex-col ${
          isFullscreen ? 'w-full h-full' : 'w-full max-w-5xl aspect-video'
        }`}
      >
        {/* Header/Controls */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/90 to-transparent flex items-center justify-between px-4 z-20 opacity-0 hover:opacity-100 transition-opacity duration-300 overflow-x-auto scrollbar-thin">
          <div className="flex items-center gap-4 flex-shrink-0">
             <span className="text-white/80 font-mono text-sm shadow-black drop-shadow-md hidden lg:block">{t.gameReady}</span>
             
             {/* Rating System */}
             {onRate && (
               <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                  <span className="text-xs text-slate-400 mr-2 hidden sm:inline">{t.rateGame}:</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRate(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="focus:outline-none transition-transform hover:scale-110 p-0.5"
                      aria-label={`Rate ${star} stars`}
                      title={`Rate ${star} stars`}
                    >
                      <Star 
                        size={16} 
                        className={`${
                          star <= (hoverRating || currentRating) 
                            ? 'fill-yellow-400 text-yellow-400' 
                            : 'text-slate-600'
                        } transition-colors`} 
                      />
                    </button>
                  ))}
               </div>
             )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
             {/* Copy Code Button */}
             <button
              onClick={handleCopyCode}
              className="group relative p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-sm transition-all"
              title={t.copyCode}
              aria-label={t.copyCode}
            >
              {showCodeCopied ? <Check size={20} className="text-green-400" /> : <FileCode size={20} />}
              {showCodeCopied && (
                <div className="absolute top-full right-0 mt-3 px-3 py-1.5 bg-green-500/90 text-white text-xs font-bold rounded shadow-lg whitespace-nowrap z-50 animate-in fade-in slide-in-from-top-1">
                  {t.codeCopied}
                </div>
              )}
            </button>

            {/* Save Game State (Using Quick Save Key) */}
            <button
              onClick={handleQuickSave}
              className="group relative p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-sm transition-all"
              title={t.quickSaveTooltip}
              aria-label={t.quickSave}
            >
              {showStateSaved ? <Check size={20} className="text-green-400" /> : <Save size={20} />}
              {showStateSaved && (
                <div className="absolute top-full right-0 mt-3 px-3 py-1.5 bg-blue-500/90 text-white text-xs font-bold rounded shadow-lg whitespace-nowrap z-50 animate-in fade-in slide-in-from-top-1">
                  {t.stateSaved}
                </div>
              )}
            </button>

             {/* Load Game State (Using Quick Load Key) */}
            <button
              onClick={handleQuickLoad}
              className="group relative p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-sm transition-all"
              title={t.quickLoadTooltip}
              aria-label={t.quickLoad}
            >
              {showStateLoaded ? <Check size={20} className="text-green-400" /> : <Upload size={20} />}
              {showStateLoaded && (
                <div className="absolute top-full right-0 mt-3 px-3 py-1.5 bg-blue-500/90 text-white text-xs font-bold rounded shadow-lg whitespace-nowrap z-50 animate-in fade-in slide-in-from-top-1">
                  {t.stateLoaded}
                </div>
              )}
              {showNoState && (
                <div className="absolute top-full right-0 mt-3 px-3 py-1.5 bg-red-600/90 text-white text-xs font-bold rounded shadow-lg whitespace-nowrap z-50 animate-in fade-in slide-in-from-top-1">
                  {t.noSavedState}
                </div>
              )}
            </button>


            {/* Editor Button */}
            {Object.keys(editableConfig).length > 0 && (
              <button
                onClick={() => {
                  setShowEditor(!showEditor);
                  setShowControls(false); // Close controls if opening editor
                }}
                className={`p-2 rounded-full backdrop-blur-sm transition-all ${showEditor ? 'bg-secondary/50 text-white' : 'bg-black/40 text-white/80 hover:bg-black/60'}`}
                title={t.editGame}
                aria-label={t.editGame}
              >
                <Pencil size={20} />
              </button>
            )}
            
            <button
              onClick={handleReset}
              className="p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-sm transition-all"
              title={t.reset}
              aria-label={t.reset}
            >
              <RotateCcw size={20} />
            </button>

             <button
              onClick={() => {
                setShowControls(!showControls);
                setShowEditor(false);
              }}
              className={`p-2 rounded-full backdrop-blur-sm transition-all ${showControls ? 'bg-primary/50 text-white' : 'bg-black/40 text-white/80 hover:bg-black/60'}`}
              title={t.controls}
              aria-label={t.controls}
            >
              <Gamepad2 size={20} />
            </button>

             <button
              onClick={handleDownload}
              className="group relative p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-sm transition-all"
              title={t.download}
              aria-label={t.download}
            >
              {showDownloaded ? <Check size={20} className="text-green-400" /> : <Download size={20} />}
              {showDownloaded && (
                <div className="absolute top-full right-0 mt-3 px-3 py-1.5 bg-black/80 text-white text-xs font-bold rounded shadow-lg whitespace-nowrap z-50 animate-in fade-in slide-in-from-top-1">
                  {t.downloadSuccess}
                </div>
              )}
            </button>

            <button
              onClick={handleShare}
              className="group relative p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-sm transition-all"
              title={t.share}
              aria-label={t.share}
            >
              {showCopied ? <Check size={20} className="text-green-400" /> : <Share2 size={20} />}
              
              {showCopied && (
                <div className="absolute top-full right-0 mt-3 px-3 py-1.5 bg-black/80 text-white text-xs font-bold rounded shadow-lg whitespace-nowrap z-50 animate-in fade-in slide-in-from-top-1">
                  {t.shareSuccess}
                </div>
              )}
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-sm transition-all"
              title={t.fullscreen}
              aria-label={t.fullscreen}
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-red-400 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-sm transition-all"
              title={t.close}
              aria-label={t.close}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Level Editor Sidebar */}
        {showEditor && (
          <div className={`absolute top-16 bottom-4 ${isRTL ? 'right-4' : 'left-4'} z-30 w-80 bg-slate-950/90 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl flex flex-col animate-in fade-in slide-in-from-left-4 overflow-hidden`}>
             <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
               <h3 className="text-white font-bold flex items-center gap-2">
                 <Pencil size={16} className="text-secondary" />
                 {t.editorTitle}
               </h3>
               <button onClick={() => setShowEditor(false)} className="text-slate-400 hover:text-white" aria-label={t.close}>
                 <X size={16} />
               </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 space-y-6">
                
                {/* Sound Settings Section */}
                {soundKeys.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 border-b border-slate-800 pb-1">
                      <Volume2 size={12} />
                      {t.soundSettings}
                    </h4>
                    {soundKeys.map(key => (
                      <div key={key} className="space-y-1">
                         <label className="text-xs text-slate-300 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                         {renderEditorInput(key, editableConfig[key])}
                      </div>
                    ))}
                  </div>
                )}

                {/* Game Settings Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 pb-1">Game Settings</h4>
                  {gameKeys.map(key => (
                    <div key={key} className="space-y-1">
                      <label className="text-xs text-slate-300 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                      {renderEditorInput(key, editableConfig[key])}
                    </div>
                  ))}
                </div>

             </div>

             <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex gap-2">
                <button 
                  onClick={applyConfigChanges}
                  className="flex-1 flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/90 text-white py-2 rounded-lg text-sm font-bold transition-colors"
                >
                  <RefreshCw size={16} />
                  {t.apply}
                </button>
             </div>
          </div>
        )}

        {/* Controls Overlay */}
        {showControls && controls.length > 0 && !showEditor && (
          <div className={`absolute top-20 ${isRTL ? 'left-4' : 'right-4'} z-10 w-72 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-4 shadow-2xl animate-in fade-in slide-in-from-right-4 pointer-events-none md:pointer-events-auto`}>
             <h3 className="text-white font-bold text-sm mb-4 flex items-center justify-between border-b border-white/10 pb-2">
               <div className="flex items-center gap-2">
                 <Gamepad2 size={16} className="text-primary" />
                 {t.controls}
               </div>
               <button onClick={() => setShowControls(false)} className="text-slate-400 hover:text-white transition-colors" aria-label={t.close}>
                 <X size={14} />
               </button>
             </h3>
             <div className="space-y-4">
               {controls.map((control, idx) => (
                 <div key={idx} className="flex items-center justify-between gap-4 group hover:bg-white/5 p-2 rounded-lg transition-colors cursor-default">
                    <div 
                      className="flex-shrink-0 flex items-center justify-center min-w-[60px]"
                      title={control.label}
                    >
                      {renderControlIcon(control)}
                    </div>
                    <span className="text-slate-200 font-medium text-sm text-right flex-1 leading-tight group-hover:text-white transition-colors">{control.label}</span>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* Game Iframe */}
        <iframe
          ref={iframeRef}
          title="Generated Game"
          onLoad={() => setIsIframeLoaded(true)}
          className={`w-full h-full border-none bg-slate-950 touch-none transition-opacity duration-700 ease-in-out ${isIframeLoaded ? 'opacity-100' : 'opacity-0'}`}
          sandbox="allow-scripts allow-forms allow-pointer-lock allow-modals"
        />
      </div>
    </div>
  );
};

export default GameDisplay;
