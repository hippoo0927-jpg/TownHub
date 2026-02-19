import React from 'react';

const BmcButton: React.FC = () => (
  <button 
    onClick={() => window.open('https://www.buymeacoffee.com/hippoo0927c', '_blank')}
    className="w-full py-4 bg-[#FFDD00] text-[#000000] rounded-2xl font-black text-xs uppercase tracking-tight shadow-xl hover:bg-[#FFC400] active:scale-95 transition-all flex items-center justify-center gap-2"
  >
    <span className="text-lg">☕</span>
    <span>Buy me a coffee</span>
  </button>
);

const Feed: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-12 animate-in fade-in zoom-in-95 duration-700">
       <div className="w-40 h-40 bg-pink-500/10 rounded-[60px] flex items-center justify-center text-7xl shadow-2xl border border-pink-500/20">🖼️</div>
       <h2 className="text-5xl lg:text-7xl font-black italic text-white tracking-tighter">Town Hub <span className="text-[#EC4899]">커뮤니티 오픈 예정</span></h2>
       <BmcButton />
    </div>
  );
};

export default Feed;