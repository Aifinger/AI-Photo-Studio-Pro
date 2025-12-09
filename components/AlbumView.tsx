import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Share2, Download, Loader } from 'lucide-react';
import { GeneratedImage } from '../types';
import { PHOTO_STYLES } from '../constants';
import JSZip from 'jszip';

interface AlbumViewProps {
  selectedIds: Set<number>;
  results: Record<number, GeneratedImage>;
  onClose: () => void;
}

export const AlbumView: React.FC<AlbumViewProps> = ({ selectedIds, results, onClose }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZipping, setIsZipping] = useState(false);
  
  // Convert Set to Array and get valid images
  const images = (Array.from(selectedIds) as number[])
    .map(id => {
      const result = results[id];
      const style = PHOTO_STYLES.find(s => s.id === id);
      return result?.status === 'completed' && result.imageUrl && style
        ? { id, url: result.imageUrl, name: style.name, category: style.category }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (images.length === 0) return null;

  const currentImage = images[activeIndex];

  const handleNext = () => setActiveIndex((prev) => (prev + 1) % images.length);
  const handlePrev = () => setActiveIndex((prev) => (prev - 1 + images.length) % images.length);

  const downloadAlbum = async () => {
    setIsZipping(true);
    try {
        const zip = new JSZip();
        
        images.forEach((img) => {
            // Remove data:image/png;base64, prefix
            const base64Data = img.url.split(',')[1];
            // Sanitize filename
            const fileName = `${img.id}_${img.name.replace(/\s+/g, '_')}.png`;
            zip.file(fileName, base64Data, { base64: true });
        });

        const content = await zip.generateAsync({ type: 'blob' });
        
        // Create download link
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'AI_Photo_Studio_Album.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
    } catch (error) {
        console.error("Failed to zip images", error);
        alert("Failed to generate zip file.");
    } finally {
        setIsZipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950 flex flex-col">
      {/* Album Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <h2 className="text-xl font-serif text-white flex items-center gap-2">
          <span className="text-indigo-400">✦</span> My Portfolio
        </h2>
        <div className="flex items-center gap-3">
          <button 
             onClick={downloadAlbum}
             disabled={isZipping}
             className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-wait"
          >
             {isZipping ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
             {isZipping ? 'Zipping...' : 'Download Album'}
          </button>

          <div className="h-6 w-px bg-slate-700 mx-2 hidden md:block"></div>

          <span className="text-sm text-slate-500 mr-2 hidden md:inline">
            {activeIndex + 1} / {images.length}
          </span>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative flex">
        {/* Left Control */}
        <button 
          onClick={handlePrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/20 hover:bg-black/50 backdrop-blur-sm rounded-full text-white/70 hover:text-white transition-all"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>

        {/* Right Control */}
        <button 
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/20 hover:bg-black/50 backdrop-blur-sm rounded-full text-white/70 hover:text-white transition-all"
        >
          <ChevronRight className="w-8 h-8" />
        </button>

        {/* Magazine Layout */}
        <div className="w-full h-full flex flex-col md:flex-row items-center justify-center p-4 md:p-12 gap-8 bg-[#0a0f1c]">
          
          {/* Image Container */}
          <div className="relative h-[60vh] md:h-[80vh] aspect-[3/4] shadow-2xl shadow-indigo-900/20 group">
             <img 
               src={currentImage.url} 
               alt={currentImage.name} 
               className="w-full h-full object-cover rounded-sm"
             />
             <div className="absolute inset-0 border-[16px] border-white/5 pointer-events-none"></div>
             
             {/* Action Overlay */}
             <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <a 
                 href={currentImage.url} 
                 download={`album-${currentImage.name}.png`}
                 className="p-2 bg-white/10 hover:bg-white/30 backdrop-blur-md rounded-full text-white"
                 title="Download single image"
               >
                 <Download className="w-5 h-5" />
               </a>
             </div>
          </div>

          {/* Text/Info Panel */}
          <div className="md:w-80 flex flex-col items-start justify-center text-left space-y-6">
            <div className="w-12 h-1 bg-indigo-500"></div>
            <div>
              <p className="text-indigo-400 text-sm tracking-widest uppercase mb-2 font-medium">
                {currentImage.category} Collection
              </p>
              <h1 className="text-4xl md:text-5xl font-serif text-white leading-tight">
                {currentImage.name}
              </h1>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              An artistic generated portrait capturing the essence of the {currentImage.category.toLowerCase()} aesthetic.
              Created with Gemini Nano Banana.
            </p>
            <div className="pt-4 text-xs text-slate-600 font-mono">
              IMG_GEN_{currentImage.id.toString().padStart(3, '0')}
            </div>
          </div>

        </div>
      </div>

      {/* Thumbnails Footer */}
      <div className="h-24 bg-slate-900 border-t border-slate-800 flex items-center gap-2 overflow-x-auto px-4 py-2">
        {images.map((img, idx) => (
          <button
            key={img.id}
            onClick={() => setActiveIndex(idx)}
            className={`flex-shrink-0 h-full aspect-[3/4] rounded overflow-hidden border-2 transition-all ${
              idx === activeIndex ? 'border-indigo-500 opacity-100' : 'border-transparent opacity-40 hover:opacity-70'
            }`}
          >
            <img src={img.url} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
};