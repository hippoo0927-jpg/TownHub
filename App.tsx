import React, { useState, useRef, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDoc, doc, setDoc, deleteDoc } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { AppStep, PixelData, StudioMode, TextLayer } from './types';
import { processArtStudioPixel } from './services/pixelService';

// 분리된 컴포넌트 임포트
import Sidebar from './Sidebar';
import Stepper from './Stepper';
import Home from './Home';
import ArtStudio from './ArtStudio';
import Feed from './Feed';
import FriendsCommunity from './FriendsCommunity';
import NicknameModal from './NicknameModal';
import DiscordModal from './DiscordModal';
import FriendModal from './FriendModal';
import PolicyModal from './PolicyModal';
import UpdateLogsModal from './UpdateLogsModal';

type MainView = 'HOME' | 'STUDIO' | 'DESIGN_FEED' | 'FRIENDS_COMMUNITY';
type PolicyType = 'TERMS' | 'PRIVACY' | 'DISCLAIMER' | null;

interface UpdateLog {
  date: string;
  content: string;
}

interface DiscordItem {
  id: string;
  name: string;
  link: string;
  desc: string;
  userId?: string;
  userEmail?: string;
  applicantNickname?: string;
  createdAt?: any;
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
const adminEmails = ["hippoo0927@gmail.com"]; 

const App: React.FC = () => {
  // Global States
  const [user, setUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<MainView>('HOME');

  // Modal States
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [tempNickname, setTempNickname] = useState('');
  const [isFriendModalOpen, setIsFriendModalOpen] = useState(false);
  const [isDiscordModalOpen, setIsDiscordModalOpen] = useState(false);
  const [activePolicy, setActivePolicy] = useState<PolicyType>(null);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);

  // Data States
  const [updateLogs, setUpdateLogs] = useState<UpdateLog[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(true);
  const [approvedDiscords, setApprovedDiscords] = useState<DiscordItem[]>([]);
  const [pendingDiscords, setPendingDiscords] = useState<DiscordItem[]>([]);
  const [discordData, setDiscordData] = useState({ name: '', link: '', desc: '' });

  // Friends States
  const [friendsList, setFriendsList] = useState<{id: string, nickname: string}[]>([]);
  const [friendSearchInput, setFriendSearchInput] = useState('');

  // Studio States
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

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const frameDragRef = useRef({ isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0, initialPropX: 0, initialPropY: 0 });
  const frameContainerRef = useRef<HTMLDivElement>(null);
  const editorScrollRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Auth & DB Initialization
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsAdmin(adminEmails.includes(currentUser.email || ""));
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setNickname(userDoc.data().nickname);
        } else {
          setIsNicknameModalOpen(true);
        }
      } else {
        setIsAdmin(false);
        setNickname('');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubApproved = onSnapshot(query(collection(db, "discord_servers"), orderBy("createdAt", "desc")), (snap) => {
      setApprovedDiscords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiscordItem)));
    });
    let unsubPending = () => {};
    if (isAdmin) {
      unsubPending = onSnapshot(query(collection(db, "discord_requests"), orderBy("createdAt", "desc")), (snap) => {
        setPendingDiscords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiscordItem)));
      });
    }
    return () => { unsubApproved(); unsubPending(); };
  }, [isAdmin]);

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
      } catch (error) { console.error("Failed to fetch logs:", error); } finally { setIsLogsLoading(false); }
    };
    fetchLogs();
  }, []);

  // Handlers
  const handleLogin = async () => { try { await signInWithPopup(auth, provider); } catch (error) { alert("로그인에 실패했습니다."); } };
  const handleLogout = () => signOut(auth);

  const saveNickname = async () => {
    if (!user || !tempNickname.trim()) return;
    try {
      await setDoc(doc(db, "users", user.uid), { nickname: tempNickname, role: adminEmails.includes(user.email || "") ? 'admin' : 'user', createdAt: serverTimestamp() });
      setNickname(tempNickname); setIsNicknameModalOpen(false); showToast("닉네임이 설정되었습니다!");
    } catch (e) { showToast("저장에 실패했습니다."); }
  };

  const submitDiscordRequest = async () => {
    if (!discordData.name || !discordData.link) return alert("필수 항목을 입력해주세요.");
    if (!user) return alert("로그인이 필요합니다.");
    try {
      await addDoc(collection(db, "discord_requests"), { ...discordData, userId: user.uid, userEmail: user.email, applicantNickname: nickname, createdAt: serverTimestamp() });
      showToast("신청 완료! 관리자 승인 후 리스트에 나타납니다."); setIsDiscordModalOpen(false); setDiscordData({ name: '', link: '', desc: '' });
    } catch (e) { alert("신청 제출 실패"); }
  };

  const approveDiscord = async (req: DiscordItem) => {
    try {
      const { id, ...data } = req;
      await addDoc(collection(db, "discord_servers"), { ...data, createdAt: serverTimestamp() });
      await deleteDoc(doc(db, "discord_requests", id));
      showToast("서버 승인이 완료되었습니다!");
    } catch (e) { alert("승인 처리 중 오류 발생"); }
  };

  const rejectDiscord = async (id: string) => {
    try { await deleteDoc(doc(db, "discord_requests", id)); showToast("신청이 거절되었습니다."); } catch (e) { alert("거절 처리 실패"); }
  };

  // Friends Handlers
  const handleAddFriend = () => {
    if (!friendSearchInput.trim()) return alert("친구 닉네임을 입력해주세요.");
    const newFriend = {
      id: `friend-${Date.now()}`,
      nickname: friendSearchInput.trim()
    };
    setFriendsList(prev => [newFriend, ...prev]);
    setFriendSearchInput('');
    setIsFriendModalOpen(false);
    showToast(`${newFriend.nickname}님이 친구 목록에 추가되었습니다!`);
  };

  const handleReportUser = (targetNickname: string) => {
    alert(`${targetNickname}님에 대한 신고가 접수되었습니다. 관리자 검증 후 적절한 조치를 취하겠습니다.`);
  };

  // Studio Handlers
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
      if (layer) frameDragRef.current = { isDragging: true, startX: clientX, startY: clientY, initialX: 0, initialY: 0, initialPropX: layer.x, initialPropY: layer.y };
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

  const paletteIndexMap = useMemo(() => {
    const m = new Map();
    if (pixelData) pixelData.palette.forEach(p => m.set(p.hex, p.index));
    return m;
  }, [pixelData]);

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
      ctx.fillStyle = l.color; ctx.font = `bold ${l.size}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
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
      const ctx = previewCanvasRef.current.getContext('2d'); if (!ctx) return;
      ctx.clearRect(0, 0, canvasDim.w, canvasDim.h); ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvasDim.w, canvasDim.h);
      ctx.save();
      ctx.translate(canvasDim.w / 2 + crop.x, canvasDim.h / 2 + crop.y);
      ctx.scale(crop.scale, crop.scale);
      ctx.drawImage(imageObjRef.current, -imageObjRef.current.width / 2, -imageObjRef.current.height / 2);
      ctx.restore();
      if (step === 'TEXT') textLayers.forEach(l => {
        ctx.fillStyle = l.color; ctx.font = `bold ${l.size}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(l.text, (l.x / 100) * canvasDim.w, (l.y / 100) * canvasDim.h);
      });
    }
  }, [step, crop, canvasDim, textLayers]);

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#020617] overflow-hidden font-sans select-none text-slate-300">
      <Sidebar user={user} nickname={nickname} activeView={activeView} setActiveView={setActiveView} handleLogin={handleLogin} handleLogout={handleLogout} />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {toast && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-white text-slate-900 px-6 py-3 rounded-full font-black shadow-2xl text-xs">{toast}</div>}
        <header className="px-6 py-4 lg:px-12 lg:py-10 shrink-0 flex flex-col lg:flex-row items-center justify-between gap-6 border-b border-slate-900/50">
           <h2 className="text-[10px] font-black italic text-slate-600 uppercase tracking-[0.4em] flex items-center gap-4"><span className="w-2 h-2 bg-pink-500 rounded-full animate-pulse"></span>DASHBOARD</h2>
           {activeView === 'STUDIO' && <Stepper step={step} studioMode={studioMode} />}
        </header>
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {activeView === 'HOME' && <Home onStart={() => { setActiveView('STUDIO'); setStep('MODE_SELECT'); }} updateLogs={updateLogs} isLogsLoading={isLogsLoading} onViewAllLogs={() => setIsLogsModalOpen(true)} onPolicyClick={setActivePolicy} />}
          {activeView === 'STUDIO' && (
            <ArtStudio 
              step={step} setStep={setStep} studioMode={studioMode} setStudioMode={setStudioMode}
              canvasDim={canvasDim} setCanvasDim={setCanvasDim} crop={crop} setCrop={setCrop}
              zoom={zoom} setZoom={setZoom} pixelData={pixelData} activePaletteId={activePaletteId} setActivePaletteId={setActivePaletteId}
              textLayers={textLayers} setTextLayers={setTextLayers} selectedTextId={selectedTextId} setSelectedTextId={setSelectedTextId}
              splitSize={splitSize} setSplitSize={setSplitSize} showPalette={showPalette} setShowPalette={setShowPalette}
              showExportMenu={showExportMenu} setShowExportMenu={setShowExportMenu} isExporting={isExporting}
              onStartPixelation={startPixelation} onExportAsZip={() => {}} 
              onResetPosition={resetPosition} onResetScale={resetScale} onFitToCanvas={fitToCanvas}
              onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={() => { frameDragRef.current.isDragging = false; }}
              fileInputRef={fileInputRef} imageObjRef={imageObjRef} previewCanvasRef={previewCanvasRef} 
              frameContainerRef={frameContainerRef} editorScrollRef={editorScrollRef} paletteIndexMap={paletteIndexMap}
            />
          )}
          {activeView === 'DESIGN_FEED' && <Feed />}
          {activeView === 'FRIENDS_COMMUNITY' && (
            <FriendsCommunity 
              user={user} 
              isAdmin={isAdmin} 
              friendsList={friendsList}
              pendingDiscords={pendingDiscords} 
              approvedDiscords={approvedDiscords} 
              onOpenFriendModal={() => setIsFriendModalOpen(true)} 
              onOpenDiscordModal={() => setIsDiscordModalOpen(true)} 
              onApproveDiscord={approveDiscord} 
              onRejectDiscord={rejectDiscord}
              onReportUser={handleReportUser}
            />
          )}
        </div>
      </main>
      <DiscordModal isOpen={isDiscordModalOpen} onClose={() => setIsDiscordModalOpen(false)} data={discordData} setData={setDiscordData} onSubmit={submitDiscordRequest} />
      <FriendModal 
        isOpen={isFriendModalOpen} 
        onClose={() => setIsFriendModalOpen(false)} 
        inputValue={friendSearchInput}
        onInputChange={setFriendSearchInput}
        onAddFriend={handleAddFriend}
      />
      <NicknameModal isOpen={isNicknameModalOpen} value={tempNickname} onChange={setTempNickname} onSave={saveNickname} />
      <PolicyModal activePolicy={activePolicy} onClose={() => setActivePolicy(null)} />
      <UpdateLogsModal isOpen={isLogsModalOpen} onClose={() => setIsLogsModalOpen(false)} logs={updateLogs} />
    </div>
  );
};

export default App;
