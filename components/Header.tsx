import React from 'react';
import { Camera, Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="w-full py-6 px-4 border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              AI Photo Studio
            </h1>
            <p className="text-xs text-slate-400">Nano Banana Edition</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
          <Sparkles className="w-4 h-4" />
          <span className="font-medium">50 Premium Styles</span>
        </div>
      </div>
    </header>
  );
};