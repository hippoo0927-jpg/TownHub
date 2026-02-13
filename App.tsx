
import React, { useState, useRef, useEffect } from 'react';
import { AppStep, PixelData, ColorInfo, TOWN_PALETTE_HEX, User, Notice, DesignPost, RecordPost } from './types';
import { processArtStudioPixel } from './services/pixelService';
import JSZip from 'jszip';

type MainView = 'HOME' | 'STUDIO' | 'DESIGN_FEED' | 'RECORD_SHOP' | 'TOWNHALL';

const App: React.FC = () => {
  // --- Global States ---
  const [activeView, setActiveView] = useState<MainView>('HOME');
  const [toast, setToast] = useState<string | null>(null);

  // --- Art Studio States ---
  const [step, setStep] = useState<AppStep>('SETUP');
  const [canvasDim, setCanvasDim] = useState({ w: 48, h: 48 });
  const [uploadedImg, setUploadedImg] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, scale: 0.8 });
  const [zoom, setZoom] = useState(300);
  const [pixelData, setPixelData] = useState<PixelData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activePaletteId, setActivePaletteId] = useState<string | null>(null);

  // --- Refs ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const frameDragRef = useRef({ isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0 });
  const frameContainerRef = useRef<HTMLDivElement>(null);
  
  // --- Editor Panning Refs ---
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const panStartPos = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const startPixelation = async () => {
    if (!previewCanvasRef.current) return;
    setIsProcessing(true);
    setTimeout(async () => {
      try {
        const compositeDataUrl = previewCanvasRef.current!.toDataURL('image/png');
        const data = await processArtStudioPixel(compositeDataUrl, canvasDim.w, canvasDim.h, 32, { x: 0, y: 0, scale: 1 });
        setPixelData(data);
        setStep('EDITOR');
        setZoom(400);
        setTimeout(centerEditorView, 50);
      } catch (e) {
        showToast("픽셀 변환 중 오류가 발생했습니다.");
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  };

  const centerEditorView = () => {
    if (editorScrollRef.current) {
      const container = editorScrollRef.current;
      const content = container.firstElementChild as HTMLElement;
      if (content) {
        container.scrollLeft = (content.offsetWidth - container.clientWidth) / 2;
        container.scrollTop = (content.offsetHeight - container.clientHeight) / 2;
      }
    }
  };

  const handleEditorMouseDown = (e: React.MouseEvent) => {
    if (!editorScrollRef.current) return;
    isPanningRef.current = true;
    panStartPos.current = {
      x: e.pageX,
      y: e.pageY,
      scrollLeft: editorScrollRef.current.scrollLeft,
      scrollTop: editorScrollRef.current.scrollTop
    };
    editorScrollRef.current.style.cursor = 'grabbing';
    editorScrollRef.current.style.userSelect = 'none';
  };

  const handleEditorMouseMove = (e: React.MouseEvent) => {
    if (!isPanningRef.current || !editorScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX;
    const y = e.pageY;
    const walkX = (x - panStartPos.current.x);
    const walkY = (y - panStartPos.current.y);
    editorScrollRef.current.scrollLeft = panStartPos.current.scrollLeft - walkX;
    editorScrollRef.current.scrollTop = panStartPos.current.scrollTop - walkY;
  };

  const handleEditorMouseUp = () => {
    isPanningRef.current = false;
    if (editorScrollRef.current) {
      editorScrollRef.current.style.cursor = 'default';
      editorScrollRef.current.style.userSelect = 'auto';
    }
  };

  useEffect(() => {
    if (step === 'FRAME' && uploadedImg && previewCanvasRef.current) {
      const ctx = previewCanvasRef.current.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvasDim.w, canvasDim.h);
      const img = new Image();
      img.src = uploadedImg;
      img.onload = () => {
        ctx.save();
        ctx.translate(canvasDim.w / 2 + crop.x, canvasDim.h / 2 + crop.y);
        ctx.scale(crop.scale, crop.scale);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();
      };
    }
  }, [step, uploadedImg, crop, canvasDim]);

  // --- UI Components ---
  const Sidebar = () => (
    <aside className="w-72 bg-slate-950 flex flex-col shrink-0 border-r border-slate-900 z-50">
      <div className="p-8">
        <div className="flex items-center gap-3 text-white mb-10 cursor-pointer" onClick={() => setActiveView('HOME')}>
          <div className="w-10 h-10 bg-pink-600 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-pink-900/40">T</div>
          <span className="font-black text-lg tracking-tighter italic">TownHub</span>
        </div>
        <nav className="space-y-2">
          {[
            { id: 'HOME', name: 'Home Hub', icon: '🏠' },
            { id: 'STUDIO', name: 'Art Studio', icon: '🎨' },
            { id: 'DESIGN_FEED', name: 'Design Feed', icon: '🖼️' },
            { id: 'RECORD_SHOP', name: 'Record Shop', icon: '💿' },
            { id: 'TOWNHALL', name: 'Town Hall', icon: '⚖️' }
          ].map(item => (
            <button key={item.id} onClick={() => setActiveView(item.id as MainView)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-all ${activeView === item.id ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>
      </div>
      
      {/* 관리자 프로필 섹션 */}
      <div className="mt-auto p-6 border-t border-slate-900 bg-slate-900/30">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/20">🦛</div>
            <div>
              <h4 className="text-white font-black text-sm italic">히포 (Hippoo)</h4>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Master Artisan</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed font-medium italic">
            "여러분들을 위해 두근두근타운에 맞는 픽셀아트 스튜디오를 만들었습니다!"
          </p>
          <div className="grid grid-cols-2 gap-2">
            <a 
              href="https://www.youtube.com/@Hippoo_Hanuu" 
              target="_blank" 
              rel="noopener noreferrer"
              className="py-3 bg-red-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-red-700 transition-all shadow-lg shadow-red-900/20 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
              YouTube
            </a>
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="py-3 bg-slate-800 text-white rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-slate-700 transition-all shadow-lg shadow-slate-950/40 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.042-1.416-4.042-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              GitHub
            </a>
          </div>
        </div>
      </div>
    </aside>
  );

  const ComingSoon = ({ title, icon }: { title: string, icon: string }) => (
    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50">
      <div className="w-32 h-32 bg-white rounded-[40px] shadow-xl flex items-center justify-center text-6xl mb-8 border border-slate-100 animate-bounce">
        {icon}
      </div>
      <h2 className="text-4xl font-black text-slate-900 mb-4 italic tracking-tighter">{title} 준비 중!</h2>
      <p className="text-slate-500 text-lg text-center max-w-md leading-relaxed font-medium">
        현재 주민 여러분을 위해 이 공간을 열심히 꾸미고 있습니다. <br/>
        조금만 더 기다려주세요! 🛠️
      </p>
      <button onClick={() => setActiveView('STUDIO')} className="mt-10 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-black transition-all">
        지금 바로 도안 만들러 가기
      </button>
    </div>
  );

  const renderStudio = () => (
    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {step === 'SETUP' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-xl bg-white rounded-[50px] shadow-2xl p-20 border border-slate-100 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2 bg-pink-500"></div>
               <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter italic leading-none">Creative Setup</h2>
               <p className="text-slate-500 mb-12 text-lg">도안의 크기를 정하고 창작을 시작하세요.</p>
               <div className="grid grid-cols-2 gap-8 mb-12">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">가로 픽셀 수</label>
                    <input type="number" value={canvasDim.w} onChange={e => setCanvasDim({...canvasDim, w: Number(e.target.value)})} className="w-full p-6 bg-slate-50 rounded-3xl font-black text-3xl text-center border-2 focus:border-pink-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">세로 픽셀 수</label>
                    <input type="number" value={canvasDim.h} onChange={e => setCanvasDim({...canvasDim, h: Number(e.target.value)})} className="w-full p-6 bg-slate-50 rounded-3xl font-black text-3xl text-center border-2 focus:border-pink-500 outline-none transition-all" />
                  </div>
               </div>
               <button onClick={() => setStep('UPLOAD')} className="w-full py-8 bg-slate-900 text-white rounded-[32px] font-black text-xl shadow-xl hover:bg-black transition-all">도안 제작실 입장</button>
            </div>
          </div>
        )}

        {step === 'UPLOAD' && (
          <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
            <div onClick={() => fileInputRef.current?.click()} className="w-full max-w-4xl aspect-[16/7] bg-white rounded-[60px] shadow-2xl border-4 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-pink-400 hover:bg-pink-50/10 transition-all group">
              <input type="file" ref={fileInputRef} onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const r = new FileReader(); r.onload = (ev) => { setUploadedImg(ev.target?.result as string); setStep('FRAME'); }; r.readAsDataURL(file);
                }
              }} accept="image/*" className="hidden" />
              <div className="w-32 h-32 bg-pink-100 rounded-[40px] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform"><span className="text-7xl">📸</span></div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter">도안으로 변환할 이미지 업로드</h3>
              <p className="text-slate-400 mt-2 font-bold uppercase tracking-widest text-xs">JPEG, PNG, WEBP SUPPORTED</p>
            </div>
            <button onClick={() => setStep('SETUP')} className="mt-8 text-slate-400 font-black hover:text-slate-900 transition-colors uppercase tracking-widest text-xs border-b-2 border-slate-200 hover:border-slate-900 pb-1">이전 단계로</button>
          </div>
        )}

        {step === 'FRAME' && (
          <div className="flex gap-12 h-full items-start animate-in fade-in duration-500">
            <div className="flex-1 flex items-center justify-center bg-white rounded-[60px] shadow-2xl border border-slate-100 p-16 relative overflow-hidden min-h-[600px] workspace-pattern">
               <div 
                ref={frameContainerRef}
                className="relative bg-white border-[10px] border-slate-950 shadow-[0_0_50px_rgba(0,0,0,0.1)] overflow-hidden" 
                style={{ 
                  width: 'min(500px, 100%)', 
                  aspectRatio: `${canvasDim.w} / ${canvasDim.h}`, 
                  cursor: 'move',
                  maxHeight: '70vh'
                }}
                onMouseDown={(e) => { 
                  frameDragRef.current = { 
                    isDragging: true, 
                    startX: e.clientX, 
                    startY: e.clientY, 
                    initialX: crop.x, 
                    initialY: crop.y 
                  }; 
                }} 
                onMouseMove={(e) => {
                  if (!frameDragRef.current.isDragging || !frameContainerRef.current) return;
                  const rect = frameContainerRef.current.getBoundingClientRect();
                  const dx = (e.clientX - frameDragRef.current.startX) * (canvasDim.w / rect.width);
                  const dy = (e.clientY - frameDragRef.current.startY) * (canvasDim.h / rect.height);
                  setCrop(prev => ({ ...prev, x: frameDragRef.current.initialX + dx, y: frameDragRef.current.initialY + dy }));
                }} 
                onMouseUp={() => frameDragRef.current.isDragging = false}
              >
                <canvas ref={previewCanvasRef} width={canvasDim.w} height={canvasDim.h} className="w-full h-full pointer-events-none" style={{ imageRendering: 'pixelated' }} />
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-red-500/20 pointer-events-none"></div>
                <div className="absolute top-0 left-1/2 w-[1px] h-full bg-red-500/20 pointer-events-none"></div>
              </div>
            </div>
            <div className="w-[420px] flex flex-col gap-8">
              <div className="bg-white rounded-[50px] shadow-2xl border border-slate-100 p-12 space-y-10">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic">Frame Controls</h3>
                 <div className="space-y-6">
                    <div className="flex justify-between items-center px-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Image Scale</label>
                       <span className="text-xs font-black text-pink-600">{(crop.scale * 100).toFixed(0)}%</span>
                    </div>
                    <input type="range" min="0.1" max="5" step="0.01" value={crop.scale} onChange={e => setCrop({...crop, scale: Number(e.target.value)})} className="w-full h-3 bg-slate-100 rounded-full appearance-none accent-pink-500 cursor-pointer" />
                 </div>
                 <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="text-[10px] text-slate-500 leading-relaxed font-bold italic">마우스를 드래그하여 이미지를 캔버스 중앙에 맞춰보세요. {canvasDim.w}x{canvasDim.h} 비율이 완벽하게 유지됩니다.</p>
                 </div>
              </div>
              <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-slate-100">
                 <div className="flex gap-4">
                    <button onClick={() => setStep('UPLOAD')} className="flex-1 py-5 bg-slate-100 rounded-2xl font-black text-slate-400 hover:bg-slate-200 transition-all">Back</button>
                    <button onClick={startPixelation} disabled={isProcessing} className="flex-[2] py-5 bg-pink-600 text-white rounded-[28px] font-black text-xl shadow-xl shadow-pink-200 hover:bg-pink-700 transition-all">
                      {isProcessing ? '처리 중...' : '픽셀 도안 변환'}
                    </button>
                 </div>
              </div>
            </div>
          </div>
        )}

        {step === 'EDITOR' && pixelData && (
          <div className="flex-1 flex flex-col gap-10 animate-in fade-in duration-500 min-h-0">
             <div className="bg-white/90 backdrop-blur p-8 rounded-[40px] shadow-xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-8">
                   <button onClick={() => setStep('FRAME')} className="w-14 h-14 flex items-center justify-center bg-slate-50 text-slate-400 rounded-2xl border hover:text-pink-500 transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                   </button>
                   <div>
                      <h2 className="font-black text-2xl text-slate-900 italic tracking-tighter">Pixel Pattern Editor</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{pixelData.width}x{pixelData.height} Grid</p>
                   </div>
                </div>
                <div className="flex items-center gap-6">
                   <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                      <button onClick={() => setZoom(z => Math.max(100, z - 100))} className="w-10 h-10 flex items-center justify-center font-black text-slate-500 hover:text-slate-900 transition-colors">－</button>
                      <span className="w-16 text-center font-black text-xs text-slate-600">{zoom}%</span>
                      <button onClick={() => setZoom(z => Math.min(1000, z + 100))} className="w-10 h-10 flex items-center justify-center font-black text-slate-500 hover:text-slate-900 transition-colors">＋</button>
                   </div>
                   <button onClick={centerEditorView} className="w-12 h-12 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center border hover:bg-slate-200 transition-colors" title="Center View">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" /></svg>
                   </button>
                   <div className="h-8 w-px bg-slate-200"></div>
                   <button onClick={() => showToast("광장 공유 기능은 현재 준비 중입니다.")} className="px-8 py-5 bg-indigo-600 text-white rounded-[26px] font-black text-lg shadow-xl shadow-indigo-100 hover:scale-105 transition-all">🌟 광장에 공유하기</button>
                   <button onClick={async () => {
                      setIsExporting(true);
                      try {
                        const zip = new JSZip();
                        const CHUNK = 24; const EX_SIZE = 40;
                        const {width, height, colors, palette} = pixelData;
                        const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d')!;
                        for(let r=0; r<Math.ceil(height/CHUNK); r++) {
                          for(let c=0; c<Math.ceil(width/CHUNK); c++) {
                            const cw = Math.min(CHUNK, width - c*CHUNK); const ch = Math.min(CHUNK, height - r*CHUNK);
                            canvas.width = cw * EX_SIZE; canvas.height = ch * EX_SIZE;
                            for(let y=0; y<ch; y++) {
                              for(let x=0; x<cw; x++) {
                                const color = colors[(r*CHUNK+y)*width + (c*CHUNK+x)]; const pItem = palette.find(p => p.hex === color);
                                const rx = x * EX_SIZE, ry = y * EX_SIZE;
                                ctx.fillStyle = color; ctx.fillRect(rx, ry, EX_SIZE, EX_SIZE);
                                if (pItem) {
                                  ctx.fillStyle = getContrastColor(color); ctx.font = `bold ${EX_SIZE*0.4}px Arial`; ctx.textAlign='center'; ctx.textBaseline='middle';
                                  ctx.fillText(pItem.index, rx + EX_SIZE/2, ry + EX_SIZE/2);
                                }
                              }
                            }
                            const blob = await new Promise<Blob|null>(res => canvas.toBlob(res));
                            if(blob) zip.file(`Pattern_Part_R${r+1}_C${c+1}.png`, blob);
                          }
                        }
                        const zipBlob = await zip.generateAsync({type:'blob'});
                        const a = document.createElement('a'); a.href = URL.createObjectURL(zipBlob); a.download = `Pattern_Guide_${Date.now()}.zip`; a.click();
                        showToast("무료 도안 가이드가 다운로드 되었습니다!");
                      } finally { setIsExporting(false); }
                   }} className="px-10 py-5 bg-pink-600 text-white rounded-[26px] font-black text-xl shadow-xl shadow-pink-100 hover:scale-105 transition-all">
                     {isExporting ? '압축 중...' : 'ZIP 도안 가이드 내보내기'}
                   </button>
                </div>
             </div>
             <div className="flex-1 flex gap-10 overflow-hidden min-h-0">
                <div 
                   ref={editorScrollRef}
                   className="flex-1 bg-white rounded-[60px] shadow-2xl border border-slate-100 overflow-auto custom-scrollbar relative workspace-pattern active:cursor-grabbing"
                   onMouseDown={handleEditorMouseDown}
                   onMouseMove={handleEditorMouseMove}
                   onMouseUp={handleEditorMouseUp}
                   onMouseLeave={handleEditorMouseUp}
                >
                   <div className="inline-block p-[200px]">
                      <div className="relative p-12 bg-white rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.15)] border-[12px] border-slate-950">
                         <div className="pixel-grid bg-white" style={{ gridTemplateColumns: `repeat(${pixelData.width}, ${zoom/10}px)`, width: 'fit-content' }}>
                            {pixelData.colors.map((color, idx) => {
                              const pItem = pixelData.palette.find(p => p.hex === color);
                              const active = activePaletteId === pItem?.index;
                              return (
                                <div key={idx} style={{ backgroundColor: color, width: zoom/10, height: zoom/10 }} className={`pixel-item group transition-all duration-200 ${active ? 'ring-4 ring-pink-500 z-10' : 'hover:ring-2 hover:ring-white/50 z-0'}`} onClick={() => setActivePaletteId(activePaletteId === pItem?.index ? null : pItem?.index || null)}>
                                  {zoom >= 300 && (
                                    <span className="pixel-num text-center select-none font-black pointer-events-none" style={{ color: getContrastColor(color), fontSize: `${(zoom/10)*0.45}px`, opacity: active ? 1 : 0.4 }}>{pItem?.index}</span>
                                  )}
                                </div>
                              );
                            })}
                         </div>
                      </div>
                   </div>
                </div>
                <div className="w-[420px] bg-white rounded-[60px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden shrink-0">
                   <div className="p-10 border-b flex items-center justify-between bg-slate-50/50">
                      <h3 className="font-black text-slate-800 text-xl italic tracking-tighter">🎨 Town Palette</h3>
                      <span className="bg-slate-900 text-white text-[10px] px-4 py-1.5 rounded-full font-black uppercase tracking-widest">{pixelData.palette.length} Colors</span>
                   </div>
                   <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                      {pixelData.palette.map(color => (
                        <div key={color.index} onClick={() => setActivePaletteId(activePaletteId === color.index ? null : color.index)} 
                           className={`flex items-center gap-6 p-6 rounded-[35px] border-2 transition-all cursor-pointer ${activePaletteId === color.index ? 'bg-pink-50 border-pink-300 shadow-lg shadow-pink-100/50' : 'bg-white border-transparent hover:bg-slate-50'}`}>
                           <div className="w-16 h-16 rounded-[24px] shadow-inner border border-black/10 flex items-center justify-center font-black text-xs" style={{ backgroundColor: color.hex, color: getContrastColor(color.hex) }}>
                             {color.index}
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-sm font-black text-slate-800 tracking-tighter">Palette No. {color.index}</p>
                              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{color.hex}</p>
                           </div>
                           <div className="text-right">
                             <p className="text-pink-600 font-black text-2xl leading-none">{color.count}</p>
                             <p className="text-[8px] font-black text-slate-300 uppercase mt-1">Pixels</p>
                           </div>
                        </div>
                      ))}
                   </div>
                   <div className="p-10 bg-slate-900 text-white">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Editor Hint</p>
                      <p className="text-[11px] font-bold leading-relaxed text-slate-400 italic">"화면을 마우스로 드래그하면 상하좌우로 이동할 수 있습니다. 돋보기 버튼 옆 과녁 버튼을 누르면 중앙으로 돌아옵니다."</p>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans selection:bg-pink-200">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {toast && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-2xl animate-bounce">
             ✨ {toast}
          </div>
        )}
        
        {/* --- HEADER --- */}
        <header className="h-20 bg-white/80 backdrop-blur-xl border-b flex items-center justify-between px-12 shrink-0 z-40">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase italic">{activeView.replace('_', ' ')}</h2>
            <div className="h-6 w-px bg-slate-200"></div>
            <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-full">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">Live Connected</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
             <button onClick={() => showToast("마을 소식지는 준비 중입니다.")} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all bg-slate-100 text-slate-400 hover:bg-slate-200`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
             </button>
             <div className="p-3 bg-slate-900 text-white rounded-2xl flex items-center gap-3 cursor-default">
                <span className="text-xs font-black uppercase tracking-widest px-2">TownHub v2.0</span>
             </div>
          </div>
        </header>

        {activeView === 'HOME' && <ComingSoon title="Home Hub" icon="🏠" />}
        {activeView === 'STUDIO' && renderStudio()}
        {activeView === 'DESIGN_FEED' && <ComingSoon title="Design Feed" icon="🖼️" />}
        {activeView === 'RECORD_SHOP' && <ComingSoon title="Record Shop" icon="💿" />}
        {activeView === 'TOWNHALL' && <ComingSoon title="Town Hall" icon="⚖️" />}
      </main>
    </div>
  );
};

function getContrastColor(hex: string) {
  if (!hex) return '#FFFFFF';
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return (r*299 + g*587 + b*114)/1000 > 125 ? '#0F172A' : '#FFFFFF';
}

export default App;
