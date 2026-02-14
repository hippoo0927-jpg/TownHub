
import React, { useState, useRef, useEffect } from 'react';
import { AppStep, PixelData, StudioMode, ColorInfo, TOWN_PALETTE_HEX, TextLayer } from './types';
import { processArtStudioPixel } from './services/pixelService';
import JSZip from 'jszip';

type MainView = 'HOME' | 'STUDIO' | 'DESIGN_FEED' | 'RECORD_SHOP' | 'TOWNHALL';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<MainView>('HOME');
  const [toast, setToast] = useState<string | null>(null);

  // Studio States
  const [step, setStep] = useState<AppStep>('MODE_SELECT');
  const [studioMode, setStudioMode] = useState<StudioMode>('PATTERN');
  const [canvasDim, setCanvasDim] = useState({ w: 48, h: 48 });
  const [uploadedImg, setUploadedImg] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, scale: 0.8 });
  const [zoom, setZoom] = useState(300);
  const [pixelData, setPixelData] = useState<PixelData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activePaletteId, setActivePaletteId] = useState<string | null>(null);

  // Text Layer States
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const frameDragRef = useRef({ isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0 });
  const textDragRef = useRef({ isDragging: false, activeId: null as string | null, startX: 0, startY: 0, initialX: 0, initialY: 0 });
  const frameContainerRef = useRef<HTMLDivElement>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const panStartPos = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const addTextLayer = () => {
    const newLayer: TextLayer = {
      id: `text-${Date.now()}`,
      text: "텍스트 입력",
      x: 50,
      y: 50,
      size: 16,
      color: "#000000"
    };
    setTextLayers(prev => [...prev, newLayer]);
    setSelectedTextId(newLayer.id);
  };

  const updateTextLayer = (id: string, updates: Partial<TextLayer>) => {
    setTextLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const removeTextLayer = (id: string) => {
    setTextLayers(prev => prev.filter(l => l.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  const startPixelation = async () => {
    if (!previewCanvasRef.current) return;
    setIsProcessing(true);
    
    const ctx = previewCanvasRef.current.getContext('2d');
    if (ctx && studioMode === 'BOOK_COVER' && textLayers.length > 0) {
      textLayers.forEach(layer => {
        if (!layer.text.trim()) return;
        ctx.fillStyle = layer.color;
        ctx.font = `bold ${layer.size}px 'Noto Sans KR', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const canvasX = (layer.x / 100) * canvasDim.w;
        const canvasY = (layer.y / 100) * canvasDim.h;
        ctx.fillText(layer.text, canvasX, canvasY);
      });
    }

    setTimeout(async () => {
      try {
        const compositeDataUrl = previewCanvasRef.current!.toDataURL('image/png');
        const data = await processArtStudioPixel(compositeDataUrl, canvasDim.w, canvasDim.h, 64, { x: 0, y: 0, scale: 1 });
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
    panStartPos.current = { x: e.pageX, y: e.pageY, scrollLeft: editorScrollRef.current.scrollLeft, scrollTop: editorScrollRef.current.scrollTop };
    editorScrollRef.current.style.cursor = 'grabbing';
  };

  const handleEditorMouseMove = (e: React.MouseEvent) => {
    if (!isPanningRef.current || !editorScrollRef.current) return;
    editorScrollRef.current.scrollLeft = panStartPos.current.scrollLeft - (e.pageX - panStartPos.current.x);
    editorScrollRef.current.scrollTop = panStartPos.current.scrollTop - (e.pageY - panStartPos.current.y);
  };

  const handleEditorMouseUp = () => {
    isPanningRef.current = false;
    if (editorScrollRef.current) editorScrollRef.current.style.cursor = 'default';
  };

  useEffect(() => {
    if ((step === 'FRAME' || step === 'TEXT') && uploadedImg && previewCanvasRef.current) {
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

  const Sidebar = () => (
    <aside className="w-72 bg-slate-950 flex flex-col shrink-0 border-r border-slate-900 z-50">
      <div className="p-8">
        <div className="flex items-center gap-3 text-white mb-10 cursor-pointer" onClick={() => { setActiveView('HOME'); setStep('MODE_SELECT'); }}>
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
            <button key={item.id} onClick={() => { setActiveView(item.id as MainView); if(item.id === 'STUDIO') setStep('MODE_SELECT'); }}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-all ${activeView === item.id ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-auto p-6 border-t border-slate-900 bg-slate-900/30">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/20">🦛</div>
            <div>
              <h4 className="text-white font-black text-sm italic">히포 (Hippoo)</h4>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Master Artisan</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed font-medium italic">"여러분들을 위해 두근두근타운에 맞는 픽셀아트 스튜디오를 만들었습니다!"</p>
          <a href="https://www.youtube.com/@Hippoo_Hanuu" target="_blank" rel="noopener noreferrer" className="w-full py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-900/20 active:scale-95">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
            YouTube 구독하기
          </a>
        </div>
      </div>
    </aside>
  );

  const renderHome = () => (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto p-12 space-y-12">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-slate-900 rounded-[60px] p-20 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none workspace-pattern scale-150 rotate-12"></div>
          <div className="relative z-10 space-y-6 max-w-2xl">
            <span className="bg-pink-500 text-white px-5 py-2 rounded-full font-black text-xs uppercase tracking-widest italic">Official Creative Hub</span>
            <h1 className="text-7xl font-black italic tracking-tighter leading-tight">Town Square<br/>Art Studio</h1>
            <p className="text-xl text-slate-300 font-medium leading-relaxed">
              두근두근타운 시민들을 위한 고퀄리티 픽셀 도안 제작 시스템. <br/>
              단 몇 번의 클릭으로 당신의 아이디어를 픽셀로 변환하세요.
            </p>
            <div className="flex gap-4 pt-6">
              <button onClick={() => { setActiveView('STUDIO'); setStep('MODE_SELECT'); }} className="px-10 py-5 bg-pink-500 text-white rounded-3xl font-black text-xl hover:bg-pink-600 transition-all shadow-lg shadow-pink-900/40">스튜디오 입장하기</button>
              <button onClick={() => setActiveView('DESIGN_FEED')} className="px-10 py-5 bg-white/10 text-white border border-white/20 rounded-3xl font-black text-xl hover:bg-white/20 transition-all">커뮤니티 구경</button>
            </div>
          </div>
        </section>

        {/* Feature Cards */}
        <div className="grid grid-cols-3 gap-8">
          <div className="bg-white p-10 rounded-[48px] shadow-xl border border-slate-100 hover:scale-105 transition-all">
            <div className="w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center text-3xl mb-6">🎨</div>
            <h3 className="text-2xl font-black italic mb-3">픽셀 도안 변환</h3>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">이미지를 타운 규격에 딱 맞는 48x48 픽셀 도안으로 자동 변환합니다.</p>
          </div>
          <div className="bg-white p-10 rounded-[48px] shadow-xl border border-slate-100 hover:scale-105 transition-all">
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-3xl mb-6">📖</div>
            <h3 className="text-2xl font-black italic mb-3">북커버 레이아웃</h3>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">150x84 정밀 가이드와 멀티 텍스트 시스템으로 완성하는 나만의 북커버.</p>
          </div>
          <div className="bg-white p-10 rounded-[48px] shadow-xl border border-slate-100 hover:scale-105 transition-all">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-3xl mb-6">🌈</div>
            <h3 className="text-2xl font-black italic mb-3">컬러 팔레트</h3>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">타운 시스템에서 지원하는 색상값(HEX)을 추출하여 게임에 바로 적용하세요.</p>
          </div>
        </div>

        {/* Dashboard Section */}
        <div className="grid grid-cols-2 gap-8">
           <div className="bg-slate-900 rounded-[50px] p-12 text-white flex flex-col justify-between">
              <div>
                <h3 className="text-3xl font-black italic mb-2 tracking-tighter">Your Creative Journey</h3>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Studio Activity Status</p>
              </div>
              <div className="grid grid-cols-2 gap-6 mt-12">
                 <div className="bg-white/5 rounded-3xl p-6">
                    <p className="text-slate-400 text-xs font-bold mb-1">Total Designs</p>
                    <p className="text-4xl font-black italic">1.2K+</p>
                 </div>
                 <div className="bg-white/5 rounded-3xl p-6">
                    <p className="text-slate-400 text-xs font-bold mb-1">Active Users</p>
                    <p className="text-4xl font-black italic">458</p>
                 </div>
              </div>
           </div>
           <div className="bg-white rounded-[50px] p-12 shadow-xl border border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black italic">Recent Feed</h3>
                <button className="text-pink-500 font-black text-sm">View All</button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                 {[1,2,3,4,5,6].map(i => (
                   <div key={i} className="aspect-square bg-slate-100 rounded-2xl overflow-hidden hover:ring-4 ring-pink-500 transition-all cursor-pointer">
                      <div className="w-full h-full workspace-pattern opacity-50"></div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );

  const renderStudio = () => (
    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {step === 'MODE_SELECT' && (
          <div className="flex-1 flex items-center justify-center">
             <div className="w-full max-w-4xl grid grid-cols-2 gap-10">
                <button onClick={() => { setStudioMode('PATTERN'); setStep('SETUP'); setCanvasDim({ w: 48, h: 48 }); }} 
                  className="bg-white p-12 rounded-[60px] shadow-2xl border-4 border-transparent hover:border-pink-500 transition-all group flex flex-col items-center">
                   <div className="w-24 h-24 bg-pink-100 rounded-[35px] flex items-center justify-center text-5xl mb-8 group-hover:scale-110 transition-transform">🎨</div>
                   <h3 className="text-2xl font-black text-slate-900 mb-2 italic">픽셀 도안 제작</h3>
                   <p className="text-slate-400 text-center font-bold text-sm">원하는 크기를 자유롭게 설정하여 나만의 픽셀 아트를 만들어보세요.</p>
                </button>
                <button onClick={() => { setStudioMode('BOOK_COVER'); setCanvasDim({ w: 150, h: 84 }); setStep('UPLOAD'); }} 
                  className="bg-white p-12 rounded-[60px] shadow-2xl border-4 border-transparent hover:border-pink-500 transition-all group flex flex-col items-center">
                   <div className="w-24 h-24 bg-indigo-100 rounded-[35px] flex items-center justify-center text-5xl mb-8 group-hover:scale-110 transition-transform">📖</div>
                   <h3 className="text-2xl font-black text-slate-900 mb-2 italic">북커버 제작</h3>
                   <p className="text-slate-400 text-center font-bold text-sm">전체 150x84 고정 규격 가이드를 제공합니다.</p>
                </button>
             </div>
          </div>
        )}

        {step === 'SETUP' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-xl bg-white rounded-[50px] shadow-2xl p-20 border border-slate-100 relative overflow-hidden animate-in slide-in-from-bottom duration-300">
               <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter italic">Creative Setup</h2>
               <div className="grid grid-cols-2 gap-8 mb-12 mt-12">
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
               <button onClick={() => setStep('MODE_SELECT')} className="w-full mt-4 text-slate-400 font-bold text-sm hover:text-slate-900 transition-colors">모드 다시 선택하기</button>
            </div>
          </div>
        )}

        {step === 'UPLOAD' && (
          <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in duration-300">
             <div className="text-center mb-12">
               <span className="bg-pink-100 text-pink-600 px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest mb-4 inline-block italic">이미지 선택</span>
               <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic">당신의 아트를 업로드하세요</h2>
             </div>
            <div onClick={() => fileInputRef.current?.click()} className="w-full max-w-4xl aspect-[16/7] bg-white rounded-[60px] shadow-2xl border-4 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-pink-400 hover:bg-pink-50/10 transition-all group">
              <input type="file" ref={fileInputRef} onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const r = new FileReader(); r.onload = (ev) => { setUploadedImg(ev.target?.result as string); setStep('FRAME'); }; r.readAsDataURL(file);
                }
              }} accept="image/*" className="hidden" />
              <div className="w-32 h-32 bg-pink-100 rounded-[40px] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform"><span className="text-7xl">📸</span></div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter">사진을 드래그하거나 클릭하여 업로드</h3>
            </div>
            <button onClick={() => setStep(studioMode === 'PATTERN' ? 'SETUP' : 'MODE_SELECT')} className="mt-8 text-slate-400 font-black hover:text-slate-900 transition-colors uppercase tracking-widest text-xs border-b-2 border-slate-200 hover:border-slate-900 pb-1">이전 단계로</button>
          </div>
        )}

        {step === 'FRAME' && (
          <div className="flex gap-12 h-full items-start animate-in fade-in duration-500">
            <div className="flex-1 flex flex-col items-center">
              <div className="text-center mb-10">
                <span className="bg-pink-100 text-pink-600 px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest mb-4 inline-block italic">위치 조정</span>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic mb-2">프레임을 맞춰주세요</h2>
                <p className="text-slate-500 font-bold text-sm">드래그하여 이미지를 이동하고 {studioMode === 'BOOK_COVER' ? '150x84' : `${canvasDim.w}x${canvasDim.h}`} 그리드에 맞게 크기를 조정하세요.</p>
              </div>

              <div className="relative w-full flex flex-col items-center justify-center bg-white rounded-[60px] shadow-2xl border border-slate-100 p-24 workspace-pattern min-h-[550px]">
                {studioMode === 'BOOK_COVER' && (
                  <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[min(700px,calc(100%-192px))] pointer-events-none">
                     <div className="relative w-full h-8 flex items-center justify-center">
                        <div className="absolute top-2 left-0 right-0 h-px bg-pink-500"></div>
                        <div className="w-full flex h-8">
                           <div className="flex-[68] h-full flex flex-col items-center"><span className="text-pink-500 font-black text-[10px] mb-1">68</span><div className="w-full h-px border-t border-dashed border-pink-300"></div></div>
                           <div className="flex-[14] h-full flex flex-col items-center px-1"><span className="text-pink-500 font-black text-[10px] mb-1">14</span><div className="w-full h-px border-t border-dashed border-pink-300"></div></div>
                           <div className="flex-[68] h-full flex flex-col items-center"><span className="text-pink-500 font-black text-[10px] mb-1">68</span><div className="w-full h-px border-t border-dashed border-pink-300"></div></div>
                        </div>
                     </div>
                  </div>
                )}

                <div 
                  ref={frameContainerRef}
                  className="relative bg-white border-[4px] border-slate-900 shadow-2xl overflow-hidden cursor-move" 
                  style={{ width: 'min(700px, 100%)', aspectRatio: `${canvasDim.w} / ${canvasDim.h}` }}
                  onMouseDown={(e) => { frameDragRef.current = { isDragging: true, startX: e.clientX, startY: e.clientY, initialX: crop.x, initialY: crop.y }; }} 
                  onMouseMove={(e) => {
                    if (!frameDragRef.current.isDragging || !frameContainerRef.current) return;
                    const rect = frameContainerRef.current.getBoundingClientRect();
                    setCrop(prev => ({ 
                      ...prev, 
                      x: frameDragRef.current.initialX + (e.clientX - frameDragRef.current.startX) * (canvasDim.w / rect.width), 
                      y: frameDragRef.current.initialY + (e.clientY - frameDragRef.current.startY) * (canvasDim.h / rect.height) 
                    }));
                  }} 
                  onMouseUp={() => frameDragRef.current.isDragging = false}
                  onMouseLeave={() => frameDragRef.current.isDragging = false}
                >
                  <canvas ref={previewCanvasRef} width={canvasDim.w} height={canvasDim.h} className="w-full h-full pointer-events-none" style={{ imageRendering: 'pixelated' }} />
                  {studioMode === 'BOOK_COVER' && (
                    <div className="absolute inset-0 pointer-events-none flex font-black text-[10px] tracking-tight italic uppercase">
                       <div className="flex-[68] bg-pink-500/5 border-r border-pink-500/30 flex items-center justify-center text-pink-500/20">BACK</div>
                       <div className="flex-[14] bg-pink-500/10 border-r border-pink-500/30 flex items-center justify-center text-pink-500/40 text-[6px] [writing-mode:vertical-rl] rotate-180">SIDE</div>
                       <div className="flex-[68] bg-pink-500/5 flex items-center justify-center text-pink-500/20">FRONT</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="w-80 space-y-8 mt-48">
              <div className="bg-white p-8 rounded-[40px] shadow-xl space-y-6 border border-slate-100">
                <div className="space-y-4">
                  <h4 className="text-pink-400 font-black text-lg italic">🔍 크기 조정</h4>
                  <input type="range" min="0.1" max="5" step="0.01" value={crop.scale} onChange={e => setCrop({...crop, scale: Number(e.target.value)})} className="w-full h-2 bg-slate-900 rounded-full appearance-none accent-pink-300 cursor-pointer" />
                </div>
                <button 
                  onClick={() => studioMode === 'PATTERN' ? startPixelation() : setStep('TEXT')} 
                  disabled={isProcessing}
                  className="w-full py-8 bg-pink-500 text-white rounded-[35px] font-black text-xl hover:bg-pink-600 transition-all active:scale-95 shadow-lg shadow-pink-900/20"
                >
                   {isProcessing ? '처리 중...' : (studioMode === 'PATTERN' ? '도안 생성하기' : '텍스트 추가하러 가기')}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'TEXT' && (
          <div className="flex gap-12 h-full items-start animate-in fade-in duration-500">
             <div className="flex-1 flex flex-col items-center">
                <div className="text-center mb-10">
                  <span className="bg-pink-100 text-pink-600 px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest mb-4 inline-block italic">멀티 텍스트 레이아웃</span>
                  <h2 className="text-4xl font-black text-slate-900 italic mb-2 tracking-tighter">원하는 위치에 텍스트를 배치하세요</h2>
                </div>
                <div className="relative w-full flex items-center justify-center bg-white rounded-[60px] shadow-2xl p-24 workspace-pattern min-h-[550px]">
                   <div className="relative bg-white border-[4px] border-slate-900 shadow-2xl overflow-hidden" style={{ width: 'min(700px, 100%)', aspectRatio: `${canvasDim.w} / ${canvasDim.h}` }}>
                      <canvas ref={previewCanvasRef} width={canvasDim.w} height={canvasDim.h} className="w-full h-full pointer-events-none" />
                      {textLayers.map(layer => (
                        <div key={layer.id} 
                           onMouseDown={(e) => {
                             setSelectedTextId(layer.id);
                             textDragRef.current = { isDragging: true, activeId: layer.id, startX: e.clientX, startY: e.clientY, initialX: layer.x, initialY: layer.y };
                           }}
                           onMouseMove={(e) => {
                             if (!textDragRef.current.isDragging || textDragRef.current.activeId !== layer.id) return;
                             const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                             updateTextLayer(layer.id, {
                               x: Math.min(100, Math.max(0, textDragRef.current.initialX + ((e.clientX - textDragRef.current.startX) / rect.width) * 100)),
                               y: Math.min(100, Math.max(0, textDragRef.current.initialY + ((e.clientY - textDragRef.current.startY) / rect.height) * 100))
                             });
                           }}
                           onMouseUp={() => { textDragRef.current.isDragging = false; textDragRef.current.activeId = null; }}
                           onMouseLeave={() => { textDragRef.current.isDragging = false; textDragRef.current.activeId = null; }}
                           className={`absolute cursor-move select-none p-1 transition-all ${selectedTextId === layer.id ? 'border-2 border-dashed border-pink-500 bg-pink-500/10' : 'border-2 border-transparent hover:border-pink-300'}`}
                           style={{ left: `${layer.x}%`, top: `${layer.y}%`, transform: 'translate(-50%, -50%)' }}
                        >
                           <span className="font-black whitespace-nowrap" style={{ fontSize: `${layer.size * 4}px`, color: layer.color }}>{layer.text || "입력..."}</span>
                        </div>
                      ))}
                      {studioMode === 'BOOK_COVER' && (
                        <div className="absolute inset-0 pointer-events-none flex opacity-20">
                           <div className="flex-[68] border-r border-pink-500/30" /><div className="flex-[14] border-r border-pink-500/30" /><div className="flex-[68]" />
                        </div>
                      )}
                   </div>
                </div>
             </div>
             <div className="w-[420px] space-y-6 mt-24">
                <button onClick={addTextLayer} className="w-full py-6 bg-pink-100 text-pink-500 rounded-3xl font-black shadow-sm hover:bg-pink-200 transition-all">+ 새로운 텍스트 추가</button>
                {selectedTextId && (
                  <div className="bg-white p-8 rounded-[40px] shadow-xl space-y-6 border border-slate-100 animate-in slide-in-from-right duration-300">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">문구 편집</label>
                       <input type="text" value={textLayers.find(l => l.id === selectedTextId)?.text} onChange={e => updateTextLayer(selectedTextId, { text: e.target.value })} className="w-full p-5 bg-slate-50 rounded-2xl font-black outline-none border-2 focus:border-pink-300" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">글자 크기</label>
                       <input type="range" min="5" max="50" value={textLayers.find(l => l.id === selectedTextId)?.size} onChange={e => updateTextLayer(selectedTextId, { size: Number(e.target.value) })} className="w-full h-2 bg-slate-200 rounded-full appearance-none accent-pink-500" />
                    </div>
                    <div className="flex justify-between items-center pt-4">
                       <button onClick={() => removeTextLayer(selectedTextId)} className="text-red-500 font-bold text-sm hover:underline">레이어 삭제</button>
                       <div className="flex gap-2">
                          {["#000000", "#FFFFFF", "#FF0000", "#0000FF", "#FFFF00", "#FF00FF"].map(c => <button key={c} onClick={() => updateTextLayer(selectedTextId, { color: c })} className={`w-6 h-6 rounded-full border-2 ${textLayers.find(l => l.id === selectedTextId)?.color === c ? 'border-slate-900 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}
                       </div>
                    </div>
                  </div>
                )}
                <button onClick={startPixelation} className="w-full py-8 bg-pink-500 text-white rounded-[40px] font-black text-2xl shadow-xl hover:bg-pink-600 active:scale-95 transition-all">레이아웃 완료</button>
             </div>
          </div>
        )}

        {step === 'EDITOR' && pixelData && (
          <div className="flex-1 flex flex-col gap-10 min-h-0 animate-in fade-in duration-500">
             <div className="bg-white/90 backdrop-blur p-8 rounded-[40px] shadow-xl flex items-center justify-between border border-slate-100">
                <button onClick={() => setStep(studioMode === 'PATTERN' ? 'FRAME' : 'TEXT')} className="px-6 py-4 bg-slate-50 rounded-2xl font-black text-slate-400 hover:text-pink-500 transition-colors">이전 단계로</button>
                <div className="flex items-center gap-6">
                   <div className="flex items-center bg-slate-100 p-2 rounded-2xl">
                      <button onClick={() => setZoom(z => Math.max(100, z - 100))} className="w-10 h-10 font-black">-</button>
                      <span className="w-20 text-center font-black">{zoom}%</span>
                      <button onClick={() => setZoom(z => Math.min(1000, z + 100))} className="w-10 h-10 font-black">+</button>
                   </div>
                   <button onClick={async () => {
                      setIsExporting(true);
                      try {
                        const zip = new JSZip();
                        const {width, height, colors} = pixelData;
                        const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d')!;
                        canvas.width = width; canvas.height = height;
                        colors.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(i % width, Math.floor(i/width), 1, 1); });
                        const blob = await new Promise<Blob|null>(r => canvas.toBlob(r));
                        if(blob) zip.file("pattern.png", blob);
                        const zipB = await zip.generateAsync({type:'blob'});
                        const a = document.createElement('a'); a.href = URL.createObjectURL(zipB); a.download="town_pattern.zip"; a.click();
                        showToast("도안 다운로드 완료!");
                      } finally { setIsExporting(false); }
                   }} className="px-12 py-5 bg-pink-600 text-white rounded-3xl font-black text-xl shadow-lg hover:bg-pink-700 transition-all">내보내기</button>
                </div>
             </div>
             <div className="flex-1 flex gap-10 overflow-hidden">
                <div ref={editorScrollRef} className="flex-1 bg-white rounded-[60px] overflow-auto custom-scrollbar relative workspace-pattern" onMouseDown={handleEditorMouseDown} onMouseMove={handleEditorMouseMove} onMouseUp={handleEditorMouseUp}>
                   <div className="inline-block p-[200px]">
                      <div className="relative p-12 bg-white rounded-3xl border-[12px] border-slate-950 shadow-2xl">
                         <div className="pixel-grid" style={{ gridTemplateColumns: `repeat(${pixelData.width}, ${zoom/10}px)` }}>
                            {pixelData.colors.map((color, idx) => {
                              const pItem = pixelData.palette.find(p => p.hex === color);
                              return (
                                <div key={idx} style={{ backgroundColor: color, width: zoom/10, height: zoom/10 }} className={`pixel-item hover:ring-2 hover:ring-white/50 transition-all ${activePaletteId === pItem?.index ? 'ring-4 ring-pink-500 z-10' : ''}`} onClick={() => setActivePaletteId(activePaletteId === pItem?.index ? null : pItem?.index || null)} />
                              );
                            })}
                         </div>
                      </div>
                   </div>
                </div>
                <div className="w-80 bg-white rounded-[60px] shadow-2xl p-8 overflow-y-auto custom-scrollbar flex flex-col shrink-0 border border-slate-100">
                   <h3 className="font-black mb-8 italic text-xl">🎨 Palette</h3>
                   <div className="space-y-4">
                      {pixelData.palette.map(p => (
                        <div key={p.index} onClick={() => setActivePaletteId(activePaletteId === p.index ? null : p.index)} className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer ${activePaletteId === p.index ? 'bg-pink-50 border-pink-300 shadow-md' : 'bg-white border-transparent hover:bg-slate-50'}`}>
                           <div className="w-12 h-12 rounded-xl border shadow-inner" style={{ backgroundColor: p.hex }} />
                           <div className="flex-1 min-w-0"><p className="font-black text-slate-800 truncate">No. {p.index}</p><p className="text-[10px] text-slate-400 font-mono uppercase">{p.hex}</p></div>
                           <span className="font-black text-pink-500">{p.count}</span>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans select-none">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {toast && <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-8 py-4 rounded-2xl font-black animate-bounce shadow-2xl">✨ {toast}</div>}
        <header className="h-20 bg-white/80 border-b flex items-center justify-between px-12 shrink-0 z-40">
           <div className="flex items-center gap-4">
             <h2 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">
               Town Studio | {activeView === 'HOME' ? 'Dashboard' : activeView}
             </h2>
           </div>
           <div className="flex items-center gap-6">
              <div className="flex -space-x-3">
                 {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200"></div>)}
                 <div className="w-8 h-8 rounded-full border-2 border-white bg-pink-500 flex items-center justify-center text-[10px] font-black text-white">+12</div>
              </div>
           </div>
        </header>
        {activeView === 'HOME' && renderHome()}
        {activeView === 'STUDIO' && renderStudio()}
        {(activeView !== 'HOME' && activeView !== 'STUDIO') && (
           <div className="flex-1 flex items-center justify-center text-4xl font-black italic text-slate-300 animate-pulse">{activeView} Hub 준비 중...</div>
        )}
      </main>
    </div>
  );
};

export default App;
