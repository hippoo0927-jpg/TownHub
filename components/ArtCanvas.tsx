
import React, { useState } from 'react';
import { GeneratedImage } from '../types';
import PaletteDisplay from './PaletteDisplay';

interface ArtCanvasProps {
  activeImage: GeneratedImage | null;
  isGenerating: boolean;
  onEdit: (image: GeneratedImage) => void;
}

const ArtCanvas: React.FC<ArtCanvasProps> = ({ activeImage, isGenerating, onEdit }) => {
  const [showGrid, setShowGrid] = useState(true);

  return (
    <div className="flex-1 flex flex-col items-center p-8 overflow-y-auto relative group custom-scrollbar">
      {isGenerating ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="w-24 h-24 relative">
            <div className="absolute inset-0 rounded-full border-2 border-white/10" />
            <div className="absolute inset-0 rounded-full border-2 border-t-blue-500 animate-spin" />
          </div>
          <p className="text-white/40 font-mono text-xs tracking-widest animate-pulse">PROCESSING PIXELS...</p>
        </div>
      ) : activeImage ? (
        <div className="w-full max-w-4xl flex flex-col items-center">
          <div className="relative group/canvas">
            <img
              src={activeImage.pixelUrl || activeImage.url}
              alt={activeImage.prompt}
              className="rounded-lg shadow-2xl max-w-full max-h-[60vh] object-contain ring-1 ring-white/20 transition-all duration-300"
              style={{ imageRendering: 'pixelated' }}
            />
            
            {/* 그리드 오버레이 */}
            {showGrid && activeImage.pixelUrl && (
              <div 
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`,
                  backgroundSize: `${100 / (activeImage.config.pixelDensity || 32)}% ${100 / (activeImage.config.pixelDensity || 32)}%`
                }}
              />
            )}

            <div className="absolute top-4 right-4 flex gap-2">
               <button
                onClick={() => setShowGrid(!showGrid)}
                className={`p-2 rounded-lg backdrop-blur-md border border-white/10 transition-colors ${showGrid ? 'bg-blue-600/50 text-white' : 'bg-black/50 text-white/50'}`}
                title="Toggle Grid"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>

            <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover/canvas:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(activeImage)}
                className="px-4 py-2 bg-black/60 backdrop-blur-md text-white rounded-full text-xs font-bold border border-white/10 hover:bg-white hover:text-black transition-colors"
              >
                MOD (EDIT)
              </button>
              <a
                href={activeImage.pixelUrl || activeImage.url}
                download={`town-pixel-${activeImage.id}.png`}
                className="p-2 bg-black/60 backdrop-blur-md text-white rounded-full border border-white/10 hover:bg-white hover:text-black transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
            </div>
          </div>

          <div className="w-full mt-8 p-6 glass rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white/80">Pixel Guide</h3>
              <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-white/40 font-mono">
                {activeImage.config.pixelDensity} x {activeImage.config.pixelDensity} CANVAS
              </span>
            </div>
            <p className="text-sm text-white/60 mb-6 italic">"{activeImage.prompt}"</p>
            
            {activeImage.palette && <PaletteDisplay palette={activeImage.palette} />}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-500/40 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white/90">Pixel Art Converter</h3>
          <p className="text-white/40 text-xs leading-relaxed">두근두근타운 캔버스 크기에 딱 맞춰드려요.<br/>아이디어를 적고 바로 도안을 확인하세요!</p>
        </div>
      )}
    </div>
  );
};

export default ArtCanvas;
