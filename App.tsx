
import React, { useState, useRef, useEffect } from 'react';
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
  const [splitSize, setSplitSize] = useState(20); // 기본값 20x20
  const [pixelData, setPixelData] = useState<PixelData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activePaletteId, setActivePaletteId] = useState<string | null>(null);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showNotice, setShowNotice] = useState(true); // 공지사항 팝업 상태
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [splitSize, setSplitSize] = useState(20); // 추가

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
      // --- 기존 startPixelation을 밖으로 빼고 독립된 함수로 분리 ---
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
    const { width, height, colors } = pixelData;
    
    // 분할 저장 로직 (사용자가 설정한 splitSize 적용)
    for (let y = 0; y < height; y += splitSize) {
      for (let x = 0; x < width; x += splitSize) {
        const c = document.createElement('canvas');
        const ctx = c.getContext('2d')!;
        const curW = Math.min(splitSize, width - x);
        const curH = Math.min(splitSize, height - y);
        c.width = curW; c.height = curH;

        for (let py = 0; py < curH; py++) {
          for (let px = 0; px < curW; px++) {
            const idx = (y + py) * width + (x + px);
            ctx.fillStyle = colors[idx];
            ctx.fillRect(px, py, 1, 1);
          }
        }
        const blob = await new Promise<Blob | null>(r => c.toBlob(r));
        if (blob) zip.file(`tile_${y/splitSize}_${x/splitSize}.png`, blob);
      }
    }
    zip.file("data.json", JSON.stringify({ palette: pixelData.palette, pixels: pixelData.colors }));
    const content = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = `town_pattern_${splitSize}px.zip`;
    a.click();
    setShowExportMenu(false);
    showToast("ZIP 압축 완료!");
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
    // imageObjRef.current를 사용해 이미 로드된 이미지를 재사용합니다.
    if ((step === 'FRAME' || step === 'TEXT') && imageObjRef.current && previewCanvasRef.current) {
      const ctx = previewCanvasRef.current.getContext('2d');
      if (!ctx) return;

      // 캔버스 초기화
      ctx.clearRect(0, 0, canvasDim.w, canvasDim.h);
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvasDim.w, canvasDim.h);

      ctx.save();
      // 이미지 조정 시 부드럽게 움직이도록 설정
      ctx.translate(canvasDim.w / 2 + crop.x, canvasDim.h / 2 + crop.y);
      ctx.scale(crop.scale, crop.scale);
      // 매번 new Image()를 하지 않고 저장된 객체만 다시 그립니다.
      ctx.drawImage(imageObjRef.current, -imageObjRef.current.width / 2, -imageObjRef.current.height / 2);
      ctx.restore();
    }
  }, [step, crop, canvasDim]); // [주의] uploadedImg를 의존성 배열에서 뺐습니다.

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
             <h2 className="text-sm lg:text-lg font-black text-slate-900 italic uppercase tracking-tighter">
               STUDIO | DASHBOARD
             </h2>
           </div>
           <div className="flex items-center gap-4">
              <div className="hidden sm:flex -space-x-3">
                 <div className="w-9 h-9 rounded-full border-2 border-white bg-slate-200"></div>
                 <div className="w-9 h-9 rounded-full border-2 border-white bg-slate-300"></div>
              </div>
           </div>
        </header>

        <div className="flex-1 overflow-hidden relative">
          <div className="h-full overflow-y-auto custom-scrollbar p-6 lg:p-12">
            {activeView === 'HOME' ? (
              <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500 pb-12">
                <div className="bg-[#0F172A] rounded-[48px] p-10 lg:p-24 text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-[60%] h-full opacity-5 pointer-events-none workspace-pattern scale-150 rotate-12"></div>
                  <div className="relative z-10 space-y-8 max-w-3xl">
                    <span className="bg-[#EC4899] text-white px-5 py-2 rounded-full font-black text-[11px] uppercase tracking-widest italic inline-block">OFFICIAL CREATIVE HUB</span>
                    <div className="space-y-2">
                      <h1 className="text-5xl lg:text-8xl font-black italic tracking-tighter leading-[0.9]">Town Square</h1>
                      <h1 className="text-5xl lg:text-8xl font-black italic tracking-tighter leading-[0.9]">Art Studio</h1>
                    </div>
                    <p className="text-slate-400 font-medium text-lg lg:text-xl">두근두근타운 시민들을 위한 고퀄리티 픽셀 도안 제작 시스템.</p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button onClick={() => { setActiveView('STUDIO'); setStep('MODE_SELECT'); }} 
                              className="px-10 py-5 bg-[#EC4899] rounded-2xl font-black text-lg hover:bg-[#DB2777] transition-all shadow-xl shadow-pink-900/30">
                        스튜디오 시작
                      </button>
                      <button className="px-10 py-5 bg-white/10 border border-white/20 rounded-2xl font-black text-lg hover:bg-white/20 transition-all">
                        커뮤니티 구경
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { icon: '🎨', title: '픽셀 도안 변환', desc: '이미지를 48x48 픽셀 도안으로 자동 변환합니다.' },
                    { icon: '📖', title: '북커버 레이아웃', desc: '150x84 정밀 가이드와 멀티 텍스트 시스템 제공.' },
                    { icon: '🌈', title: '컬러 팔레트', desc: '타운 규격 HEX 코드를 추출하여 바로 사용하세요.' }
                  ].map((f, i) => (
                    <div key={i} className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 hover:shadow-xl transition-all group">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform">{f.icon}</div>
                      <h3 className="text-2xl font-black italic mb-4">{f.title}</h3>
                      <p className="text-slate-500 font-medium text-sm leading-relaxed">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : activeView === 'STUDIO' ? (
              <div className="h-full max-w-7xl mx-auto flex flex-col">
                {step === 'MODE_SELECT' && (
                  <div className="flex-1 flex items-center justify-center grid grid-cols-1 md:grid-cols-2 gap-8">
                    <button onClick={() => { setStudioMode('PATTERN'); setStep('SETUP'); setCanvasDim({w:48, h:48}); }} 
                            className="bg-white p-16 rounded-[48px] shadow-xl border-4 border-transparent hover:border-[#EC4899] transition-all flex flex-col items-center group">
                      <div className="w-24 h-24 bg-pink-50 rounded-[32px] flex items-center justify-center text-5xl mb-8 group-hover:scale-110 transition-all">🎨</div>
                      <h3 className="text-3xl font-black italic text-slate-900">픽셀 도안 제작</h3>
                      <p className="text-slate-400 font-bold mt-2">자유로운 규격으로 픽셀화</p>
                    </button>
                    <button onClick={() => { setStudioMode('BOOK_COVER'); setCanvasDim({w:150, h:84}); setStep('UPLOAD'); }} 
                            className="bg-white p-16 rounded-[48px] shadow-xl border-4 border-transparent hover:border-[#EC4899] transition-all flex flex-col items-center group">
                      <div className="w-24 h-24 bg-indigo-50 rounded-[32px] flex items-center justify-center text-5xl mb-8 group-hover:scale-110 transition-all">📖</div>
                      <h3 className="text-3xl font-black italic text-slate-900">북커버 제작</h3>
                      <p className="text-slate-400 font-bold mt-2">150x84 정밀 가이드 제공</p>
                    </button>
                  </div>
                )}

                {step === 'SETUP' && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="bg-white p-12 lg:p-20 rounded-[48px] shadow-2xl max-w-lg w-full border border-slate-50">
                      <h2 className="text-4xl font-black mb-10 italic tracking-tighter">Dimension Setup</h2>
                      <div className="grid grid-cols-2 gap-6 mb-10">
                        <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">가로 픽셀</label><input type="number" value={canvasDim.w} onChange={e=>setCanvasDim({...canvasDim, w:Number(e.target.value)})} className="w-full p-6 bg-slate-50 rounded-3xl font-black text-3xl text-center border-2 border-transparent focus:border-pink-500 outline-none transition-all" /></div>
                        <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">세로 픽셀</label><input type="number" value={canvasDim.h} onChange={e=>setCanvasDim({...canvasDim, h:Number(e.target.value)})} className="w-full p-6 bg-slate-50 rounded-3xl font-black text-3xl text-center border-2 border-transparent focus:border-pink-500 outline-none transition-all" /></div>
                      </div>
                      <button onClick={()=>setStep('UPLOAD')} className="w-full py-7 bg-[#0F172A] text-white rounded-[32px] font-black text-xl shadow-xl hover:bg-black transition-all">다음 단계로</button>
                    </div>
                  </div>
                )}

                {step === 'UPLOAD' && (
                  <div className="flex-1 flex items-center justify-center">
                    <div onClick={()=>fileInputRef.current?.click()} className="w-full max-w-4xl aspect-[16/8] bg-white rounded-[60px] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-pink-500 transition-all group">
                    <input 
   type="file" 
  ref={fileInputRef} 
  onChange={(e) => {
    const f = e.target.files?.[0]; 
    if (f) { 
      const r = new FileReader(); 
      r.onload = (ev) => {
        const img = new Image();
        img.src = ev.target?.result as string;
        img.onload = () => {
          imageObjRef.current = img; 
          setUploadedImg(img.src); 
          setStep('FRAME');
        };
      }; 
      r.readAsDataURL(f); 
    }
  }} 
  className="hidden" 
  accept="image/*" 
/>
                      <div className="w-24 h-24 bg-pink-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-all">
                        <span className="text-5xl">📸</span>
                      </div>
                      <p className="font-black text-2xl text-slate-900 italic">이미지를 선택하거나 드래그하세요</p>
                      <p className="text-slate-400 font-bold mt-2">최적의 결과를 위해 고화질 이미지를 권장합니다</p>
                    </div>
                  </div>
                )}

                {(step === 'FRAME' || step === 'TEXT') && (
                  <div className="flex flex-col lg:flex-row gap-10 h-full min-h-0">
                    <div className="flex-1 flex flex-col items-center min-h-0">
                      <div className="bg-white rounded-[60px] shadow-2xl p-6 lg:p-20 w-full flex-1 flex items-center justify-center workspace-pattern relative border border-slate-50 overflow-hidden">
                        <div ref={frameContainerRef} className="relative bg-white border-4 border-slate-900 shadow-2xl overflow-hidden cursor-move"
                             style={{ width: 'min(700px, 100%)', aspectRatio: `${canvasDim.w}/${canvasDim.h}` }}
                             onMouseDown={e=>{ frameDragRef.current={isDragging:true, startX:e.clientX, startY:e.clientY, initialX:crop.x, initialY:crop.y}; }}
                             onMouseMove={e=>{
                               if(!frameDragRef.current.isDragging) return;
                               const rect=frameContainerRef.current!.getBoundingClientRect();
                               if(step==='FRAME') setCrop(prev=>({...prev, x:frameDragRef.current.initialX+(e.clientX-frameDragRef.current.startX)*(canvasDim.w/rect.width), y:frameDragRef.current.initialY+(e.clientY-frameDragRef.current.startY)*(canvasDim.h/rect.height)}));
                             }}
                             onMouseUp={()=>frameDragRef.current.isDragging=false}
                        >
                          <canvas ref={previewCanvasRef} width={canvasDim.w} height={canvasDim.h} className="w-full h-full pointer-events-none" style={{imageRendering:'pixelated'}} />
                          
                          {/* 가이드 레이어 (격자 무늬) */}
                          <div className="absolute inset-0 pointer-events-none opacity-20" 
                               style={{
                                 backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`,
                                 backgroundSize: `${100 / canvasDim.w}% ${100 / canvasDim.h}%`
                               }}
                          />
                          
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
                             <button onClick={()=>studioMode==='PATTERN'?startPixelation():setStep('TEXT')} className="w-full py-6 bg-[#EC4899] text-white rounded-3xl font-black text-lg shadow-lg hover:bg-[#DB2777] transition-all">다음 단계</button>
                           </>
                         ) : (
                           <>
                             <button onClick={()=>{const n:TextLayer={id:`t-${Date.now()}`, text:'Text Here', x:50, y:50, size:14, color:'#000000'}; setTextLayers([...textLayers, n]); setSelectedTextId(n.id);}} className="w-full py-5 bg-slate-100 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all">+ 텍스트 추가</button>
                             {selectedTextId && (
                               <div className="space-y-4 pt-4 border-t border-slate-100">
                                 <input type="text" value={textLayers.find(l=>l.id===selectedTextId)?.text} onChange={e=>setTextLayers(textLayers.map(l=>l.id===selectedTextId?{...l, text:e.target.value}:l))} className="w-full p-4 bg-slate-50 rounded-xl font-bold border-2 focus:border-pink-500 outline-none" />
                               </div>
                             )}
                             <button onClick={startPixelation} className="w-full py-6 bg-[#EC4899] text-white rounded-3xl font-black text-lg shadow-lg hover:bg-[#DB2777] transition-all">변환 시작</button>
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
                         <button onClick={()=>setStep(studioMode==='PATTERN'?'FRAME':'TEXT')} className="px-6 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-xs text-slate-500 hover:bg-slate-100">이전</button>
                         <div className="flex items-center gap-3">
                            <button onClick={()=>setShowTipModal(true)} className="px-6 py-3 bg-orange-100 text-orange-600 rounded-xl font-black text-xs flex items-center gap-2">💡 Tip</button>
                            <div className="bg-slate-100 p-1.5 rounded-xl flex items-center gap-3">
                               <button onClick={()=>setZoom(z=>Math.max(100,z-100))} className="w-10 h-10 font-black text-xl hover:bg-slate-200 rounded-lg transition-all">-</button>
                               <span className="text-[10px] font-black w-12 text-center">{zoom}%</span>
                               <button onClick={()=>setZoom(z=>Math.min(1000,z+100))} className="w-10 h-10 font-black text-xl hover:bg-slate-200 rounded-lg transition-all">+</button>
</div> {/* 줌 컨트롤 영역을 닫아주는 div 추가 */}

<div className="relative"> {/* 내보내기 버튼 시작 */}
  <button 
    onClick={() => setShowExportMenu(!showExportMenu)}
    className="px-10 py-4 bg-[#EC4899] text-white rounded-2xl font-black text-lg shadow-xl shadow-pink-900/20 hover:bg-[#DB2777] transition-all flex items-center gap-2"
  >
    내보내기 {showExportMenu ? '▴' : '▾'}
  </button>

  {showExportMenu && (
  <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[100] p-2 animate-in fade-in slide-in-from-top-2">
    <div className="p-4 bg-slate-50 rounded-xl mb-2">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">분할 크기 (px)</label>
      <input 
        type="number" 
        value={splitSize} 
        onChange={(e) => setSplitSize(Math.max(1, Number(e.target.value)))}
        className="w-full p-2 bg-white border border-slate-200 rounded-lg font-black text-center outline-none focus:border-pink-500"
      />
    </div>

    <div className="px-6 py-2">
  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">분할 크기 (px)</label>
  <input 
    type="number" 
    value={splitSize} 
    onChange={(e) => setSplitSize(Math.max(1, Number(e.target.value)))} 
    className="w-full p-2 bg-slate-50 rounded-lg text-center font-black border focus:border-pink-500" 
  />
</div>
<div className="h-[1px] bg-slate-100 mx-4"></div>
    <button onClick={exportAsZip} className="w-full px-6 py-4 text-left hover:bg-slate-50 flex items-center gap-3 transition-colors">
      <span className="text-xl">📦</span>
      <div>
        <p className="font-black text-sm text-slate-900">ZIP 분할 저장</p>
        <p className="text-[10px] text-slate-400 font-bold">{splitSize}px 단위 이미지들</p>
      </div>
    </button>
    <div className="h-[1px] bg-slate-100 mx-4"></div>
    <button onClick={exportAsJson} className="w-full px-6 py-4 text-left hover:bg-slate-50 flex items-center gap-3 transition-colors">
      <span className="text-xl">📄</span>
      <p className="font-black text-sm text-slate-900">JSON 데이터 저장</p>
    </button>
  </div>
)}
</div>
                      </div>
                      
                      <div ref={editorScrollRef} className="flex-1 bg-white rounded-[48px] overflow-auto relative workspace-pattern border border-slate-100 custom-scrollbar"
                           onMouseDown={e=>{if(e.button!==0)return; isPanningRef.current=true; panStartPos.current={x:e.pageX, y:e.pageY, scrollLeft:editorScrollRef.current!.scrollLeft, scrollTop:editorScrollRef.current!.scrollTop}; editorScrollRef.current!.style.cursor='grabbing';}}
                           onMouseMove={e=>{if(!isPanningRef.current)return; editorScrollRef.current!.scrollLeft=panStartPos.current.scrollLeft-(e.pageX-panStartPos.current.x); editorScrollRef.current!.scrollTop=panStartPos.current.scrollTop-(e.pageY-panStartPos.current.y);}}
                           onMouseUp={()=>{isPanningRef.current=false; if(editorScrollRef.current) editorScrollRef.current.style.cursor='default';}}
                      >
                        <div className="inline-block p-[200px]">
                          <div className="bg-white p-6 border-[8px] border-slate-900 shadow-2xl rounded-sm">
                            <canvas 
  ref={(canvas) => {
    if (canvas && pixelData) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const size = zoom / 20; // 현재 줌 수치에 따른 한 칸의 크기
      canvas.width = pixelData.width * size;
      canvas.height = pixelData.height * size;
      
      // 1. 픽셀색상 및 숫자 먼저 그리기
      pixelData.colors.forEach((color, idx) => {
        const x = (idx % pixelData.width) * size;
        const y = Math.floor(idx / pixelData.width) * size;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, size, size);
        
        if (zoom >= 250) {
          const pIdx = pixelData.palette.findIndex(p => p.hex === color);
          ctx.fillStyle = getContrastColor(color);
          ctx.font = `bold ${size / 2.5}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(pIdx + 1), x + size / 2, y + size / 2);
        }
      });

      // 2. 격자선 추가 (픽셀 위에 덧그리기)
      // 세로선 그리기
      for (let i = 0; i <= pixelData.width; i++) {
        const isBold = i % 5 === 0;
        ctx.strokeStyle = isBold ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.1)";
        ctx.lineWidth = isBold ? 1.5 : 0.5;
        ctx.beginPath();
        ctx.moveTo(i * size, 0);
        ctx.lineTo(i * size, canvas.height);
        ctx.stroke();
      }
      
      // 가로선 그리기
      for (let j = 0; j <= pixelData.height; j++) {
        const isBold = j % 5 === 0;
        ctx.strokeStyle = isBold ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.1)";
        ctx.lineWidth = isBold ? 1.5 : 0.5;
        ctx.beginPath();
        ctx.moveTo(0, j * size);
        ctx.lineTo(canvas.width, j * size);
        ctx.stroke();
      }
    }
  }}
/>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="w-full lg:w-[320px] bg-white rounded-[40px] p-8 shadow-xl overflow-hidden border border-slate-50 shrink-0 flex flex-col min-h-0">
                      <h3 className="font-black mb-6 italic text-xl shrink-0">🎨 Palette</h3>
                      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                        <div className="grid grid-cols-4 lg:grid-cols-1 gap-3">
                          {pixelData.palette.map((p, i) => (
                            <div key={p.index} onClick={()=>setActivePaletteId(activePaletteId===p.index?null:p.index)} 
                                 className={`flex items-center gap-4 p-3 rounded-2xl border-2 cursor-pointer transition-all ${activePaletteId===p.index?'bg-pink-50 border-[#EC4899] shadow-md':'bg-white border-transparent hover:bg-slate-50'}`}>
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border shadow-inner shrink-0" style={{backgroundColor:p.hex, color:getContrastColor(p.hex)}}>{i+1}</div>
                              <div className="hidden lg:block flex-1 min-w-0">
                                <p className="text-[11px] font-black truncate text-slate-900">NO.{p.index}</p>
                                <p className="text-[9px] font-mono text-slate-400 uppercase">{p.hex}</p>
                              </div>
                              <span className="hidden lg:block font-black text-[#EC4899] text-xs">{p.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-pulse">
                 <div className="text-8xl">🚀</div>
                 <div className="font-black italic text-3xl text-slate-200 uppercase tracking-widest">{activeView} HUB 준비 중...</div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Notice Modal */}
      {activeView === 'HOME' && showNotice && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#0F172A]/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] p-8 lg:p-14 max-w-xl w-full shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-8">
              <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-4xl">✨</span>
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl lg:text-3xl font-black italic tracking-tighter text-slate-900 uppercase">서비스 안내 및 유의사항</h3>
                <div className="space-y-4 text-slate-600 font-medium text-sm lg:text-base leading-relaxed text-center px-4">
                  <p>
                    본 서비스는 여러분의 창작 활동을 돕기 위해 만든 무료 변환 도구입니다. 
                    <span className="text-slate-900 font-bold"> 소중한 사진은 변환 즉시 파기되며 서버에 절대 저장되지 않으니 </span> 
                    안심하고 사용하세요!
                  </p>
                  <p>
                    아직 개발 중인 단계라 완벽하지 않을 수 있지만, 여러분의 소중한 피드백은 언제나 환영합니다. 
                    <span className="block mt-4 text-[13px] text-slate-400 font-bold">
                      단, 결과물의 저작권 책임은 원본 이미지 소유자에게 있으며, 
                      본 서비스는 결과물 활용으로 발생하는 문제에 대해 책임을 지지 않습니다.
                    </span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowNotice(false)} 
                className="w-full py-6 bg-[#EC4899] text-white rounded-[32px] font-black text-xl shadow-xl shadow-pink-900/20 hover:bg-[#DB2777] transition-all active:scale-95"
              >
                확인하였습니다
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tip Modal */}
      </main>

      {/* 팁 모달 - 여기부터 파일 끝까지 덮어쓰기 하세요 */}
      {showTipModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden border border-white/20 animate-in slide-in-from-bottom-8">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
               <div>
                 <h3 className="text-3xl font-black italic tracking-tighter">🎨 Art Studio Tips</h3>
                 <p className="text-[#EC4899] font-bold text-sm mt-1">내보내기를 누르면 압축된 사진을 받을 수 있습니다.</p>
               </div>
               <button onClick={() => setShowTipModal(false)} className="w-12 h-12 bg-slate-100 rounded-full font-black text-slate-500 hover:bg-slate-900 hover:text-white transition-all">✕</button>
            </div>
            <div className="p-10 space-y-8">
              <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100">
                 <h4 className="font-black text-lg mb-2 italic">📂 저장 안내</h4>
                 <p className="text-slate-500 text-sm leading-relaxed">
                   우측 상단 <span className="text-[#EC4899] font-black">내보내기</span> 버튼 클릭 시 제작된 도안이 
                   <span className="font-bold underline text-slate-900 ml-1">{splitSize}px 단위 분할 이미지</span>와 
                   데이터 파일이 포함된 <span className="font-bold underline text-slate-900">ZIP 압축 파일</span>로 즉시 다운로드됩니다.
                 </p>
              </div>
              <div className="rounded-[40px] overflow-hidden border-8 border-slate-50 shadow-inner">
                <img src={PALETTE_GUIDE_IMG} className="w-full h-auto" alt="Guide" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
