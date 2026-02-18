
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

// App.tsx 상단에 추가 또는 수정
const getWeightedColorDistance = (c1: string, c2: string) => {
  const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
  
  // 초록색(g) 가중치를 조절하여 파랑이 초록으로 튀는 것을 방지
  return Math.sqrt(
    Math.pow((r1 - r2) * 0.3, 2) + 
    Math.pow((g1 - g2) * 0.59, 2) + 
    Math.pow((b1 - b2) * 0.11, 2)
  );
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
  const [showPalette, setShowPalette] = useState(true); // 팔레트 표시 상태

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

  const handleDragStart = (e: any, isText: boolean = false, textId: string | null = null) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    if (isText && textId) {
      setSelectedTextId(textId);
      const layer = textLayers.find(l => l.id === textId);
      if (layer) {
        frameDragRef.current = { isDragging: true, startX: clientX, startY: clientY, initialX: 0, initialY: 0, initialPropX: layer.x, initialPropY: layer.y };
      }
    } else {
      frameDragRef.current = { isDragging: true, startX: clientX, startY: clientY, initialX: crop.x, initialY: crop.y, initialPropX: 0, initialPropY: 0 };
    }
  };

  const handleDragMove = (e: any) => {
    if (!frameDragRef.current.isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    if (!frameContainerRef.current) return;
    const rect = frameContainerRef.current.getBoundingClientRect();
    if (step === 'FRAME') {
      setCrop(prev => ({ ...prev, x: frameDragRef.current.initialX + (clientX - frameDragRef.current.startX) * (canvasDim.w / rect.width), y: frameDragRef.current.initialY + (clientY - frameDragRef.current.startY) * (canvasDim.h / rect.height) }));
    } else if (step === 'TEXT' && selectedTextId) {
      const dx = ((clientX - frameDragRef.current.startX) / rect.width) * 100;
      const dy = ((clientY - frameDragRef.current.startY) / rect.height) * 100;
      setTextLayers(prev => prev.map(l => l.id === selectedTextId ? { ...l, x: Math.max(0, Math.min(100, frameDragRef.current.initialPropX + dx)), y: Math.max(0, Math.min(100, frameDragRef.current.initialPropY + dy)) } : l));
    }
  };
// App 컴포넌트 내부에 추가
const formatPaletteIndex = (index: number) => {
  const row = Math.floor((index - 1) / 8) + 1; // 한 행에 8칸 기준
  const col = (index - 1) % 8 + 1;
  return `${row}-${col}`;
};
  
  const exportAsZip = async () => {
    if (!pixelData || isExporting) return;
    setIsExporting(true); 
    showToast("가이드 파일 생성 중...");
    
    // 인게임 팔레트 번호 포맷팅 함수 (8열 기준)
    const formatPaletteIndex = (index: number) => {
      const row = Math.floor((index - 1) / 8) + 1;
      const col = (index - 1) % 8 + 1;
      return `${row}-${col}`;
    };

    try {
      const zip = new JSZip(); 
      const { width, height, colors, palette } = pixelData; 
      const blockSize = 60; // 가독성을 위해 블록 크기를 살짝 키웠습니다.
      
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
              
              // 팔레트 내 인덱스 찾기 (1부터 시작)
              const pIdx = palette.findIndex(p => p.hex === color) + 1;
              // 인게임 좌표 형식(행-열)으로 변환
              const gameCoord = formatPaletteIndex(pIdx);

              // 1. 배경색 채우기
              ctx.fillStyle = color; 
              ctx.fillRect(px * blockSize, py * blockSize, blockSize, blockSize);
              
              // 2. 그리드 선 그리기
              ctx.strokeStyle = "rgba(0,0,0,0.15)"; 
              ctx.lineWidth = 0.5; 
              ctx.strokeRect(px * blockSize, py * blockSize, blockSize, blockSize);
              
              // 3. 텍스트 가시성 설정
              const contrastColor = getContrastColor(color);
              ctx.font = `bold ${blockSize / 3.5}px sans-serif`; 
              ctx.textAlign = 'center'; 
              ctx.textBaseline = 'middle';

              // 4. 글자 테두리(Stroke) 추가 - 밝은색/어두운색 모든 배경에서 글자가 잘 보이게 함
              ctx.strokeStyle = contrastColor === 'white' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)';
              ctx.lineWidth = 3;
              ctx.strokeText(gameCoord, px * blockSize + blockSize / 2, py * blockSize + blockSize / 2);

              // 5. 실제 텍스트 쓰기
              ctx.fillStyle = contrastColor; 
              ctx.fillText(gameCoord, px * blockSize + blockSize / 2, py * blockSize + blockSize / 2);
            }
          }
          const blob = await new Promise<Blob | null>(r => c.toBlob(r)); 
          if (blob) zip.file(`guide_y${Math.floor(y/splitSize)}_x${Math.floor(x/splitSize)}.png`, blob);
        }
      }

      // 원본 픽셀 이미지 저장 로직
      const orig = document.createElement('canvas'); 
      orig.width = width; 
      orig.height = height; 
      const octx = orig.getContext('2d')!;
      colors.forEach((col, i) => { 
        octx.fillStyle = col; 
        octx.fillRect(i % width, Math.floor(i / width), 1, 1); 
      });
      
      const oblob = await new Promise<Blob | null>(r => orig.toBlob(r)); 
      if (oblob) zip.file("original_pixel.png", oblob);
      
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
      showToast("저장 완료!");
    } catch (e) { 
      showToast("오류 발생"); 
    } finally { 
      setIsExporting(false); 
    }
  };

  const startPixelation = async () => {
    if (!previewCanvasRef.current) return; setIsProcessing(true);
    const finalCanvas = document.createElement('canvas'); finalCanvas.width = canvasDim.w; finalCanvas.height = canvasDim.h;
    const ctx = finalCanvas.getContext('2d')!; ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvasDim.w, canvasDim.h);
    if (imageObjRef.current) {
      ctx.save(); ctx.translate(canvasDim.w / 2 + crop.x, canvasDim.h / 2 + crop.y);
      ctx.scale(crop.scale, crop.scale); ctx.drawImage(imageObjRef.current, -imageObjRef.current.width / 2, -imageObjRef.current.height / 2);
      ctx.restore();
    }
    textLayers.forEach(l => {
      ctx.fillStyle = l.color; ctx.font = `bold ${l.size}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(l.text, (l.x / 100) * canvasDim.w, (l.y / 100) * canvasDim.h);
    });
    setTimeout(async () => {
      try {
        const data = await processArtStudioPixel(finalCanvas.toDataURL(), canvasDim.w, canvasDim.h, 64, { x: 0, y: 0, scale: 1 });
        setPixelData(data); setStep('EDITOR'); setZoom(400); setShowPalette(window.innerWidth > 1024); // PC에서는 처음부터 보여줌
      } catch (e) { showToast("변환 중 오류 발생"); } finally { setIsProcessing(false); }
    }, 100);
  };

  useEffect(() => {
    if ((step === 'FRAME' || step === 'TEXT') && imageObjRef.current && previewCanvasRef.current) {
      const ctx = previewCanvasRef.current.getContext('2d'); if (!ctx) return;
      ctx.clearRect(0, 0, canvasDim.w, canvasDim.h); ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvasDim.w, canvasDim.h);
      ctx.save(); ctx.translate(canvasDim.w / 2 + crop.x, canvasDim.h / 2 + crop.y); ctx.scale(crop.scale, crop.scale); ctx.drawImage(imageObjRef.current, -imageObjRef.current.width / 2, -imageObjRef.current.height / 2); ctx.restore();
      if (step === 'TEXT') {
        textLayers.forEach(l => {
          ctx.fillStyle = l.color; ctx.font = `bold ${l.size}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(l.text, (l.x / 100) * canvasDim.w, (l.y / 100) * canvasDim.h);
        });
      }
    }
  }, [step, crop, canvasDim, textLayers]);

  const Sidebar = () => (
    <aside className="w-full lg:w-[280px] bg-[#020617] flex flex-col shrink-0 border-b lg:border-r border-slate-900 z-50 lg:h-full overflow-hidden shadow-2xl">
      <div className="px-6 py-4 lg:p-10 flex flex-row lg:flex-col h-full justify-between items-center lg:items-stretch">
        <div className="flex flex-row lg:flex-col items-center lg:items-stretch gap-6 lg:gap-14">
          <div className="flex items-center gap-4 text-white cursor-pointer group" onClick={() => { setActiveView('HOME'); setStep('MODE_SELECT'); }}>
            <div className="w-10 h-10 bg-gradient-to-br from-[#F472B6] to-[#DB2777] rounded-xl flex items-center justify-center font-black text-xl shadow-[0_4px_20px_-4px_rgba(244,114,182,0.6)]">T</div>
            <span className="font-black italic text-2xl tracking-tighter hidden sm:inline">TownHub</span>
          </div>
          <nav className="flex flex-row lg:flex-col gap-2 lg:gap-3">
            {[
              { id: 'HOME', label: 'Home', icon: '🏠' },
              { id: 'STUDIO', label: 'Art Studio', icon: '🎨' },
              { id: 'DESIGN_FEED', label: 'Feed', icon: '🖼️' },
              { id: 'RECORD_SHOP', label: 'Shop', icon: '🛍️' }
            ].map(item => (
              <button key={item.id} onClick={() => { setActiveView(item.id as MainView); if(item.id === 'STUDIO') setStep('MODE_SELECT'); }}
                className={`flex items-center gap-3 lg:gap-5 px-3 py-2 lg:px-6 lg:py-4 rounded-xl lg:rounded-[24px] font-black text-[11px] lg:text-sm transition-all whitespace-nowrap ${activeView === item.id ? 'bg-[#EC4899]/20 text-[#EC4899] ring-1 ring-[#EC4899]/30 shadow-[0_0_20px_-5px_rgba(236,72,153,0.3)]' : 'text-slate-500 hover:text-slate-200 hover:bg-slate-900/50'}`}
              >
                <span className="text-base lg:text-xl">{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="hidden lg:flex flex-col space-y-6 pt-10 border-t border-slate-900/50">
           <div className="flex items-center gap-5 p-4 bg-slate-900/40 rounded-[28px] border border-slate-800/50">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 overflow-hidden ring-2 ring-slate-800">
                 <img src="https://api.dicebear.com/7.x/pixel-art/svg?seed=hippo&backgroundColor=b6e3f4" alt="Hippo" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                 <p className="text-white font-black text-sm italic">히포 (Hippoo_)</p>
                 <p className="text-[#F472B6] font-black text-[10px] uppercase tracking-widest mt-0.5">Master Artisan</p>
              </div>
           </div>
           <button onClick={() => window.open('https://www.youtube.com/@Hippoo_Hanuu', '_blank')} className="w-full py-4 bg-[#EF4444] text-white rounded-2xl font-black text-xs uppercase tracking-tight shadow-xl hover:bg-red-600 active:scale-95 transition-all">YouTube 구독하기</button>
        </div>
      </div>
    </aside>
  );

  const selectedText = textLayers.find(l => l.id === selectedTextId);

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#020617] overflow-hidden font-sans select-none text-slate-300">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {toast && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-white text-slate-900 px-6 py-3 rounded-full font-black shadow-2xl text-xs animate-in slide-in-from-top-4">{toast}</div>}
        <header className="px-6 py-4 lg:px-12 lg:py-10 shrink-0 flex items-center justify-between">
           <h2 className="text-[10px] font-black italic text-slate-600 uppercase tracking-[0.4em] flex items-center gap-4">
              <span className="w-2 h-2 bg-pink-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(236,72,153,0.8)]"></span>
              {activeView === 'STUDIO' ? `${step} DASHBOARD` : 'EDITOR DASHBOARD'}
           </h2>
        </header>

        <div className="flex-1 overflow-hidden relative flex flex-col">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-14 lg:pt-4">
            {activeView === 'HOME' ? (
              <div className="max-w-7xl mx-auto h-full flex items-center justify-center animate-in fade-in duration-1000">
                <div className="bg-slate-900/40 rounded-[64px] lg:rounded-[100px] p-12 lg:p-48 text-white shadow-2xl relative border border-slate-800/50 overflow-hidden w-full max-w-6xl backdrop-blur-3xl text-center lg:text-left">
                  <div className="absolute -right-40 -top-40 w-[600px] h-[600px] bg-pink-500/5 blur-[150px] rounded-full" />
                  <div className="relative z-10 space-y-12 lg:space-y-16">
                    <span className="bg-[#EC4899] text-white px-8 py-3 rounded-full font-black text-[11px] uppercase tracking-[0.4em] italic inline-block shadow-lg shadow-pink-500/20">PREMIUM CREATIVE HUB</span>
                    <h1 className="text-5xl lg:text-[140px] font-black italic tracking-tighter leading-[0.8] bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-600">Town Square<br/>Art Studio</h1>
                    <button onClick={() => { setActiveView('STUDIO'); setStep('MODE_SELECT'); }} 
                            className="px-12 py-6 lg:px-20 lg:py-10 bg-white text-slate-900 rounded-[40px] lg:rounded-[60px] font-black text-xl lg:text-3xl hover:bg-[#EC4899] hover:text-white transition-all shadow-2xl transform hover:-translate-y-2 active:scale-95">스튜디오 시작</button>
                  </div>
                </div>
              </div>
            ) : activeView === 'STUDIO' ? (
              <div className="h-full max-w-7xl mx-auto flex flex-col relative">
                {step === 'MODE_SELECT' && (
                  <div className="flex-1 flex flex-col md:grid md:grid-cols-2 gap-8 lg:gap-14 items-center justify-center p-4">
                    <button onClick={() => { setStudioMode('PATTERN'); setStep('SETUP'); setCanvasDim({w:48, h:48}); }} 
                            className="w-full aspect-square max-w-md bg-slate-900/40 p-12 lg:p-20 rounded-[64px] lg:rounded-[100px] border-2 border-slate-800 hover:border-[#EC4899] hover:shadow-[0_0_50px_-10px_rgba(236,72,153,0.3)] transition-all flex flex-col items-center justify-center group shadow-2xl">
                      <div className="text-7xl lg:text-[100px] mb-10 group-hover:scale-110 transition-transform">🎨</div>
                      <h3 className="text-3xl lg:text-5xl font-black italic text-white text-center">픽셀 도안 제작</h3>
                      <p className="mt-4 text-slate-600 font-bold text-xs uppercase tracking-[0.3em]">Pixel Tool</p>
                    </button>
                    <button onClick={() => { setStudioMode('BOOK_COVER'); setCanvasDim({w:150, h:84}); setStep('UPLOAD'); }} 
                            className="w-full aspect-square max-w-md bg-slate-900/40 p-12 lg:p-20 rounded-[64px] lg:rounded-[100px] border-2 border-slate-800 hover:border-cyan-500 hover:shadow-[0_0_50px_-10px_rgba(6,182,212,0.3)] transition-all flex flex-col items-center justify-center group shadow-2xl">
                      <div className="text-7xl lg:text-[100px] mb-10 group-hover:scale-110 transition-transform">📖</div>
                      <h3 className="text-3xl lg:text-5xl font-black italic text-white text-center">북커버 제작</h3>
                      <p className="mt-4 text-slate-600 font-bold text-xs uppercase tracking-[0.3em]">Layout Tool</p>
                    </button>
                  </div>
                )}

                {step === 'SETUP' && (
                  <div className="flex-1 flex items-center justify-center p-4">
                    <div className="bg-slate-900/60 p-12 lg:p-28 rounded-[64px] lg:rounded-[100px] shadow-2xl border border-slate-800 max-w-2xl w-full backdrop-blur-xl">
                      <h2 className="text-4xl lg:text-6xl font-black mb-12 lg:mb-20 italic text-white tracking-tighter text-center">Dimension</h2>
                      <div className="grid grid-cols-2 gap-6 lg:gap-10 mb-12 lg:mb-20 text-center">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Width</label>
                          <input type="number" value={canvasDim.w} onChange={e=>setCanvasDim({...canvasDim, w:Number(e.target.value)})} className="w-full p-6 lg:p-10 bg-slate-800 rounded-[32px] lg:rounded-[48px] font-black text-3xl lg:text-5xl text-center text-white outline-none focus:ring-2 focus:ring-[#EC4899] shadow-inner" />
                        </div>
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Height</label>
                          <input type="number" value={canvasDim.h} onChange={e=>setCanvasDim({...canvasDim, h:Number(e.target.value)})} className="w-full p-6 lg:p-10 bg-slate-800 rounded-[32px] lg:rounded-[48px] font-black text-3xl lg:text-5xl text-center text-white outline-none focus:ring-2 focus:ring-[#EC4899] shadow-inner" />
                        </div>
                      </div>
                      <button onClick={()=>setStep('UPLOAD')} className="w-full py-8 lg:py-10 bg-white text-slate-900 rounded-[40px] lg:rounded-[60px] font-black text-xl lg:text-3xl shadow-2xl hover:bg-[#EC4899] hover:text-white transition-all">Next Step</button>
                    </div>
                  </div>
                )}

                {step === 'UPLOAD' && (
                  <div className="flex-1 flex items-center justify-center p-4">
                    <div onClick={()=>fileInputRef.current?.click()} className="w-full max-w-5xl aspect-video bg-slate-900/20 rounded-[64px] lg:rounded-[120px] border-4 border-dashed border-slate-800 flex flex-col items-center justify-center cursor-pointer hover:border-[#EC4899]/50 group transition-all shadow-2xl">
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                        const f = e.target.files?.[0]; if (f) {
                          const r = new FileReader(); r.onload = (ev) => {
                            const img = new Image(); img.src = ev.target?.result as string;
                            img.onload = () => { imageObjRef.current = img; setUploadedImg(img.src); setStep('FRAME'); setCrop({x:0,y:0,scale:0.8}); };
                          }; r.readAsDataURL(f);
                        }
                      }} />
                      <div className="w-24 h-24 lg:w-40 lg:h-40 bg-slate-900 rounded-[40px] lg:rounded-[60px] flex items-center justify-center text-5xl lg:text-8xl mb-8 group-hover:bg-[#EC4899] transition-all shadow-2xl">📸</div>
                      <p className="font-black text-2xl lg:text-5xl text-white italic tracking-tighter">이미지를 선택하세요</p>
                    </div>
                  </div>
                )}

                {(step === 'FRAME' || step === 'TEXT') && (
                  <div className="flex flex-col lg:flex-row gap-8 lg:gap-20 h-full min-h-0 items-center justify-center p-2">
                    <div className="w-full flex-1 flex flex-col items-center min-h-0 lg:max-w-6xl">
                      <div className="bg-slate-900/40 rounded-[48px] lg:rounded-[120px] shadow-2xl p-6 lg:p-36 w-full flex-1 flex items-center justify-center relative overflow-hidden border border-slate-800/50 backdrop-blur-xl">
                        <div ref={frameContainerRef} className="relative bg-white shadow-2xl overflow-hidden rounded-xl z-10 touch-none"
                             style={{ width: 'min(900px, 100%)', aspectRatio: `${canvasDim.w}/${canvasDim.h}`, border: '4px solid #000' }}
                             onMouseDown={e => handleDragStart(e)} onTouchStart={e => handleDragStart(e)}
                             onMouseMove={e => handleDragMove(e)} onTouchMove={e => handleDragMove(e)}
                             onMouseUp={() => { frameDragRef.current.isDragging = false; }} onTouchEnd={() => { frameDragRef.current.isDragging = false; }}>
                          <canvas ref={previewCanvasRef} width={canvasDim.w} height={canvasDim.h} className={`w-full h-full pointer-events-none`} style={{imageRendering:'pixelated'}} />
                          {studioMode === 'BOOK_COVER' && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                               <div className="absolute inset-y-0 left-1/2 w-[1px] bg-pink-500/50 border-l border-dashed" />
                               <div className="absolute left-[12%] top-6 lg:top-14 bg-[#EC4899] text-white px-4 py-1.5 rounded-full text-[9px] lg:text-[11px] font-black shadow-lg">BACK</div>
                               <div className="absolute left-1/2 top-6 lg:top-14 -translate-x-1/2 bg-cyan-500 text-white px-4 py-1.5 rounded-full text-[9px] lg:text-[11px] font-black shadow-lg">SIDE</div>
                               <div className="absolute right-[12%] top-6 lg:top-14 bg-[#EC4899] text-white px-4 py-1.5 rounded-full text-[9px] lg:text-[11px] font-black shadow-lg">FRONT</div>
                            </div>
                          )}
                          {textLayers.map(l => (
                            <div key={l.id} 
                                 className={`absolute cursor-move font-black whitespace-nowrap select-none touch-none ${selectedTextId === l.id ? 'ring-4 ring-[#EC4899] bg-white/60 p-1 rounded-md' : ''}`}
                                 style={{ left: `${l.x}%`, top: `${l.y}%`, transform: 'translate(-50%, -50%)', color: l.color, fontSize: `calc(${l.size}px * (min(900, 100vw) / ${canvasDim.w}))` }}
                                 onMouseDown={e => { e.stopPropagation(); handleDragStart(e, true, l.id); }} onTouchStart={e => { e.stopPropagation(); handleDragStart(e, true, l.id); }}>{l.text}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-full lg:w-[480px] shrink-0 z-20 pb-8 lg:pb-0">
                      <div className="bg-slate-900 p-8 lg:p-16 rounded-[48px] lg:rounded-[80px] shadow-2xl space-y-10 lg:space-y-16 border border-slate-800">
                         {step === 'FRAME' ? (
                           <div className="space-y-10">
                             <div className="space-y-6">
                                <div className="flex items-center justify-between px-2">
                                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Image Scale</label>
                                  <span className="text-[#EC4899] font-black text-sm">{Math.round(crop.scale * 100)}%</span>
                                </div>
                                <input type="range" min="0.1" max="5" step="0.01" value={crop.scale} onChange={e=>setCrop({...crop, scale:Number(e.target.value)})} className="w-full accent-[#EC4899] h-2.5 rounded-full bg-slate-800" />
                             </div>
                             <div className="grid grid-cols-2 gap-4 lg:gap-6">
                                <button onClick={resetPosition} className="py-4 lg:py-6 bg-slate-800 text-slate-400 rounded-2xl lg:rounded-[32px] font-black text-[10px] lg:text-xs hover:bg-slate-700 transition-all">위치 초기화</button>
                                <button onClick={resetScale} className="py-4 lg:py-6 bg-slate-800 text-slate-400 rounded-2xl lg:rounded-[32px] font-black text-[10px] lg:text-xs hover:bg-slate-700 transition-all">스케일 초기화</button>
                                <button onClick={fitToCanvas} className="col-span-2 py-5 lg:py-7 bg-slate-800 text-white rounded-2xl lg:rounded-[32px] font-black text-xs lg:text-sm hover:bg-slate-700 transition-all">캔버스 채우기</button>
                             </div>
                             <button onClick={() => studioMode === 'BOOK_COVER' ? setStep('TEXT') : startPixelation()} className="w-full py-8 lg:py-10 bg-[#EC4899] text-white rounded-[40px] lg:rounded-[60px] font-black text-xl lg:text-3xl shadow-xl active:scale-95 transition-all">레이아웃 완료 ➔</button>
                           </div>
                         ) : (
                           <div className="space-y-10">
                             <button onClick={() => { const n: TextLayer = { id: `t-${Date.now()}`, text: 'Hello', x: 50, y: 50, size: 8, color: '#000000' }; setTextLayers([...textLayers, n]); setSelectedTextId(n.id); }} 
                                     className="w-full py-5 lg:py-7 bg-white text-slate-900 rounded-[30px] lg:rounded-[40px] font-black text-xs lg:text-sm">+ 텍스트 레이어 추가</button>
                             {selectedText && (
                               <div className="p-8 lg:p-12 bg-slate-800/50 rounded-[40px] lg:rounded-[60px] space-y-8 border border-slate-700/50">
                                  <input type="text" value={selectedText.text} onChange={e => setTextLayers(prev => prev.map(l => l.id === selectedTextId ? { ...l, text: e.target.value } : l))} 
                                         className="w-full p-5 bg-slate-900 rounded-2xl font-black text-sm text-white outline-none ring-2 ring-slate-700 focus:ring-[#EC4899]" />
                                  <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Font Size ({selectedText.size}px)</label>
                                    <input type="range" min="4" max="40" value={selectedText.size} onChange={e => setTextLayers(prev => prev.map(l => l.id === selectedTextId ? { ...l, size: Number(e.target.value) } : l))} className="w-full accent-[#EC4899]" />
                                  </div>
                                  <div className="flex gap-4">
                                    <input type="color" value={selectedText.color} onChange={e => setTextLayers(prev => prev.map(l => l.id === selectedTextId ? { ...l, color: e.target.value } : l))} className="flex-1 h-14 bg-transparent cursor-pointer rounded-xl overflow-hidden" />
                                    <button onClick={() => setTextLayers(prev => prev.filter(l => l.id !== selectedTextId))} className="px-6 bg-red-500/10 text-red-500 font-black text-[10px] rounded-2xl hover:bg-red-500 hover:text-white transition-all">삭제</button>
                                  </div>
                               </div>
                             )}
                             <button onClick={startPixelation} className="w-full py-8 lg:py-10 bg-[#EC4899] text-white rounded-[40px] lg:rounded-[60px] font-black text-xl lg:text-3xl shadow-xl active:scale-95">변환 프로세스 시작</button>
                           </div>
                         )}
                         <button onClick={() => setStep(step === 'TEXT' ? 'FRAME' : 'UPLOAD')} className="w-full py-2 text-slate-600 font-black text-[10px] uppercase tracking-[0.4em] text-center block hover:text-slate-400">Go Back</button>
                      </div>
                    </div>
                  </div>
                )}

                {step === 'EDITOR' && pixelData && (
                  <div className="flex flex-col lg:flex-row gap-0 h-full min-h-0 animate-in fade-in overflow-hidden relative">
                    <div className="flex-1 flex flex-col gap-6 lg:gap-10 min-h-0 overflow-hidden px-4">
                      <div className="bg-slate-900/40 p-5 lg:p-8 rounded-[40px] lg:rounded-[50px] border border-slate-800/50 flex items-center justify-between shrink-0 z-[100] backdrop-blur-md">
                         <button onClick={()=>setStep(studioMode === 'BOOK_COVER' ? 'TEXT' : 'FRAME')} className="px-6 py-3 bg-slate-800 rounded-2xl font-black text-[11px] text-slate-400 hover:text-white transition-all">이전 단계</button>
                         <div className="flex items-center gap-3 lg:gap-6">
                            <div className="bg-slate-800 p-1.5 lg:p-2 rounded-2xl flex items-center gap-3 lg:gap-5">
                               <button onClick={()=>setZoom(z=>Math.max(100,z-100))} className="w-10 h-10 lg:w-12 lg:h-12 font-black bg-slate-900 text-white rounded-xl hover:bg-[#EC4899]">-</button>
                               <span className="text-[11px] lg:text-sm font-black w-12 lg:w-16 text-center text-white">{zoom}%</span>
                               <button onClick={()=>setZoom(z=>Math.min(1000,z+100))} className="w-10 h-10 lg:w-12 lg:h-12 font-black bg-slate-900 text-white rounded-xl hover:bg-[#EC4899]">+</button>
                            </div>
                            <div className="relative">
                              <button onClick={(e) => { e.stopPropagation(); setShowExportMenu(!showExportMenu); }} className="px-8 py-4 lg:px-12 lg:py-5 bg-white text-slate-900 rounded-2xl font-black shadow-2xl text-[11px] lg:text-xs uppercase tracking-widest hover:bg-[#EC4899] hover:text-white transition-all">Export {showExportMenu ? '▲' : '▼'}</button>
                              {showExportMenu && (
                                <div className="absolute right-0 mt-4 w-72 lg:w-80 bg-slate-900 rounded-[40px] shadow-2xl border border-slate-800 p-5 z-[150] origin-top-right animate-in zoom-in-95">
                                  <div className="p-5 bg-slate-800 rounded-3xl mb-3">
                                    <label className="text-[10px] font-black text-slate-500 block mb-2 uppercase">Grid Size (px)</label>
                                    <input type="number" value={splitSize} onChange={(e) => setSplitSize(Math.max(1, Number(e.target.value)))} className="w-full p-4 bg-slate-900 rounded-2xl text-center font-black text-white outline-none border border-slate-700 focus:border-[#EC4899]" />
                                  </div>
                                  <button disabled={isExporting} onClick={exportAsZip} className="w-full p-5 text-left hover:bg-slate-800 flex items-center gap-5 rounded-3xl group transition-all">
                                    <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-[#EC4899] transition-colors">📦</div>
                                    <span className="font-black text-white text-xs">ZIP Guide Download</span>
                                  </button>
                                </div>
                              )}
                            </div>
                         </div>
                      </div>
                      /* EDITOR 부분 수정 코드 */
<div 
  ref={editorScrollRef} 
  className="flex-1 bg-slate-900/20 rounded-[64px] overflow-auto relative border border-slate-800/50 custom-scrollbar z-10"
  style={{ 
    // 모든 수치 계산을 부모 레벨에서 CSS 변수로 처리
    '--cell-size': `${zoom / 20}px`,
    '--font-size': zoom >= 250 ? `${Math.max(7, zoom / 60)}px` : '0px'
  } as any}
>
  <div className="inline-block p-[100px] lg:p-[300px]">
    <div className="bg-slate-900 p-8 lg:p-16 border-[12px] lg:border-[20px] border-black shadow-2xl rounded-sm">
      <div 
        className="pixel-grid" 
        style={{ 
          display: 'grid',
          gridTemplateColumns: `repeat(${pixelData.width}, var(--cell-size))` 
        }}
      >
        {pixelData.colors.map((color, idx) => {
          const pId = paletteIndexMap.get(color);
          const isSelected = activePaletteId === pId;
          const colIndex = idx % pixelData.width;
          const rowIndex = Math.floor(idx / pixelData.width);

          // 5단위 보더 표시 로직을 CSS 변수나 단순화된 방식으로 처리
          const isFifthCol = (colIndex + 1) % 5 === 0;
          const isFifthRow = (rowIndex + 1) % 5 === 0;

          return (
            <div 
              key={idx} 
              style={{ 
                backgroundColor: color, 
                width: 'var(--cell-size)', 
                height: 'var(--cell-size)',
                // 글자색과 폰트 크기도 변수로 관리
                color: getContrastColor(color),
                fontSize: 'var(--font-size)',
                // 보더 계산을 루프 밖에서 정의한 조건으로 단순화
                borderRight: isFifthCol ? '1px solid rgba(255,255,255,0.2)' : '0.5px solid rgba(255,255,255,0.05)',
                borderBottom: isFifthRow ? '1px solid rgba(255,255,255,0.2)' : '0.5px solid rgba(255,255,255,0.05)'
              }}
              className={`pixel-item flex items-center justify-center font-black ${
                isSelected ? 'ring-2 lg:ring-4 ring-[#EC4899] scale-125 z-10 shadow-2xl' : 'hover:opacity-90'
              }`}
              onClick={() => setActivePaletteId(isSelected ? null : pId)}
            >
              {/* 번호 렌더링 최적화 */}
              {zoom >= 250 && formatPaletteIndex(pixelData.palette.findIndex(p => p.hex === color) + 1)}
            </div>
          );
        })}
      </div>
    </div>
  </div>
</div>

                    {/* 팔레트 패널 - 동그란 버튼으로 토글 */}
                    <div className={`fixed lg:relative top-0 right-0 h-full lg:h-auto z-[200] lg:z-auto transition-all duration-500 ease-out flex ${showPalette ? 'translate-x-0 opacity-100' : 'translate-x-full lg:translate-x-0 lg:w-0 opacity-0 lg:overflow-hidden'}`}>
                      <div className="w-[85vw] lg:w-[440px] bg-slate-900 p-8 lg:p-14 rounded-l-[48px] lg:rounded-[100px] shadow-2xl border-l border-slate-800 h-full flex flex-col min-h-0">
                         <div className="flex items-center justify-between mb-8 lg:mb-12 shrink-0">
                            <h3 className="font-black italic text-2xl lg:text-4xl text-white">Palette <span className="text-[11px] bg-slate-800 px-4 py-1.5 rounded-full not-italic text-slate-500 border border-slate-700">{pixelData.palette.length}</span></h3>
                            <button onClick={() => setShowPalette(false)} className="lg:hidden text-slate-500 font-black text-2xl">✕</button>
                         </div>
                         <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                           <div className="grid grid-cols-1 gap-4 lg:gap-6">
                             {pixelData.palette.map((p, i) => (
                               <div key={p.index} onClick={()=>setActivePaletteId(activePaletteId===p.index?null:p.index)} 
                                    className={`flex items-center gap-5 lg:gap-7 p-4 lg:p-6 rounded-[28px] lg:rounded-[40px] border-2 transition-all cursor-pointer ${activePaletteId===p.index?'bg-slate-800 border-[#EC4899] shadow-xl scale-[1.03]':'border-transparent hover:bg-slate-800/40'}`}>
                                 <div className="w-12 h-12 lg:w-18 lg:h-18 rounded-[16px] lg:rounded-[26px] flex items-center justify-center font-black text-sm lg:text-xl border-2 border-slate-900 shadow-inner shrink-0" style={{backgroundColor:p.hex, color:getContrastColor(p.hex)}}>{i+1}</div>
                                 <div className="flex-1 min-w-0 pr-1">
                                   <div className="flex items-center gap-3 lg:gap-4 w-full">
                                     <p className="text-sm lg:text-lg font-black truncate text-white italic">{p.index}</p>
                                     <span className="text-[9px] lg:text-[11px] bg-slate-900 text-slate-400 px-3 py-1.5 rounded-xl font-black shrink-0 border border-slate-800">{p.count} PX</span>
                                   </div>
                                   <p className="text-[10px] lg:text-[11px] font-mono text-slate-600 uppercase tracking-widest mt-1.5">{p.hex}</p>
                                 </div>
                               </div>
                             ))}
                           </div>
                         </div>
                      </div>
                    </div>

                    {/* 팔레트 토글 버튼 - 동그란 아이콘 */}
                    <button onClick={() => setShowPalette(!showPalette)} 
                            className={`fixed bottom-10 right-10 w-20 h-20 lg:w-24 lg:h-24 bg-[#EC4899] rounded-full shadow-[0_10px_40px_-10px_rgba(236,72,153,1)] z-[300] flex items-center justify-center text-3xl lg:text-4xl transform hover:scale-110 active:scale-95 transition-all ${showPalette ? 'rotate-45 opacity-0 pointer-events-none lg:opacity-100 lg:pointer-events-auto' : 'rotate-0'}`}>
                      🎨
                    </button>
                    {/* 모바일에서 열렸을 때 배경 어둡게 */}
                    /* 560번 줄 근처: 에디터 렌더링이 끝나는 지점 */
                  {showPalette && (
                    <div 
                      className="fixed inset-0 bg-black/60 z-[190] lg:hidden animate-in fade-in" 
                      onClick={() => setShowPalette(false)} 
                    />
                  )}
                </div> // <-- 픽셀 그리드 등을 감싸는 div의 끝
              ) // <-- 삼항 연산자 (A) 부분의 끝 소괄호
            ) : ( // <-- 여기서 567번 줄 에러 발생 지점: 삼항 연산자의 : (B) 시작
              <div className="flex-1 flex flex-col items-center justify-center gap-10">
                <div className="w-24 h-24 border-4 border-[#EC4899]/20 border-t-[#EC4899] rounded-full animate-spin"></div>
                <p className="text-slate-400 font-medium">도안을 생성하고 있습니다...</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 면책사항 모달 */}
      {activeView === 'HOME' && showNotice && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-2xl animate-in fade-in duration-500">
          <div className="bg-slate-900 rounded-[64px] lg:rounded-[100px] shadow-[0_80px_200px_-20px_rgba(0,0,0,1)] max-w-4xl w-full overflow-hidden flex flex-col border border-slate-800 max-h-[92vh] animate-in zoom-in-95 duration-500">
            <div className="p-12 lg:p-20 border-b border-slate-800 text-center bg-slate-900/50">
              <div className="w-24 h-24 bg-[#EC4899]/10 rounded-[40px] flex items-center justify-center mx-auto mb-8 border border-[#EC4899]/20 shadow-2xl">
                 <span className="text-5xl">⚖️</span>
              </div>
              <h3 className="text-3xl lg:text-5xl font-black italic text-white uppercase tracking-tighter">Art Studio 이용 면책사항</h3>
              <p className="mt-4 text-[#EC4899] font-black text-[11px] tracking-[0.6em] uppercase opacity-60">Legal Information & Responsibility</p>
            </div>
            <div className="p-10 lg:p-20 overflow-y-auto custom-scrollbar space-y-12 text-slate-400 text-base lg:text-xl leading-relaxed">
              <div className="space-y-6 group">
                <h4 className="font-black text-2xl lg:text-3xl italic text-white flex items-center gap-5 transition-all group-hover:text-[#EC4899]"><span className="w-2.5 h-2.5 bg-[#EC4899] rounded-full shadow-[0_0_10px_#EC4899]"></span> 결과물의 정확성 및 품질</h4>
                <p>
                  본 서비스는 이미지를 픽셀화하여 도안을 생성하는 보조 도구입니다. 원본 이미지의 품질, 조명, 색상 구성에 따라 변환된 도안의 결과가 실제와 다를 수 있으며, 이에 따른 디자인의 정확성을 100% 보장하지 않습니다.<br/><br/>
                  사용자는 도안을 실제 제작(자수, 블록 등)에 사용하기 전, 반드시 색상과 칸수를 최종 확인해야 합니다.
                </p>
              </div>
              <div className="space-y-6 group">
                <h4 className="font-black text-2xl lg:text-3xl italic text-white flex items-center gap-5 transition-all group-hover:text-[#EC4899]"><span className="w-2.5 h-2.5 bg-[#EC4899] rounded-full shadow-[0_0_10px_#EC4899]"></span> 저작권 및 사용 책임</h4>
                <p>
                  사용자가 업로드하는 이미지에 대한 저작권 책임은 전적으로 사용자 본인에게 있습니다. 저작권이 있는 이미지(캐릭터, 타인의 작품 등)를 무단 사용하여 발생하는 법적 분쟁에 대해 서비스는 책임을 지지 않습니다.<br/><br/>
                  생성된 도안을 상업적으로 이용할 경우, 원본 이미지의 저작권 규정을 준수해야 합니다.
                </p>
              </div>
              <div className="space-y-6 group">
                <h4 className="font-black text-2xl lg:text-3xl italic text-white flex items-center gap-5 transition-all group-hover:text-[#EC4899]"><span className="w-2.5 h-2.5 bg-[#EC4899] rounded-full shadow-[0_0_10px_#EC4899]"></span> 데이터 보관 및 손실</h4>
                <p>
                  본 서비스는 브라우저 기반으로 작동하며, 별도의 서버에 사용자의 이미지를 영구 저장하지 않습니다. 브라우저 종료, 캐시 삭제 등으로 인해 발생하는 작업 데이터 손실에 대해서는 책임을 지지 않으므로, 작업 완료 후 반드시 <span className="text-white font-black">**[내보내기]**</span>를 통해 파일을 저장하시기 바랍니다.
                </p>
              </div>
              <div className="space-y-6 group">
                <h4 className="font-black text-2xl lg:text-3xl italic text-white flex items-center gap-5 transition-all group-hover:text-[#EC4899]"><span className="w-2.5 h-2.5 bg-[#EC4899] rounded-full shadow-[0_0_10px_#EC4899]"></span> 서비스 이용 환경</h4>
                <p>
                  사용자 기기의 성능, 브라우저 버전, 네트워크 상태에 따라 서비스 이용 및 파일 다운로드(ZIP, JSON)가 원활하지 않을 수 있습니다. 권장 브라우저(Chrome 등) 환경에서의 이용을 권장합니다.
                </p>
              </div>
            </div>
            <div className="p-12 lg:p-20 bg-slate-900/50 border-t border-slate-800">
              <button onClick={() => setShowNotice(false)} className="w-full py-8 lg:py-10 bg-white text-slate-900 rounded-[40px] lg:rounded-[60px] font-black text-2xl lg:text-4xl shadow-2xl hover:bg-[#EC4899] hover:text-white transition-all transform hover:-translate-y-2 active:scale-95 shadow-[#EC4899]/10">동의하고 시작하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
