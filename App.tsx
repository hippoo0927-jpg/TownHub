
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppStep, PixelData, StudioMode, ColorInfo, TOWN_PALETTE_HEX, TextLayer } from './types';
import { processArtStudioPixel } from './services/pixelService';
import JSZip from 'jszip';

type MainView = 'HOME' | 'STUDIO' | 'DESIGN_FEED' | 'RECORD_SHOP';

const PALETTE_GUIDE_IMG = "https://postfiles.pstatic.net/MjAyNjAyMTRfMjkx/MDAxNzcxMDU3NTk4NDUw.UdWMz036JirwSH3q0aunhh3BlUUk0fch-buODrROIJUg.2q5o0meMMuNoW3EVKQlQzxUQIx9kMrJbVZoMDILhGX0g.PNG/%EC%83%89%EC%BD%94%EB%93%9C_%EC%9D%BD%EB%8A%94%EB%B2%95.png?type=w966"; 

const getContrastColor = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return ((r * 299) + (g * 587) + (b * 114)) / 1000 >= 128 ? 'black' : 'white';
};

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<MainView>('HOME');
  const [toast, setToast] = useState<string | null>(null);
  const [step, setStep] = useState<AppStep>('MODE_SELECT');
  const [studioMode, setStudioMode] = useState<StudioMode>('PATTERN');
  const [canvasDim, setCanvasDim] = useState({ w: 48, h: 48 });
  const [uploadedImg, setUploadedImg] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, scale: 0.8 });
  const [zoom, setZoom] = useState(400);
  const [pixelData, setPixelData] = useState<PixelData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activePaletteId, setActivePaletteId] = useState<string | null>(null);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showNotice, setShowNotice] = useState(true);
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [splitSize, setSplitSize] = useState(25);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const frameDragRef = useRef({ isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0, initialPropX: 0, initialPropY: 0 });
  const frameContainerRef = useRef<HTMLDivElement>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const panStartPos = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const paletteIndexMap = useMemo(() => {
    if (!pixelData) return new Map();
    const m = new Map();
    pixelData.palette.forEach(p => m.set(p.hex, p.index));
    return m;
  }, [pixelData]);

  const resetPosition = () => setCrop(prev => ({ ...prev, x: 0, y: 0 }));
  const resetScale = () => setCrop(prev => ({ ...prev, scale: 0.8 }));
  const fitToCanvas = () => {
    if (!imageObjRef.current) return;
    const scaleW = canvasDim.w / imageObjRef.current.width;
    const scaleH = canvasDim.h / imageObjRef.current.height;
    setCrop(prev => ({ ...prev, scale: Math.max(scaleW, scaleH), x: 0, y: 0 }));
  };

  const exportAsZip = async () => {
    if (!pixelData || isExporting) return;
    setIsExporting(true);
    showToast("가이드 파일 생성 중...");
    try {
      const zip = new JSZip();
      const { width, height, colors, palette } = pixelData;
      const blockSize = 40; 
      for (let y = 0; y < height; y += splitSize) {
        for (let x = 0; x < width; x += splitSize) {
          const curW = Math.min(splitSize, width - x);
          const curH = Math.min(splitSize, height - y);
          const c = document.createElement('canvas');
          const ctx = c.getContext('2d')!;
          c.width = curW * blockSize;
          c.height = curH * blockSize;
          for (let py = 0; py < curH; py++) {
            for (let px = 0; px < curW; px++) {
              const idx = (y + py) * width + (x + px);
              const color = colors[idx];
              const pIdx = palette.findIndex(p => p.hex === color) + 1;
              ctx.fillStyle = color;
              ctx.fillRect(px * blockSize, py * blockSize, blockSize, blockSize);
              ctx.strokeStyle = "rgba(0,0,0,0.1)";
              ctx.lineWidth = 0.5;
              ctx.strokeRect(px * blockSize, py * blockSize, blockSize, blockSize);
              ctx.fillStyle = getContrastColor(color);
              ctx.font = `bold ${blockSize / 2.5}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(String(pIdx), px * blockSize + blockSize / 2, py * blockSize + blockSize / 2);
            }
          }
          ctx.strokeStyle = "rgba(0,0,0,0.4)";
          ctx.lineWidth = 2;
          for (let gx = 0; gx <= curW; gx++) { if ((x + gx) % 5 === 0) { ctx.beginPath(); ctx.moveTo(gx * blockSize, 0); ctx.lineTo(gx * blockSize, c.height); ctx.stroke(); } }
          for (let gy = 0; gy <= curH; gy++) { if ((y + gy) % 5 === 0) { ctx.beginPath(); ctx.moveTo(0, gy * blockSize); ctx.lineTo(c.width, gy * blockSize); ctx.stroke(); } }
          const blob = await new Promise<Blob | null>(r => c.toBlob(r));
          if (blob) zip.file(`guide_y${Math.floor(y/splitSize)}_x${Math.floor(x/splitSize)}.png`, blob);
        }
      }
      const orig = document.createElement('canvas');
      orig.width = width; orig.height = height;
      const octx = orig.getContext('2d')!;
      colors.forEach((col, i) => { octx.fillStyle = col; octx.fillRect(i % width, Math.floor(i / width), 1, 1); });
      const oblob = await new Promise<Blob | null>(r => orig.toBlob(r));
      if (oblob) zip.file("original_pixel.png", oblob);
      zip.file("palette_info.json", JSON.stringify({ palette: pixelData.palette }));
      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `town_art_guide_${Date.now()}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setShowExportMenu(false);
      showToast("ZIP 가이드 저장 완료!");
    } catch (e) {
      showToast("오류 발생");
    } finally {
      setIsExporting(false);
    }
  };

  const startPixelation = async () => {
    if (!previewCanvasRef.current) return;
    setIsProcessing(true);
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = canvasDim.w;
    finalCanvas.height = canvasDim.h;
    const ctx = finalCanvas.getContext('2d')!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvasDim.w, canvasDim.h);
    if (imageObjRef.current) {
      ctx.save();
      ctx.translate(canvasDim.w / 2 + crop.x, canvasDim.h / 2 + crop.y);
      ctx.scale(crop.scale, crop.scale);
      ctx.drawImage(imageObjRef.current, -imageObjRef.current.width / 2, -imageObjRef.current.height / 2);
      ctx.restore();
    }
    textLayers.forEach(l => {
      ctx.fillStyle = l.color;
      ctx.font = `bold ${l.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(l.text, (l.x / 100) * canvasDim.w, (l.y / 100) * canvasDim.h);
    });
    setTimeout(async () => {
      try {
        const data = await processArtStudioPixel(finalCanvas.toDataURL(), canvasDim.w, canvasDim.h, 64, { x: 0, y: 0, scale: 1 });
        setPixelData(data);
        setStep('EDITOR');
        setZoom(400);
      } catch (e) { showToast("변환 중 오류 발생"); }
      finally { setIsProcessing(false); }
    }, 100);
  };

  useEffect(() => {
    if ((step === 'FRAME' || step === 'TEXT') && imageObjRef.current && previewCanvasRef.current) {
      const ctx = previewCanvasRef.current.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvasDim.w, canvasDim.h);
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvasDim.w, canvasDim.h);
      ctx.save();
      ctx.translate(canvasDim.w / 2 + crop.x, canvasDim.h / 2 + crop.y);
      ctx.scale(crop.scale, crop.scale);
      ctx.drawImage(imageObjRef.current, -imageObjRef.current.width / 2, -imageObjRef.current.height / 2);
      ctx.restore();
      if (step === 'TEXT') {
          textLayers.forEach(l => {
            ctx.fillStyle = l.color;
            ctx.font = `bold ${l.size}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(l.text, (l.x / 100) * canvasDim.w, (l.y / 100) * canvasDim.h);
          });
      }
    }
  }, [step, crop, canvasDim, textLayers]);

  const Sidebar = () => (
    <aside className="w-full lg:w-[280px] bg-[#020617] flex flex-col shrink-0 border-b lg:border-r border-slate-900 z-50 h-full overflow-hidden shadow-2xl">
      <div className="px-8 py-6 lg:p-10 flex flex-col h-full justify-between">
        <div className="space-y-12">
          <div className="flex items-center gap-4 text-white cursor-pointer group" onClick={() => { setActiveView('HOME'); setStep('MODE_SELECT'); }}>
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-pink-500/20 group-hover:scale-110 transition-transform">T</div>
            <span className="font-black italic text-2xl tracking-tighter">TownHub</span>
          </div>
          <nav className="flex flex-col gap-3">
            {[
              { id: 'HOME', label: 'Home', icon: '🏠' },
              { id: 'STUDIO', label: 'Art Studio', icon: '🎨' },
              { id: 'DESIGN_FEED', label: 'Feed', icon: '🖼️' },
              { id: 'RECORD_SHOP', label: 'Shop', icon: '🛍️' }
            ].map(item => (
              <button key={item.id} onClick={() => { setActiveView(item.id as MainView); if(item.id === 'STUDIO') setStep('MODE_SELECT'); }}
                className={`flex items-center gap-5 px-6 py-4 rounded-[20px] font-black text-sm transition-all whitespace-nowrap ${activeView === item.id ? 'bg-[#F472B6] text-white shadow-[0_10px_30px_-10px_rgba(244,114,182,0.5)] scale-105' : 'text-slate-500 hover:bg-slate-900 hover:text-slate-200'}`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="mt-8 space-y-6 pt-10 border-t border-slate-900/50">
           <div className="flex items-center gap-5 p-4 bg-slate-900/40 rounded-[24px] border border-slate-800/50">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 overflow-hidden ring-2 ring-slate-800 ring-offset-2 ring-offset-[#020617]">
                 <img src="https://api.dicebear.com/7.x/pixel-art/svg?seed=hippo&backgroundColor=b6e3f4" alt="Hippo" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                 <p className="text-white font-black text-sm italic">히포 (Hippo)</p>
                 <p className="text-[#F472B6] font-black text-[10px] uppercase tracking-widest mt-0.5">Master Artisan</p>
              </div>
           </div>
           <button onClick={() => window.open('https://www.youtube.com/@Hippoo_Hanuu', '_blank')} className="w-full py-4 bg-[#EF4444] text-white rounded-2xl font-black text-xs uppercase tracking-tight hover:bg-red-600 transition-all shadow-xl shadow-red-900/20 active:scale-95">YouTube 구독하기</button>
        </div>
      </div>
    </aside>
  );

  const selectedText = textLayers.find(l => l.id === selectedTextId);

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#020617] overflow-hidden font-sans select-none text-slate-300">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="px-12 py-8 shrink-0 flex items-center justify-between">
           <h2 className="text-[10px] font-black italic text-slate-600 uppercase tracking-[0.3em] flex items-center gap-4">
              <span className="w-2 h-2 bg-pink-500 rounded-full animate-pulse"></span>
              STUDIO DASHBOARD
           </h2>
        </header>

        <div className="flex-1 overflow-hidden relative flex flex-col">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-14 lg:pt-4">
            {activeView === 'HOME' ? (
              <div className="max-w-7xl mx-auto h-full flex items-center justify-center animate-in fade-in duration-700">
                <div className="bg-slate-900/30 rounded-[80px] p-16 lg:p-40 text-white shadow-2xl relative border border-slate-800/50 overflow-hidden w-full max-w-6xl backdrop-blur-3xl">
                  <div className="absolute -right-40 -top-40 w-[600px] h-[600px] bg-pink-500/10 blur-[150px] rounded-full" />
                  <div className="absolute -left-40 -bottom-40 w-[600px] h-[600px] bg-blue-500/10 blur-[150px] rounded-full" />
                  <div className="relative z-10 space-y-12">
                    <span className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-8 py-3 rounded-full font-black text-xs uppercase tracking-[0.3em] italic inline-block shadow-lg shadow-pink-500/20">PREMIUM CREATIVE HUB</span>
                    <h1 className="text-7xl lg:text-[130px] font-black italic tracking-tighter leading-[0.8] bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">Town Square<br/>Art Studio</h1>
                    <button onClick={() => { setActiveView('STUDIO'); setStep('MODE_SELECT'); }} 
                            className="px-16 py-8 bg-white text-slate-900 rounded-[40px] font-black text-2xl hover:bg-pink-500 hover:text-white transition-all shadow-2xl transform hover:-translate-y-2 active:scale-95">스튜디오 시작</button>
                  </div>
                </div>
              </div>
            ) : activeView === 'STUDIO' ? (
              <div className="h-full max-w-7xl mx-auto flex flex-col">
                {step === 'MODE_SELECT' && (
                  <div className="flex-1 flex flex-col md:grid md:grid-cols-2 gap-10 items-center justify-center p-4">
                    <button onClick={() => { setStudioMode('PATTERN'); setStep('SETUP'); setCanvasDim({w:48, h:48}); }} 
                            className="w-full aspect-square max-w-md bg-slate-900/40 p-16 rounded-[80px] border-2 border-slate-800 hover:border-pink-500 hover:bg-slate-900/60 transition-all flex flex-col items-center justify-center group shadow-2xl backdrop-blur-md">
                      <div className="text-7xl mb-10 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-500">🎨</div>
                      <h3 className="text-4xl font-black italic text-white text-center">픽셀 도안 제작</h3>
                      <p className="mt-4 text-slate-500 font-bold text-sm uppercase tracking-widest">Pixel Pattern Tool</p>
                    </button>
                    <button onClick={() => { setStudioMode('BOOK_COVER'); setCanvasDim({w:150, h:84}); setStep('UPLOAD'); }} 
                            className="w-full aspect-square max-w-md bg-slate-900/40 p-16 rounded-[80px] border-2 border-slate-800 hover:border-cyan-500 hover:bg-slate-900/60 transition-all flex flex-col items-center justify-center group shadow-2xl backdrop-blur-md">
                      <div className="text-7xl mb-10 group-hover:scale-125 group-hover:rotate-12 transition-all duration-500">📖</div>
                      <h3 className="text-4xl font-black italic text-white text-center">북커버 제작</h3>
                      <p className="mt-4 text-slate-500 font-bold text-sm uppercase tracking-widest">Book Cover Layout</p>
                    </button>
                  </div>
                )}

                {step === 'SETUP' && (
                  <div className="flex-1 flex items-center justify-center p-4">
                    <div className="bg-slate-900/60 p-24 rounded-[80px] shadow-2xl border border-slate-800 max-w-xl w-full backdrop-blur-xl">
                      <h2 className="text-5xl font-black mb-14 italic text-white tracking-tighter">Dimension</h2>
                      <div className="grid grid-cols-2 gap-8 mb-14">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Width</label>
                          <input type="number" value={canvasDim.w} onChange={e=>setCanvasDim({...canvasDim, w:Number(e.target.value)})} className="w-full p-8 bg-slate-800/50 rounded-[40px] font-black text-4xl text-center text-white border-none focus:ring-4 focus:ring-pink-500/20 outline-none transition-all" />
                        </div>
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Height</label>
                          <input type="number" value={canvasDim.h} onChange={e=>setCanvasDim({...canvasDim, h:Number(e.target.value)})} className="w-full p-8 bg-slate-800/50 rounded-[40px] font-black text-4xl text-center text-white border-none focus:ring-4 focus:ring-pink-500/20 outline-none transition-all" />
                        </div>
                      </div>
                      <button onClick={()=>setStep('UPLOAD')} className="w-full py-8 bg-white text-slate-900 rounded-[40px] font-black text-2xl shadow-2xl hover:bg-pink-500 hover:text-white transition-all">다음 단계로</button>
                    </div>
                  </div>
                )}

                {step === 'UPLOAD' && (
                  <div className="flex-1 flex items-center justify-center p-4">
                    <div onClick={()=>fileInputRef.current?.click()} className="w-full max-w-5xl aspect-[16/9] bg-slate-900/20 rounded-[100px] border-4 border-dashed border-slate-800/50 flex flex-col items-center justify-center cursor-pointer hover:border-pink-500/50 transition-all group shadow-2xl backdrop-blur-sm">
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                        const f = e.target.files?.[0]; if (f) {
                          const r = new FileReader(); r.onload = (ev) => {
                            const img = new Image(); img.src = ev.target?.result as string;
                            img.onload = () => { imageObjRef.current = img; setUploadedImg(img.src); setStep('FRAME'); setCrop({x:0,y:0,scale:0.8}); };
                          }; r.readAsDataURL(f);
                        }
                      }} />
                      <div className="w-32 h-32 bg-slate-900 rounded-[40px] flex items-center justify-center text-7xl mb-10 group-hover:scale-110 group-hover:bg-pink-500 transition-all shadow-2xl">📸</div>
                      <p className="font-black text-4xl text-white italic text-center tracking-tighter">이미지를 선택하세요</p>
                      <p className="mt-4 text-slate-500 font-bold text-xs uppercase tracking-[0.4em]">Drop your creative work</p>
                    </div>
                  </div>
                )}

                {(step === 'FRAME' || step === 'TEXT') && (
                  <div className="flex flex-col lg:flex-row gap-16 h-full min-h-0 items-center justify-center animate-in fade-in zoom-in-95">
                    <div className="flex-1 flex flex-col items-center min-h-0 w-full lg:max-w-5xl">
                      <div className="bg-slate-900/40 rounded-[100px] shadow-2xl p-16 lg:p-28 w-full flex-1 flex items-center justify-center relative overflow-hidden border border-slate-800/50 backdrop-blur-xl">
                        <div className="absolute inset-0 workspace-pattern opacity-10"></div>
                        <div ref={frameContainerRef} className="relative bg-white shadow-2xl overflow-hidden rounded-xl group/canvas z-10"
                             style={{ width: 'min(900px, 100%)', aspectRatio: `${canvasDim.w}/${canvasDim.h}`, border: '4px solid #000' }}
                             onMouseDown={e=>{
                               if (step === 'FRAME') {
                                 frameDragRef.current={isDragging:true, startX:e.clientX, startY:e.clientY, initialX:crop.x, initialY:crop.y, initialPropX:0, initialPropY:0};
                               }
                             }}
                             onMouseMove={e=>{
                               if(!frameDragRef.current.isDragging) return;
                               const rect=frameContainerRef.current!.getBoundingClientRect();
                               if(step==='FRAME') {
                                 setCrop(prev=>({...prev, x:frameDragRef.current.initialX+(e.clientX-frameDragRef.current.startX)*(canvasDim.w/rect.width), y:frameDragRef.current.initialY+(e.clientY-frameDragRef.current.startY)*(canvasDim.h/rect.height)}));
                               } else if (step === 'TEXT' && selectedTextId) {
                                 const dx = ((e.clientX - frameDragRef.current.startX) / rect.width) * 100;
                                 const dy = ((e.clientY - frameDragRef.current.startY) / rect.height) * 100;
                                 setTextLayers(prev => prev.map(l => l.id === selectedTextId ? { ...l, x: Math.max(0, Math.min(100, frameDragRef.current.initialPropX + dx)), y: Math.max(0, Math.min(100, frameDragRef.current.initialPropY + dy)) } : l));
                               }
                             }}
                             onMouseUp={()=>{frameDragRef.current.isDragging=false;}}>
                          <canvas ref={previewCanvasRef} width={canvasDim.w} height={canvasDim.h} className={`w-full h-full pointer-events-none ${step === 'FRAME' ? 'cursor-move' : ''}`} style={{imageRendering:'pixelated'}} />
                          
                          {/* 북커버 가이드라인 디자인 개편 */}
                          {studioMode === 'BOOK_COVER' && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                               <div className="absolute inset-y-0 left-1/2 w-[2px] bg-pink-500/50 dashed-line" />
                               <div className="absolute left-[15%] top-12 bg-pink-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">BACK</div>
                               <div className="absolute left-1/2 top-12 -translate-x-1/2 bg-cyan-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">SIDE</div>
                               <div className="absolute right-[15%] top-12 bg-pink-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">FRONT</div>
                            </div>
                          )}

                          {textLayers.map(l => (
                            <div key={l.id} 
                                 className={`absolute cursor-move font-black whitespace-nowrap select-none ${selectedTextId === l.id ? 'ring-4 ring-pink-500 ring-offset-4 rounded px-2 z-50 bg-white/60' : ''}`}
                                 style={{ left: `${l.x}%`, top: `${l.y}%`, transform: 'translate(-50%, -50%)', color: l.color, fontSize: `calc(${l.size}px * (900 / ${canvasDim.w}))` }}
                                 onMouseDown={e => {
                                   e.stopPropagation();
                                   setSelectedTextId(l.id);
                                   frameDragRef.current = { isDragging: true, startX: e.clientX, startY: e.clientY, initialX: 0, initialY: 0, initialPropX: l.x, initialPropY: l.y };
                                 }}>
                              {l.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-full lg:w-[440px] shrink-0 z-20">
                      <div className="bg-slate-900 p-14 rounded-[70px] shadow-2xl space-y-12 border border-slate-800">
                         <div className="flex items-center justify-between border-b border-slate-800 pb-8">
                            <h3 className="font-black italic text-2xl text-white">Inspector</h3>
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">{studioMode}</span>
                         </div>
                         {step === 'FRAME' ? (
                           <div className="space-y-12">
                             <div className="space-y-8">
                                <div className="flex items-center justify-between px-2">
                                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Image Scale</label>
                                  <span className="bg-slate-800 px-4 py-1.5 rounded-xl font-black text-pink-500 text-xs">{Math.round(crop.scale * 100)}%</span>
                                </div>
                                <input type="range" min="0.1" max="5" step="0.01" value={crop.scale} onChange={e=>setCrop({...crop, scale:Number(e.target.value)})} className="w-full accent-pink-500 h-2.5 rounded-full cursor-pointer bg-slate-800" />
                             </div>

                             <div className="space-y-5">
                               <div className="grid grid-cols-2 gap-5">
                                  <button onClick={resetPosition} className="py-5 bg-slate-800 text-slate-300 rounded-[24px] font-black text-xs hover:bg-slate-700 transition-all active:scale-95 shadow-lg">위치 초기화</button>
                                  <button onClick={resetScale} className="py-5 bg-slate-800 text-slate-300 rounded-[24px] font-black text-xs hover:bg-slate-700 transition-all active:scale-95 shadow-lg">스케일 초기화</button>
                               </div>
                               <button onClick={fitToCanvas} className="w-full py-6 bg-slate-800 text-white rounded-[24px] font-black text-sm hover:bg-slate-700 transition-all flex items-center justify-center gap-3 shadow-lg">
                                  <span className="text-xl">⤢</span> 캔버스에 가득 채우기
                               </button>
                             </div>

                             <button onClick={() => studioMode === 'BOOK_COVER' ? setStep('TEXT') : startPixelation()} className="w-full py-9 bg-pink-500 text-white rounded-[40px] font-black text-2xl shadow-2xl shadow-pink-500/30 hover:bg-pink-400 transition-all flex items-center justify-center gap-4 active:scale-95">
                               레이아웃 완료 ➔
                             </button>
                           </div>
                         ) : (
                           <div className="space-y-10 animate-in slide-in-from-bottom-8">
                             <button onClick={() => {
                               const n: TextLayer = { id: `t-${Date.now()}`, text: 'Type Here', x: 50, y: 50, size: 8, color: '#000000' };
                               setTextLayers([...textLayers, n]);
                               setSelectedTextId(n.id);
                             }} className="w-full py-6 bg-white text-slate-900 rounded-[30px] font-black text-sm shadow-xl hover:bg-slate-100 transition-all">+ 텍스트 레이어 추가</button>
                             
                             {selectedText && (
                               <div className="p-10 bg-slate-800/50 rounded-[50px] space-y-8 border border-slate-700/50">
                                  <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Text Content</label>
                                    <input type="text" value={selectedText.text} onChange={e => setTextLayers(prev => prev.map(l => l.id === selectedTextId ? { ...l, text: e.target.value } : l))} className="w-full p-5 bg-slate-900 border-none rounded-2xl font-black text-sm text-white outline-none ring-2 ring-slate-700 focus:ring-pink-500 transition-all" />
                                  </div>
                                  <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Font Size ({selectedText.size}px)</label>
                                    <input type="range" min="4" max="40" value={selectedText.size} onChange={e => setTextLayers(prev => prev.map(l => l.id === selectedTextId ? { ...l, size: Number(e.target.value) } : l))} className="w-full accent-pink-500" />
                                  </div>
                                  <div className="flex gap-5 items-center">
                                    <div className="flex-1 space-y-2">
                                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Color</label>
                                       <input type="color" value={selectedText.color} onChange={e => setTextLayers(prev => prev.map(l => l.id === selectedTextId ? { ...l, color: e.target.value } : l))} className="w-full h-14 border-none rounded-2xl bg-slate-900 cursor-pointer p-1" />
                                    </div>
                                    <button onClick={() => setTextLayers(prev => prev.filter(l => l.id !== selectedTextId))} className="px-6 h-14 bg-red-500/10 text-red-500 font-black text-xs rounded-2xl hover:bg-red-500 hover:text-white shadow-sm transition-all mt-6">삭제</button>
                                  </div>
                               </div>
                             )}
                             <button onClick={startPixelation} className="w-full py-9 bg-pink-500 text-white rounded-[40px] font-black text-2xl shadow-2xl hover:bg-pink-400 transition-all active:scale-95">변환 프로세스 시작</button>
                           </div>
                         )}
                         <button onClick={() => setStep(step === 'TEXT' ? 'FRAME' : 'UPLOAD')} className="w-full py-2 text-slate-600 font-black text-[10px] uppercase tracking-[0.4em] hover:text-slate-400 transition-colors">Go Back</button>
                      </div>
                    </div>
                  </div>
                )}

                {step === 'EDITOR' && pixelData && (
                  <div className="flex flex-col lg:flex-row gap-10 h-full min-h-0 animate-in fade-in overflow-hidden">
                    <div className="flex-1 flex flex-col gap-8 min-h-0 overflow-hidden">
                      <div className="bg-slate-900/40 p-6 rounded-[40px] border border-slate-800/50 flex items-center justify-between shrink-0 relative z-[100] backdrop-blur-md">
                         <button onClick={()=>setStep(studioMode === 'BOOK_COVER' ? 'TEXT' : 'FRAME')} className="px-6 py-3 bg-slate-800 border border-slate-700 rounded-2xl font-black text-[10px] text-slate-400 hover:bg-slate-700 hover:text-white transition-all">이전 단계</button>
                         <div className="flex items-center gap-5 ml-2">
                            <button onClick={()=>setShowTipModal(true)} className="px-6 py-3 bg-pink-500/10 text-pink-400 rounded-2xl font-black text-[10px] border border-pink-500/20">💡 PRO TIPS</button>
                            <div className="bg-slate-800 p-1.5 rounded-2xl flex items-center gap-4">
                               <button onClick={()=>setZoom(z=>Math.max(100,z-100))} className="w-10 h-10 font-black bg-slate-900 text-white hover:bg-pink-500 rounded-xl transition-all shadow-lg">-</button>
                               <span className="text-[11px] font-black w-14 text-center text-white">{zoom}%</span>
                               <button onClick={()=>setZoom(z=>Math.min(1000,z+100))} className="w-10 h-10 font-black bg-slate-900 text-white hover:bg-pink-500 rounded-xl transition-all shadow-lg">+</button>
                            </div>
                            <div className="relative">
                              <button onClick={(e) => { e.stopPropagation(); setShowExportMenu(!showExportMenu); }} className="px-10 py-4 bg-white text-slate-900 rounded-2xl font-black shadow-2xl text-xs uppercase tracking-[0.2em] hover:bg-pink-500 hover:text-white transition-all">Export {showExportMenu ? '▲' : '▼'}</button>
                              {showExportMenu && (
                                <>
                                  <div className="fixed inset-0 z-[140] lg:hidden" onClick={() => setShowExportMenu(false)} />
                                  <div className="absolute right-0 mt-5 w-80 bg-slate-900 rounded-[40px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] border border-slate-800 p-4 z-[150] animate-in zoom-in-95 origin-top-right overflow-hidden" onClick={e=>e.stopPropagation()}>
                                    <div className="p-6 bg-slate-800 rounded-[30px] mb-3">
                                      <label className="text-[9px] font-black text-slate-500 block mb-3 uppercase tracking-widest">Grid Split Size (px)</label>
                                      <input type="number" value={splitSize} onChange={(e) => setSplitSize(Math.max(1, Number(e.target.value)))} className="w-full p-4 bg-slate-900 border-none rounded-2xl text-center font-black text-lg text-white outline-none focus:ring-2 focus:ring-pink-500" />
                                    </div>
                                    <button disabled={isExporting} onClick={exportAsZip} className={`w-full p-6 text-left hover:bg-slate-800 flex items-center gap-5 rounded-[30px] transition-all group ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                      <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-pink-500 transition-colors">{isExporting ? '⏳' : '📦'}</div>
                                      <div>
                                        <p className="font-black text-white text-sm">ZIP Guide Download</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-1">Ready for Minecraft/Town</p>
                                      </div>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                         </div>
                      </div>
                      
                      <div ref={editorScrollRef} className="flex-1 bg-slate-900/20 rounded-[80px] overflow-auto relative border border-slate-800/50 custom-scrollbar z-10 backdrop-blur-sm"
                           style={{ '--cell-size': `${zoom / 20}px` } as any}
                           onMouseDown={e=>{if(e.button!==0)return; isPanningRef.current=true; panStartPos.current={x:e.pageX, y:e.pageY, scrollLeft:editorScrollRef.current!.scrollLeft, scrollTop:editorScrollRef.current!.scrollTop}; editorScrollRef.current!.style.cursor='grabbing';}}
                           onMouseMove={e=>{if(!isPanningRef.current)return; editorScrollRef.current!.scrollLeft=panStartPos.current.scrollLeft-(e.pageX-panStartPos.current.x); editorScrollRef.current!.scrollTop=panStartPos.current.scrollTop-(e.pageY-panStartPos.current.y);}}
                           onMouseUp={()=>{isPanningRef.current=false; if(editorScrollRef.current) editorScrollRef.current.style.cursor='default';}}>
                        <div className="inline-block p-[300px]">
                          <div className="bg-slate-900 p-12 border-[16px] border-black shadow-2xl rounded-sm">
                            <div className="pixel-grid border-none shadow-none" style={{ gridTemplateColumns: `repeat(${pixelData.width}, var(--cell-size))` }}>
                              {pixelData.colors.map((color, idx) => {
                                const pId = paletteIndexMap.get(color);
                                const pNum = pixelData.palette.findIndex(p => p.hex === color) + 1;
                                const isSelected = activePaletteId === pId;
                                const colIndex = idx % pixelData.width;
                                const rowIndex = Math.floor(idx / pixelData.width);
                                const borderRight = (colIndex + 1) % 5 === 0 ? '1.5px solid rgba(255,255,255,0.2)' : '0.5px solid rgba(255,255,255,0.05)';
                                const borderBottom = (rowIndex + 1) % 5 === 0 ? '1.5px solid rgba(255,255,255,0.2)' : '0.5px solid rgba(255,255,255,0.05)';
                                return (
                                  <div key={idx} 
                                       style={{ backgroundColor: color, width: 'var(--cell-size)', height: 'var(--cell-size)', color: getContrastColor(color), fontSize: zoom >= 250 ? Math.max(6, zoom / 65) + 'px' : '0px', borderRight, borderBottom }}
                                       className={`pixel-item flex items-center justify-center font-black transition-none ${isSelected ? 'ring-4 ring-pink-500 scale-125 z-10 shadow-2xl shadow-pink-500/50' : 'hover:opacity-80'}`}
                                       onClick={() => setActivePaletteId(isSelected ? null : pId)}>
                                    {zoom >= 250 && pNum}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="w-full lg:w-[400px] bg-slate-900 p-12 rounded-[80px] shadow-2xl border border-slate-800 shrink-0 flex flex-col min-h-0 z-20">
                      <div className="flex items-center justify-between mb-10 shrink-0">
                         <h3 className="font-black italic text-3xl flex items-center gap-4 text-white">Palette <span className="text-[11px] bg-slate-800 px-4 py-1.5 rounded-full not-italic text-slate-500 border border-slate-700">{pixelData.palette.length}</span></h3>
                         <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Master</span>
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar pr-3">
                        <div className="grid grid-cols-1 gap-5">
                          {pixelData.palette.map((p, i) => (
                            <div key={p.index} onClick={()=>setActivePaletteId(activePaletteId===p.index?null:p.index)} 
                                 className={`flex items-center gap-6 p-5 rounded-[32px] border-2 transition-all cursor-pointer ${activePaletteId===p.index?'bg-slate-800 border-pink-500 shadow-xl scale-[1.02]':'border-transparent hover:bg-slate-800/50 hover:border-slate-800'}`}>
                              <div className="w-16 h-16 rounded-[22px] flex items-center justify-center font-black text-lg border-2 border-slate-900 shadow-inner shrink-0" style={{backgroundColor:p.hex, color:getContrastColor(p.hex)}}>{i+1}</div>
                              <div className="flex-1 min-w-0 pr-1">
                                <div className="flex items-center gap-4 w-full">
                                  <p className="text-base font-black truncate text-white italic">{p.index}</p>
                                  <span className="text-[11px] bg-slate-900 text-slate-400 px-3 py-1.5 rounded-xl font-black shrink-0 border border-slate-800">{p.count} PX</span>
                                </div>
                                <p className="text-[11px] font-mono text-slate-600 uppercase tracking-widest mt-1.5">{p.hex}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-10 animate-pulse text-slate-800"><div className="text-[160px] opacity-10">🚀</div><div className="font-black italic text-5xl uppercase tracking-[0.5em] opacity-10">{activeView} HUB</div></div>
            )}
          </div>
        </div>
      </main>

      {/* 팁 모달 - 디자인 개편 */}
      {showTipModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-2xl z-[1000] flex items-center justify-center p-8 animate-in fade-in" onClick={() => setShowTipModal(false)}>
          <div className="bg-slate-900 w-full max-w-3xl rounded-[80px] shadow-2xl border border-slate-800 overflow-hidden animate-in zoom-in-95" onClick={e=>e.stopPropagation()}>
            <div className="p-16 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
               <div>
                 <h2 className="text-5xl font-black italic tracking-tighter text-white">STUDIO TIPS</h2>
                 <p className="text-pink-500 font-black text-xs mt-2 uppercase tracking-[0.3em]">Advanced User Manual</p>
               </div>
               <button onClick={() => setShowTipModal(false)} className="w-16 h-16 bg-slate-800 rounded-[30px] font-black text-slate-400 hover:bg-pink-500 hover:text-white transition-all flex items-center justify-center text-3xl shadow-xl">✕</button>
            </div>
            <div className="p-16 space-y-12 overflow-y-auto max-h-[70vh] custom-scrollbar">
              <div className="bg-slate-800/50 p-12 rounded-[50px] border border-slate-800">
                 <h4 className="font-black text-3xl mb-6 italic text-white flex items-center gap-4"><span className="w-3 h-3 bg-pink-500 rounded-full"></span> 저장 및 다운로드</h4>
                 <p className="text-slate-400 text-base leading-relaxed">내보내기 버튼 클릭 시 <span className="text-pink-500 font-black underline">{splitSize}px 크기의 고해상도 가이드 도안</span>들이 포함된 ZIP 파일이 생성됩니다. 픽셀 번호가 선명하게 인쇄되어 제작 편의성을 높였습니다.</p>
              </div>
              <img src={PALETTE_GUIDE_IMG} className="w-full h-auto rounded-[50px] shadow-2xl border border-slate-800" alt="Guide" />
            </div>
          </div>
        </div>
      )}

      {/* 이용 면책사항 모달 - 디자인 개편 */}
      {activeView === 'HOME' && showNotice && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-500">
          <div className="bg-slate-900 rounded-[80px] shadow-[0_60px_150px_-20px_rgba(0,0,0,1)] max-w-4xl w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-500 border border-slate-800">
            <div className="p-16 border-b border-slate-800 bg-slate-900/50 flex flex-col items-center">
              <div className="w-24 h-24 bg-pink-500/10 rounded-[40px] flex items-center justify-center mb-8 border border-pink-500/20 shadow-2xl shadow-pink-500/10">
                <span className="text-5xl">⚖️</span>
              </div>
              <h3 className="text-4xl font-black italic tracking-tighter text-white uppercase text-center">Art Studio 이용 면책사항</h3>
              <p className="mt-2 text-pink-500 font-black text-[10px] tracking-[0.5em] uppercase">Terms of service & Responsibility</p>
            </div>
            <div className="p-16 lg:p-20 overflow-y-auto custom-scrollbar max-h-[55vh] space-y-12 text-slate-400 text-base lg:text-lg leading-relaxed">
              <div className="space-y-6 group">
                <h4 className="font-black text-2xl italic text-white flex items-center gap-4 transition-all group-hover:text-pink-500"><span className="w-2 h-2 bg-pink-500 rounded-full"></span> 1. 결과물의 정확성 및 품질</h4>
                <p>
                  본 서비스는 이미지를 픽셀화하여 도안을 생성하는 보조 도구입니다. 원본 이미지의 품질, 조명, 색상 구성에 따라 변환된 도안의 결과가 실제와 다를 수 있으며, 이에 따른 디자인의 정확성을 100% 보장하지 않습니다.<br/><br/>
                  사용자는 도안을 실제 제작(자수, 블록 등)에 사용하기 전, 반드시 색상과 칸수를 최종 확인해야 합니다.
                </p>
              </div>
              <div className="space-y-6 group">
                <h4 className="font-black text-2xl italic text-white flex items-center gap-4 transition-all group-hover:text-pink-500"><span className="w-2 h-2 bg-pink-500 rounded-full"></span> 2. 저작권 및 사용 책임</h4>
                <p>
                  사용자가 업로드하는 이미지에 대한 저작권 책임은 전적으로 사용자 본인에게 있습니다. 저작권이 있는 이미지(캐릭터, 타인의 작품 등)를 무단 사용하여 발생하는 법적 분쟁에 대해 서비스는 책임을 지지 않습니다.<br/><br/>
                  생성된 도안을 상업적으로 이용할 경우, 원본 이미지의 저작권 규정을 준수해야 합니다.
                </p>
              </div>
              <div className="space-y-6 group">
                <h4 className="font-black text-2xl italic text-white flex items-center gap-4 transition-all group-hover:text-pink-500"><span className="w-2 h-2 bg-pink-500 rounded-full"></span> 3. 데이터 보관 및 손실</h4>
                <p>
                  본 서비스는 브라우저 기반으로 작동하며, 별도의 서버에 사용자의 이미지를 영구 저장하지 않습니다. 브라우저 종료, 캐시 삭제 등으로 인해 발생하는 작업 데이터 손실에 대해서는 책임을 지지 않으므로, 작업 완료 후 반드시 <span className="text-white font-black">**[Export]**</span>를 통해 파일을 저장하시기 바랍니다.
                </p>
              </div>
              <div className="space-y-6 group">
                <h4 className="font-black text-2xl italic text-white flex items-center gap-4 transition-all group-hover:text-pink-500"><span className="w-2 h-2 bg-pink-500 rounded-full"></span> 4. 서비스 이용 환경</h4>
                <p>
                  사용자 기기의 성능, 브라우저 버전, 네트워크 상태에 따라 서비스 이용 및 파일 다운로드(ZIP, JSON)가 원활하지 않을 수 있습니다. 권장 브라우저(Chrome 등) 환경에서의 이용을 권장합니다.
                </p>
              </div>
            </div>
            <div className="p-16 bg-slate-900/50 border-t border-slate-800">
              <button onClick={() => setShowNotice(false)} className="w-full py-9 bg-white text-slate-900 rounded-[50px] font-black text-3xl shadow-2xl hover:bg-pink-500 hover:text-white transition-all transform hover:-translate-y-2 active:scale-95">동의하고 시작하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
