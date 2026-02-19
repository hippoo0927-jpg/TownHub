import React, { useState, useMemo } from 'react';

interface DiscordItem {
  id: string;
  name: string;
  link: string;
  desc: string;
}

interface FriendItem {
  id: string;
  nickname: string;
  title: string;
  gameId: string;
  description: string;
  imageURL: string;
  category: string;
  uid: string;
  role: string;
  likes: string[];
  likesCount: number;
  reports: any[];
  reportsCount: number;
  adminVerifiedAt?: any;
  createdAt?: any;
}

interface FriendsCommunityProps {
  user: any;
  isAdmin: boolean;
  friendsList: FriendItem[];
  lastFriendReg: any;
  pendingDiscords: DiscordItem[];
  approvedDiscords: DiscordItem[];
  onOpenFriendModal: () => void;
  onOpenDiscordModal: () => void;
  onApproveDiscord: (req: any) => void;
  onRejectDiscord: (id: string) => void;
  onReportUser: (id: string, nickname: string) => void;
  onDeleteFriend: (id: string) => void;
  onLikeFriend: (id: string) => void;
  onAdminCleanFriend: (id: string) => void;
}

const CATEGORIES = ["전체", "게임", "일반", "친목", "기타"];

const FriendsCommunity: React.FC<FriendsCommunityProps> = (props) => {
  const { 
    user, 
    isAdmin, 
    friendsList,
    lastFriendReg,
    pendingDiscords, 
    approvedDiscords, 
    onOpenFriendModal, 
    onOpenDiscordModal, 
    onApproveDiscord, 
    onRejectDiscord,
    onReportUser,
    onDeleteFriend,
    onLikeFriend,
    onAdminCleanFriend
  } = props;

  const [activeTab, setActiveTab] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [showReportersList, setShowReportersList] = useState<string | null>(null);

  const cooldownDays = useMemo(() => {
    if (!user || isAdmin || !lastFriendReg) return 0;
    const last = lastFriendReg.toDate ? lastFriendReg.toDate() : new Date(lastFriendReg);
    const diff = new Date().getTime() - last.getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (diff < sevenDays) {
      return Math.ceil((sevenDays - diff) / (24 * 60 * 60 * 1000));
    }
    return 0;
  }, [user, isAdmin, lastFriendReg]);

  const filteredFriends = useMemo(() => {
    return friendsList
      .filter(f => {
        // 일반 유저는 신고 3회 이상 카드 숨김 (관리자는 예외)
        if (!isAdmin && (f.reportsCount || 0) >= 3) return false;
        
        const matchCategory = activeTab === "전체" || f.category === activeTab;
        const matchSearch = f.nickname.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            f.gameId.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCategory && matchSearch;
      })
      .sort((a, b) => {
        // 관리자는 신고 누적된 것부터 확인하도록 정렬 옵션 추가할 수 있지만 기본은 인기순 유지
        if ((b.likesCount || 0) !== (a.likesCount || 0)) {
          return (b.likesCount || 0) - (a.likesCount || 0);
        }
        return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
      });
  }, [friendsList, activeTab, searchQuery, isAdmin]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("게임 ID가 복사되었습니다!");
  };

  const isCleanVerified = (verifiedAt: any) => {
    if (!verifiedAt) return false;
    const date = verifiedAt.toDate ? verifiedAt.toDate() : new Date(verifiedAt);
    const diff = new Date().getTime() - date.getTime();
    return diff < 24 * 60 * 60 * 1000; // 24시간
  };

  return (
    <div className="flex-1 p-6 lg:p-12 overflow-hidden h-full flex flex-col gap-8">
      <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
        <div className="flex-[3] bg-slate-900/20 border border-slate-800 rounded-[40px] p-8 lg:p-10 flex flex-col overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <h2 className="text-3xl lg:text-4xl font-black italic text-white uppercase tracking-tighter">Friends Finder</h2>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <input 
                type="text" 
                placeholder="닉네임 또는 게임 ID 검색" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 md:w-64 p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white outline-none focus:ring-2 ring-pink-500"
              />
              <button 
                onClick={() => {
                  if (!user) return alert("로그인이 필요합니다.");
                  if (cooldownDays > 0) return alert(`프로필 카드는 1주일에 한 번만 등록 가능합니다.`);
                  onOpenFriendModal();
                }} 
                className={`px-6 py-3 text-white rounded-xl font-black transition-all shadow-lg text-sm whitespace-nowrap ${cooldownDays > 0 ? 'bg-slate-700 cursor-not-allowed grayscale' : 'bg-[#EC4899] hover:scale-105 active:scale-95'}`}
              >
                {cooldownDays > 0 ? `${cooldownDays}일 후 등록 가능` : '등록'}
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-8 pb-2 shrink-0">
            {CATEGORIES.map(cat => (
              <button 
                key={cat} 
                onClick={() => setActiveTab(cat)}
                className={`px-5 py-2 rounded-full text-xs font-black transition-all border ${activeTab === cat ? 'bg-white text-slate-900 border-white shadow-xl' : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-500'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {filteredFriends.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
                {filteredFriends.map((friend) => {
                  const isPopular = (friend.likesCount || 0) >= 10;
                  const hasLiked = user && friend.likes?.includes(user.uid);
                  const isIsolated = (friend.reportsCount || 0) >= 3;
                  const verified = isCleanVerified(friend.adminVerifiedAt);
                  
                  return (
                    <div key={friend.id} className={`bg-black/40 border rounded-[32px] p-6 flex flex-col md:flex-row gap-6 transition-all relative group overflow-hidden ${isIsolated && isAdmin ? 'border-red-600/50 bg-red-900/10' : isPopular ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-slate-800 hover:border-pink-500/20'}`}>
                      {/* 카드 좌측 */}
                      <div className="w-full md:w-40 flex flex-col gap-3 shrink-0">
                         <div className="aspect-[3/4] rounded-2xl bg-slate-800 overflow-hidden border border-slate-700 relative">
                            <img src={friend.imageURL} alt="Character" className="w-full h-full object-cover" />
                            {isPopular && <div className="absolute top-2 left-2 bg-yellow-500 text-black font-black text-[9px] px-2 py-0.5 rounded-full shadow-lg">POPULAR</div>}
                            {verified && <div className="absolute bottom-2 left-2 bg-green-500 text-white font-black text-[8px] px-2 py-0.5 rounded-full shadow-lg uppercase">CLEAN VERIFIED</div>}
                            {isIsolated && isAdmin && <div className="absolute inset-0 bg-red-600/40 flex items-center justify-center p-4 text-center"><p className="text-white font-black text-[10px] uppercase leading-tight drop-shadow-md">⚠️ 신고 누적<br/>검토 대기</p></div>}
                         </div>
                         <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex items-center justify-between gap-2 overflow-hidden">
                            <span className="text-[10px] font-mono text-slate-400 truncate flex-1">{friend.gameId}</span>
                            <button onClick={() => copyToClipboard(friend.gameId)} className="p-1.5 bg-slate-800 rounded-lg hover:bg-white hover:text-slate-900 transition-all">
                               <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                            </button>
                         </div>
                      </div>

                      {/* 카드 우측 */}
                      <div className="flex-1 flex flex-col min-w-0">
                         <div className="flex justify-between items-start mb-4 gap-2">
                            <div className="flex flex-col min-w-0">
                               <div className="flex items-center gap-1 flex-wrap">
                                  <h4 className="text-white font-black text-lg truncate italic">{friend.nickname}</h4>
                                  {friend.role === "admin" ? (
                                    <span className="text-[11px] text-[#EC4899] font-black uppercase tracking-tight"> [👑 관리자]</span>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter opacity-60"> [일반 시민]</span>
                                  )}
                               </div>
                               <span className="text-[10px] font-bold text-pink-500 uppercase tracking-widest leading-none">({friend.title})</span>
                            </div>
                            <div className="flex gap-2">
                               <button onClick={() => onLikeFriend(friend.id)} className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${hasLiked ? 'bg-pink-500 text-white border-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.4)]' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-pink-500'}`}>
                                  <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 ${hasLiked ? 'fill-current' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                  <span className="text-xs font-black">{friend.likesCount || 0}</span>
                               </button>
                               <button onClick={() => onReportUser(friend.id, friend.nickname)} className="p-2 bg-slate-800 rounded-xl text-slate-500 hover:text-red-500 transition-colors" title="신고">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                               </button>
                               {isAdmin && (
                                 <div className="flex gap-2">
                                    <button onClick={() => onAdminCleanFriend(friend.id)} className="p-2 bg-green-900/30 rounded-xl text-green-500 hover:bg-green-600 hover:text-white transition-all" title="복구/클린">
                                       <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </button>
                                    <button onClick={() => onDeleteFriend(friend.id)} className="p-2 bg-red-900/30 rounded-xl text-red-500 hover:bg-red-600 hover:text-white transition-all" title="영구 삭제">
                                       <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                 </div>
                               )}
                            </div>
                         </div>
                         
                         <div className="flex-1 bg-slate-900/40 border border-slate-800/50 rounded-2xl p-4 overflow-hidden">
                            <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap line-clamp-6">{friend.description}</p>
                         </div>
                         <div className="mt-3 flex items-center justify-between">
                            <span className="text-[9px] font-black bg-pink-500/10 text-pink-500 px-3 py-1 rounded-full uppercase tracking-tighter">Category: {friend.category}</span>
                            {isAdmin && (friend.reportsCount || 0) > 0 && (
                              <button onClick={() => setShowReportersList(showReportersList === friend.id ? null : friend.id)} className="text-[9px] font-black text-red-500 underline">신고 내역 ({friend.reportsCount})</button>
                            )}
                         </div>
                         {isAdmin && showReportersList === friend.id && (
                           <div className="mt-4 p-4 bg-black/60 rounded-2xl border border-red-500/30 space-y-3 animate-in slide-in-from-top-2 duration-300">
                              <h5 className="text-[10px] font-black text-red-500 uppercase tracking-widest">Reports Details</h5>
                              {friend.reports?.map((r: any, idx: number) => (
                                <div key={idx} className="border-t border-slate-800 pt-2 first:border-0 first:pt-0">
                                   <div className="flex justify-between text-[8px] font-black text-slate-500">
                                      <span>BY: {r.reporterNickname} ({r.reporterId.slice(0,5)})</span>
                                      <span>TYPE: {r.reason}</span>
                                   </div>
                                   <p className="text-[10px] text-slate-300 mt-1">{r.detail}</p>
                                </div>
                              ))}
                           </div>
                         )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                 <div className="text-6xl">🔍</div>
                 <p className="italic font-bold">찾으시는 조건의 친구가 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* 디스코드 섹션 */}
        <div className="flex-1 bg-slate-900/20 border border-slate-800 rounded-[40px] p-8 lg:p-10 flex flex-col overflow-hidden max-w-md">
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