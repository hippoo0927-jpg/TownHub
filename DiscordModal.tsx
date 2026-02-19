import React, { useState, useRef } from 'react';

interface DiscordModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: { name: string; link: string; desc: string; imageUrl: string };
  setData: (data: any) => void;
  onSubmit: () => void;
}

const DiscordModal: React.FC<DiscordModalProps> = ({ isOpen, onClose, data, setData, onSubmit }) => {
  const [isFetchingIcon, setIsFetchingIcon] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const extractInviteCode = (link: string) => {
    const parts = link.split('/');
    return parts[parts.length - 1];
  };

  const fetchServerInfo = async () => {
    if (!data.link) return;
    const inviteCode = extractInviteCode(data.link);
    if (!inviteCode) return;

    try {
      setIsFetchingIcon(true);
      // Using a proxy or public API endpoint if available, but Discord API usually has CORS restrictions.
      // We will attempt fetching, but gracefully fail to manual upload if blocked.
      const response = await fetch(`https://discord.com/api/v10/invites/${inviteCode}?with_counts=false`);
      if (response.ok) {
        const json = await response.json();
        if (json.guild) {
          const serverName = json.guild.name;
          const iconId = json.guild.icon;
          const guildId = json.guild.id;
          let imageUrl = data.imageUrl;
          
          if (iconId) {
            imageUrl = `https://cdn.discordapp.com/icons/${guildId}/${iconId}.png`;
          }
          
          setData({
            ...data,
            name: data.name || serverName,
            imageUrl
          });
        }
      } else {
        console.warn("Discord API fetch failed or invite code invalid.");
      }
    } catch (e) {
      console.error("Discord API CORS error or network error:", e);
    } finally {
      setIsFetchingIcon(false);
    }
  };

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', 'town_hub_preset');
      
      const res = await fetch('https://api.cloudinary.com/v1_1/duhiasxcm/image/upload', { 
        method: 'POST', 
        body: fd 
      });
      
      if (res.ok) {
        const cloudData = await res.json();
        setData({ ...data, imageUrl: cloudData.secure_url });
        alert("서버 아이콘이 업로드되었습니다.");
      }
    } catch (e) {
      alert("이미지 업로드 중 오류 발생");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 max-w-md w-full" onClick={e=>e.stopPropagation()}>
        <h3 className="text-2xl font-black text-white mb-8 italic uppercase tracking-tighter text-center">Discord 홍보 신청</h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Invite Link</label>
            <div className="flex gap-2">
              <input 
                key="discord-link-input"
                className="flex-1 p-4 bg-slate-800 rounded-2xl text-white text-sm outline-none focus:ring-2 ring-indigo-500 border border-slate-700" 
                placeholder="https://discord.gg/..." 
                value={data.link} 
                onChange={(e) => setData({...data, link: e.target.value})} 
              />
              <button 
                onClick={fetchServerInfo}
                disabled={isFetchingIcon || !data.link}
                className="px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black transition-all disabled:opacity-50"
              >
                {isFetchingIcon ? '...' : '불러오기'}
              </button>
            </div>
            <p className="text-[9px] text-slate-500 px-1">링크를 입력하고 불러오기를 누르면 서버 정보를 가져옵니다.</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Server Name</label>
            <input 
              key="discord-name-input"
              className="w-full p-4 bg-slate-800 rounded-2xl text-white text-sm outline-none focus:ring-2 ring-indigo-500 border border-slate-700" 
              placeholder="서버 이름을 입력하세요" 
              value={data.name} 
              onChange={(e) => setData({...data, name: e.target.value})} 
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Server Icon</label>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shrink-0">
                {data.imageUrl ? <img src={data.imageUrl} className="w-full h-full object-cover" alt="Icon" /> : <div className="w-full h-full flex items-center justify-center text-xs opacity-20">No Img</div>}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isUploading}
                className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl text-[10px] font-black border border-slate-700 hover:border-indigo-500 transition-all"
              >
                {isUploading ? '업로드 중...' : '아이콘 수동 업로드'}
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleManualUpload} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Description</label>
            <textarea 
              key="discord-desc-input"
              className="w-full p-4 bg-slate-800 rounded-2xl text-white text-sm h-24 outline-none focus:ring-2 ring-indigo-500 border border-slate-700 resize-none" 
              placeholder="간단한 서버 소개 (최대 100자)" 
              maxLength={100}
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