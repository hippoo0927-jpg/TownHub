
import React from 'react';
import { AspectRatio, ImageSize, StudioModel, PixelDensity } from '../types';

interface SidebarProps {
  config: {
    aspectRatio: AspectRatio;
    model: StudioModel;
    imageSize: ImageSize;
    pixelDensity: PixelDensity;
  };
  setConfig: (config: any) => void;
  isGenerating: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ config, setConfig, isGenerating }) => {
  const aspectRatios: AspectRatio[] = ['1:1', '3:4', '4:3', '9:16', '16:9'];
  const densities: PixelDensity[] = [16, 32, 48, 64, 128];

  return (
    <div className="w-full lg:w-80 h-full flex flex-col gap-6 p-6 border-r border-white/10 glass overflow-y-auto">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white/90 italic">Pixel Studio</h2>
          <p className="text-[10px] text-white/30 uppercase tracking-tighter">Dugeun Dugeun Town Optimized</p>
        </div>
        
        <div className="space-y-2">
          <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Pixel Density (Grid Size)</label>
          <div className="grid grid-cols-5 gap-1">
            {densities.map((d) => (
              <button
                key={d}
                disabled={isGenerating}
                onClick={() => setConfig({ ...config, pixelDensity: d })}
                className={`py-2 rounded-lg text-[10px] font-bold transition-all ${
                  config.pixelDensity === d 
                    ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]' 
                    : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-white/40 px-1">Tip: 32 or 48 is best for Town Canvas.</p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Engine</label>
          <div className="grid grid-cols-1 gap-2">
            <button
              disabled={isGenerating}
              onClick={() => setConfig({ ...config, model: StudioModel.FLASH })}
              className={`p-3 rounded-xl border text-left transition-all ${
                config.model === StudioModel.FLASH 
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                  : 'border-white/5 bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              <div className="font-semibold text-sm">Gemini Flash</div>
              <div className="text-[10px] opacity-70">Best for Pixel-Ready Base</div>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Aspect Ratio</label>
          <div className="grid grid-cols-3 gap-2">
            {aspectRatios.map((ratio) => (
              <button
                key={ratio}
                disabled={isGenerating}
                onClick={() => setConfig({ ...config, aspectRatio: ratio })}
                className={`py-2 rounded-lg text-xs font-medium transition-all ${
                  config.aspectRatio === ratio 
                    ? 'bg-white text-black' 
                    : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-white/10 space-y-4">
        <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <p className="text-[10px] text-orange-400 font-medium">✨ 똥손 탈출 팁</p>
          <p className="text-[9px] text-orange-300/60 leading-relaxed">생성된 이미지 하단의 색상표를 눌러 HEX 코드를 복사한 뒤 게임 팔레트에 붙여넣으세요!</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
