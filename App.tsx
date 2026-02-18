
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { AppStep, PixelData, StudioMode, ColorInfo, TOWN_PALETTE_HEX, TextLayer } from './types';
import { processArtStudioPixel } from './services/pixelService';
import JSZip from 'jszip';

type MainView = 'HOME' | 'STUDIO' | 'DESIGN_FEED' | 'FRIENDS_COMMUNITY';
type PolicyType = 'TERMS' | 'PRIVACY' | 'DISCLAIMER' | null;

interface UpdateLog {
  date: string;
  content: string;
}
const firebaseConfig = {
  apiKey: "AIzaSyDbsuXM1MEH5T-IQ97wIvObXp5yC68_TYw",
  authDomain: "town-hub0927.firebaseapp.com",
  projectId: "town-hub0927",
  storageBucket: "town-hub0927.firebasestorage.app",
  messagingSenderId: "329581279235",
  appId: "1:329581279235:web:1337185e104498ad483636",
  measurementId: "G-D0DMJSHCLZ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

const getContrastColor = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return ((r * 299) + (g * 587) + (b * 114)) / 1000 >= 128 ? 'black' : 'white';
};

const formatPaletteIndex = (index: number) => {
  const row = Math.floor((index - 1) / 8) + 1;
  const col = (index - 1) % 8 + 1;
  return `${row}-${col}`;
};

/**
 * Buy Me a Coffee 커스텀 버튼
 */
const BmcButton: React.FC = () => {
  return (
    <button 
      onClick={() => window.open('https://www.buymeacoffee.com/hippoo0927c', '_blank')}
      className="w-full py-4 bg-[#FFDD00] text-[#000000] rounded-2xl font-black text-xs uppercase tracking-tight shadow-xl hover:bg-[#FFC400] active:scale-95 transition-all flex items-center justify-center gap-2"
    >
      <span className="text-lg">☕</span>
      <span>Buy me a coffee</span>
    </button>
  );
};

const App: React.FC = () => {
  // 1. 상태 관리
  const [user, setUser] = useState<User | null>(null);
  // --- 추가된 상태값 ---
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [nickname, setNickname] = useState<string>('');
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [tempNickname, setTempNickname] = useState('');
  
  // 본인의 구글 이메일을 여기에 입력하세요 (관리자 지정)
  const ADMIN_EMAIL = "hippoo0927@gmail.com"; 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // 관리자 여부 확인
        if (currentUser.email === ADMIN_EMAIL) {
          setRole('admin');
        }
        
        // Firestore에서 닉네임 정보 가져오기
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setNickname(userDoc.data().nickname);
        } else {
          // 정보가 없으면 닉네임 설정창 띄우기
          setIsNicknameModalOpen(true);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 닉네임 저장 함수
  const saveNickname = async () => {
    if (!user || !tempNickname.trim()) return;
    try {
      await setDoc(doc(db, "users", user.uid), {
        nickname: tempNickname,
        role: user.email === ADMIN_EMAIL ? 'admin' : 'user',
        createdAt: serverTimestamp()
      });
      setNickname(tempNickname);
      setIsNicknameModalOpen(false);
      showToast("닉네임이 설정되었습니다!");
    } catch (e) {
      showToast("저장에 실패했습니다.");
    }
  };
  // -----------------------

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      alert("로그인에 실패했습니다.");
    }
  };

  const handleLogout = () => signOut(auth);
  const [activeView, setActiveView] = useState<MainView>('HOME');
  const [toast, setToast] = useState<string | null>(null);
  const [step, setStep] = useState<AppStep>('MODE_SELECT');
  const [studioMode, setStudioMode] = useState<StudioMode>('PATTERN');
  const [canvasDim, setCanvasDim] = useState({ w: 48, h: 48 });
  const [crop, setCrop] = useState({ x: 0, y: 0, scale: 0.8 });
  const [zoom, setZoom] = useState(400);
  const [pixelData, setPixelData] = useState<PixelData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activePaletteId, setActivePaletteId] = useState<string | null>(null);
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [splitSize, setSplitSize] = useState(25);
  const [showPalette, setShowPalette] = useState(true);
  
  const [activePolicy, setActivePolicy] = useState<PolicyType>(null);
  const [updateLogs, setUpdateLogs] = useState<UpdateLog[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(true);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);

  // 2. Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const frameDragRef = useRef({ isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0, initialPropX: 0, initialPropY: 0 });
  const frameContainerRef = useRef<HTMLDivElement>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);

  // 3. 유틸리티
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLogsLoading(true);
      try {
        const response = await fetch('https://raw.githubusercontent.com/hippoo0927-jpg/TownHub/main/updates.txt');
        if (!response.ok) throw new Error('Network response was not ok');
        const text = await response.text();
        const parsedLogs = text.trim().split('\n').filter(line => line.trim() !== '').map(line => {
          if (line.includes('/')) {
            const [date, content] = line.split('/');
            return { date: date.trim(), content: content.trim() };
          }
          return { date: 'Latest', content: line.trim() };
        });
        setUpdateLogs(parsedLogs);
      } catch (error) {
        console.error("Failed to fetch logs:", error);
      } finally {
        setIsLogsLoading(false);
      }
    };
    fetchLogs();
  }, []);

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

  // 4. 드래그 엔진
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

  // 5. 핵심 엔진: ZIP Export (5x5 보조선 포함)
  const exportAsZip = async () => {
    if (!pixelData || isExporting) return;
    setIsExporting(true);
    showToast("가이드 파일 생성 중...");
    try {
      const zip = new JSZip();
      const { width, height, colors, palette } = pixelData;
      const blockSize = 60;
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
              const globalX = x + px;
              const globalY = y + py;
              const idx = globalY * width + globalX;
              const color = colors[idx];
              const pIdx = palette.findIndex(p => p.hex === color) + 1;
              const gameCoord = formatPaletteIndex(pIdx);
              
              // 픽셀 배경
              ctx.fillStyle = color;
              ctx.fillRect(px * blockSize, py * blockSize, blockSize, blockSize);
              
              // 기본 1px 그리드
              ctx.strokeStyle = "rgba(0,0,0,0.1)";
              ctx.lineWidth = 0.5;
              ctx.strokeRect(px * blockSize, py * blockSize, blockSize, blockSize);

              // 5x5 강조 그리드 (굵고 어두운 선)
              if ((globalX + 1) % 5 === 0) {
                ctx.strokeStyle = "rgba(0,0,0,0.4)";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo((px + 1) * blockSize, py * blockSize);
                ctx.lineTo((px + 1) * blockSize, (py + 1) * blockSize);
                ctx.stroke();
              }
              if ((globalY + 1) % 5 === 0) {
                ctx.strokeStyle = "rgba(0,0,0,0.4)";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(px * blockSize, (py + 1) * blockSize);
                ctx.lineTo((px + 1) * blockSize, (py + 1) * blockSize);
                ctx.stroke();
              }

              // 좌표 텍스트
              const contrastColor = getContrastColor(color);
              ctx.font = `bold ${blockSize / 3.5}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.strokeStyle = contrastColor === 'white' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)';
              ctx.lineWidth = 2.5;
              ctx.strokeText(gameCoord, px * blockSize + blockSize / 2, py * blockSize + blockSize / 2);
              ctx.fillStyle = contrastColor;
              ctx.fillText(gameCoord, px * blockSize + blockSize / 2, py * blockSize + blockSize / 2);
            }
          }
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
      
      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url; link.setAttribute('download', `town_art_guide_${Date.now()}.zip`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link); window.URL.revokeObjectURL(url);
      setShowExportMenu(false); showToast("저장 완료!");
    } catch (e) {
      showToast("오류 발생");
    } finally {
      setIsExporting(false);
    }
  };

  // 6. 핵심 엔진: 변환 로직
  const startPixelation = async () => {
    if (!previewCanvasRef.current) return;
    setIsProcessing(true);
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = canvasDim.w; finalCanvas.height = canvasDim.h;
    const ctx = finalCanvas.getContext('2d')!;
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvasDim.w, canvasDim.h);
    if (imageObjRef.current) {
      ctx.save();
      ctx.translate(canvasDim.w / 2 + crop.x, canvasDim.h / 2 + crop.y);
      ctx.scale(crop.scale, crop.scale);
      ctx.drawImage(imageObjRef.current, -imageObjRef.current.width / 2, -imageObjRef.current.height / 2);
      ctx.restore();
    }
    textLayers.forEach(l => {
      ctx.fillStyle = l.color; ctx.font = `bold ${l.size}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(l.text, (l.x / 100) * canvasDim.w, (l.y / 100) * canvasDim.h);
    });
    setTimeout(async () => {
      try {
        const data = await processArtStudioPixel(finalCanvas.toDataURL(), canvasDim.w, canvasDim.h, 64, { x: 0, y: 0, scale: 1 });
        setPixelData(data); setStep('EDITOR'); setZoom(400); setShowPalette(window.innerWidth > 1024);
      } catch (e) { showToast("변환 중 오류 발생"); } finally { setIsProcessing(false); }
    }, 100);
  };

  useEffect(() => {
    if ((step === 'FRAME' || step === 'TEXT') && imageObjRef.current && previewCanvasRef.current) {
      const ctx = previewCanvasRef.current.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvasDim.w, canvasDim.h);
      ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvasDim.w, canvasDim.h);
      ctx.save();
      ctx.translate(canvasDim.w / 2 + crop.x, canvasDim.h / 2 + crop.y);
      ctx.scale(crop.scale, crop.scale);
      ctx.drawImage(imageObjRef.current, -imageObjRef.current.width / 2, -imageObjRef.current.height / 2);
      ctx.restore();
      if (step === 'TEXT') {
        textLayers.forEach(l => {
          ctx.fillStyle = l.color; ctx.font = `bold ${l.size}px sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(l.text, (l.x / 100) * canvasDim.w, (l.y / 100) * canvasDim.h);
        });
      }
    }
  }, [step, crop, canvasDim, textLayers]);

  // UI 컴포넌트들
  const Sidebar = () => (
  <aside className="fixed bottom-0 left-0 right-0 lg:relative lg:w-[420px] lg:h-full bg-slate-950/50 backdrop-blur-3xl border-t lg:border-t-0 lg:border-r border-slate-900/50 p-6 lg:p-12 flex flex-row lg:flex-col items-center lg:items-stretch justify-between lg:justify-start gap-8 z-[100]">
    {/* 로고 섹션 */}
    <div className="flex items-center gap-6 group cursor-pointer" onClick={() => setActiveView('HOME')}>
      <div className="w-14 h-14 bg-gradient-to-br from-[#EC4899] to-[#8B5CF6] rounded-[22px] flex items-center justify-center shadow-2xl shadow-pink-500/20 group-hover:scale-110 group-active:scale-95 transition-all duration-500">
        <span className="text-white font-black text-2xl italic tracking-tighter">T</span>
      </div>
      <div className="hidden lg:block">
        <h1 className="text-2xl font-black italic text-white tracking-tighter leading-none uppercase">TownHub</h1>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
          <span className="w-1 h-1 bg-pink-500 rounded-full animate-pulse"></span>
          Art District
        </p>
      </div>
    </div>

    {/* 메뉴 네비게이션 */}
    <nav className="flex lg:flex-col items-center lg:items-stretch gap-3 lg:mt-12">
      {[
        { id: 'HOME', label: 'Home', icon: '🏠' },
        { id: 'STUDIO', label: 'Art Studio', icon: '🎨' },
        { id: 'DESIGN_FEED', label: 'Design Feed', icon: '🖼️' },
        { id: 'FRIENDS_COMMUNITY', label: 'Friends & DISCORD', icon: '💎' },
      ].map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveView(item.id as MainView)}
          className={`flex items-center gap-5 px-6 py-4 rounded-[24px] transition-all duration-500 group relative overflow-hidden ${
            activeView === item.id 
              ? 'bg-white text-slate-900 shadow-2xl shadow-white/10 scale-105' 
              : 'text-slate-500 hover:text-white hover:bg-slate-900/50'
          }`}
        >
          <span className="text-xl group-hover:rotate-12 transition-transform duration-500">{item.icon}</span>
          <span className="hidden lg:block font-black text-xs uppercase tracking-widest">{item.label}</span>
          {activeView === item.id && (
            <div className="absolute right-4 w-1.5 h-1.5 bg-pink-500 rounded-full"></div>
          )}
        </button>
      ))}
    </nav>

    {/* 로그인 및 하단 버튼 섹션 (에러 원인이었던 부분) */}
    <div className="hidden lg:flex flex-col space-y-6 pt-10 mt-auto border-t border-slate-900/50">
      {user ? (
        /* 로그인 완료 상태 */
        <div className="flex items-center gap-5 p-4 bg-slate-900/40 rounded-[28px] border border-slate-800/50">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 overflow-hidden ring-2 ring-pink-500/30">
            <img src={user.photoURL || ""} alt="Profile" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-sm italic truncate">{user.displayName}</p>
            <button onClick={handleLogout} className="text-[#F472B6] font-black text-[10px] uppercase hover:text-white transition-colors">Logout</button>
          </div>
        </div>
      ) : (
        /* 로그인 미완료 상태 */
        <button 
          onClick={handleLogin} 
          className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-tight shadow-xl hover:bg-[#EC4899] hover:text-white transition-all active:scale-95"
        >
          Login with Google
        </button>
      )}

      {/* 기타 버튼들 */}
      <button 
        onClick={() => window.open('https://www.youtube.com/@Hippoo_Hanuu', '_blank')} 
        className="w-full py-4 bg-[#EF4444] text-white rounded-2xl font-black text-xs uppercase tracking-tight shadow-xl hover:bg-red-600 active:scale-95 transition-all"
      >
        YouTube 구독하기
      </button>
      <BmcButton />
    </div>
  </aside>
);

  const PolicyModal = () => {
    if (!activePolicy) return null;
    const contentMap = {
      TERMS: { 
        title: "이용약관", 
        text: "본 서비스를 통해 생성된 모든 결과물의 저작권 책임은 전적으로 사용자에게 있습니다. 사용자는 업로드하는 이미지가 타인의 저작권을 침해하지 않음을 보증해야 하며, 본 서비스는 결과물 사용으로 인해 발생하는 어떠한 저작권 분쟁이나 법적 문제에도 책임을 지지 않습니다. 또한, 시스템 오류나 브라우저 환경에 따른 데이터 손실 또는 결과물의 부정확성에 대해 본 서비스는 일체의 책임을 지지 않음을 명시합니다." 
      },
      PRIVACY: { 
        title: "개인정보 처리방침", 
        text: "Town Square(이하 '본 서비스')는 사용자의 개인정보를 소중히 여기며, 개인정보보호법을 준수합니다. 본 서비스는 Google AdSense, Google Analytics 4(GA4), Google Tag Manager(GTM)를 사용하여 광고 제공 및 서비스 이용 통계를 분석합니다. 이 과정에서 쿠키(Cookie)가 사용될 수 있으나, 본 서비스는 사용자의 이미지를 서버로 전송하거나 저장하지 않습니다. 모든 이미지 처리 및 변환 작업은 사용자의 브라우저 내(Local)에서 안전하게 수행됩니다." 
      },
      DISCLAIMER: { 
        title: "면책사항", 
        text: "본 변환 결과는 원본 이미지에 따라 실제 인게임 결과와 차이가 발생할 수 있습니다. 시스템의 보정 로직은 완벽한 정확성을 보장하지 않으며, 사용자는 도안 제작 전 최종 검토를 수행해야 합니다. 서비스 이용 중 발생하는 데이터 손실에 대해서는 복구가 불가능할 수 있음을 알려드립니다." 
      }
    };
    const current = contentMap[activePolicy];
    return (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setActivePolicy(null)}>
        <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-10 lg:p-16 max-w-2xl w-full shadow-2xl relative animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
          <button onClick={() => setActivePolicy(null)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors text-2xl">✕</button>
          <h3 className="text-3xl lg:text-4xl font-black italic text-white mb-8 border-l-4 border-[#EC4899] pl-6 uppercase tracking-tighter">{current.title}</h3>
          <p className="text-slate-400 text-lg lg:text-xl leading-relaxed whitespace-pre-wrap">{current.text}</p>
          <button onClick={() => setActivePolicy(null)} className="mt-12 w-full py-5 bg-white text-slate-900 rounded-3xl font-black text-lg hover:bg-[#EC4899] hover:text-white transition-all">확인</button>
        </div>
      </div>
    );
  };
const NicknameModal = () => {
    if (!isNicknameModalOpen) return null;
    return (
      <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
        <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-10 max-w-md w-full text-center">
          <h3 className="text-3xl font-black text-white mb-6 italic">WELCOME!</h3>
          <p className="text-slate-400 mb-8">사용하실 닉네임을 설정해주세요.</p>
          <input 
            type="text" 
            value={tempNickname} 
            onChange={(e) => setTempNickname(e.target.value)}
            className="w-full p-5 bg-slate-800 rounded-2xl text-white font-bold mb-6 outline-none focus:ring-2 ring-pink-500"
            placeholder="닉네임 입력 (최대 10자)"
            maxLength={10}
          />
          <button onClick={saveNickname} className="w-full py-5 bg-pink-500 text-white rounded-2xl font-black hover:bg-pink-600 transition-all">시작하기</button>
        </div>
      </div>
    );
  };

  /**
   * 업데이트 로그 전체 내역 모달
   */
  const UpdateLogsModal = () => {
    if (!isLogsModalOpen) return null;
    return (
      <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setIsLogsModalOpen(false)}>
        <div className="bg-slate-900 border border-slate-800 rounded-[56px] p-10 lg:p-16 max-w-4xl w-full max-h-[85vh] shadow-[0_0_100px_rgba(0,0,0,0.5)] relative flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden" onClick={e => e.stopPropagation()}>
          <button onClick={() => setIsLogsModalOpen(false)} className="absolute top-10 right-10 text-slate-500 hover:text-white transition-colors text-2xl">✕</button>
          <h3 className="text-4xl lg:text-5xl font-black italic text-white mb-10 border-l-4 border-[#EC4899] pl-6 uppercase tracking-tighter">Town Hub <span className="text-[#EC4899]">History</span></h3>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-4">
             {updateLogs.map((log, idx) => (
               <div key={idx} className="flex flex-col md:flex-row md:items-center gap-4 p-8 bg-slate-800/40 rounded-[32px] border border-slate-800 hover:border-slate-700 transition-all">
                  <div className="md:w-32 shrink-0">
                    <span className="text-[#EC4899] font-black font-mono text-xs uppercase tracking-widest">{log.date}</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-slate-200 text-lg font-bold leading-snug">{log.content}</span>
                  </div>
               </div>
             ))}
          </div>
          
          <button onClick={() => setIsLogsModalOpen(false)} className="mt-10 w-full py-6 bg-white text-slate-900 rounded-[32px] font-black text-xl hover:bg-[#EC4899] hover:text-white transition-all">Close History</button>
        </div>
      </div>
    );
  };

  const Stepper = () => {
    const steps: { key: AppStep; label: string }[] = [
      { key: 'MODE_SELECT', label: '모드 선택' },
      ...(studioMode === 'PATTERN' ? [{ key: 'SETUP' as AppStep, label: '규격 설정' }] : []),
      { key: 'UPLOAD', label: '업로드' },
      { key: 'FRAME', label: '레이아웃' },
      ...(studioMode === 'BOOK_COVER' ? [{ key: 'TEXT' as AppStep, label: '텍스트' }] : []),
      { key: 'EDITOR', label: '완성' }
    ];
    const currentIdx = steps.findIndex(s => s.key === step);
    return (
      <div className="flex items-center justify-center w-full max-w-4xl mx-auto px-4 py-6">
        {steps.map((s, i) => (
          <React.Fragment key={s.key}>
            <div className="flex flex-col items-center relative">
              <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center font-black text-xs transition-all duration-500 ${i <= currentIdx ? 'bg-[#EC4899] text-white shadow-[0_0_15px_rgba(236,72,153,0.5)] scale-110' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                {i < currentIdx ? '✓' : i + 1}
              </div>
              <span className={`absolute -bottom-6 whitespace-nowrap text-[10px] lg:text-[11px] font-bold tracking-tighter ${i <= currentIdx ? 'text-[#EC4899]' : 'text-slate-600'}`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-[2px] mx-2 lg:mx-4 transition-all duration-1000 ${i < currentIdx ? 'bg-[#EC4899]' : 'bg-slate-800'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const selectedText = textLayers.find(l => l.id === selectedTextId);

  // 메인 렌더링 로직 (View Switch)
  const renderMainContent = () => {
    switch (activeView) {
      case 'HOME':
        return (
          <div className="min-h-full flex flex-col pt-10 lg:pt-32 pb-20 px-6 lg:px-20 overflow-y-auto custom-scrollbar no-scrollbar">
            <div className="max-w-7xl mx-auto w-full flex-1">
              <div className="text-center mb-24 space-y-10 animate-in fade-in duration-1000">
                <div className="inline-block px-6 py-2 bg-pink-500/10 border border-pink-500/20 rounded-full text-pink-500 font-black text-[11px] tracking-[0.4em] uppercase mb-4 shadow-xl">Open Beta Version</div>
                <h2 className="text-5xl lg:text-[140px] font-black italic tracking-tighter text-white leading-[0.85]">TOWN <span className="text-[#EC4899]">SQUARE</span><br/><span className="text-slate-700">ART STUDIO</span></h2>
                <p className="text-slate-400 text-lg lg:text-3xl font-medium max-w-3xl mx-auto leading-relaxed">상상을 현실로 만드는 가장 완벽한 방법.<br/><span className="text-white">Town Hub의 정밀한 픽셀 엔진</span>을 지금 경험해보세요.</p>
                <div className="flex flex-col items-center gap-8 mt-14">
                  <button onClick={() => { setActiveView('STUDIO'); setStep('MODE_SELECT'); }} className="px-16 py-8 bg-[#EC4899] text-white rounded-[40px] lg:rounded-[60px] font-black text-2xl lg:text-4xl hover:scale-105 transition-all shadow-[0_0_80px_rgba(236,72,153,0.4)] transform active:scale-95 group relative overflow-hidden"><span className="relative z-10">스튜디오 시작하기</span><div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" /></button>
                  <div className="lg:hidden w-full max-w-[320px]"><BmcButton /></div>
                </div>
              </div>
              
              <div className="mt-48 grid lg:grid-cols-2 gap-24 border-t border-slate-900 pt-32">
                <div className="space-y-16">
                  <h3 className="text-4xl lg:text-5xl font-black text-white italic flex items-center gap-6"><span className="w-16 h-1 bg-[#EC4899]"></span> FAQ</h3>
                  <div className="space-y-12">
                    <div className="group bg-slate-900/20 p-8 rounded-[40px] border border-slate-900 hover:border-pink-500/20 transition-all"><h4 className="text-[#EC4899] font-black text-2xl mb-5 group-hover:translate-x-2 transition-transform">Q. 이미지가 초록색/왜곡되어 보입니다.</h4><p className="text-slate-400 text-xl leading-relaxed font-medium">Town Hub는 Redmean 색차 공식을 적용하고 파란색 가중치를 강화했습니다. 원본 이미지의 대비가 강할수록 더욱 정확한 매핑이 이루어집니다.</p></div>
                    <div className="group bg-slate-900/20 p-8 rounded-[40px] border border-slate-900 hover:border-pink-500/20 transition-all"><h4 className="text-[#EC4899] font-black text-2xl mb-5 group-hover:translate-x-2 transition-transform">Q. 저장되는 ZIP 파일에는 무엇이 있나요?</h4><p className="text-slate-400 text-xl leading-relaxed font-medium">그리드 사이즈로 분할된 가이드 이미지(좌표 및 5x5 보조선 포함)와 전체 원본 픽셀 데이터가 압축되어 제공됩니다.</p></div>
                  </div>
                </div>
                
                <div className="space-y-16">
                  <div className="flex items-center justify-between">
                    <h3 onClick={() => setIsLogsModalOpen(true)} className="text-4xl lg:text-5xl font-black text-white italic flex items-center gap-6 cursor-pointer hover:text-[#EC4899] transition-colors group">
                      <span className="w-16 h-1 bg-[#EC4899]"></span> LATEST UPDATES
                      <span className="text-sm not-italic font-bold text-slate-600 group-hover:translate-x-2 transition-transform">View All ➔</span>
                    </h3>
                  </div>
                  <div className="space-y-6">
                    {isLogsLoading ? (
                      <div className="p-10 bg-slate-900/20 rounded-[40px] border border-slate-900 text-slate-500 font-black italic text-xl animate-pulse">업데이트 내역을 불러오는 중입니다...</div>
                    ) : updateLogs.length > 0 ? (
                      updateLogs.slice(0, 3).map((log, idx) => (
                        <div key={idx} className="flex items-start gap-5 p-8 bg-slate-900/30 rounded-[40px] border border-slate-900 hover:border-[#EC4899]/30 transition-all group">
                          <span className="text-3xl mt-1">🚀</span>
                          <div className="flex flex-col"><span className="text-[#EC4899] font-black font-mono text-sm tracking-tighter uppercase mb-1">{log.date}</span><span className="text-slate-200 text-xl font-bold group-hover:text-white transition-colors">{log.content}</span></div>
                        </div>
                      ))
                    ) : (
                      <div className="p-10 bg-slate-900/20 rounded-[40px] border border-slate-900 text-slate-600 italic text-xl">업데이트 내역을 불러올 수 없습니다.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-48 bg-gradient-to-br from-slate-900/50 to-transparent p-12 lg:p-24 rounded-[80px] border border-slate-900">
                 <h3 className="text-4xl lg:text-6xl font-black text-white italic mb-20">Art Studio <span className="text-[#EC4899]">Guide & Tips</span></h3>
                 <div className="grid md:grid-cols-2 gap-16 lg:gap-24">
                    <div className="space-y-6 group"><div className="text-5xl lg:text-6xl mb-4 group-hover:scale-110 transition-transform">💡</div><h5 className="text-2xl lg:text-3xl font-black text-white italic">01. 선명도를 높이는 대비 조절</h5><p className="text-slate-400 text-lg lg:text-xl leading-relaxed">원본 이미지의 <span className="text-white font-bold">대비(Contrast)를 높여보세요.</span> 파란색 왜곡 방지 로직과 시너지를 일으켜 훨씬 뚜렷한 도안이 생성됩니다.</p></div>
                    <div className="space-y-6 group"><div className="text-5xl lg:text-6xl mb-4 group-hover:scale-110 transition-transform">🎨</div><h5 className="text-2xl lg:text-3xl font-black text-white italic">02. 5x5 그리드 가이드 활용</h5><p className="text-slate-400 text-lg lg:text-xl leading-relaxed">워크스페이스와 내보내기 파일에는 <span className="text-[#EC4899] font-bold">5x5 단위 보조선</span>이 포함되어 있습니다. 인게임에서 픽셀을 찍을 때 훨씬 빠르고 정확하게 카운팅이 가능합니다.</p></div>
                    <div className="space-y-6 group"><div className="text-5xl lg:text-6xl mb-4 group-hover:scale-110 transition-transform">✍️</div><h5 className="text-2xl lg:text-3xl font-black text-white italic">03. 텍스트 레이어의 지혜</h5><p className="text-slate-400 text-lg lg:text-xl leading-relaxed">이미지에 포함된 글자는 뭉개질 확률이 높습니다. 별도로 <span className="text-white font-bold">텍스트 레이어</span>를 추가하여 깔끔한 가독성을 확보하세요.</p></div>
                    <div className="space-y-6 group"><div className="text-5xl lg:text-6xl mb-4 group-hover:scale-110 transition-transform">🔍</div><h5 className="text-2xl lg:text-3xl font-black text-white italic">04. 세부 디테일 검토</h5><p className="text-slate-400 text-lg lg:text-xl leading-relaxed">변환 직후 팔레트 목록에서 각 색상의 비중을 확인하세요. 5x5 단위로 픽셀을 찍어 내려가며 도안을 완성하세요.</p></div>
                 </div>
              </div>
            </div>
            
            <footer className="mt-64 border-t border-slate-900 pt-32 pb-20">
              <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-3 gap-24">
                <div className="space-y-8"><h4 className="text-white font-black italic text-3xl tracking-tighter">TOWN HUB</h4><p className="text-slate-500 text-xl leading-relaxed font-medium">Town Hub는 두근두근타운 유저들을 위한 비영리 팬 메이드 서비스입니다.</p></div>
                <div className="space-y-8 text-slate-500 text-xl"><h4 className="text-white font-black italic text-3xl uppercase tracking-tighter">Policy</h4><ul className="space-y-4 font-bold"><li onClick={() => setActivePolicy('TERMS')} className="hover:text-white cursor-pointer transition-colors">이용약관</li><li onClick={() => setActivePolicy('PRIVACY')} className="hover:text-white cursor-pointer transition-colors text-[#EC4899]">개인정보처리방침</li><li onClick={() => setActivePolicy('DISCLAIMER')} className="hover:text-white cursor-pointer transition-colors">면책사항</li></ul></div>
                <div className="space-y-8 text-slate-500 text-xl"><h4 className="text-white font-black italic text-3xl uppercase tracking-tighter">Contact</h4><div className="space-y-4 font-medium"><p className="flex items-center gap-4 hover:text-white transition-colors cursor-pointer font-bold">📧 hyuneitv@gmail.com</p><p className="opacity-40">© 2026 Town Hub Studio.</p></div></div>
              </div>
              <div className="mt-20 flex justify-center lg:hidden w-full max-w-[320px] mx-auto"><BmcButton /></div>
            </footer>
          </div>
        );
      case 'STUDIO':
        return (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-14 lg:pt-4">
            <div className="h-full max-w-7xl mx-auto flex flex-col relative">
              {step === 'MODE_SELECT' && (
                <div className="flex-1 flex flex-col md:grid md:grid-cols-2 gap-8 lg:gap-14 items-center justify-center p-4">
                  <button onClick={() => { setStudioMode('PATTERN'); setStep('SETUP'); setCanvasDim({w:48, h:48}); }} className="w-full aspect-square max-w-md bg-slate-900/40 p-12 lg:p-20 rounded-[64px] border-2 border-slate-800 hover:border-[#EC4899] hover:shadow-[0_0_50px_rgba(236,72,153,0.3)] transition-all flex flex-col items-center justify-center group"><div className="text-7xl lg:text-[100px] mb-10 group-hover:scale-110 transition-transform">🎨</div><h3 className="text-3xl lg:text-5xl font-black italic text-white text-center">픽셀 도안 제작</h3></button>
                  <button onClick={() => { setStudioMode('BOOK_COVER'); setCanvasDim({w:150, h:84}); setStep('UPLOAD'); }} className="w-full aspect-square max-w-md bg-slate-900/40 p-12 lg:p-20 rounded-[64px] border-2 border-slate-800 hover:border-cyan-500 hover:shadow-[0_0_50px_rgba(6,182,212,0.3)] transition-all flex flex-col items-center justify-center group"><div className="text-7xl lg:text-[100px] mb-10 group-hover:scale-110 transition-transform">📖</div><h3 className="text-3xl lg:text-5xl font-black italic text-white text-center">북커버 제작</h3></button>
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
                          img.onload = () => { imageObjRef.current = img; setStep('FRAME'); setCrop({x:0,y:0,scale:0.8}); };
                        }; r.readAsDataURL(f);
                      }
                    }} />
                    <div className="w-24 h-24 lg:w-40 lg:h-40 bg-slate-900 rounded-[40px] flex items-center justify-center text-5xl lg:text-8xl mb-8 group-hover:bg-[#EC4899] transition-all">📸</div>
                    <p className="font-black text-2xl lg:text-5xl text-white italic tracking-tighter">이미지를 선택하세요</p>
                  </div>
                </div>
              )}
              {(step === 'FRAME' || step === 'TEXT') && (
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-20 h-full min-h-0 items-center justify-center p-2">
                  <div className="w-full flex-1 flex flex-col items-center min-h-0 lg:max-w-6xl overflow-hidden">
                    <div className="bg-slate-900/40 rounded-[48px] shadow-2xl p-6 lg:p-36 w-full flex-1 flex items-center justify-center relative border border-slate-800/50 backdrop-blur-xl overflow-hidden">
                      <div ref={frameContainerRef} className="relative bg-white shadow-2xl overflow-hidden rounded-xl z-10 touch-none"
                           style={{ width: 'min(900px, 100%)', aspectRatio: `${canvasDim.w}/${canvasDim.h}`, border: '4px solid #000' }}
                           onMouseDown={e => handleDragStart(e)} onTouchStart={e => handleDragStart(e)}
                           onMouseMove={e => handleDragMove(e)} onTouchMove={e => handleDragMove(e)}
                           onMouseUp={() => { frameDragRef.current.isDragging = false; }} onTouchEnd={() => { frameDragRef.current.isDragging = false; }}>
                        <canvas ref={previewCanvasRef} width={canvasDim.w} height={canvasDim.h} className="w-full h-full pointer-events-none" style={{imageRendering:'pixelated'}} />
                        {textLayers.map(l => (
                          <div key={l.id} className={`absolute cursor-move font-black whitespace-nowrap select-none touch-none ${selectedTextId === l.id ? 'ring-4 ring-[#EC4899] bg-white/60 p-1 rounded-md' : ''}`}
                               style={{ left: `${l.x}%`, top: `${l.y}%`, transform: 'translate(-50%, -50%)', color: l.color, fontSize: `calc(${l.size}px * (min(900, 100vw) / ${canvasDim.w}))` }}
                               onMouseDown={e => { e.stopPropagation(); handleDragStart(e, true, l.id); }} onTouchStart={e => { e.stopPropagation(); handleDragStart(e, true, l.id); }}>{l.text}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="w-full lg:w-[480px] shrink-0 z-20 pb-8 lg:pb-0">
                    <div className="bg-slate-900 p-8 lg:p-16 rounded-[48px] shadow-2xl space-y-10 border border-slate-800">
                       {step === 'FRAME' ? (
                         <div className="space-y-10">
                           <div className="space-y-6"><label className="text-[11px] font-black text-slate-500 uppercase block">Scale: {Math.round(crop.scale * 100)}%</label><input type="range" min="0.1" max="5" step="0.01" value={crop.scale} onChange={e=>setCrop({...crop, scale:Number(e.target.value)})} className="w-full accent-[#EC4899] h-2.5 rounded-full bg-slate-800" /></div>
                           <div className="grid grid-cols-2 gap-4"><button onClick={resetPosition} className="py-4 bg-slate-800 text-slate-400 rounded-2xl font-black text-xs">위치 초기화</button><button onClick={resetScale} className="py-4 bg-slate-800 text-slate-400 rounded-2xl font-black text-xs">스케일 초기화</button><button onClick={fitToCanvas} className="col-span-2 py-5 bg-slate-800 text-white rounded-2xl font-black text-sm hover:bg-slate-700 transition-all">캔버스 채우기</button></div>
                           <button onClick={() => studioMode === 'BOOK_COVER' ? setStep('TEXT') : startPixelation()} className="w-full py-8 bg-[#EC4899] text-white rounded-[40px] font-black text-xl lg:text-3xl shadow-xl transition-all">레이아웃 완료 ➔</button>
                         </div>
                       ) : (
                         <div className="space-y-10">
                           <button onClick={() => { const n: TextLayer = { id: `t-${Date.now()}`, text: 'Hello', x: 50, y: 50, size: 8, color: '#000000' }; setTextLayers([...textLayers, n]); setSelectedTextId(n.id); }} className="w-full py-5 bg-white text-slate-900 rounded-[30px] font-black text-xs">+ 텍스트 레이어 추가</button>
                           {selectedText && (
                             <div className="p-8 bg-slate-800/50 rounded-[40px] space-y-8 border border-slate-700/50">
                                <input type="text" value={selectedText.text} onChange={e => setTextLayers(prev => prev.map(l => l.id === selectedTextId ? { ...l, text: e.target.value } : l))} className="w-full p-5 bg-slate-900 rounded-2xl font-black text-sm text-white outline-none ring-2 ring-slate-700 focus:ring-[#EC4899]" />
                                <div className="space-y-3"><label className="text-[10px] font-black text-slate-500 uppercase">Font Size ({selectedText.size}px)</label><input type="range" min="4" max="40" value={selectedText.size} onChange={e => setTextLayers(prev => prev.map(l => l.id === selectedTextId ? { ...l, size: Number(e.target.value) } : l))} className="w-full accent-[#EC4899]" /></div>
                                <div className="flex gap-4"><input type="color" value={selectedText.color} onChange={e => setTextLayers(prev => prev.map(l => l.id === selectedTextId ? { ...l, color: e.target.value } : l))} className="flex-1 h-14 bg-transparent cursor-pointer rounded-xl overflow-hidden" /><button onClick={() => setTextLayers(prev => prev.filter(l => l.id !== selectedTextId))} className="px-6 bg-red-500/10 text-red-500 font-black text-[10px] rounded-2xl hover:bg-red-500 hover:text-white transition-all">삭제</button></div>
                             </div>
                           )}
                           <button onClick={startPixelation} className="w-full py-8 bg-[#EC4899] text-white rounded-[40px] font-black text-xl lg:text-3xl shadow-xl">변환 프로세스 시작</button>
                         </div>
                       )}
                       <button onClick={() => setStep(step === 'TEXT' ? 'FRAME' : 'UPLOAD')} className="w-full py-2 text-slate-600 font-black text-[10px] uppercase text-center block">Go Back</button>
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
                          <div className="bg-slate-800 p-1.5 rounded-2xl flex items-center gap-3"><button onClick={()=>setZoom(z=>Math.max(100,z-100))} className="w-10 h-10 font-black bg-slate-900 text-white rounded-xl hover:bg-[#EC4899]">-</button><span className="text-[11px] font-black w-12 text-center text-white">{zoom}%</span><button onClick={()=>setZoom(z=>Math.min(1000,z+100))} className="w-10 h-10 font-black bg-slate-900 text-white rounded-xl hover:bg-[#EC4899]">+</button></div>
                          <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setShowExportMenu(!showExportMenu); }} className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black shadow-2xl text-[11px] hover:bg-[#EC4899] hover:text-white transition-all">Export {showExportMenu ? '▲' : '▼'}</button>
                            {showExportMenu && (
                              <div className="absolute right-0 mt-4 w-72 bg-slate-900 rounded-[40px] shadow-2xl border border-slate-800 p-5 z-[150] origin-top-right animate-in zoom-in-95">
                                <div className="p-5 bg-slate-800 rounded-3xl mb-3"><label className="text-[10px] font-black text-slate-500 block mb-2 uppercase">Grid Size (px)</label><input type="number" value={splitSize} onChange={(e) => setSplitSize(Math.max(1, Number(e.target.value)))} className="w-full p-4 bg-slate-900 rounded-2xl text-center font-black text-white outline-none border border-slate-700" /></div>
                                <button disabled={isExporting} onClick={exportAsZip} className="w-full p-5 text-left hover:bg-slate-800 flex items-center gap-5 rounded-3xl group transition-all"><div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-[#EC4899] transition-colors">📦</div><span className="font-black text-white text-xs">ZIP Guide Download</span></button>
                              </div>
                            )}
                          </div>
                       </div>
                    </div>
                    {/* UI 워크스페이스 그리드 렌더링 (5x5 보조선 적용) */}
                    <div ref={editorScrollRef} className="flex-1 bg-slate-900/20 rounded-[64px] overflow-auto relative border border-slate-800/50 custom-scrollbar z-10" style={{'--cell-size': `${zoom / 20}px`, '--font-size': zoom >= 250 ? `${Math.max(7, zoom / 60)}px` : '0px'} as any}>
                      <div className="inline-block p-[100px] lg:p-[300px]">
                        <div className="bg-slate-900 p-8 lg:p-16 border-[12px] border-black shadow-2xl rounded-sm">
                          <div className="pixel-grid" style={{display: 'grid', gridTemplateColumns: `repeat(${pixelData.width}, var(--cell-size))`}}>
                            {pixelData.colors.map((color, idx) => {
                              const row = Math.floor(idx / pixelData.width);
                              const col = idx % pixelData.width;
                              const pId = paletteIndexMap.get(color);
                              const isSelected = activePaletteId === pId;
                              
                              // 5x5 그리드 선 강조 로직
                              const isMajorRight = (col + 1) % 5 === 0 && (col + 1) !== pixelData.width;
                              const isMajorBottom = (row + 1) % 5 === 0 && (row + 1) !== pixelData.height;

                              return (
                                <div key={idx} 
                                  style={{backgroundColor: color, width: 'var(--cell-size)', height: 'var(--cell-size)', color: getContrastColor(color), fontSize: 'var(--font-size)'}}
                                  className={`pixel-item flex items-center justify-center font-black transition-all border-black/5 ${isMajorRight ? 'border-r-2 border-r-black/40' : 'border-r-[0.5px]'} ${isMajorBottom ? 'border-b-2 border-b-black/40' : 'border-b-[0.5px]'} ${isSelected ? 'ring-4 ring-[#EC4899] scale-125 z-10 shadow-2xl' : 'hover:opacity-90'}`}
                                  onClick={() => setActivePaletteId(isSelected ? null : pId)}>
                                  {zoom >= 250 && formatPaletteIndex(pixelData.palette.findIndex(p => p.hex === color) + 1)}
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
      case 'DESIGN_FEED':
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-12 animate-in fade-in zoom-in-95 duration-700">
             <div className="w-40 h-40 bg-pink-500/10 rounded-[60px] flex items-center justify-center text-7xl shadow-2xl border border-pink-500/20">🖼️</div>
             <div className="space-y-6 max-w-2xl"><h2 className="text-5xl lg:text-7xl font-black italic text-white tracking-tighter">Town Hub <span className="text-[#EC4899]">커뮤니티 오픈 예정</span></h2><p className="text-slate-400 text-xl lg:text-2xl font-medium leading-relaxed">전 세계 두근두근타운 아티스트들과 소통하고 나만의 도안을 자랑할 수 있는 공간이 준비 중입니다. <br/><br/><span className="text-white font-bold">도안 공유, 좋아요, 아티스트 랭킹</span> 등 다양한 기능이 곧 찾아옵니다.</p></div>
             <div className="flex flex-col items-center gap-8"><div className="px-8 py-3 bg-slate-900 border border-slate-800 rounded-full text-slate-500 font-bold text-sm uppercase tracking-widest">Coming Soon in 2026</div><BmcButton /></div>
          </div>
        );
      case 'FRIENDS_COMMUNITY':
  return (
    <div className="flex-1 p-6 lg:p-12 overflow-hidden h-full">
      <div className="flex flex-col lg:flex-row gap-8 h-full">
        
        {/* 1. 왼쪽: Friends 리스트 섹션 */}
        <div className="flex-[2] bg-slate-900/20 border border-slate-800 rounded-[40px] p-8 lg:p-10 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-3xl lg:text-4xl font-black italic text-white uppercase tracking-tighter">Friends</h2>
            <button 
              onClick={() => {
                if(!user) return alert("로그인이 필요합니다.");
                // 친구 등록 모달 열기 로직
              }}
              className="px-8 py-3 bg-[#EC4899] text-white rounded-2xl font-black hover:scale-105 transition-all shadow-lg text-sm"
            >
              친구 등록하기
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 여기에 DB에서 가져온 친구 카드들이 표시됩니다 */}
              <p className="text-slate-500 text-sm italic">등록된 친구가 없습니다.</p>
            </div>
          </div>
        </div>

        {/* 2. 오른쪽: Discord 승인제 섹션 */}
        <div className="flex-1 bg-slate-900/20 border border-slate-800 rounded-[40px] p-8 lg:p-10 flex flex-col overflow-hidden">
          <div className="flex flex-col items-center mb-10">
            <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter mb-4">Discord</h2>
            
            {/* [추가된 버튼]: 일반 유저에게만 보이는 등록 신청 버튼 */}
            {role !== 'admin' && (
              <button 
                onClick={() => {
                  if(!user) return alert("로그인이 필요합니다.");
                  // 디스코드 신청 모달 열기 로직
                }}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
              >
                디스코드 홍보 신청하기
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
            {/* 관리자일 때: 승인 대기 중인 신청 목록을 먼저 보여줌 */}
            {role === 'admin' && (
              <div className="mb-6 p-4 border border-pink-500/30 rounded-3xl bg-pink-500/5">
                <p className="text-[10px] font-black text-pink-500 uppercase mb-3 tracking-widest">승인 대기 목록 (Admin Only)</p>
                {/* 대기 아이템 예시 */}
                <div className="bg-black/40 border border-slate-800 rounded-2xl p-4 flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">신청건 #1</span>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-green-600 text-[10px] font-black rounded-lg">승인</button>
                    <button className="px-3 py-1 bg-red-600 text-[10px] font-black rounded-lg">거절</button>
                  </div>
                </div>
              </div>
            )}

            {/* 공통: 승인 완료된 디스코드 목록 */}
            <p className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">커뮤니티 목록</p>
            {[1, 2].map((i) => (
              <div key={i} className="bg-black/40 border border-slate-800 rounded-3xl p-5 flex items-center justify-between group hover:border-indigo-500/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center text-lg">💬</div>
                  <span className="font-bold text-white text-sm">Official Server</span>
                </div>
                <button className="px-5 py-2 border border-slate-700 rounded-xl text-[10px] font-black hover:bg-white hover:text-black transition-all">JOIN</button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 카드 샘플 - 나중에 DB 연동 시 이 부분을 map으로 돌립니다 */}
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-black/40 border border-slate-800 rounded-[32px] p-6 flex gap-6 hover:border-pink-500/30 transition-all group">
                  <div className="w-32 h-44 bg-slate-800 rounded-2xl flex items-center justify-center text-xs text-slate-600 font-bold border border-slate-700 group-hover:border-pink-500/20 transition-all">프로필 사진</div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <h4 className="text-xl font-black text-white mb-2 italic">닉네임</h4>
                      <div className="flex gap-1.5 mb-3">
                        <span className="text-[10px] bg-pink-500/10 text-pink-500 px-2 py-0.5 rounded-lg border border-pink-500/20 font-bold">#Casual</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">자기소개 문구가 여기에 표시됩니다...</p>
                    </div>
                    <div className="bg-black p-2 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-400">ID: Hippo#0927</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 오른쪽: Discord (도안 디자인) */}
        <div className="flex-1 bg-slate-900/20 border border-slate-800 rounded-[40px] p-8 lg:p-10 flex flex-col">
          <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter text-center mb-10">Discord</h2>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-black/40 border border-slate-800 rounded-3xl p-5 flex items-center justify-between group hover:bg-indigo-500/5 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500/20 rounded-full border border-indigo-500/20 flex items-center justify-center text-xl">💬</div>
                  <span className="font-black text-white text-sm">디스코드 이름</span>
                </div>
                <button className="px-6 py-2 border-2 border-white rounded-xl text-xs font-black hover:bg-white hover:text-black transition-all">Join</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
      default: return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#020617] overflow-hidden font-sans select-none text-slate-300">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {toast && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-white text-slate-900 px-6 py-3 rounded-full font-black shadow-2xl text-xs animate-in slide-in-from-top-4">{toast}</div>}
        <header className="px-6 py-4 lg:px-12 lg:py-10 shrink-0 flex flex-col lg:flex-row items-center justify-between gap-6 border-b border-slate-900/50">
           <h2 className="text-[10px] font-black italic text-slate-600 uppercase tracking-[0.4em] flex items-center gap-4"><span className="w-2 h-2 bg-pink-500 rounded-full animate-pulse"></span>{activeView === 'STUDIO' ? `${step} DASHBOARD` : activeView === 'HOME' ? 'MAIN DASHBOARD' : `${activeView} DASHBOARD`}</h2>
           {activeView === 'STUDIO' && <Stepper />}
        </header>
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {renderMainContent()}
        </div>
      </main>
      <PolicyModal />
      <UpdateLogsModal />
    </div>
  );
};

export default App;
