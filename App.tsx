import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { UploadSection } from './components/UploadSection';
import { StyleGrid } from './components/StyleGrid';
import { AlbumView } from './components/AlbumView';
import { PHOTO_STYLES } from './constants';
import { AppState, GeneratedImage, Gender } from './types';
import { generateStyledImage } from './services/genai';
import { Clock, PauseCircle, PlayCircle, AlertTriangle } from 'lucide-react';

// Strictly limit to 1 request at a time
const MAX_CONCURRENCY = 1;
// Increased delay to 10 seconds (max 6 RPM) to be safe for free/lower tiers
const REQUEST_DELAY_MS = 10000; 
// Increased base cooldown to 60 seconds for 429 errors
const BASE_COOLDOWN_MS = 60000;
// Stop automatically after this many consecutive errors
const MAX_CONSECUTIVE_ERRORS = 3;

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    gender: 'female',
    uploadedImage: null,
    queue: [],
    activeRequests: 0,
  });

  const [results, setResults] = useState<Record<number, GeneratedImage>>({});
  const [selectedStyles, setSelectedStyles] = useState<Set<number>>(new Set());
  const [isAlbumOpen, setIsAlbumOpen] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Phase 1: Upload and Initialization
  const handleStart = (image: string, gender: Gender) => {
    const initialResults: Record<number, GeneratedImage> = {};
    
    PHOTO_STYLES.forEach(style => {
      initialResults[style.id] = {
        styleId: style.id,
        imageUrl: null,
        status: 'idle'
      };
    });

    setResults(initialResults);
    setSelectedStyles(new Set()); 
    setState(prev => ({
      ...prev,
      uploadedImage: image,
      gender,
      queue: [],
      activeRequests: 0
    }));
    setCooldownUntil(0);
    setConsecutiveErrors(0);
    setIsPaused(false);
  };

  const handleRetry = (styleId: number) => {
    setResults(prev => ({
      ...prev,
      [styleId]: { ...prev[styleId], status: 'pending', error: undefined, imageUrl: null }
    }));
    
    setSelectedStyles(prev => {
        const next = new Set(prev);
        next.delete(styleId);
        return next;
    });

    setState(prev => ({
      ...prev,
      queue: [...prev.queue, styleId]
    }));
    // Auto-resume if retrying manually
    if (isPaused) setIsPaused(false);
  };

  const handleGenerateSelected = () => {
      const stylesToGenerate = (Array.from(selectedStyles) as number[]).filter(id => results[id]?.status === 'idle');
      
      if (stylesToGenerate.length === 0) return;

      setResults(prev => {
          const next = { ...prev };
          stylesToGenerate.forEach(id => {
              if (next[id]) next[id] = { ...next[id], status: 'pending' };
          });
          return next;
      });

      setState(prev => ({
          ...prev,
          queue: [...prev.queue, ...stylesToGenerate]
      }));

      setSelectedStyles(new Set());
      if (isPaused) setIsPaused(false);
  };

  const toggleSelection = (id: number) => {
    setSelectedStyles(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    const resultsArray = Object.values(results) as GeneratedImage[];
    const idleIds = resultsArray.filter(r => r.status === 'idle').map(r => r.styleId);
    const completedIds = resultsArray.filter(r => r.status === 'completed').map(r => r.styleId);
    
    if (idleIds.length > 0) {
        const allIdleSelected = idleIds.every(id => selectedStyles.has(id));
        if (allIdleSelected) {
             setSelectedStyles(prev => {
                 const next = new Set(prev);
                 idleIds.forEach(id => next.delete(id));
                 return next;
             });
        } else {
            setSelectedStyles(prev => {
                const next = new Set(prev);
                idleIds.forEach(id => next.add(id));
                return next;
            });
        }
    } else if (completedIds.length > 0) {
        const allCompletedSelected = completedIds.every(id => selectedStyles.has(id));
        if (allCompletedSelected) {
            setSelectedStyles(new Set());
        } else {
            setSelectedStyles(new Set(completedIds));
        }
    }
  };

  // Timer Effect
  useEffect(() => {
    if (cooldownUntil === 0 || isPaused) {
        setTimeRemaining(0);
        return;
    }

    const interval = setInterval(() => {
        const left = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
        setTimeRemaining(left);
        if (left <= 0) {
            setCooldownUntil(0);
        }
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownUntil, isPaused]);

  // Queue Processor
  useEffect(() => {
    if (isPaused || cooldownUntil > Date.now()) {
        return;
    }

    const processQueue = async () => {
      if (state.queue.length === 0 || state.activeRequests >= MAX_CONCURRENCY || !state.uploadedImage) {
        return;
      }

      const styleId = state.queue[0];
      const remainingQueue = state.queue.slice(1);

      setState(prev => ({
        ...prev,
        queue: remainingQueue,
        activeRequests: prev.activeRequests + 1
      }));

      processStyle(styleId);
    };

    processQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.queue, state.activeRequests, state.uploadedImage, cooldownUntil, isPaused]);


  const processStyle = async (styleId: number) => {
    setResults(prev => ({
      ...prev,
      [styleId]: { ...prev[styleId], status: 'generating' }
    }));

    const style = PHOTO_STYLES.find(s => s.id === styleId);
    if (!style || !state.uploadedImage) {
        setState(prev => ({ ...prev, activeRequests: prev.activeRequests - 1 }));
        return;
    }

    try {
      const imageUrl = await generateStyledImage(
        state.uploadedImage, 
        state.gender, 
        style.promptSuffix
      );

      setResults(prev => ({
        ...prev,
        [styleId]: { ...prev[styleId], status: 'completed', imageUrl }
      }));
      
      setConsecutiveErrors(0);
      setCooldownUntil(Date.now() + REQUEST_DELAY_MS);

    } catch (error: any) {
      console.error(`Failed to generate style ${styleId}`, error);
      
      const errorMessage = error?.message || '';
      const isRateLimit = errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED');

      if (isRateLimit) {
        const newConsecutiveErrors = consecutiveErrors + 1;
        setConsecutiveErrors(newConsecutiveErrors);
        
        // CIRCUIT BREAKER
        if (newConsecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            console.warn("Max consecutive errors reached. Pausing queue.");
            setIsPaused(true);
            setCooldownUntil(0); // Stop timer, wait for manual resume
            
            // Put back in queue
            setState(prev => ({
                ...prev,
                queue: [styleId, ...prev.queue]
            }));

            setResults(prev => ({
                ...prev,
                [styleId]: { ...prev[styleId], status: 'pending', error: "Rate limit reached. Paused." }
            }));
        } else {
            // Standard Backoff
            const backoffTime = BASE_COOLDOWN_MS * Math.pow(2, newConsecutiveErrors - 1);
            setCooldownUntil(Date.now() + backoffTime);

            setState(prev => ({
                ...prev,
                queue: [styleId, ...prev.queue]
            }));

            setResults(prev => ({
                ...prev,
                [styleId]: { ...prev[styleId], status: 'pending', error: undefined }
            }));
        }
      } else {
        // Permanent failure
        setResults(prev => ({
            ...prev,
            [styleId]: { 
            ...prev[styleId], 
            status: 'failed', 
            error: errorMessage || 'Unknown error' 
            }
        }));
        setConsecutiveErrors(0);
      }
    } finally {
      setState(prev => ({
        ...prev,
        activeRequests: prev.activeRequests - 1
      }));
    }
  };

  const handlePauseToggle = () => {
    if (isPaused) {
        setConsecutiveErrors(0); // Reset error count on manual resume
        setCooldownUntil(0);
    }
    setIsPaused(!isPaused);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <UploadSection 
          onStart={handleStart} 
          isProcessing={state.queue.length > 0 || state.activeRequests > 0 || isPaused} 
        />
        
        {/* Status Banners */}
        <div className="max-w-7xl mx-auto mb-6 px-4 space-y-4">
            
            {/* 1. Queue Status & Manual Pause Control */}
            {state.queue.length > 0 && (
                 <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-amber-500 animate-pulse' : 'bg-green-500 animate-pulse'}`}></div>
                        <span className="text-slate-300 font-medium">
                            {isPaused ? 'Generation Paused' : `Processing Queue (${state.queue.length} remaining)`}
                        </span>
                    </div>
                    <button 
                        onClick={handlePauseToggle}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                            isPaused 
                            ? 'bg-green-600 hover:bg-green-500 text-white' 
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        }`}
                    >
                        {isPaused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                        {isPaused ? 'Resume Generation' : 'Pause'}
                    </button>
                 </div>
            )}

            {/* 2. Cooldown Countdown */}
            {timeRemaining > 0 && !isPaused && (
                <div className="bg-blue-500/10 border border-blue-500/30 text-blue-300 px-6 py-4 rounded-xl flex items-center justify-between gap-4 animate-pulse">
                    <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5" />
                        <span className="font-medium">Pacing requests to respect API limits...</span>
                    </div>
                    <div className="font-mono font-bold">
                        {timeRemaining}s
                    </div>
                </div>
            )}

            {/* 3. Circuit Breaker Warning */}
            {isPaused && consecutiveErrors >= MAX_CONSECUTIVE_ERRORS && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-200 px-6 py-4 rounded-xl flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                    <div>
                        <p className="font-bold">Generation Paused: High Error Rate</p>
                        <p className="text-sm text-red-300/80">
                            We hit the API rate limit multiple times. The queue has been paused to prevent further errors. 
                            Please wait a minute before clicking "Resume".
                        </p>
                    </div>
                </div>
            )}
        </div>
        
        <StyleGrid 
          results={results} 
          onRetry={handleRetry}
          selectedIds={selectedStyles}
          onToggleSelection={toggleSelection}
          onSelectAll={handleSelectAll}
          onOpenAlbum={() => setIsAlbumOpen(true)}
          onGenerateSelected={handleGenerateSelected}
        />
      </main>

      {/* Album Modal */}
      {isAlbumOpen && (
        <AlbumView 
          selectedIds={selectedStyles}
          results={results}
          onClose={() => setIsAlbumOpen(false)}
        />
      )}

      <footer className="py-8 text-center text-slate-600 text-sm">
        <p>© 2025 AI Photo Studio Pro. Powered by Gemini Nano Banana.</p>
      </footer>
    </div>
  );
};

export default App;