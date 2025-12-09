import React, { useState, useMemo } from 'react';
import { Loader2, RefreshCw, AlertCircle, Check, BookOpen, CheckSquare, Square, Play, Search, X } from 'lucide-react';
import { GeneratedImage, PhotoStyle } from '../types';
import { PHOTO_STYLES } from '../constants';

interface StyleGridProps {
  results: Record<number, GeneratedImage>;
  onRetry: (styleId: number) => void;
  selectedIds: Set<number>;
  onToggleSelection: (id: number) => void;
  onSelectAll: () => void;
  onOpenAlbum: () => void;
  onGenerateSelected: () => void;
}

export const StyleGrid: React.FC<StyleGridProps> = ({ 
  results, 
  onRetry, 
  selectedIds, 
  onToggleSelection,
  onSelectAll,
  onOpenAlbum,
  onGenerateSelected
}) => {
  // 1. All Hooks must be declared unconditionally at the top
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  // Filter Logic (Memoized)
  const categories = useMemo(() => {
    const cats = new Set(PHOTO_STYLES.map(s => s.category));
    return ['All', ...Array.from(cats).sort()];
  }, []);

  const filteredStyles = useMemo(() => {
    return PHOTO_STYLES.filter(style => {
      const matchesSearch = style.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'All' || style.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, activeCategory]);

  const resultsArray = Object.values(results) as GeneratedImage[];
  const completedImages = resultsArray.filter(r => r.status === 'completed');
  const completedCount = completedImages.length;
  
  // Logic to determine what Select All does
  const idleStyles = resultsArray.filter(r => r.status === 'idle');
  const hasIdle = idleStyles.length > 0;
  
  // If we have idle styles, select all logic applies to them. If not, it applies to completed (for album).
  const targetGroupForSelectAll = hasIdle ? idleStyles : completedImages;
  const targetIds = targetGroupForSelectAll.map(r => r.styleId);
  
  // Check if all relevant items are selected
  const allSelected = targetIds.length > 0 && targetIds.every(id => selectedIds.has(id));

  // Determine Main Action Button state
  const selectedIdleCount = resultsArray.filter(r => r.status === 'idle' && selectedIds.has(r.styleId)).length;
  const selectedCompletedCount = resultsArray.filter(r => r.status === 'completed' && selectedIds.has(r.styleId)).length;

  // 2. Conditional Return AFTER hooks
  const hasStarted = Object.keys(results).length > 0;
  if (!hasStarted) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
          Choose Styles
          <span className="text-sm font-normal text-slate-500 ml-2">
             ({completedCount} / {PHOTO_STYLES.length} Completed)
          </span>
        </h2>
        
        <div className="flex items-center gap-3">
            <button
                onClick={onSelectAll}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-medium transition-colors border border-slate-700"
            >
                {allSelected ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4" />}
                {allSelected ? 'Deselect All' : `Select All ${hasIdle ? 'Available' : 'Completed'}`}
            </button>
            
            {/* Desktop Action Buttons */}
            {selectedIdleCount > 0 && (
                 <button 
                 onClick={onGenerateSelected}
                 className="hidden sm:flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full text-white font-bold shadow-lg hover:shadow-indigo-500/20 transition-all transform hover:scale-105"
             >
                 <Play className="w-5 h-5 fill-current" />
                 Generate ({selectedIdleCount})
             </button>
            )}

            {selectedCompletedCount > 0 && selectedIdleCount === 0 && (
            <button 
                onClick={onOpenAlbum}
                className="hidden sm:flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-white font-bold shadow-lg hover:shadow-orange-500/20 transition-all transform hover:scale-105"
            >
                <BookOpen className="w-5 h-5" />
                Create Album ({selectedCompletedCount})
            </button>
            )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-sm mb-6">
        {/* Search */}
        <div className="relative w-full md:w-64 flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
                type="text" 
                placeholder="Search styles..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-8 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-500"
            />
             {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-8 bg-slate-700 mx-2"></div>

        {/* Categories */}
        <div className="flex-1 w-full overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <div className="flex gap-2">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border flex-shrink-0 ${
                            activeCategory === cat 
                            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-lg shadow-indigo-900/20' 
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:bg-slate-750'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
        </div>
      </div>
      
      {filteredStyles.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
            <Search className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No styles found matching your criteria.</p>
            <button 
                onClick={() => { setSearchTerm(''); setActiveCategory('All'); }}
                className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm font-medium"
            >
                Clear Filters
            </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {filteredStyles.map((style) => {
            const result = results[style.id] || { status: 'idle', imageUrl: null, styleId: style.id };
            const isSelected = selectedIds.has(style.id);
            const isCompleted = result.status === 'completed';
            const isIdle = result.status === 'idle';
            
            return (
                <div 
                key={style.id} 
                onClick={() => (isCompleted || isIdle) && onToggleSelection(style.id)}
                className={`relative group rounded-xl overflow-hidden bg-slate-800 border transition-all duration-300 cursor-pointer ${
                    isSelected 
                    ? 'border-indigo-500 ring-2 ring-indigo-500/50 scale-[1.02] shadow-xl z-10' 
                    : 'border-slate-800 hover:border-indigo-500/30'
                } ${isIdle ? 'opacity-90 hover:opacity-100' : ''}`}
                >
                {/* Selection Checkbox */}
                {(isCompleted || isIdle) && (
                    <div className={`absolute top-3 right-3 z-20 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-black/30 border-white/50 hover:bg-black/50'
                    }`}>
                    {isSelected && <Check className="w-4 h-4" />}
                    </div>
                )}

                {/* Regenerate Button (Visible on Hover for Completed) */}
                {isCompleted && (
                    <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRetry(style.id);
                    }}
                    className="absolute top-3 left-3 z-20 p-1.5 rounded-full bg-black/40 hover:bg-black/70 text-white/70 hover:text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all border border-white/10"
                    title="Regenerate this style"
                    >
                    <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                )}

                {/* Card Header (Style Name for Image View) */}
                {!isIdle && (
                    <div className="absolute top-0 left-0 right-0 z-10 p-3 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                        <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold text-white bg-black/40 backdrop-blur-md px-2 py-0.5 rounded border border-white/10 ml-8">
                                {style.id}
                            </span>
                        </div>
                    </div>
                )}

                {/* Card Content */}
                <div className="aspect-[3/4] w-full bg-slate-900 flex items-center justify-center relative">
                    {/* IDLE STATE */}
                    {result.status === 'idle' && (
                        <div className="flex flex-col items-center justify-center p-4 text-center h-full w-full bg-gradient-to-br from-slate-800 to-slate-900">
                            <div className={`w-12 h-12 rounded-full mb-3 flex items-center justify-center ${isSelected ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700/50 text-slate-500'}`}>
                                <span className="font-serif text-lg font-bold">{style.id}</span>
                            </div>
                            <h3 className={`font-bold mb-1 ${isSelected ? 'text-indigo-300' : 'text-slate-300'}`}>{style.name}</h3>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{style.category}</p>
                        </div>
                    )}

                    {/* QUEUED / PENDING */}
                    {result.status === 'pending' && (
                    <div className="flex flex-col items-center text-slate-500">
                        <div className="w-8 h-8 rounded-full border-2 border-slate-700 mb-2 border-t-transparent animate-spin"></div>
                        <span className="text-[10px]">Queued</span>
                    </div>
                    )}

                    {/* GENERATING */}
                    {result.status === 'generating' && (
                    <div className="flex flex-col items-center text-indigo-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <span className="text-[10px] animate-pulse">Generating...</span>
                    </div>
                    )}

                    {/* FAILED */}
                    {result.status === 'failed' && (
                    <div className="flex flex-col items-center text-red-400 p-2 text-center">
                        <AlertCircle className="w-6 h-6 mb-2" />
                        <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onRetry(style.id);
                        }}
                        className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded-full flex items-center gap-1 transition-colors"
                        >
                        <RefreshCw className="w-3 h-3" /> Retry
                        </button>
                    </div>
                    )}

                    {/* COMPLETED */}
                    {result.status === 'completed' && result.imageUrl && (
                    <img 
                        src={result.imageUrl} 
                        alt={style.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                    )}
                </div>
                
                {/* Footer (Always visible) */}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                    <p className="text-xs font-medium text-white truncate text-center">{style.name}</p>
                </div>
                </div>
            );
            })}
        </div>
      )}

      {/* Floating Action Bar */}
      <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
        selectedIds.size > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
      }`}>
        {selectedIdleCount > 0 ? (
            <button 
                onClick={onGenerateSelected}
                className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white shadow-2xl hover:scale-105 transition-transform"
            >
                <div className="relative">
                <Play className="w-6 h-6 fill-current" />
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-indigo-600 rounded-full text-[10px] flex items-center justify-center font-bold">
                    {selectedIdleCount}
                </span>
                </div>
                <span className="font-bold text-lg">Generate Selected</span>
            </button>
        ) : selectedCompletedCount > 0 ? (
            <button 
                onClick={onOpenAlbum}
                className="flex items-center gap-3 px-8 py-4 bg-slate-900/90 backdrop-blur-xl border border-indigo-500/30 rounded-full text-white shadow-2xl hover:scale-105 transition-transform"
            >
                <div className="relative">
                <BookOpen className="w-6 h-6 text-indigo-400" />
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-indigo-500 rounded-full text-[10px] flex items-center justify-center border border-slate-900">
                    {selectedCompletedCount}
                </span>
                </div>
                <span className="font-bold text-lg">Open Album</span>
            </button>
        ) : null}
      </div>
    </div>
  );
};