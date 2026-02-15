
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppStep, PixelData, StudioMode, ColorInfo, TOWN_PALETTE_HEX, TextLayer } from './types';
import { processArtStudioPixel } from './services/pixelService';
import JSZip from 'jszip';

type MainView = 'HOME' | 'STUDIO' | 'DESIGN_FEED' | 'RECORD_SHOP';

const PALETTE_GUIDE_IMG = "https://raw.githubusercontent.com/hippoo0927-jpg/TownHub/main/palette-guide.png";

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
  const frameDragRef = useRef({ isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0 });
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

  const exportAsJson = () => {
    if (!pixelData) return;
    const artData = {
      metadata: { title: "TownHub_Design", dimensions: canvasDim, mode: studioMode, timestamp: new Date().toISOString() },
      palette: pixelData.palette,
      pixels: pixelData.colors
    };
    const blob = new Blob([JSON.stringify(artData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `town_design_${Date.now()}.json`;
    a.click();
    setShowExportMenu(false);
    showToast("JSON 다운로드 완료!");
  };

  const exportAsZip = async () => {
    if (!pixelData) return;
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
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = `town_art_guide_${Date.now()}.zip`;
    a.click();
    setShowExportMenu(false);
    showToast("가이드 ZIP 생성 완료!");
  };

  const startPixelation = async () => {
    if (!previewCanvasRef.current) return;
    setIsProcessing(true);
    const ctx = previewCanvasRef.current.getContext('2d');
    if (ctx && studioMode === 'BOOK_COVER' && textLayers.length > 0) {
      textLayers.forEach(l => {
        if (!l.text.trim()) return;
        ctx.fillStyle = l.color;
        ctx.font = `bold ${l.size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(l.text, (l.x / 100) * canvasDim.w, (l.y / 100) * canvasDim.h);
      });
    }
    setTimeout(async () => {
      try {
        const data = await processArtStudioPixel(previewCanvasRef.current!.toDataURL(), canvasDim.w, canvasDim.h, 64, { x: 0, y: 0, scale: 1 });
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
    }
  }, [step, crop, canvasDim]);

  const Sidebar = () => (
    <aside className="w-full lg:w-[260px] bg-[#030712] flex lg:flex-col shrink-0 border-r border-slate-900 z-50 overflow-x-auto lg:overflow-x-hidden">
      <div className="p-6 lg:p-8 flex lg:flex-col items-center lg:items-stretch gap-4 lg:gap-0 h-full">
        <div className="flex items-center gap-3 text-white lg:mb-12 cursor-pointer shrink-0" onClick={() => { setActiveView('HOME'); setStep('MODE_SELECT'); }}>
          <div className="w-9 h-9 bg-pink-600 rounded-lg flex items-center justify-center font-black text-lg">T</div>
          <span className="font-black italic text-xl tracking-tighter hidden sm:inline">TownHub</span>
        </div>
        <nav className="flex lg:flex-col gap-2 flex-1">
          {[
            { id: 'HOME', label: 'Home', icon: '🏠' },
            { id: 'STUDIO', label: 'Art Studio', icon: '🎨' },
            { id: 'DESIGN_FEED', label: 'Feed', icon: '🖼️' },
            { id: 'RECORD_SHOP', label: 'Shop', icon: '🛍️' }
          ].map(item => (
            <button key={item.id} onClick={() => { setActiveView(item.id as MainView); if(item.id === 'STUDIO') setStep('MODE_SELECT'); }}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${activeView === item.id ? 'bg-[#EC4899] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'}`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="hidden lg:inline">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="hidden lg:flex mt-auto pt-8 border-t border-slate-900 flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/20">🦛</div>
            <div>
              <h4 className="text-white font-black text-sm italic">히포 (Hippoo)</h4>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">MASTER ARTISAN</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed italic">"여러분들을 위해 두근두근타운에 맞는 픽셀아트 스튜디오를 만들었습니다!"</p>
          <a href="https://www.youtube.com/@Hippoo_Hanuu" target="_blank" rel="noopener noreferrer" 
             className="w-full py-3.5 bg-[#EF4444] text-white rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center hover:bg-red-600 transition-all shadow-lg shadow-red-900/20 active:scale-95">
            YOUTUBE 구독하기
          </a>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#F8FAFC] overflow-hidden font-sans select-none">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {toast && <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-8 py-4 rounded-2xl font-black shadow-2xl text-sm animate-in fade-in slide-in-from-top-4">✨ {toast}</div>}
        <header className="h-16 lg:h-20 bg-white border-b border-slate-100 flex items-center justify-between px-6 lg:px-12 shrink-0 z-40">
           <div className="flex items-center gap-4">
             <h2 className="text-sm lg:text-lg font-black text-slate-900 italic uppercase tracking-tighter">STUDIO | DASHBOARD</h2>
           </div>
        </header>

        <div className="flex-1 overflow-hidden relative">
          <div className="h-full overflow-y-auto custom-scrollbar p-6 lg:p-12">
            {activeView === 'HOME' ? (
              <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500 pb-12">
                <div className="bg-[#0F172A] rounded-[48px] p-10 lg:p-24 text-white shadow-2xl relative overflow-hidden">
                  <div className="relative z-10 space-y-8 max-w-3xl">
                    <span className="bg-[#EC4899] text-white px-5 py-2 rounded-full font-black text-[11px] uppercase tracking-widest italic inline-block">OFFICIAL CREATIVE HUB</span>
                    <h1 className="text-5xl lg:text-8xl font-black italic tracking-tighter leading-[0.9]">Town Square Art Studio</h1>
                    <button onClick={() => { setActiveView('STUDIO'); setStep('MODE_SELECT'); }} 
                            className="px-10 py-5 bg-[#EC4899] rounded-2xl font-black text-lg hover:bg-[#DB2777] transition-all shadow-xl shadow-pink-900/30">스튜디오 시작</button>
                  </div>
                </div>
              </div>
            ) : activeView === 'STUDIO' ? (
              <div className="h-full max-w-7xl mx-auto flex flex-col">
                {step === 'MODE_SELECT' && (
                  <div className="flex-1 flex items-center justify-center grid grid-cols-1 md:grid-cols-2 gap-8">
                    <button onClick={() => { setStudioMode('PATTERN'); setStep('SETUP'); setCanvasDim({w:48, h:48}); }} className="bg-white p-16 rounded-[48px] shadow-xl border-4 border-transparent hover:border-[#EC4899] transition-all flex flex-col items-center group">
                      <div className="text-5xl mb-8 group-hover:scale-110 transition-all">🎨</div><h3 className="text-3xl font-black italic text-slate-900">픽셀 도안 제작</h3>
                    </button>
                    <button onClick={() => { setStudioMode('BOOK_COVER'); setCanvasDim({w:150, h:84}); setStep('UPLOAD'); }} className="bg-white p-16 rounded-[48px] shadow-xl border-4 border-transparent hover:border-[#EC4899] transition-all flex flex-col items-center group">
                      <div className="text-5xl mb-8 group-hover:scale-110 transition-all">📖</div><h3 className="text-3xl font-black italic text-slate-900">북커버 제작</h3>
                    </button>
                  </div>
                )}

                {step === 'SETUP' && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="bg-white p-12 lg:p-20 rounded-[48px] shadow-2xl max-w-lg w-full border border-slate-50">
                      <h2 className="text-4xl font-black mb-10 italic">Dimension Setup</h2>
                      <div className="grid grid-cols-2 gap-6 mb-10">
                        <input type="number" value={canvasDim.w} onChange={e=>setCanvasDim({...canvasDim, w:Number(e.target.value)})} className="w-full p-6 bg-slate-50 rounded-3xl font-black text-3xl text-center border focus:border-pink-500 outline-none" />
                        <input type="number" value={canvasDim.h} onChange={e=>setCanvasDim({...canvasDim, h:Number(e.target.value)})} className="w-full p-6 bg-slate-50 rounded-3xl font-black text-3xl text-center border focus:border-pink-500 outline-none" />
                      </div>
                      <button onClick={()=>setStep('UPLOAD')} className="w-full py-7 bg-[#0F172A] text-white rounded-[32px] font-black text-xl shadow-xl hover:bg-black transition-all">다음 단계로</button>
                    </div>
                  </div>
                )}

                {step === 'UPLOAD' && (
                  <div className="flex-1 flex items-center justify-center">
                    <div onClick={()=>fileInputRef.current?.click()} className="w-full max-w-4xl aspect-[16/8] bg-white rounded-[60px] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-pink-500 transition-all group">
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                        const f = e.target.files?.[0]; if (f) {
                          const r = new FileReader(); r.onload = (ev) => {
                            const img = new Image(); img.src = ev.target?.result as string;
                            img.onload = () => { imageObjRef.current = img; setUploadedImg(img.src); setStep('FRAME'); };
                          }; r.readAsDataURL(f);
                        }
                      }} />
                      <div className="text-5xl mb-6 group-hover:scale-110 transition-all">📸</div>
                      <p className="font-black text-2xl text-slate-900 italic">이미지를 선택하세요</p>
                    </div>
                  </div>
                )}

                {(step === 'FRAME' || step === 'TEXT') && (
                  <div className="flex flex-col lg:flex-row gap-10 h-full min-h-0">
                    <div className="flex-1 flex flex-col items-center min-h-0">
                      <div className="bg-white rounded-[60px] shadow-2xl p-6 lg:p-20 w-full flex-1 flex items-center justify-center workspace-pattern relative overflow-hidden border border-slate-50">
                        <div ref={frameContainerRef} className="relative bg-white border-4 border-slate-900 shadow-2xl overflow-hidden cursor-move"
                             style={{ width: 'min(700px, 100%)', aspectRatio: `${canvasDim.w}/${canvasDim.h}` }}
                             onMouseDown={e=>{ frameDragRef.current={isDragging:true, startX:e.clientX, startY:e.clientY, initialX:crop.x, initialY:crop.y}; }}
                             onMouseMove={e=>{
                               if(!frameDragRef.current.isDragging) return;
                               const rect=frameContainerRef.current!.getBoundingClientRect();
                               if(step==='FRAME') setCrop(prev=>({...prev, x:frameDragRef.current.initialX+(e.clientX-frameDragRef.current.startX)*(canvasDim.w/rect.width), y:frameDragRef.current.initialY+(e.clientY-frameDragRef.current.startY)*(canvasDim.h/rect.height)}));
                             }}
                             onMouseUp={()=>frameDragRef.current.isDragging=false}>
                          <canvas ref={previewCanvasRef} width={canvasDim.w} height={canvasDim.h} className="w-full h-full pointer-events-none" style={{imageRendering:'pixelated'}} />
                          <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`, backgroundSize: `${100 / canvasDim.w}% ${100 / canvasDim.h}%` }} />
                          {step==='TEXT' && textLayers.map(l=>(
                            <div key={l.id} className="absolute cursor-move font-black whitespace-nowrap" style={{left:`${l.x}%`, top:`${l.y}%`, transform:'translate(-50%,-50%)', color:l.color, fontSize:`${l.size*2}px` }} 
                                 onMouseDown={e=>{e.stopPropagation(); setSelectedTextId(l.id);}} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="w-full lg:w-80 space-y-6 shrink-0">
                      <div className="bg-white p-8 rounded-[40px] shadow-xl space-y-8 border border-slate-50">
                         <h3 className="font-black italic text-xl">Controls</h3>
                         {step==='FRAME' ? (
                           <>
                             <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">🔍 SCALE ZOOM</label>
                                <input type="range" min="0.1" max="5" step="0.01" value={crop.scale} onChange={e=>setCrop({...crop, scale:Number(e.target.value)})} className="w-full accent-pink-500" />
                             </div>
                             <button onClick={()=>studioMode==='PATTERN'?startPixelation():setStep('TEXT')} className="w-full py-6 bg-[#EC4899] text-white rounded-3xl font-black shadow-lg hover:bg-[#DB2777] transition-all">다음 단계</button>
                           </>
                         ) : (
                           <>
                             <button onClick={()=>{const n:TextLayer={id:`t-${Date.now()}`, text:'Text Here', x:50, y:50, size:14, color:'#000000'}; setTextLayers([...textLayers, n]); setSelectedTextId(n.id);}} className="w-full py-5 bg-slate-100 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all">+ 텍스트 추가</button>
                             <button onClick={startPixelation} className="w-full py-6 bg-[#EC4899] text-white rounded-3xl font-black shadow-lg hover:bg-[#DB2777] transition-all">변환 시작</button>
                           </>
                         )}
                      </div>
                    </div>
                  </div>
                )}

                {step === 'EDITOR' && pixelData && (
                  <div className="flex flex-col lg:flex-row gap-8 h-full min-h-0 animate-in fade-in overflow-hidden">
                    <div className="flex-1 flex flex-col gap-6 min-h-0 overflow-hidden">
                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between shrink-0">
                         <button onClick={()=>setStep(studioMode==='PATTERN'?'FRAME':'TEXT')} className="px-6 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-xs text-slate-500 hover:bg-slate-100 transition-all">이전 단계</button>
                         <div className="flex items-center gap-3">
                            <button onClick={()=>setShowTipModal(true)} className="px-6 py-3 bg-orange-100 text-orange-600 rounded-xl font-black text-xs hover:bg-orange-200 transition-all">💡 Tip</button>
                            <div className="bg-slate-100 p-1.5 rounded-xl flex items-center gap-3">
                               <button onClick={()=>setZoom(z=>Math.max(100,z-100))} className="w-10 h-10 font-black hover:bg-slate-200 rounded-lg transition-all">-</button>
                               <span className="text-[10px] font-black w-12 text-center">{zoom}%</span>
                               <button onClick={()=>setZoom(z=>Math.min(1000,z+100))} className="w-10 h-10 font-black hover:bg-slate-200 rounded-lg transition-all">+</button>
                            </div>
                            <div className="relative">
                              <button onClick={() => setShowExportMenu(!showExportMenu)} className="px-10 py-4 bg-[#EC4899] text-white rounded-2xl font-black shadow-xl shadow-pink-900/20 hover:bg-[#DB2777] transition-all flex items-center gap-2">내보내기 {showExportMenu ? '▴' : '▾'}</button>
                              {showExportMenu && (
                                <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border p-2 z-[100] animate-in slide-in-from-top-2">
                                  <div className="p-4 bg-slate-50 rounded-xl mb-2">
                                    <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-widest">분할 크기 (px)</label>
                                    <input type="number" value={splitSize} onChange={(e) => setSplitSize(Math.max(1, Number(e.target.value)))} className="w-full p-2 border rounded-lg text-center font-black outline-none focus:border-pink-500" />
                                  </div>
                                  <button onClick={exportAsZip} className="w-full p-4 text-left hover:bg-slate-50 flex items-center gap-3 rounded-xl transition-colors"><span>📦</span> <div><p className="font-black text-sm">ZIP 가이드 저장</p><p className="text-[10px] text-slate-400">숫자 포함 고해상도</p></div></button>
                                  <button onClick={exportAsJson} className="w-full p-4 text-left hover:bg-slate-50 flex items-center gap-3 rounded-xl transition-colors"><span>📄</span> <span className="font-black text-sm">JSON 데이터 저장</span></button>
                                </div>
                              )}
                            </div>
                         </div>
                      </div>
                      
                      <div ref={editorScrollRef} className="flex-1 bg-white rounded-[48px] overflow-auto relative workspace-pattern border border-slate-100 custom-scrollbar"
                           style={{ '--cell-size': `${zoom / 20}px` } as any}
                           onMouseDown={e=>{if(e.button!==0)return; isPanningRef.current=true; panStartPos.current={x:e.pageX, y:e.pageY, scrollLeft:editorScrollRef.current!.scrollLeft, scrollTop:editorScrollRef.current!.scrollTop}; editorScrollRef.current!.style.cursor='grabbing';}}
                           onMouseMove={e=>{if(!isPanningRef.current)return; editorScrollRef.current!.scrollLeft=panStartPos.current.scrollLeft-(e.pageX-panStartPos.current.x); editorScrollRef.current!.scrollTop=panStartPos.current.scrollTop-(e.pageY-panStartPos.current.y);}}
                           onMouseUp={()=>{isPanningRef.current=false; if(editorScrollRef.current) editorScrollRef.current.style.cursor='default';}}>
                        <div className="inline-block p-[200px]">
                          <div className="bg-white p-6 border-[8px] border-slate-900 shadow-2xl rounded-sm">
                            <div className="pixel-grid" style={{ gridTemplateColumns: `repeat(${pixelData.width}, var(--cell-size))` }}>
                              {pixelData.colors.map((color, idx) => {
                                const pId = paletteIndexMap.get(color);
                                const pNum = pixelData.palette.findIndex(p => p.hex === color) + 1;
                                const isSelected = activePaletteId === pId;
                                const colIndex = idx % pixelData.width;
                                const rowIndex = Math.floor(idx / pixelData.width);
                                const borderRight = (colIndex + 1) % 5 === 0 ? '1.5px solid rgba(0,0,0,0.3)' : '0.5px solid rgba(0,0,0,0.1)';
                                const borderBottom = (rowIndex + 1) % 5 === 0 ? '1.5px solid rgba(0,0,0,0.3)' : '0.5px solid rgba(0,0,0,0.1)';

                                return (
                                  <div key={idx} 
                                       style={{ backgroundColor: color, width: 'var(--cell-size)', height: 'var(--cell-size)', color: getContrastColor(color), fontSize: zoom >= 250 ? Math.max(5, zoom / 70) + 'px' : '0px', borderRight, borderBottom }}
                                       className={`pixel-item flex items-center justify-center font-black transition-none ${isSelected ? 'ring-2 ring-[#EC4899] scale-110 z-10 shadow-lg' : 'hover:opacity-80'}`}
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

                    <div className="w-full lg:w-[320px] bg-white rounded-[40px] p-8 shadow-xl border border-slate-50 shrink-0 flex flex-col min-h-0">
                      <h3 className="font-black mb-6 italic text-xl shrink-0">🎨 Palette</h3>
                      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                        <div className="grid grid-cols-4 lg:grid-cols-1 gap-3">
                          {pixelData.palette.map((p, i) => (
                            <div key={p.index} onClick={()=>setActivePaletteId(activePaletteId===p.index?null:p.index)} 
                                 className={`flex items-center gap-4 p-3 rounded-2xl border-2 transition-all cursor-pointer ${activePaletteId===p.index?'bg-pink-50 border-[#EC4899] shadow-md':'border-transparent hover:bg-slate-50'}`}>
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border shadow-inner" style={{backgroundColor:p.hex, color:getContrastColor(p.hex)}}>{i+1}</div>
                              <div className="hidden lg:block flex-1 min-w-0">
                                <p className="text-[11px] font-black truncate text-slate-900">NO.{p.index}</p>
                                <p className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter">{p.hex}</p>
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
              <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-pulse"><div className="text-8xl">🚀</div><div className="font-black italic text-3xl text-slate-200 uppercase tracking-widest">{activeView} HUB 준비 중...</div></div>
            )}
          </div>
        </div>
      </main>

      {/* 팁 모달 */}
      {showTipModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[1000] flex items-center justify-center p-6 animate-in fade-in" onClick={() => setShowTipModal(false)}>
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e=>e.stopPropagation()}>
            <div className="p-12 border-b flex justify-between items-center bg-slate-50/50">
               <div>
                 <h2 className="text-3xl font-black italic tracking-tighter">ART STUDIO TIPS</h2>
                 <p className="text-[#EC4899] font-bold text-xs mt-1 uppercase tracking-widest">Master Guide System</p>
               </div>
               <button onClick={() => setShowTipModal(false)} className="w-12 h-12 bg-white rounded-full font-black text-slate-400 shadow-sm border hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center">✕</button>
            </div>
            <div className="p-12 space-y-10">
              <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100">
                 <h4 className="font-black text-xl mb-2 italic flex items-center gap-2"><span>📂</span> 저장 안내</h4>
                 <p className="text-slate-500 text-sm leading-relaxed">내보내기 버튼 클릭 시 <span className="text-[#EC4899] font-black underline">{splitSize}px 크기의 고해상도 가이드 도안</span>들이 포함된 ZIP 파일이 생성됩니다. 숫자가 크게 적혀 있어 따라 그리기가 편리하며 5칸마다 진한 선이 그어져 있습니다.</p>
              </div>
              <img src={PALETTE_GUIDE_IMG} className="w-full h-auto rounded-3xl shadow-xl" alt="Guide" />
            </div>
          </div>
        </div>
      )}

      {/* 공지사항 모달 (면책사항 상세 버전) */}
      {activeView === 'HOME' && showNotice && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-10 lg:p-14 border-b border-slate-50 bg-slate-50/50 flex flex-col items-center">
              <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mb-6">
                <span className="text-4xl">⚖️</span>
              </div>
              <h3 className="text-2xl lg:text-3xl font-black italic tracking-tighter text-slate-900 uppercase text-center">Art Studio 이용 면책사항</h3>
            </div>
            
            <div className="p-10 lg:p-14 overflow-y-auto custom-scrollbar max-h-[50vh] space-y-8">
              <div className="space-y-4">
                <h4 className="font-black text-lg italic text-slate-900">1. 결과물의 정확성 및 품질</h4>
                <p className="text-slate-500 text-sm lg:text-base leading-relaxed">
                  본 서비스는 이미지를 픽셀화하여 도안을 생성하는 보조 도구입니다. 원본 이미지의 품질, 조명, 색상 구성에 따라 변환된 도안의 결과가 실제와 다를 수 있으며, 이에 따른 디자인의 정확성을 100% 보장하지 않습니다.<br/>
                  <span className="text-slate-900 font-bold">사용자는 도안을 실제 제작(자수, 블록 등)에 사용하기 전, 반드시 색상과 칸수를 최종 확인해야 합니다.</span>
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-black text-lg italic text-slate-900">2. 저작권 및 사용 책임</h4>
                <p className="text-slate-500 text-sm lg:text-base leading-relaxed">
                  사용자가 업로드하는 이미지에 대한 저작권 책임은 전적으로 사용자 본인에게 있습니다. 저작권이 있는 이미지(캐릭터, 타인의 작품 등)를 무단 사용하여 발생하는 법적 분쟁에 대해 서비스는 책임을 지지 않습니다.<br/>
                  <span className="text-slate-900 font-bold">생성된 도안을 상업적으로 이용할 경우, 원본 이미지의 저작권 규정을 준수해야 합니다.</span>
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-black text-lg italic text-slate-900">3. 데이터 보관 및 손실</h4>
                <p className="text-slate-500 text-sm lg:text-base leading-relaxed">
                  본 서비스는 브라우저 기반으로 작동하며, 별도의 서버에 사용자의 이미지를 영구 저장하지 않습니다. 브라우저 종료, 캐시 삭제 등으로 인해 발생하는 작업 데이터 손실에 대해서는 책임을 지지 않으므로, <span className="text-slate-900 font-bold underline">작업 완료 후 반드시 [내보내기]를 통해 파일을 저장하시기 바랍니다.</span>
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-black text-lg italic text-slate-900">4. 서비스 이용 환경</h4>
                <p className="text-slate-500 text-sm lg:text-base leading-relaxed">
                  사용자 기기의 성능, 브라우저 버전, 네트워크 상태에 따라 서비스 이용 및 파일 다운로드(ZIP, JSON)가 원활하지 않을 수 있습니다. <span className="text-slate-900 font-bold">권장 브라우저(Chrome 등) 환경에서의 이용을 권장합니다.</span>
                </p>
              </div>
            </div>

            <div className="p-10 lg:p-14 bg-slate-50/50">
              <button onClick={() => setShowNotice(false)} className="w-full py-6 bg-[#EC4899] text-white rounded-[32px] font-black text-xl shadow-xl hover:bg-[#DB2777] transition-all">확인했습니다</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
