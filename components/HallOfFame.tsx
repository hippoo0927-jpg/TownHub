
import React from 'react';
import { FeedItem } from '../types';

interface HallOfFameProps {
  items: FeedItem[];
  onSelect: (item: FeedItem) => void;
}

const HallOfFame: React.FC<HallOfFameProps> = ({ items, onSelect }) => {
  if (items.length === 0) return null;

  return (
    <div className="mb-14 relative group">
      <div className="flex items-center gap-3 mb-6 px-2">
        <span className="text-2xl">🏆</span>
        <h3 className="text-xl font-black italic text-white uppercase tracking-tighter">Hall of Fame</h3>
        <div className="flex-1 h-[1px] bg-gradient-to-r from-pink-500/50 to-transparent"></div>
      </div>
      
      <div className="flex gap-6 overflow-x-auto no-scrollbar pb-4 px-2">
        {items.map((item, idx) => (
          <div 
            key={item.id}
            onClick={() => onSelect(item)}
            className="flex-shrink-0 w-[280px] lg:w-[320px] relative rounded-[32px] overflow-hidden cursor-pointer group/card transition-transform hover:-translate-y-2 duration-500 border-2 border-slate-800"
            style={{ 
              boxShadow: item.isEditorPick ? '0 0 30px rgba(236, 72, 153, 0.2)' : 'none'
            }}
          >
            {/* 배경 그라데이션 애니메이션 (Editor Pick 전용) */}
            {item.isEditorPick && (
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-transparent to-purple-500/20 animate-pulse pointer-events-none" />
            )}
            
            <div className="aspect-video relative overflow-hidden bg-slate-900">
              {/* Use mediaUrls[0] as mediaUrl was deprecated and moved to array type */}
              <img 
                src={(item.mediaUrls && item.mediaUrls.length > 0) ? item.mediaUrls[0] : "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop"} 
                className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-700"
                alt={item.title}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-[9px] font-black text-white uppercase italic">
                  {item.category}
                </span>
                {item.isEditorPick && (
                  <span className="px-3 py-1 bg-pink-500 rounded-full text-[9px] font-black text-white shadow-lg">EDITOR'S PICK</span>
                )}
              </div>

              <div className="absolute bottom-4 left-4 right-4">
                <h4 className="text-lg font-black text-white italic truncate leading-tight">{item.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold text-pink-500 uppercase tracking-tighter">{item.authorNickname}</span>
                  <span className="text-[8px] font-black text-slate-500">#{idx + 1} TOP RANK</span>
                </div>
              </div>
            </div>
            
            {/* 네온 테두리 애니메이션 */}
            <div className="absolute inset-0 border-2 border-transparent group-hover/card:border-pink-500/30 rounded-[32px] transition-all pointer-events-none" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default HallOfFame;
