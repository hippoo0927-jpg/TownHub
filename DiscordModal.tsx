import React from 'react';

interface DiscordModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: { name: string; link: string; desc: string };
  setData: (data: any) => void;
  onSubmit: () => void;
}

const DiscordModal: React.FC<DiscordModalProps> = ({ isOpen, onClose, data, setData, onSubmit }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 max-w-md w-full" onClick={e=>e.stopPropagation()}>
        <h3 className="text-2xl font-black text-white mb-8 italic uppercase tracking-tighter text-center">Discord 홍보 신청</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Server Name</label>
            <input 
              key="discord-name-input"
              autoFocus
              className="w-full p-4 bg-slate-800 rounded-2xl text-white text-sm outline-none focus:ring-2 ring-indigo-500 border border-slate-700" 
              placeholder="서버 이름을 입력하세요" 
              value={data.name} 
              onChange={(e) => setData({...data, name: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Invite Link</label>
            <input 
              key="discord-link-input"
              className="w-full p-4 bg-slate-800 rounded-2xl text-white text-sm outline-none focus:ring-2 ring-indigo-500 border border-slate-700" 
              placeholder="https://discord.gg/..." 
              value={data.link} 
              onChange={(e) => setData({...data, link: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Description</label>
            <textarea 
              key="discord-desc-input"
              className="w-full p-4 bg-slate-800 rounded-2xl text-white text-sm h-24 outline-none focus:ring-2 ring-indigo-500 border border-slate-700 resize-none" 
              placeholder="간단한 서버 소개" 
              value={data.desc} 
              onChange={(e) => setData({...data, desc: e.target.value})}
            ></textarea>
          </div>
        </div>
        <div className="flex gap-4 mt-8">
          <button onClick={onClose} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-bold">취소</button>
          <button onClick={onSubmit} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">신청하기</button>
        </div>
      </div>
    </div>
  );
};

export default DiscordModal;