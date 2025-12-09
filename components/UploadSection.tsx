import React, { useCallback, useState } from 'react';
import { Upload, User, UserCheck, X } from 'lucide-react';
import { Gender } from '../types';

interface UploadSectionProps {
  onStart: (image: string, gender: Gender) => void;
  isProcessing: boolean;
}

export const UploadSection: React.FC<UploadSectionProps> = ({ onStart, isProcessing }) => {
  const [image, setImage] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender>('female');
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImage(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => setImage(null);

  return (
    <div className="w-full max-w-3xl mx-auto my-8 p-6 bg-slate-900/50 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-sm">
      {!image ? (
        <div 
          className={`relative h-64 flex flex-col items-center justify-center border-2 border-dashed rounded-xl transition-all duration-300 ${
            dragActive ? "border-indigo-500 bg-indigo-500/10" : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/50"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleChange}
            accept="image/*"
          />
          <div className="bg-slate-800 p-4 rounded-full mb-4">
            <Upload className="w-8 h-8 text-indigo-400" />
          </div>
          <p className="text-lg font-medium text-slate-200">Upload your portrait</p>
          <p className="text-sm text-slate-500 mt-2">Drag & drop or click to browse</p>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="relative group w-48 h-48 flex-shrink-0">
            <img 
              src={image} 
              alt="Upload" 
              className="w-full h-full object-cover rounded-xl border-2 border-indigo-500/50 shadow-lg"
            />
            <button 
              onClick={clearImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 w-full space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-3">Select Gender for Styling</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setGender('female')}
                  className={`flex items-center justify-center gap-3 p-4 rounded-xl border transition-all ${
                    gender === 'female' 
                      ? 'bg-pink-500/20 border-pink-500 text-pink-200' 
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span>Female</span>
                </button>
                <button
                  onClick={() => setGender('male')}
                  className={`flex items-center justify-center gap-3 p-4 rounded-xl border transition-all ${
                    gender === 'male' 
                      ? 'bg-blue-500/20 border-blue-500 text-blue-200' 
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                  }`}
                >
                  <UserCheck className="w-5 h-5" />
                  <span>Male</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => onStart(image, gender)}
              className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${
                isProcessing 
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white hover:shadow-indigo-500/25 hover:scale-[1.01] active:scale-[0.99] bg-[length:200%_auto] animate-gradient'
              }`}
            >
              {isProcessing ? 'Processing...' : 'Continue to Style Selection'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};