import React, { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove, increment, getDoc, where, limit } from "firebase/firestore";
import { FeedItem } from './types';
import HallOfFame from './components/HallOfFame';
import FeedCard from './components/FeedCard';
import FeedModal from './components/FeedModal';
import FeedDetailModal from './components/FeedDetailModal';

interface FeedProps {
  user: any;
  isAdmin: boolean;
  nickname: string;
  userTitle: string;
  db: any;
  onOpenReport: (id: string, nickname: string) => void;
}

const CATEGORIES = ["전체", "🎨 갤러리", "📚 꿀팁/강좌", "🤝 파티모집"];

const Feed: React.FC<FeedProps> = ({ user, isAdmin, nickname, userTitle, db, onOpenReport }) => {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [activeTab, setActiveTab] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, "Feeds"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map(doc => ({ 
        id: doc.id, 
        likes: doc.data().likes || [],
        reports: doc.data().reports || [],
        mediaUrls: doc.data().mediaUrls || [],
        isNotice: doc.data().isNotice || false,
        ...doc.data() 
      } as FeedItem)));
      setIsLoading(false);
    });
    return () => unsub();
  }, [db]);

  const filteredItems = useMemo(() => {
    let result = items.filter(item => {
      if (!isAdmin && (item.reportsCount || 0) >= 3) return false;
      const matchCategory = activeTab === "전체" || item.category === activeTab;
      const matchSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.authorNickname.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });

    // 정렬 로직: 공지사항 우선 노출
    return result.sort((a, b) => {
      const aNotice = a.isNotice ? 1 : 0;
      const bNotice = b.isNotice ? 1 : 0;
      if (aNotice !== bNotice) return bNotice - aNotice;
      
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
  }, [items, activeTab, searchQuery, isAdmin]);

  const hallOfFameItems = useMemo(() => {
    return [...items]
      .sort((a, b) => {
        if (a.isEditorPick !== b.isEditorPick) return a.isEditorPick ? -1 : 1;
        return (b.likesCount || 0) - (a.likesCount || 0);
      })
      .slice(0, 5);
  }, [items]);

  const handleCreatePost = async (data: any) => {
    if (!user) return;
    try {
      await addDoc(collection(db, "Feeds"), {
        ...data,
        authorId: user.uid,
        authorEmail: user.email,
        authorNickname: nickname,
        authorTitle: userTitle,
        authorRole: isAdmin ? 'admin' : 'user',
        likes: [],
        likesCount: 0,
        reports: [],
        reportsCount: 0,
        views: 0,
        createdAt: serverTimestamp()
      });
      setIsWriteModalOpen(false);
      alert("성공적으로 등록되었습니다!");
    } catch (e) {
      alert("등록 실패");
    }
  };

  const handleLike = async (id: string) => {
    if (!user) return alert("로그인이 필요합니다.");
    const ref = doc(db, "Feeds", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const likes = snap.data().likes || [];
    if (likes.includes(user.uid)) {
      await updateDoc(ref, { likes: arrayRemove(user.uid), likesCount: increment(-1) });
    } else {
      await updateDoc(ref, { likes: arrayUnion(user.uid), likesCount: increment(1) });
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (window.confirm("정말로 삭제하시겠습니까?")) {
      await deleteDoc(doc(db, "Feeds", id));
      setSelectedItem(null);
    }
  };

  const handleViewDetail = async (item: FeedItem) => {
    setSelectedItem(item);
    await updateDoc(doc(db, "Feeds", item.id), { views: increment(1) });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 lg:p-14 lg:pt-0 relative">
      <div className="flex-1 overflow-y-auto custom-scrollbar no-scrollbar pb-32">
        <div className="max-w-6xl mx-auto w-full">
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-14 mt-6">
            <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto">
               {CATEGORIES.map(cat => (
                 <button 
                   key={cat} 
                   onClick={() => setActiveTab(cat)}
                   className={`px-6 py-2 rounded-full text-[11px] font-black transition-all whitespace-nowrap border ${activeTab === cat ? 'bg-white text-slate-900 border-white' : 'bg-slate-900/40 text-slate-500 border-slate-800 hover:border-slate-700'}`}
                 >
                   {cat}
                 </button>
               ))}
            </div>
            <div className="relative w-full md:w-80">
               <input 
                 type="text" 
                 placeholder="제목, 내용, 작성자 검색..." 
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 className="w-full p-4 pl-12 bg-slate-900/40 border border-slate-800 rounded-3xl text-sm text-white outline-none focus:ring-2 ring-pink-500"
               />
               <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">🔍</span>
            </div>
          </div>

          {activeTab === "전체" && <HallOfFame items={hallOfFameItems} onSelect={handleViewDetail} />}

          <div className="space-y-4">
             <div className="flex items-center justify-between px-2 mb-6">
                <h3 className="text-xl font-black italic text-white uppercase tracking-tighter">Recent Feeds</h3>
                <span className="text-[10px] font-black text-slate-600 uppercase">{filteredItems.length} POSTS</span>
             </div>
             
             {isLoading ? (
               <div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-t-pink-500 border-slate-700 rounded-full animate-spin"></div></div>
             ) : filteredItems.length > 0 ? (
               <div className="grid grid-cols-1 gap-4">
                  {filteredItems.map(item => (
                    <FeedCard key={item.id} item={item} isAdmin={isAdmin} onSelect={handleViewDetail} />
                  ))}
               </div>
             ) : (
               <div className="py-20 text-center text-slate-600 font-bold italic">
                 등록된 게시글이 없거나 검색 결과가 없습니다.
               </div>
             )}
          </div>
        </div>
      </div>

      <button 
        onClick={() => user ? setIsWriteModalOpen(true) : alert("로그인이 필요합니다.")}
        className="fixed bottom-10 right-10 lg:bottom-16 lg:right-16 w-20 h-20 bg-[#EC4899] text-white rounded-[32px] flex items-center justify-center text-3xl shadow-[0_0_40px_rgba(236,72,153,0.4)] hover:scale-110 active:scale-95 transition-all z-[100] group"
      >
        <span className="group-hover:rotate-12 transition-transform">✍️</span>
      </button>

      <FeedModal 
        isOpen={isWriteModalOpen} 
        onClose={() => setIsWriteModalOpen(false)} 
        isAdmin={isAdmin}
        userEmail={user?.email}
        onSubmit={handleCreatePost} 
      />

      <FeedDetailModal 
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={selectedItem}
        user={user}
        isAdmin={isAdmin}
        onLike={handleLike}
        onReport={onOpenReport}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default Feed;