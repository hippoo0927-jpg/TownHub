import React from 'react';
import { FeedItem } from '../types';

interface FeedCardProps {
  item: FeedItem;
  isAdmin: boolean;
  onSelect: (item: FeedItem) => void;
}

const FeedCard: React.FC<FeedCardProps> = ({ item, isAdmin, onSelect }) => {
  const isIsolated = item.reportsCount >= 3;
  const mediaUrls = item.mediaUrls || [];
  const hasMultipleMedia = mediaUrls.length > 1;
  const isNotice = item.isNotice === true;

  return (
    <div 
      onClick={() => onSelect(item)}
      className={`group flex items-center gap-6 p-4 border rounded-[28px] transition-all cursor-pointer relative overflow-hidden 
        ${isNotice 
          ? 'bg-pink-500/10 border-pink-500/60 border-2 shadow-[0_0_30px_rgba(236,72,153,0.15)] ring-1 ring-pink-500/20' 
          : 'bg-slate-900/40 border-slate-800 hover:border-pink-500/30'} 
        ${isIsolated && isAdmin ? 'bg-red-500/5 border-red-500/20' : ''}`}
    >
      {/* 썸네일 */}
      <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-2xl bg-slate-800 overflow-hidden shrink-0 border border-slate-700/50 relative">
        {mediaUrls.length > 0 ? (
          <>
            <img 
              src={mediaUrls[0]} 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
              alt="Thumbnail" 
            />
            {hasMultipleMedia && (
              <div className="absolute top-2 right-2 px-1.5 py-1 bg-black/60 backdrop-blur-md rounded-lg flex items-center gap-1 border border-white/10 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[9px] font-black text-white">+{mediaUrls.length - 1}</span>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl opacity-20">🖼️</div>
        )}
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
        <div className="flex items-center gap-2 mb-1">
          {isNotice && (
            <span className="text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter bg-pink-500 text-white shadow-xl animate-pulse">
              📢 필독 공지
            </span>
          )}
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter border ${item.isEditorPick ? 'bg-pink-500/10 text-pink-500 border-pink-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
            {item.category}
          </span>
          {isIsolated && isAdmin && (
            <span className="text-[9px] bg-red-600 text-white px-2 py-0.5 rounded-md font-black uppercase">⚠️ 신고 누적 검토</span>
          )}
        </div>
        
        <h4 className={`text-lg font-black italic truncate leading-tight transition-colors ${isNotice ? 'text-white' : 'text-white group-hover:text-pink-500'}`}>
          {item.title}
        </h4>
        
        <p className={`text-sm line-clamp-1 mb-2 font-medium ${isNotice ? 'text-pink-100/70' : 'text-slate-500'}`}>
          {item.content}
        </p>

        <div className={`flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest ${isNotice ? 'text-pink-200/60' : 'text-slate-500'}`}>
          <div className="flex items-center gap-1.5">
            <span className={isNotice ? 'text-white font-black underline decoration-pink-300' : 'text-pink-500'}>{item.authorNickname}</span>
            {item.authorRole === 'admin' && <span className="text-[8px] bg-pink-500/20 text-pink-500 px-1 rounded uppercase">ADMIN</span>}
          </div>
          <span className="opacity-40">|</span>
          <div className="flex items-center gap-1">
             <span>❤️ {item.likesCount}</span>
             <span className="ml-2">👁️ {item.views || 0}</span>
          </div>
          <span className="hidden lg:inline opacity-40">|</span>
          <span className="hidden lg:inline opacity-60">
            {item.createdAt?.toDate ? new Date(item.createdAt.toDate()).toLocaleDateString() : 'Just now'}
          </span>
        </div>
      </div>

      {/* 태그 (데스크탑 전용) */}
      <div className="hidden lg:flex flex-wrap gap-2 max-w-[150px] justify-end">
        {item.tags?.slice(0, 2).map(tag => (
          <span key={tag} className={`text-[9px] font-black ${isNotice ? 'text-pink-200' : 'text-slate-600 hover:text-pink-500'}`}>#{tag}</span>
        ))}
      </div>
    </div>
  );
};

export default FeedCard;