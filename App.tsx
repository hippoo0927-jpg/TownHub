
import React, { useState, useRef, useEffect } from 'react';
import { AppStep, PixelData, StudioMode, ColorInfo, TOWN_PALETTE_HEX, TextLayer } from './types';
import { processArtStudioPixel } from './services/pixelService';
import JSZip from 'jszip';

type MainView = 'HOME' | 'STUDIO' | 'DESIGN_FEED' | 'RECORD_SHOP' | 'TOWNHALL';

// 사용자가 제공한 팔레트 가이드 이미지 (실제 이미지 경로로 교체 필요)
const PALETTE_GUIDE_IMG = "https://images.squarespace-cdn.com/content/v1/5f1b1322b62d29194291882d/1614761005727-8YJ9A8QG8K8G8G8G8G8G/palette_guide_placeholder.png"; 

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
  
  // Tip Modal State
  const [showTipModal, setShowTipModal] = useState(false);

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
    <aside className="w-full lg:w-72 bg-slate-950 flex lg:flex-col shrink-0 border-r border-slate-900 z-50 overflow-x-auto lg:overflow-x-hidden">
      <div className="p-4 lg:p-8 flex lg:flex-col items-center lg:items-stretch gap-4 lg:gap-0">
        <div className="flex items-center gap-3 text-white lg:mb-10 cursor-pointer shrink-0" onClick={() => { setActiveView('HOME'); setStep('MODE_SELECT'); }}>
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-pink-600 rounded-lg lg:rounded-xl flex items-center justify-center font-black text-lg shadow-lg shadow-pink-900/40">T</div>
          <span className="font-black text-base lg:text-lg tracking-tighter italic hidden sm:inline">TownHub</span>
        </div>
        <nav className="flex lg:flex-col gap-1 lg:space-y-2">
          {[
            { id: 'HOME', name: 'Home', icon: '🏠' },
            { id: 'STUDIO', name: 'Art Studio', icon: '🎨' },
            { id: 'DESIGN_FEED', name: 'Feed', icon: '🖼️' },
            { id: 'RECORD_SHOP', name: 'Shop', icon: '💿' }
          ].map(item => (
            <button key={item.id} onClick={() => { setActiveView(item.id as MainView); if(item.id === 'STUDIO') setStep('MODE_SELECT'); }}
              className={`flex items-center gap-2 lg:gap-4 px-3 lg:px-5 py-2 lg:py-4 rounded-xl lg:rounded-2xl font-bold text-xs lg:text-sm transition-all whitespace-nowrap ${activeView === item.id ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
            >
              <span className="text-base lg:text-lg">{item.icon}</span>
              <span className="hidden lg:inline">{item.name}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="hidden lg:flex mt-auto p-6 border-t border-slate-900 bg-slate-900/30 flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/20">🦛</div>
          <div>
            <h4 className="text-white font-black text-sm italic">히포 (Hippoo)</h4>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Master Artisan</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed font-medium italic">"여러분들을 위해 두근두근타운에 맞는 픽셀아트 스튜디오를 만들었습니다!"</p>
        <a href="https://www.youtube.com/@Hippoo_Hanuu" target="_blank" rel="noopener noreferrer" className="w-full py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-900/20 active:scale-95">
          YouTube 구독하기
        </a>
      </div>
    </aside>
  );

  const renderHome = () => (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto p-6 lg:p-12 space-y-8 lg:space-y-12">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-slate-900 rounded-[32px] lg:rounded-[60px] p-8 lg:p-20 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none workspace-pattern scale-150 rotate-12"></div>
          <div className="relative z-10 space-y-4 lg:space-y-6 max-w-2xl text-center lg:text-left">
            <span className="bg-pink-500 text-white px-4 py-1.5 rounded-full font-black text-[10px] lg:text-xs uppercase tracking-widest italic inline-block">Official Creative Hub</span>
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-black italic tracking-tighter leading-tight">Town Square<br/>Art Studio</h1>
            <p className="text-base lg:text-xl text-slate-300 font-medium leading-relaxed">
              두근두근타운 시민들을 위한 고퀄리티 픽셀 도안 제작 시스템.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 pt-4 lg:pt-6">
              <button onClick={() => { setActiveView('STUDIO'); setStep('MODE_SELECT'); }} className="px-8 lg:px-10 py-4 lg:py-5 bg-pink-500 text-white rounded-2xl lg:rounded-3xl font-black text-lg lg:text-xl hover:bg-pink-600 transition-all shadow-lg shadow-pink-900/40">스튜디오 시작</button>
              <button onClick={() => setActiveView('DESIGN_FEED')} className="px-8 lg:px-10 py-4 lg:py-5 bg-white/10 text-white border border-white/20 rounded-2xl lg:rounded-3xl font-black text-lg lg:text-xl hover:bg-white/20 transition-all">커뮤니티 구경</button>
            </div>
          </div>
        </section>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-8">
          {[
            { icon: '🎨', title: '픽셀 도안 변환', desc: '이미지를 48x48 픽셀 도안으로 자동 변환합니다.' },
            { icon: '📖', title: '북커버 레이아웃', desc: '150x84 정밀 가이드와 멀티 텍스트 시스템 제공.' },
            { icon: '🌈', title: '컬러 팔레트', desc: '타운 규격 HEX 코드를 추출하여 바로 사용하세요.' }
          ].map((f, i) => (
            <div key={i} className="bg-white p-6 lg:p-10 rounded-[32px] lg:rounded-[48px] shadow-xl border border-slate-100">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl lg:text-3xl mb-4 lg:mb-6">{f.icon}</div>
              <h3 className="text-xl lg:text-2xl font-black italic mb-2 lg:mb-3">{f.title}</h3>
              <p className="text-slate-500 font-medium text-xs lg:text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStudio = () => (
    <div className="flex-1 overflow-y-auto p-4 lg:p-12 custom-scrollbar bg-slate-50 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {step === 'MODE_SELECT' && (
          <div className="flex-1 flex items-center justify-center">
             <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
                <button onClick={() => { setStudioMode('PATTERN'); setStep('SETUP'); setCanvasDim({ w: 48, h: 48 }); }} 
                  className="bg-white p-8 lg:p-12 rounded-[40px] lg:rounded-[60px] shadow-2xl border-4 border-transparent hover:border-pink-500 transition-all group flex flex-col items-center">
                   <div className="w-20 h-20 lg:w-24 lg:h-24 bg-pink-100 rounded-[30px] flex items-center justify-center text-4xl lg:text-5xl mb-6 lg:mb-8">🎨</div>
                   <h3 className="text-xl lg:text-2xl font-black text-slate-900 mb-2 italic">픽셀 도안 제작</h3>
                   <p className="text-slate-400 text-center font-bold text-xs lg:text-sm">48x48 등 자유로운 크기로 제작</p>
                </button>
                <button onClick={() => { setStudioMode('BOOK_COVER'); setCanvasDim({ w: 150, h: 84 }); setStep('UPLOAD'); }} 
                  className="bg-white p-8 lg:p-12 rounded-[40px] lg:rounded-[60px] shadow-2xl border-4 border-transparent hover:border-pink-500 transition-all group flex flex-col items-center">
                   <div className="w-20 h-20 lg:w-24 lg:h-24 bg-indigo-100 rounded-[30px] flex items-center justify-center text-4xl lg:text-5xl mb-6 lg:mb-8">📖</div>
                   <h3 className="text-xl lg:text-2xl font-black text-slate-900 mb-2 italic">북커버 제작</h3>
                   <p className="text-slate-400 text-center font-bold text-xs lg:text-sm">150x84 고정 규격 가이드 제공</p>
                </button>
             </div>
          </div>
        )}

        {step === 'SETUP' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-xl bg-white rounded-[40px] shadow-2xl p-8 lg:p-20 border border-slate-100">
               <h2 className="text-3xl lg:text-4xl font-black text-slate-900 mb-8 italic">Creative Setup</h2>
               <div className="grid grid-cols-2 gap-4 lg:gap-8 mb-8 lg:mb-12">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">가로 픽셀</label>
                    <input type="number" value={canvasDim.w} onChange={e => setCanvasDim({...canvasDim, w: Number(e.target.value)})} className="w-full p-4 lg:p-6 bg-slate-50 rounded-2xl font-black text-2xl lg:text-3xl text-center border-2 focus:border-pink-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">세로 픽셀</label>
                    <input type="number" value={canvasDim.h} onChange={e => setCanvasDim({...canvasDim, h: Number(e.target.value)})} className="w-full p-4 lg:p-6 bg-slate-50 rounded-2xl font-black text-2xl lg:text-3xl text-center border-2 focus:border-pink-500 outline-none transition-all" />
                  </div>
               </div>
               <button onClick={() => setStep('UPLOAD')} className="w-full py-6 lg:py-8 bg-slate-900 text-white rounded-[24px] lg:rounded-[32px] font-black text-lg lg:text-xl shadow-xl hover:bg-black transition-all">다음으로</button>
            </div>
          </div>
        )}

        {step === 'UPLOAD' && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div onClick={() => fileInputRef.current?.click()} className="w-full max-w-4xl aspect-[16/9] md:aspect-[16/7] bg-white rounded-[40px] lg:rounded-[60px] shadow-2xl border-4 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-pink-400 transition-all group">
              <input type="file" ref={fileInputRef} onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const r = new FileReader(); r.onload = (ev) => { setUploadedImg(ev.target?.result as string); setStep('FRAME'); }; r.readAsDataURL(file);
                }
              }} accept="image/*" className="hidden" />
              <div className="w-20 h-20 lg:w-32 lg:h-32 bg-pink-100 rounded-[30px] lg:rounded-[40px] flex items-center justify-center mb-6 lg:mb-8 group-hover:scale-110 transition-transform"><span className="text-4xl lg:text-7xl">📸</span></div>
              <h3 className="text-xl lg:text-2xl font-black text-slate-900 text-center px-6">사진을 업로드하세요</h3>
            </div>
          </div>
        )}

        {(step === 'FRAME' || step === 'TEXT') && (
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 h-full items-center lg:items-start">
            <div className="flex-1 w-full flex flex-col items-center">
              <div className="text-center mb-6 lg:mb-10">
                <h2 className="text-2xl lg:text-4xl font-black text-slate-900 italic tracking-tighter">{step === 'FRAME' ? '이미지 위치 조정' : '텍스트 배치'}</h2>
              </div>
              <div className="relative w-full bg-white rounded-[40px] lg:rounded-[60px] shadow-2xl p-4 sm:p-12 lg:p-24 workspace-pattern overflow-hidden flex items-center justify-center">
                <div 
                  ref={frameContainerRef}
                  className="relative bg-white border-[4px] border-slate-900 shadow-2xl overflow-hidden cursor-move max-w-full" 
                  style={{ width: 'min(700px, 100%)', aspectRatio: `${canvasDim.w} / ${canvasDim.h}` }}
                  onMouseDown={(e) => { frameDragRef.current = { isDragging: true, startX: e.clientX, startY: e.clientY, initialX: crop.x, initialY: crop.y }; }} 
                  onMouseMove={(e) => {
                    if (!frameDragRef.current.isDragging || !frameContainerRef.current) return;
                    const rect = frameContainerRef.current.getBoundingClientRect();
                    if (step === 'FRAME') {
                        setCrop(prev => ({ 
                          ...prev, 
                          x: frameDragRef.current.initialX + (e.clientX - frameDragRef.current.startX) * (canvasDim.w / rect.width), 
                          y: frameDragRef.current.initialY + (e.clientY - frameDragRef.current.startY) * (canvasDim.h / rect.height) 
                        }));
                    }
                  }} 
                  onMouseUp={() => frameDragRef.current.isDragging = false}
                  onMouseLeave={() => frameDragRef.current.isDragging = false}
                >
                  <canvas ref={previewCanvasRef} width={canvasDim.w} height={canvasDim.h} className="w-full h-full pointer-events-none" style={{ imageRendering: 'pixelated' }} />
                  {step === 'TEXT' && textLayers.map(layer => (
                    <div key={layer.id} className="absolute cursor-move select-none" style={{ left: `${layer.x}%`, top: `${layer.y}%`, transform: 'translate(-50%, -50%)' }}
                        onMouseDown={(e) => {
                             e.stopPropagation();
                             setSelectedTextId(layer.id);
                             textDragRef.current = { isDragging: true, activeId: layer.id, startX: e.clientX, startY: e.clientY, initialX: layer.x, initialY: layer.y };
                        }}
                    >
                        <span className="font-black whitespace-nowrap" style={{ fontSize: `${layer.size * 2}px`, color: layer.color }}>{layer.text}</span>
                    </div>
                  ))}
                  {studioMode === 'BOOK_COVER' && (
                    <div className="absolute inset-0 pointer-events-none flex font-black text-[10px] opacity-20 italic">
                       <div className="flex-[68] border-r border-pink-500/30 flex items-center justify-center">BACK</div>
                       <div className="flex-[14] border-r border-pink-500/30 flex items-center justify-center text-[6px] [writing-mode:vertical-rl]">SIDE</div>
                       <div className="flex-[68] flex items-center justify-center">FRONT</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="w-full lg:w-80 shrink-0 space-y-4 lg:space-y-8">
              {step === 'FRAME' ? (
                <div className="bg-white p-6 lg:p-8 rounded-[32px] lg:rounded-[40px] shadow-xl space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400">🔍 크기 조정</label>
                    <input type="range" min="0.1" max="5" step="0.01" value={crop.scale} onChange={e => setCrop({...crop, scale: Number(e.target.value)})} className="w-full h-2 bg-slate-900 rounded-full appearance-none accent-pink-300" />
                  </div>
                  <button onClick={() => studioMode === 'PATTERN' ? startPixelation() : setStep('TEXT')} className="w-full py-6 lg:py-8 bg-pink-500 text-white rounded-3xl font-black text-lg lg:text-xl shadow-lg">다음 단계</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <button onClick={addTextLayer} className="w-full py-4 bg-pink-100 text-pink-500 rounded-2xl font-black">+ 텍스트 추가</button>
                  {selectedTextId && (
                     <div className="bg-white p-6 rounded-3xl shadow-lg space-y-4">
                        <input type="text" value={textLayers.find(l => l.id === selectedTextId)?.text} onChange={e => updateTextLayer(selectedTextId, { text: e.target.value })} className="w-full p-4 bg-slate-50 rounded-xl font-bold" />
                        <input type="range" min="5" max="50" value={textLayers.find(l => l.id === selectedTextId)?.size} onChange={e => updateTextLayer(selectedTextId, { size: Number(e.target.value) })} className="w-full accent-pink-500" />
                        <button onClick={() => removeTextLayer(selectedTextId)} className="w-full text-red-500 text-xs font-bold">삭제</button>
                     </div>
                  )}
                  <button onClick={startPixelation} className="w-full py-6 lg:py-8 bg-pink-500 text-white rounded-3xl font-black text-lg lg:text-xl">변환 완료</button>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'EDITOR' && pixelData && (
          <div className="flex-1 flex flex-col gap-6 lg:gap-10 min-h-0">
             <div className="bg-white p-4 lg:p-8 rounded-[32px] lg:rounded-[40px] shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <button onClick={() => setStep(studioMode === 'PATTERN' ? 'FRAME' : 'TEXT')} className="px-6 py-3 bg-slate-100 rounded-xl font-black text-slate-400 text-sm">이전</button>
                <div className="flex items-center gap-2 lg:gap-4">
                   <button onClick={() => setShowTipModal(true)} className="px-6 py-3 bg-orange-100 text-orange-600 rounded-xl font-black text-sm flex items-center gap-2">💡 Tip</button>
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
                        showToast("다운로드 완료!");
                      } finally { setIsExporting(false); }
                   }} className="px-8 lg:px-12 py-3 lg:py-5 bg-pink-600 text-white rounded-2xl lg:rounded-3xl font-black text-base lg:text-xl shadow-lg">내보내기</button>
                </div>
             </div>
             <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:gap-10 overflow-hidden">
                <div ref={editorScrollRef} className="flex-1 bg-white rounded-[32px] lg:rounded-[60px] overflow-auto custom-scrollbar relative workspace-pattern border border-slate-100" onMouseDown={handleEditorMouseDown} onMouseMove={handleEditorMouseMove} onMouseUp={handleEditorMouseUp}>
                   <div className="inline-block p-10 sm:p-20 lg:p-[200px]">
                      <div className="relative p-4 sm:p-12 bg-white rounded-2xl border-[4px] lg:border-[12px] border-slate-950 shadow-2xl">
                         <div className="pixel-grid" style={{ gridTemplateColumns: `repeat(${pixelData.width}, ${zoom/15}px)` }}>
                            {pixelData.colors.map((color, idx) => {
                              const pItem = pixelData.palette.find(p => p.hex === color);
                              return (
                                <div key={idx} style={{ backgroundColor: color, width: zoom/15, height: zoom/15 }} className={`pixel-item ${activePaletteId === pItem?.index ? 'ring-2 ring-pink-500 z-10' : ''}`} onClick={() => setActivePaletteId(activePaletteId === pItem?.index ? null : pItem?.index || null)} />
                              );
                            })}
                         </div>
                      </div>
                   </div>
                </div>
                <div className="w-full lg:w-80 bg-white rounded-[32px] lg:rounded-[60px] shadow-2xl p-6 lg:p-8 overflow-y-auto custom-scrollbar shrink-0 border border-slate-100">
                   <h3 className="font-black mb-4 lg:mb-8 italic text-lg lg:text-xl">🎨 Palette</h3>
                   <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-1 gap-3">
                      {pixelData.palette.map(p => (
                        <div key={p.index} onClick={() => setActivePaletteId(activePaletteId === p.index ? null : p.index)} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${activePaletteId === p.index ? 'bg-pink-50 border-pink-300' : 'bg-white border-transparent'}`}>
                           <div className="w-8 h-8 rounded-lg border shadow-inner" style={{ backgroundColor: p.hex }} />
                           <div className="flex-1 min-w-0"><p className="font-black text-slate-800 text-[10px] lg:text-xs truncate">{p.index}</p></div>
                           <span className="font-black text-pink-500 text-xs">{p.count}</span>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Tip Modal - Responsive optimized */}
      {showTipModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 lg:p-8 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowTipModal(false)}>
          <div className="bg-white rounded-[32px] lg:rounded-[40px] p-6 lg:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 lg:mb-6 sticky top-0 bg-white py-2 z-10">
               <div className="flex flex-col">
                  <h3 className="text-xl lg:text-2xl font-black italic">🎨 Art Studio Tips</h3>
                  <p className="text-pink-600 font-bold text-xs lg:text-sm mt-1">내보내기를 누르면 압축된 사진을 받을 수 있습니다.</p>
               </div>
               <button onClick={() => setShowTipModal(false)} className="w-8 h-8 lg:w-10 lg:h-10 bg-slate-100 text-slate-400 rounded-full font-black hover:bg-slate-900 hover:text-white flex items-center justify-center">X</button>
            </div>
            
            <div className="space-y-4 lg:space-y-6">
               <div className="bg-slate-50 p-4 lg:p-6 rounded-2xl border border-slate-100">
                  <h4 className="font-black text-slate-900 text-sm lg:text-base mb-1">📂 저장 안내</h4>
                  <p className="text-slate-500 text-[10px] lg:text-xs leading-relaxed">
                    오른쪽 상단의 <span className="text-pink-600 font-black">내보내기</span> 버튼을 클릭하면 픽셀 도안이 포함된 <span className="font-bold underline">ZIP 압축 파일</span>이 다운로드됩니다.
                  </p>
               </div>
               <div className="rounded-2xl lg:rounded-[32px] overflow-hidden border-2 lg:border-4 border-slate-100 relative">
                  <img src={PALETTE_GUIDE_IMG} className="w-full h-auto" alt="Palette Guide" />
               </div>
               <p className="text-center text-slate-400 font-bold text-[10px] lg:text-xs">가이드 번호를 확인하여 타운 팔레트에 색상을 배치하세요!</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-slate-50 overflow-hidden font-sans select-none">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {toast && <div className="absolute top-4 lg:top-10 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-xl font-black shadow-2xl text-xs lg:text-base">✨ {toast}</div>}
        <header className="h-16 lg:h-20 bg-white/80 border-b flex items-center justify-between px-6 lg:px-12 shrink-0 z-40">
           <div className="flex items-center gap-4">
             <h2 className="text-sm lg:text-xl font-black text-slate-900 italic uppercase tracking-tighter">
               Studio | {activeView === 'HOME' ? 'Dashboard' : activeView}
             </h2>
           </div>
           <div className="flex items-center gap-4">
              <div className="hidden sm:flex -space-x-2">
                 {[1,2].map(i => <div key={i} className="w-6 h-6 lg:w-8 lg:h-8 rounded-full border-2 border-white bg-slate-200"></div>)}
              </div>
           </div>
        </header>
        {activeView === 'HOME' && renderHome()}
        {activeView === 'STUDIO' && renderStudio()}
        {(activeView !== 'HOME' && activeView !== 'STUDIO') && (
           <div className="flex-1 flex items-center justify-center text-2xl lg:text-4xl font-black italic text-slate-200 animate-pulse">{activeView} Hub 준비 중...</div>
        )}
      </main>
    </div>
  );
};

export default App;
