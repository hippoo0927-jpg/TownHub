
import React, { useRef, useState } from 'react';
import { AppStep, StudioMode, PixelData, TextLayer } from './types';
import { getContrastColor, formatPaletteIndex } from './utils';
import JSZip from 'jszip';

interface ArtStudioProps {
  step: AppStep;
  setStep: (step: AppStep) => void;
  studioMode: StudioMode;
  setStudioMode: (mode: StudioMode) => void;
  canvasDim: { w: number; h: number };
  setCanvasDim: (dim: { w: number; h: number }) => void;
  crop: { x: number; y: number; scale: number };
  setCrop: (crop: any) => void;
  zoom: number;
  setZoom: (zoom: any) => void;
  pixelData: PixelData | null;
  activePaletteId: string | null;
  setActivePaletteId: (id: string | null) => void;
  textLayers: TextLayer[];
  setTextLayers: React.Dispatch<React.SetStateAction<TextLayer[]>>;
  selectedTextId: string | null;
  setSelectedTextId: (id: string | null) => void;
  splitSize: number;
  setSplitSize: (size: number) => void;
  showPalette: boolean;
  setShowPalette: (show: boolean) => void;
  showExportMenu: boolean;
  setShowExportMenu: (show: boolean) => void;
  isExporting: boolean;
  onStartPixelation: () => void;
  onExportAsZip: () => void;
  onResetPosition: () => void;
  onResetScale: () => void;
  onFitToCanvas: () => void;
  onDragStart: (e: any, isText?: boolean, textId?: string | null) => void;
  onDragMove: (e: any) => void;
  onDragEnd: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  imageObjRef: React.RefObject<HTMLImageElement | null>;
  previewCanvasRef: React.RefObject<HTMLCanvasElement>;
  frameContainerRef: React.RefObject<HTMLDivElement>;
  editorScrollRef: React.RefObject<HTMLDivElement>;
  paletteIndexMap: Map<string, string>;
}

const ArtStudio: React.FC<ArtStudioProps> = (props) => {
  const {
    step, setStep, studioMode, setStudioMode, canvasDim, setCanvasDim,
    crop, setCrop, zoom, setZoom, pixelData, activePaletteId, setActivePaletteId,
    textLayers, setTextLayers, selectedTextId, setSelectedTextId, splitSize, setSplitSize,
    showPalette, setShowPalette, showExportMenu, setShowExportMenu, isExporting: propsIsExporting,
    onStartPixelation, onResetPosition, onResetScale, onFitToCanvas,
    onDragStart, onDragMove, onDragEnd, fileInputRef, imageObjRef,
    previewCanvasRef, frameContainerRef, editorScrollRef, paletteIndexMap
  } = props;

  const [localIsExporting, setLocalIsExporting] = useState(false);
  const selectedText = textLayers.find(l => l.id === selectedTextId);

  // 도안 이미지 분할 생성 및 다운로드 (ID 텍스트 포함)
  const downloadImage = async () => {
    if (!pixelData) return;
    setLocalIsExporting(true);
    
    try {
      const zip = new JSZip();
      const scale = 40; // 조각 이미지 픽셀 크기 (Upscaling)
      
      const numCols = Math.ceil(pixelData.width / splitSize);
      const numRows = Math.ceil(pixelData.height / splitSize);

      // 1. 조각 이미지 생성 (Slicing)
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          const startX = c * splitSize;
          const startY = r * splitSize;
          const currentChunkW = Math.min(splitSize, pixelData.width - startX);
          const currentChunkH = Math.min(splitSize, pixelData.height - startY);

          const chunkCanvas = document.createElement('canvas');
          chunkCanvas.width = currentChunkW * scale;
          chunkCanvas.height = currentChunkH * scale;
          const ctx = chunkCanvas.getContext('2d');
          if (!ctx) continue;

          for (let y = 0; y < currentChunkH; y++) {
            for (let x = 0; x < currentChunkW; x++) {
              const globalX = startX + x;
              const globalY = startY + y;
              const globalIdx = globalY * pixelData.width + globalX;
              const color = pixelData.colors[globalIdx];
              const pId = paletteIndexMap.get(color);

              const drawX = x * scale;
              const drawY = y * scale;

              // 배경색 채우기
              ctx.fillStyle = color;
              ctx.fillRect(drawX, drawY, scale, scale);

              // 격자선 (기본)
              ctx.strokeStyle = 'rgba(0,0,0,0.1)';
              ctx.lineWidth = 1;
              ctx.strokeRect(drawX, drawY, scale, scale);

              // 5x5 강조선 (전체 도안 좌표 기준)
              if ((globalX + 1) % 5 === 0) {
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath(); ctx.moveTo(drawX + scale, drawY); ctx.lineTo(drawX + scale, drawY + scale); ctx.stroke();
              }
              if ((globalY + 1) % 5 === 0) {
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath(); ctx.moveTo(drawX, drawY + scale); ctx.lineTo(drawX + scale, drawY + scale); ctx.stroke();
              }

              // ID 텍스트 삽입
              if (pId) {
                ctx.fillStyle = getContrastColor(color);
                ctx.font = `bold ${scale * 0.35}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(pId, drawX + scale / 2, drawY + scale / 2);
              }
            }
          }

          const blob = await new Promise<Blob | null>(res => chunkCanvas.toBlob(res, 'image/png'));
          if (blob) zip.file(`guide_row${r + 1}_col${c + 1}.png`, blob);
        }
      }

      // 2. 전체 도안 이미지 생성 (Full View)
      const fullCanvas = document.createElement('canvas');
      const fullScale = 10; // 전체보기는 약간 작게
      fullCanvas.width = pixelData.width * fullScale;
      fullCanvas.height = pixelData.height * fullScale;
      const fCtx = fullCanvas.getContext('2d');
      if (fCtx) {
        pixelData.colors.forEach((color, idx) => {
          const x = (idx % pixelData.width) * fullScale;
          const y = Math.floor(idx / pixelData.width) * fullScale;
          fCtx.fillStyle = color;
          fCtx.fillRect(x, y, fullScale, fullScale);
        });
        const fullBlob = await new Promise<Blob | null>(res => fullCanvas.toBlob(res, 'image/png'));
        if (fullBlob) zip.file("full_view.png", fullBlob);
      }

      // 3. 가이드 텍스트 파일 추가
      let guideText = "TOWN HUB PIXEL ART GUIDE\n\n";
      guideText += `Total Dimension: ${pixelData.width}x${pixelData.height}\n`;
      guideText += `Split Size: ${splitSize}x${splitSize}\n\n`;
      guideText += "COLOR PALETTE LIST:\n";
      pixelData.palette.forEach((p, i) => {
        guideText += `[${i + 1}] ID: ${p.index} | HEX: ${p.hex} | COUNT: ${p.count}px\n`;
      });
      zip.file("palette_list.txt", guideText);

      // 4. ZIP 다운로드
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `town_studio_guide_${Date.now()}.zip`;
      link.click();
      
      setShowExportMenu(false);
    } catch (e) {
      console.error(e);
      alert("내보내기 중 오류가 발생했습니다.");
    } finally {
      setLocalIsExporting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-14 lg:pt-4">
      <div className="h-full max-w-7xl mx-auto flex flex-col relative">
        {step === 'MODE_SELECT' && (
          <div className="flex-1 flex flex-col md:grid md:grid-cols-2 gap-8 lg:gap-14 items-center justify-center p-4">
            <button onClick={() => { setStudioMode('PATTERN'); setStep('SETUP'); setCanvasDim({w:48, h:48}); }} className="w-full aspect-square max-w-md bg-slate-900/40 p-12 lg:p-20 rounded-[64px] border-2 border-slate-800 hover:border-[#EC4899] transition-all flex flex-col items-center justify-center group"><div className="text-7xl lg:text-[100px] mb-10 group-hover:scale-110 transition-transform">🎨</div><h3 className="text-3xl lg:text-5xl font-black italic text-white text-center">픽셀 도안 제작</h3></button>
            <button onClick={() => { setStudioMode('BOOK_COVER'); setCanvasDim({w:150, h:84}); setStep('UPLOAD'); }} className="w-full aspect-square max-w-md bg-slate-900/40 p-12 lg:p-20 rounded-[64px] border-2 border-slate-800 hover:border-cyan-500 transition-all flex flex-col items-center justify-center group"><div className="text-7xl lg:text-[100px] mb-10 group-hover:scale-110 transition-transform">📖</div><h3 className="text-3xl lg:text-5xl font-black italic text-white text-center">북커버 제작</h3></button>
          </div>
        )}
        {step === 'SETUP' && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="bg-slate-900/60 p-12 lg:p-28 rounded-[64px] shadow-2xl border border-slate-800 max-w-2xl w-full backdrop-blur-xl">
              <h2 className="text-4xl lg:text-6xl font-black mb-12 italic text-white text-center">Dimension</h2>
              <div className="grid grid-cols-2 gap-6 mb-12 text-center">
                <div className="space-y-4"><label className="text-[10px] font-black text-slate-500 uppercase">Width</label><input type="number" value={canvasDim.w} onChange={e=>setCanvasDim({...canvasDim, w:Number(e.target.value)})} className="w-full p-6 bg-slate-800 rounded-[32px] font-black text-3xl text-center text-white outline-none" /></div>
                <div className="space-y-4"><label className="text-[10px] font-black text-slate-500 uppercase">Height</label><input type="number" value={canvasDim.h} onChange={e=>setCanvasDim({...canvasDim, h:Number(e.target.value)})} className="w-full p-6 bg-slate-800 rounded-[32px] font-black text-3xl text-center text-white outline-none" /></div>
              </div>
              <button onClick={()=>setStep('UPLOAD')} className="w-full py-8 bg-white text-slate-900 rounded-[40px] font-black text-xl lg:text-3xl shadow-2xl hover:bg-[#EC4899] hover:text-white transition-all">Next Step</button>
            </div>
          </div>
        )}
        {step === 'UPLOAD' && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div onClick={()=>fileInputRef.current?.click()} className="w-full max-w-5xl aspect-video bg-slate-900/20 rounded-[64px] border-4 border-dashed border-slate-800 flex flex-col items-center justify-center cursor-pointer group transition-all shadow-2xl">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                const f = e.target.files?.[0]; if (f) {
                  const r = new FileReader(); r.onload = (ev) => {
                    const img = new Image(); img.src = ev.target?.result as string;
                    img.onload = () => { if(imageObjRef.current !== undefined) (imageObjRef as any).current = img; setStep('FRAME'); setCrop({x:0,y:0,scale:0.8}); };
                  }; r.readAsDataURL(f);
                }
              }} />
              <div className="w-24 h-24 lg:w-40 lg:h-40 bg-slate-900 rounded-[40px] flex items-center justify-center text-5xl lg:text-8xl mb-8 group-hover:bg-[#EC4899] transition-all">📸</div>
              <p className="font-black text-2xl lg:text-5xl text-white italic tracking-tighter">이미지 선택</p>
            </div>
          </div>
        )}
        {(step === 'FRAME' || step === 'TEXT') && (
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-20 h-full min-h-0 items-center justify-center p-2">
            <div className="w-full flex-1 flex flex-col items-center min-h-0 lg:max-w-6xl overflow-hidden">
              <div className="bg-slate-900/40 rounded-[48px] shadow-2xl p-6 lg:p-36 w-full flex-1 flex items-center justify-center relative border border-slate-800/50 backdrop-blur-xl overflow-hidden">
                <div ref={frameContainerRef} className="relative bg-white shadow-2xl overflow-hidden rounded-xl z-10 touch-none"
                     style={{ width: 'min(900px, 100%)', aspectRatio: `${canvasDim.w}/${canvasDim.h}`, border: '4px solid #000' }}
                     onMouseDown={e => onDragStart(e)} onTouchStart={e => onDragStart(e)}
                     onMouseMove={e => onDragMove(e)} onTouchMove={e => onDragMove(e)}
                     onMouseUp={onDragEnd} onTouchEnd={onDragEnd}>
                  <canvas ref={previewCanvasRef} width={canvasDim.w} height={canvasDim.h} className="w-full h-full pointer-events-none" style={{imageRendering:'pixelated'}} />
                  {textLayers.map(l => (
                    <div key={l.id} className={`absolute cursor-move font-black whitespace-nowrap select-none touch-none ${selectedTextId === l.id ? 'ring-4 ring-[#EC4899] bg-white/60 p-1 rounded-md' : ''}`}
                         style={{ left: `${l.x}%`, top: `${l.y}%`, transform: 'translate(-50%, -50%)', color: l.color, fontSize: `calc(${l.size}px * (min(900, 100vw) / ${canvasDim.w}))` }}
                         onMouseDown={e => { e.stopPropagation(); onDragStart(e, true, l.id); }} onTouchStart={e => { e.stopPropagation(); onDragStart(e, true, l.id); }}>{l.text}</div>
                  ))}
                </div>
              </div>
            </div>
            <div className="w-full lg:w-[480px] shrink-0 z-20 pb-8 lg:pb-0">
              <div className="bg-slate-900 p-8 lg:p-16 rounded-[48px] shadow-2xl space-y-10 border border-slate-800">
                 {step === 'FRAME' ? (
                   <div className="space-y-10">
                     <div className="space-y-6"><label className="text-[11px] font-black text-slate-500 uppercase block">Scale: {Math.round(crop.scale * 100)}%</label><input type="range" min="0.1" max="5" step="0.01" value={crop.scale} onChange={e=>setCrop({...crop, scale:Number(e.target.value)})} className="w-full accent-[#EC4899] h-2.5 rounded-full bg-slate-800" /></div>
                     <div className="grid grid-cols-2 gap-4"><button onClick={onResetPosition} className="py-4 bg-slate-800 text-slate-400 rounded-2xl font-black text-xs">위치 초기화</button><button onClick={onResetScale} className="py-4 bg-slate-800 text-slate-400 rounded-2xl font-black text-xs">스케일 초기화</button><button onClick={onFitToCanvas} className="col-span-2 py-5 bg-slate-800 text-white rounded-2xl font-black text-sm hover:bg-slate-700 transition-all">캔버스 채우기</button></div>
                     <button onClick={() => studioMode === 'BOOK_COVER' ? setStep('TEXT') : onStartPixelation()} className="w-full py-8 bg-[#EC4899] text-white rounded-[40px] font-black text-xl lg:text-3xl shadow-xl transition-all">레이아웃 완료 ➔</button>
                   </div>
                 ) : (
                   <div className="space-y-10">
                     <button onClick={() => { const n: TextLayer = { id: `t-${Date.now()}`, text: 'Hello', x: 50, y: 50, size: 8, color: '#000000' }; setTextLayers([...textLayers, n]); setSelectedTextId(n.id); }} className="w-full py-5 bg-white text-slate-900 rounded-[30px] font-black text-xs">+ 텍스트 레이어 추가</button>
                     {selectedText && (
                       <div className="p-8 bg-slate-800/50 rounded-[40px] space-y-8 border border-slate-700/50">
                          <input 
                            key={`text-editor-input-${selectedTextId}`}
                            autoFocus
                            type="text" 
                            value={selectedText.text} 
                            onChange={e => setTextLayers(prev => prev.map(l => l.id === selectedTextId ? { ...l, text: e.target.value } : l))} 
                            className="w-full p-5 bg-slate-900 rounded-2xl font-black text-sm text-white outline-none ring-2 ring-slate-700 focus:ring-[#EC4899]" 
                          />
                          <div className="space-y-3"><label className="text-[10px] font-black text-slate-500 uppercase">Font Size ({selectedText.size}px)</label><input type="range" min="4" max="40" value={selectedText.size} onChange={e => setTextLayers(prev => prev.map(l => l.id === selectedTextId ? { ...l, size: Number(e.target.value) } : l))} className="w-full accent-[#EC4899]" /></div>
                          <div className="flex gap-4"><input type="color" value={selectedText.color} onChange={e => setTextLayers(prev => prev.map(l => l.id === selectedTextId ? { ...l, color: e.target.value } : l))} className="flex-1 h-14 bg-transparent cursor-pointer rounded-xl overflow-hidden" /><button onClick={() => setTextLayers(prev => prev.filter(l => l.id !== selectedTextId))} className="px-6 bg-red-500/10 text-red-500 font-black text-[10px] rounded-2xl hover:bg-red-500 hover:text-white transition-all">삭제</button></div>
                       </div>
                     )}
                     <button onClick={onStartPixelation} className="w-full py-8 bg-[#EC4899] text-white rounded-[40px] font-black text-xl lg:text-3xl shadow-xl">변환 프로세스 시작</button>
                   </div>
                 )}
              </div>
            </div>
          </div>
        )}
        {step === 'EDITOR' && pixelData && (
          <div className="flex flex-col lg:flex-row gap-0 h-full min-h-0 animate-in fade-in overflow-hidden relative">
            <div className="flex-1 flex flex-col gap-6 lg:gap-10 min-h-0 overflow-hidden px-4">
              <div className="bg-slate-900/40 p-5 rounded-[40px] border border-slate-800/50 flex items-center justify-between shrink-0 z-[100] backdrop-blur-md">
                 <button onClick={()=>setStep(studioMode === 'BOOK_COVER' ? 'TEXT' : 'FRAME')} className="px-6 py-3 bg-slate-800 rounded-2xl font-black text-[11px] text-slate-400 hover:text-white transition-all">이전 단계</button>
                 <div className="flex items-center gap-3 lg:gap-6">
                    <div className="bg-slate-800 p-1.5 rounded-2xl flex items-center gap-3"><button onClick={()=>setZoom((z:any)=>Math.max(100,z-100))} className="w-10 h-10 font-black bg-slate-900 text-white rounded-xl hover:bg-[#EC4899]">-</button><span className="text-[11px] font-black w-12 text-center text-white">{Math.round(zoom / 4)}%</span><button onClick={()=>setZoom((z:any)=>Math.min(2000,z+100))} className="w-10 h-10 font-black bg-slate-900 text-white rounded-xl hover:bg-[#EC4899]">+</button></div>
                    <div className="relative">
                      <button onClick={(e) => { e.stopPropagation(); setShowExportMenu(!showExportMenu); }} className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black shadow-2xl text-[11px]">Export {showExportMenu ? '▲' : '▼'}</button>
                      {showExportMenu && (
                        <div className="absolute right-0 mt-4 w-72 bg-slate-900 rounded-[40px] shadow-2xl border border-slate-800 p-5 z-[150] origin-top-right">
                          <div className="p-5 bg-slate-800 rounded-3xl mb-3"><label className="text-[10px] font-black text-slate-500 block mb-2 uppercase">Grid Size (px)</label>
                          <input 
                            key="export-grid-size-input"
                            autoFocus
                            type="number" 
                            value={splitSize} 
                            onChange={(e) => setSplitSize(Math.max(1, Number(e.target.value)))} 
                            className="w-full p-4 bg-slate-900 rounded-2xl text-center font-black text-white outline-none border border-slate-700" 
                          /></div>
                          <button disabled={localIsExporting} onClick={downloadImage} className="w-full p-5 text-left hover:bg-slate-800 flex items-center gap-5 rounded-3xl group transition-all">
                            <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-[#EC4899] transition-colors">
                              {localIsExporting ? '⏳' : '📦'}
                            </div>
                            <span className="font-black text-white text-xs">{localIsExporting ? 'Exporting...' : 'ZIP Guide Download'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                 </div>
              </div>
              <div ref={editorScrollRef} className="flex-1 bg-slate-900/20 rounded-[64px] overflow-auto relative border border-slate-800/50 custom-scrollbar z-10">
                <div className="inline-block p-[100px] lg:p-[400px]">
                  <div className="bg-slate-900 p-8 lg:p-16 border-[12px] border-black shadow-2xl rounded-sm"
                    style={{ transform: `scale(${zoom / 400})`, transformOrigin: '0 0', willChange: 'transform', imageRendering: 'pixelated' }}>
                    <div className="pixel-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${pixelData.width}, 20px)`, width: `${pixelData.width * 20}px` }}>
                      {pixelData.colors.map((color, idx) => {
                        const rowIdx = Math.floor(idx / pixelData.width); const colIdx = idx % pixelData.width;
                        const pId = paletteIndexMap.get(color); const isSelected = activePaletteId === pId;
                        const isMajorRight = (colIdx + 1) % 5 === 0 && (colIdx + 1) !== pixelData.width;
                        const isMajorBottom = (rowIdx + 1) % 5 === 0 && (rowIdx + 1) !== pixelData.height;
                        return (
                          <div key={idx} style={{ backgroundColor: color, width: '20px', height: '20px', color: getContrastColor(color), fontSize: '6px' }}
                            className={`pixel-item flex items-center justify-center font-black transition-opacity border-black/5 ${isMajorRight ? 'border-r-2 border-r-black/40' : 'border-r-[0.5px]'} ${isMajorBottom ? 'border-b-2 border-b-black/40' : 'border-b-[0.5px]'} ${isSelected ? 'ring-2 ring-[#EC4899] z-10 shadow-2xl' : 'hover:opacity-90'}`}
                            onClick={() => setActivePaletteId(isSelected ? null : pId)}>
                            {zoom >= 250 && pId}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={`fixed lg:relative top-0 right-0 h-full lg:h-auto z-[200] lg:z-auto transition-all duration-500 flex ${showPalette ? 'translate-x-0 opacity-100' : 'translate-x-full lg:translate-x-0 lg:w-0 opacity-0'}`}>
              <div className="w-[85vw] lg:w-[440px] bg-slate-900 p-8 lg:p-14 rounded-l-[48px] lg:rounded-[100px] shadow-2xl border-l border-slate-800 h-full flex flex-col min-h-0">
                 <div className="flex items-center justify-between mb-8 shrink-0"><h3 className="font-black italic text-2xl text-white">Palette <span className="text-[11px] bg-slate-800 px-4 py-1.5 rounded-full not-italic text-slate-500">{pixelData.palette.length}</span></h3><button onClick={() => setShowPalette(false)} className="lg:hidden text-slate-500 font-black text-2xl">✕</button></div>
                 <div className="flex-1 overflow-y-auto custom-scrollbar pr-2"><div className="grid grid-cols-1 gap-4 lg:gap-6">
                     {pixelData.palette.map((p, i) => (
                       <div key={p.index} onClick={()=>setActivePaletteId(activePaletteId===p.index?null:p.index)} className={`flex items-center gap-5 p-4 rounded-[28px] border-2 transition-all cursor-pointer ${activePaletteId===p.index?'bg-slate-800 border-[#EC4899] shadow-xl scale-[1.03]':'border-transparent hover:bg-slate-800/40'}`}><div className="w-12 h-12 rounded-[16px] flex items-center justify-center font-black text-sm border-2 border-slate-900 shrink-0" style={{backgroundColor:p.hex, color:getContrastColor(p.hex)}}>{i+1}</div><div className="flex-1 min-w-0 pr-1"><div className="flex items-center gap-3 w-full"><p className="text-sm font-black truncate text-white italic">{p.index}</p><span className="text-[9px] bg-slate-900 text-slate-400 px-3 py-1.5 rounded-xl font-black shrink-0">{p.count} PX</span></div><p className="text-[10px] font-mono text-slate-600 uppercase mt-1.5">{p.hex}</p></div></div>
                     ))}
                 </div></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtStudio;
