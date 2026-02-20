import React from 'react';
import { User } from "firebase/auth";

type MainView = 'HOME' | 'STUDIO' | 'DESIGN_FEED' | 'FRIENDS_COMMUNITY';

interface SidebarProps {
  user: User | null;
  nickname: string;
  activeView: MainView;
  setActiveView: (view: MainView) => void;
  handleLogin: () => void;
  handleLogout: () => void;
}

const BmcButton: React.FC = () => (
  <button 
    onClick={() => window.open('https://www.buymeacoffee.com/hippoo0927c', '_blank')}
    className="w-full py-4 bg-[#FFDD00] text-[#000000] rounded-2xl font-black text-xs uppercase tracking-tight shadow-xl hover:bg-[#FFC400] active:scale-95 transition-all flex items-center justify-center gap-2"
  >
    <span className="text-lg">☕</span>
    <span>Buy me a coffee</span>
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({ user, nickname, activeView, setActiveView, handleLogin, handleLogout }) => (
  <aside className="fixed bottom-0 left-0 right-0 lg:relative lg:w-[420px] lg:h-full bg-slate-950/50 backdrop-blur-3xl border-t lg:border-t-0 lg:border-r border-slate-900/50 p-6 lg:p-12 flex flex-row lg:flex-col items-center lg:items-stretch justify-between lg:justify-start gap-8 z-[100]">
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
            activeView === item.id ? 'bg-white text-slate-900 shadow-2xl scale-105' : 'text-slate-500 hover:text-white hover:bg-slate-900/50'
          }`}
        >
          <span className="text-xl group-hover:rotate-12 transition-transform duration-500">{item.icon}</span>
          <span className="hidden lg:block font-black text-xs uppercase tracking-widest">{item.label}</span>
          {activeView === item.id && <div className="absolute right-4 w-1.5 h-1.5 bg-pink-500 rounded-full"></div>}
        </button>
      ))}
    </nav>
    <div className="hidden lg:flex flex-col space-y-6 pt-10 mt-auto border-t border-slate-900/50">
      {user ? (
        <div className="flex items-center gap-5 p-4 bg-slate-900/40 rounded-[28px] border border-slate-800/50">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 overflow-hidden ring-2 ring-pink-500/30">
            <img src={user.photoURL || "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=2080&auto=format&fit=crop"} alt="Profile" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-sm italic truncate">{nickname || user.displayName || user.email?.split('@')[0]}</p>
            <button onClick={handleLogout} className="text-[#F472B6] font-black text-[10px] uppercase hover:text-white transition-colors">Logout</button>
          </div>
        </div>
      ) : (
        <button onClick={handleLogin} className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-tight shadow-xl hover:bg-[#EC4899] hover:text-white transition-all">Login / Register</button>
      )}
      <button onClick={() => window.open('https://www.youtube.com/@Hippoo_Hanuu', '_blank')} className="w-full py-4 bg-[#EF4444] text-white rounded-2xl font-black text-xs uppercase tracking-tight shadow-xl hover:bg-red-600 transition-all">YouTube 구독하기</button>
      <BmcButton />
    </div>
  </aside>
);

export default Sidebar;