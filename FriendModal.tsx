import React from 'react';

interface FriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: {
    gameId: string;
    description: string;
    imageURL: string;
    category: string;
  };
  setFormData: (data: any) => void;
  onAddFriend: () => void;
}

const CATEGORIES = ["전체", "게임", "일반", "친목", "기타"];

const FriendModal: React.FC<FriendModalProps> = ({ isOpen, onClose, formData, setFormData, onAddFriend }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-10 max-w-lg w-full shadow-2xl my-8">
        <h3 className="text-3xl font-black text-white mb-6 italic uppercase tracking-tighter text-center">Register Profile</h3>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Game Category</label>
            <select 
              key="friend-category-select"
              autoFocus
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full p-4 bg-slate-800 rounded-2xl text-white font-bold outline-none focus:ring-2 ring-pink-500 border border-slate-700 appearance-none cursor-pointer"
            >
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Game ID</label>
            <input 
              key="friend-gameid-input"
              type="text"
              value={formData.gameId}
              onChange={(e) => setFormData({...formData, gameId: e.target.value})}
              placeholder="게임 내 고유 ID 입력"
              className="w-full p-4 bg-slate-800 rounded-2xl text-white font-bold outline-none focus:ring-2 ring-pink-500 border border-slate-700"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Character Photo URL</label>
            <input 
              key="friend-image-input"
              type="text"
              value={formData.imageURL}
              onChange={(e) => setFormData({...formData, imageURL: e.target.value})}
              placeholder="이미지 주소 붙여넣기 (생략 시 기본 이미지)"
              className="w-full p-4 bg-slate-800 rounded-2xl text-white font-bold outline-none focus:ring-2 ring-pink-500 border border-slate-700"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Description</label>
            <textarea 
              key="friend-desc-input"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="어떤 친구를 찾고 있는지 적어주세요."
              className="w-full p-4 bg-slate-800 rounded-2xl text-white font-bold h-32 outline-none focus:ring-2 ring-pink-500 border border-slate-700 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-4 mt-10">
          <button 
            onClick={onClose} 
            className="flex-1 py-5 bg-slate-800 text-slate-400 rounded-3xl font-black hover:bg-slate-700 transition-all uppercase text-xs"
          >
            Cancel
          </button>
          <button 
            onClick={onAddFriend} 
            className="flex-[2] py-5 bg-[#EC4899] text-white rounded-3xl font-black shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:bg-pink-600 transition-all uppercase text-xs"
          >
            Submit Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default FriendModal;