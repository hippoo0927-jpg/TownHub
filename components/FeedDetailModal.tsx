import React, { useState, useEffect } from 'react';
import { FeedItem } from '../types';

interface FeedDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: FeedItem | null;
  user: any;
  isAdmin: boolean;
  onLike: (id: string) => void;
  onReport: (id: string, nickname: string) => void;
  onDelete: (id: string) => void;
}

const FeedDetailModal: React.FC<FeedDetailModalProps> = ({ isOpen, onClose, item, user, isAdmin, onLike, onReport, onDelete }) => {
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    if (isOpen) setCurrentIdx(0);
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const hasLiked = user && item.likes?.includes(user.uid);
  const mediaUrls = item.mediaUrls || [];
  const hasMultipleMedia = mediaUrls.length > 1;

  const nextMedia = () => {
    setCurrentIdx((prev) => (prev + 1) % mediaUrls.length);
  };

  const prevMedia = () => {
    setCurrentIdx((prev) => (prev - 1 + mediaUrls.length) % mediaUrls.length);
  };

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-[56px] max-w-6xl w-full shadow-2xl overflow-hidden flex flex-col lg:flex-row animate-in fade-in zoom-in-95 duration-500">
        
        {/* 미디어 영역 (Carousel) */}
        <div className="lg:w-[60%] aspect-square lg:aspect-auto bg-black flex items-center justify-center relative border-b lg:border-b-0 lg:border-r border-slate-800 overflow-hidden">
          {mediaUrls.length > 0 ? (
            <>
              {item.mediaType === 'video' ? (
                <video src={mediaUrls[currentIdx]} controls autoPlay loop className="max-w-full max-h-full" />
              ) : (
                <img src={mediaUrls[currentIdx]} className="max-w-full max-h-full object-contain transition-all duration-500" alt={`Content ${currentIdx + 1}`} style={{ imageRendering: 'pixelated' }} />
              )}

              {/* 내비게이션 화살표 */}
              {hasMultipleMedia && (
                <>
                  <button onClick={prevMedia} className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 backdrop-blur-md rounded-full text-white flex items-center justify-center hover:bg-white hover:text-black transition-all z-10 shadow-xl">❮</button>
                  <button onClick={nextMedia} className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 backdrop-blur-md rounded-full text-white flex items-center justify-center hover:bg-white hover:text-black transition-all z-10 shadow-xl">❯</button>
                  
                  {/* 페이지 표시기 */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full text-[10px] font-black text-white shadow-2xl">
                    {currentIdx + 1} / {mediaUrls.length}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="text-9xl opacity-10">🖼️</div>
          )}
          
          <button onClick={onClose} className="absolute top-6 left-6 w-12 h-12 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white text-xl hover:bg-white hover:text-black transition-all z-20">✕</button>
        </div>

        {/* 정보 영역 */}
        <div className="lg:w-[40%] flex flex-col p-8 lg:p-12">
          <div className="flex-1">
             <div className="flex items-center gap-3 mb-6">
                <span className="px-3 py-1 bg-pink-500/10 text-pink-500 border border-pink-500/20 rounded-full text-[10px] font-black uppercase italic">{item.category}</span>
                {item.isEditorPick && <span className="text-[10px] font-black text-yellow-500">🏆 Editor's Choice</span>}
             </div>

             <h3 className="text-3xl lg:text-4xl font-black italic text-white mb-6 leading-tight uppercase tracking-tighter">{item.title}</h3>
             
             <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 overflow-hidden shrink-0 ring-2 ring-pink-500/20">
                   <div className="w-full h-full flex items-center justify-center text-xl bg-slate-700">👤</div>
                </div>
                <div>
                   <p className="text-white font-black text-sm italic">{item.authorNickname}</p>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.authorTitle || 'Town Citizen'}</p>
                </div>
             </div>

             <div className="bg-slate-800/30 rounded-3xl p-6 lg:p-8 border border-slate-800/50 mb-8 min-h-[200px]">
                <p className="text-slate-300 text-lg leading-relaxed whitespace-pre-wrap font-medium">{item.content}</p>
             </div>

             <div className="flex flex-wrap gap-2 mb-10">
                {item.tags?.map(tag => (
                  <span key={tag} className="text-[10px] font-black text-pink-500/60 hover:text-pink-500 cursor-pointer">#{tag}</span>
                ))}
             </div>
          </div>

          {/* 하단 액션 바 */}
          <div className="pt-8 border-t border-slate-800 flex items-center justify-between gap-4">
             <div className="flex items-center gap-3">
                <button 
                  onClick={() => onLike(item.id)}
                  className={`flex items-center gap-3 px-6 py-4 rounded-3xl font-black transition-all ${hasLiked ? 'bg-pink-500 text-white shadow-xl' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                >
                  <span>{hasLiked ? '❤️' : '🤍'}</span>
                  <span className="text-xs">{item.likesCount}</span>
                </button>
                <button onClick={() => onReport(item.id, item.authorNickname)} className="p-4 bg-slate-800 rounded-3xl text-slate-500 hover:text-red-500 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </button>
             </div>
             {isAdmin && (
               <button onClick={() => onDelete(item.id)} className="px-6 py-4 bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white rounded-3xl font-black text-xs uppercase transition-all">Delete Post</button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedDetailModal;