import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { UploadSection } from './components/UploadSection';
import { StyleGrid } from './components/StyleGrid';
import { AlbumView } from './components/AlbumView';
import { PHOTO_STYLES } from './constants';
import { AppState, GeneratedImage, Gender } from './types';
import { generateStyledImage } from './services/genai';
import { Clock } from 'lucide-react';

// Strictly limit to 1 request at a time to prevent 429 RESOURCE_EXHAUSTED
const MAX_CONCURRENCY = 1;
// Minimum delay between successful requests to prevent bursting
const REQUEST_DELAY_MS = 5000; 
// Base cooldown when a 429 is hit
const BASE_COOLDOWN_MS = 20000;

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

  // Phase 1: Upload and Initialization (Set everything to Idle)
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
    setSelectedStyles(new Set()); // Reset selection
    setState(prev => ({
      ...prev,
      uploadedImage: image,
      gender,
      queue: [], // Queue is empty until user selects styles
      activeRequests: 0
    }));
    setCooldownUntil(0);
    setConsecutiveErrors(0);
  };

  const handleRetry = (styleId: number) => {
    setResults(prev => ({
      ...prev,
      [styleId]: { ...prev[styleId], status: 'pending', error: undefined, imageUrl: null }
    }));
    
    // Remove from selection so it doesn't get confused with "Generate Selected" vs "Album"
    setSelectedStyles(prev => {
        const next = new Set(prev);
        next.delete(styleId);
        return next;
    });

    setState(prev => ({
      ...prev,
      queue: [...prev.queue, styleId]
    }));
  };

  // Phase 2: User Selects Styles to Generate
  const handleGenerateSelected = () => {
      // Cast Array.from result to number[] to avoid 'unknown' type inference on index
      const stylesToGenerate = (Array.from(selectedStyles) as number[]).filter(id => results[id]?.status === 'idle');
      
      if (stylesToGenerate.length === 0) return;

      // Update status to pending
      setResults(prev => {
          const next = { ...prev };
          stylesToGenerate.forEach(id => {
              if (next[id]) next[id] = { ...next[id], status: 'pending' };
          });
          return next;
      });

      // Add to queue
      setState(prev => ({
          ...prev,
          queue: [...prev.queue, ...stylesToGenerate]
      }));

      // Clear selection to prepare for next interaction (or album selection)
      setSelectedStyles(new Set());
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
    
    // Priority: Select all Idle (for generation). If no Idle, toggle Completed (for album).
    if (idleIds.length > 0) {
        const allIdleSelected = idleIds.every(id => selectedStyles.has(id));
        if (allIdleSelected) {
             // Deselect all idle
             setSelectedStyles(prev => {
                 const next = new Set(prev);
                 idleIds.forEach(id => next.delete(id));
                 return next;
             });
        } else {
            // Select all idle
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

  // Timer Effect for UI countdown
  useEffect(() => {
    if (cooldownUntil === 0) {
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
  }, [cooldownUntil]);

  // Queue Processor Effect
  useEffect(() => {
    // If cooling down, do nothing
    if (cooldownUntil > Date.now()) {
        return;
    }

    const processQueue = async () => {
      if (state.queue.length === 0 || state.activeRequests >= MAX_CONCURRENCY || !state.uploadedImage) {
        return;
      }

      // Take just ONE item at a time
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
  }, [state.queue, state.activeRequests, state.uploadedImage, cooldownUntil]);


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
      
      // Success! Reset error count.
      setConsecutiveErrors(0);

      // Enforce a small delay even on success to prevent bursting
      setCooldownUntil(Date.now() + REQUEST_DELAY_MS);

    } catch (error: any) {
      console.error(`Failed to generate style ${styleId}`, error);
      
      const errorMessage = error?.message || '';
      // Check for 429 or quota related errors
      const isRateLimit = errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED');

      if (isRateLimit) {
        const newConsecutiveErrors = consecutiveErrors + 1;
        setConsecutiveErrors(newConsecutiveErrors);
        
        // Exponential backoff: 20s, 40s, 80s...
        const backoffTime = BASE_COOLDOWN_MS * Math.pow(2, newConsecutiveErrors - 1);
        console.warn(`Rate limit hit! Backing off for ${backoffTime/1000}s. Consecutive errors: ${newConsecutiveErrors}`);
        
        // 1. Set cooldown
        setCooldownUntil(Date.now() + backoffTime);

        // 2. Put this item back at the FRONT of the queue
        setState(prev => ({
            ...prev,
            queue: [styleId, ...prev.queue]
        }));

        // 3. Reset status to pending so UI shows it's waiting
        setResults(prev => ({
            ...prev,
            [styleId]: { ...prev[styleId], status: 'pending', error: undefined }
        }));
      } else {
        // Permanent failure for non-rate-limit errors
        setResults(prev => ({
            ...prev,
            [styleId]: { 
            ...prev[styleId], 
            status: 'failed', 
            error: errorMessage || 'Unknown error' 
            }
        }));
        // Even on failure, reset consecutive rate limit errors to avoid punishing logic errors
        setConsecutiveErrors(0);
      }
    } finally {
      // Always decrement active requests
      setState(prev => ({
        ...prev,
        activeRequests: prev.activeRequests - 1
      }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <UploadSection 
          onStart={handleStart} 
          isProcessing={state.queue.length > 0 || state.activeRequests > 0 || cooldownUntil > Date.now()} 
        />
        
        {/* Cooldown Indicator */}
        {timeRemaining > 0 && (
            <div className="max-w-7xl mx-auto mb-6 px-4">
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-6 py-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse shadow-lg shadow-amber-900/10">
                    <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5" />
                        <span className="font-medium">API Limit Reached. Pausing queue to recover quota...</span>
                    </div>
                    <div className="bg-amber-500/20 px-4 py-1 rounded-full font-mono font-bold text-amber-200 border border-amber-500/30">
                        Resuming in {timeRemaining}s
                    </div>
                </div>
            </div>
        )}
        
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