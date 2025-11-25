import React, { useEffect, useRef, useState } from 'react';
import { X, Maximize2, Minimize2, Share2, Check, Star, Gamepad2, MousePointer2, MousePointerClick, ArrowUp, Download } from 'lucide-react';
import { Translation, GameControl } from '../types';

interface GameDisplayProps {
  code: string;
  prompt: string;
  gameId?: string; // Optional because initial generation might not have ID passed immediately if not refactored fully, but we will pass it
  controls?: GameControl[];
  rating?: number;
  onClose: () => void;
  onRate?: (rating: number) => void;
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
  t,
  isRTL
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showCopied, setShowCopied] = useState(false);
  const [showDownloaded, setShowDownloaded] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentRating, setCurrentRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    setCurrentRating(initialRating || 0);
  }, [initialRating]);

  useEffect(() => {
    if (iframeRef.current && code) {
      const blob = new Blob([code], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      iframeRef.current.src = url;

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [code]);

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
      const blob = new Blob([code], { type: 'text/html' });
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

  const handleShare = async () => {
    const shareText = `Check out this game I created with Dr. Game AI!\n\nPrompt: ${prompt}`;
    const fileName = `dr-game-${gameId || Date.now()}.html`;
    const blob = new Blob([code], { type: 'text/html' });
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
        // Fallback to text sharing below
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

    // Fallback: Clipboard and Twitter
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
          <div className="flex flex-col items-center gap-1.5 p-1">
             <KeyCap className="w-8 h-8 text-sm">W</KeyCap>
             <div className="flex gap-1.5">
               <KeyCap className="w-8 h-8 text-sm">A</KeyCap>
               <KeyCap className="w-8 h-8 text-sm">S</KeyCap>
               <KeyCap className="w-8 h-8 text-sm">D</KeyCap>
             </div>
          </div>
        );
      case 'arrows':
        return (
          <div className="flex flex-col items-center gap-1.5 p-1">
             <KeyCap className="w-8 h-8"><ArrowUp size={16} /></KeyCap>
             <div className="flex gap-1.5">
               <KeyCap className="w-8 h-8"><ArrowUp size={16} className="-rotate-90" /></KeyCap>
               <KeyCap className="w-8 h-8"><ArrowUp size={16} className="rotate-180" /></KeyCap>
               <KeyCap className="w-8 h-8"><ArrowUp size={16} className="rotate-90" /></KeyCap>
             </div>
          </div>
        );
      case 'space':
        return <KeyCap className="h-8 w-24 text-xs uppercase tracking-wider">{t.controlIcons.space}</KeyCap>;
      case 'mouse':
        return (
          <div className="w-12 h-12 flex items-center justify-center bg-slate-800 rounded-xl border border-slate-600 shadow-md">
             <MousePointer2 size={24} className="text-primary animate-pulse" />
          </div>
        );
      case 'click':
        return (
          <div className="w-12 h-12 flex items-center justify-center bg-slate-800 rounded-xl border border-slate-600 shadow-md relative">
             <MousePointerClick size={24} className="text-secondary" />
             <span className="absolute -top-1 -right-1 flex h-3 w-3">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
               <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary"></span>
             </span>
          </div>
        );
      default:
        return <KeyCap className="h-8 min-w-[32px] px-2 text-xs uppercase">{control.keyName || "?"}</KeyCap>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-fade-in">
      <div 
        ref={containerRef}
        className={`bg-black relative rounded-xl shadow-2xl overflow-hidden flex flex-col ${
          isFullscreen ? 'w-full h-full' : 'w-full max-w-5xl aspect-video'
        }`}
      >
        {/* Header/Controls */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/90 to-transparent flex items-center justify-between px-4 z-20 opacity-0 hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center gap-4">
             <span className="text-white/80 font-mono text-sm shadow-black drop-shadow-md hidden md:block">{t.gameReady}</span>
             
             {/* Rating System */}
             {onRate && (
               <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                  <span className="text-xs text-slate-400 mr-2">{t.rateGame}:</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRate(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="focus:outline-none transition-transform hover:scale-110"
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

          <div className="flex items-center gap-2">
             <button
              onClick={() => setShowControls(!showControls)}
              className={`p-2 rounded-full backdrop-blur-sm transition-all ${showControls ? 'bg-primary/50 text-white' : 'bg-black/40 text-white/80 hover:bg-black/60'}`}
              title={t.controls}
            >
              <Gamepad2 size={20} />
            </button>

             <button
              onClick={handleDownload}
              className="group relative p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-sm transition-all"
              title={t.download}
            >
              {showDownloaded ? <Check size={20} className="text-green-400" /> : <Download size={20} />}
              {showDownloaded && (
                <div className="absolute top-full right-0 mt-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap">
                  {t.downloadSuccess}
                </div>
              )}
            </button>

            <button
              onClick={handleShare}
              className="group relative p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-sm transition-all"
              title={t.share}
            >
              {showCopied ? <Check size={20} className="text-green-400" /> : <Share2 size={20} />}
              
              {showCopied && (
                <div className="absolute top-full right-0 mt-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap">
                  {t.shareSuccess}
                </div>
              )}
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-sm transition-all"
              title={t.fullscreen}
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-red-400 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-sm transition-all"
              title={t.close}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Controls Overlay */}
        {showControls && controls.length > 0 && (
          <div className={`absolute top-20 ${isRTL ? 'left-4' : 'right-4'} z-10 w-72 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-2xl animate-in fade-in slide-in-from-right-4`}>
             <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
               <Gamepad2 size={16} className="text-primary" />
               {t.controls}
             </h3>
             <div className="space-y-4">
               {controls.map((control, idx) => (
                 <div key={idx} className="flex items-center justify-between gap-4">
                    <div className="flex-shrink-0 flex items-center justify-center min-w-[60px]">
                      {renderControlIcon(control)}
                    </div>
                    <span className="text-slate-200 font-medium text-sm text-right flex-1 leading-tight">{control.label}</span>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* Game Iframe */}
        <iframe
          ref={iframeRef}
          title="Generated Game"
          className="w-full h-full border-none bg-slate-950"
          sandbox="allow-scripts allow-forms allow-pointer-lock allow-modals"
        />
      </div>
    </div>
  );
};

export default GameDisplay;