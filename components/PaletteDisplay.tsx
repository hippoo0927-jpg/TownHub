
import React from 'react';
import { ColorInfo } from '../types';

interface PaletteDisplayProps {
  palette: ColorInfo[];
}

const PaletteDisplay: React.FC<PaletteDisplayProps> = ({ palette }) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // 간단한 알림 효과를 줄 수 있습니다.
  };

  return (
    <div className="w-full mt-6 space-y-3">
      <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest">Dugeun Town Color List</h4>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {palette.map((color) => (
          <button
            key={color.hex}
            onClick={() => copyToClipboard(color.hex)}
            className="group relative flex flex-col items-center gap-1 p-2 rounded-lg bg-white/5 border border-white/10 hover:border-blue-500/50 transition-all active:scale-95"
          >
            <div 
              className="w-8 h-8 rounded shadow-inner border border-black/20"
              style={{ backgroundColor: color.hex }}
            />
            <span className="text-[10px] font-mono text-white/60">{color.hex}</span>
            <div className="absolute -top-1 -right-1 bg-blue-600 text-[8px] px-1 rounded-full font-bold opacity-0 group-hover:opacity-100 transition-opacity">
              COPY
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PaletteDisplay;
