import React from 'react';

interface DiscordItem {
  id: string;
  name: string;
  link: string;
  desc: string;
}

interface FriendItem {
  id: string;
  nickname: string;
}

interface FriendsCommunityProps {
  user: any;
  isAdmin: boolean;
  friendsList: FriendItem[];
  pendingDiscords: DiscordItem[];
  approvedDiscords: DiscordItem[];
  onOpenFriendModal: () => void;
  onOpenDiscordModal: () => void;
  onApproveDiscord: (req: any) => void;
  onRejectDiscord: (id: string) => void;
  onReportUser: (nickname: string) => void;
}

const FriendsCommunity: React.FC<FriendsCommunityProps> = (props) => {
  const { 
    user, 
    isAdmin, 
    friendsList,
    pendingDiscords, 
    approvedDiscords, 
    onOpenFriendModal, 
    onOpenDiscordModal, 
    onApproveDiscord, 
    onRejectDiscord,
    onReportUser
  } = props;

  return (
    <div className="flex-1 p-6 lg:p-12 overflow-hidden h-full">
      <div className="flex flex-col lg:flex-row gap-8 h-full max-w-7xl mx-auto">
        <div className="flex-[2] bg-slate-900/20 border border-slate-800 rounded-[40px] p-8 lg:p-10 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-3xl lg:text-4xl font-black italic text-white uppercase tracking-tighter">Friends</h2>
            <button onClick={() => user ? onOpenFriendModal() : alert("로그인이 필요합니다.")} className="px-8 py-3 bg-[#EC4899] text-white rounded-2xl font-black hover:scale-105 transition-all shadow-lg text-sm">등록하기</button>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {friendsList.length > 0 ? (
              <div className="space-y-4">
                {friendsList.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between p-6 bg-black/40 border border-slate-800 rounded-3xl group hover:border-pink-500/30 transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xl">👤</div>
                       <span className="text-white font-bold text-lg italic">{friend.nickname}</span>
                    </div>
                    <button 
                      onClick={() => onReportUser(friend.nickname)}
                      className="px-4 py-2 bg-red-600/10 text-red-500 border border-red-500/20 rounded-xl font-black text-[10px] hover:bg-red-600 hover:text-white transition-all uppercase"
                    >
                      Report
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 italic">등록된 친구가 없습니다. 새로운 친구를 추가해보세요!</p>
            )}
          </div>
        </div>
        <div className="flex-1 bg-slate-900/20 border border-slate-800 rounded-[40px] p-8 lg:p-10 flex flex-col overflow-hidden">
          <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter text-center mb-10">Discord</h2>
          <button onClick={() => user ? onOpenDiscordModal() : alert("로그인이 필요합니다.")} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase mb-10 shadow-lg">디스코드 신청</button>
          <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
            {isAdmin && pendingDiscords.length > 0 && (
              <div className="mb-10 p-6 border border-pink-500/30 rounded-3xl bg-pink-500/5">
                <h3 className="text-xs font-black text-pink-500 uppercase mb-4 tracking-widest">Pending (Admin)</h3>
                {pendingDiscords.map((req) => (
                  <div key={req.id} className="bg-black/40 border border-slate-800 rounded-2xl p-4 mb-3">
                    <p className="text-sm font-bold text-white mb-1">{req.name}</p>
                    <div className="flex gap-2">
                      <button onClick={() => onApproveDiscord(req)} className="flex-1 py-2 bg-green-600 text-white text-[10px] font-black rounded-lg">APPROVE</button>
                      <button onClick={() => onRejectDiscord(req.id)} className="px-3 py-2 bg-red-600 text-white text-[10px] font-black rounded-lg">REJECT</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {approvedDiscords.map((srv) => (
              <div key={srv.id} className="bg-black/40 border border-slate-800 rounded-3xl p-6 group hover:border-indigo-500/30 transition-all">
                <div className="flex items-center justify-between mb-2"><h4 className="text-white font-black italic">{srv.name}</h4><button onClick={() => window.open(srv.link, '_blank')} className="px-4 py-1.5 border border-slate-700 rounded-xl text-[10px] font-black hover:bg-white hover:text-black transition-all">JOIN</button></div>
                <p className="text-slate-500 text-[10px] line-clamp-2">{srv.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FriendsCommunity;