
import React from 'react';
import { GeneratedImage } from '../types';

interface HistoryBarProps {
  images: GeneratedImage[];
  onSelect: (image: GeneratedImage) => void;
  activeId: string | null;
}

const HistoryBar: React.FC<HistoryBarProps> = ({ images, onSelect, activeId }) => {
  if (images.length === 0) return null;

  return (
    <div className="w-full h-32 border-t border-white/10 glass flex items-center p-4 gap-4 overflow-x-auto">
      {images.map((img) => (
        <button
          key={img.id}
          onClick={() => onSelect(img)}
          className={`relative h-full aspect-square rounded-lg overflow-hidden flex-shrink-0 transition-all hover:scale-105 ${
            activeId === img.id ? 'ring-2 ring-blue-500 scale-105 z-10' : 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100'
          }`}
        >
          <img src={img.url} className="w-full h-full object-cover" alt={img.prompt} />
        </button>
      ))}
    </div>
  );
};

export default HistoryBar;
