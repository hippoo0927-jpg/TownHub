import React from 'react';

interface FriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  inputValue: string;
  onInputChange: (val: string) => void;
  onAddFriend: () => void;
}

const FriendModal: React.FC<FriendModalProps> = ({ isOpen, onClose, inputValue, onInputChange, onAddFriend }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-10 max-w-md w-full text-center">
        <h3 className="text-2xl font-black text-white mb-4 italic uppercase tracking-tighter">Friends Community</h3>
        <p className="text-slate-400 mb-8 leading-relaxed text-sm">등록하실 친구의 닉네임을 정확하게 입력해주세요.</p>
        
        <input 
          key="friend-search-input"
          autoFocus
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="닉네임 입력"
          className="w-full p-4 bg-slate-800 rounded-2xl text-white font-bold mb-8 outline-none focus:ring-2 ring-pink-500 border border-slate-700"
          onKeyDown={(e) => e.key === 'Enter' && onAddFriend()}
        />

        <div className="flex gap-4">
          <button 
            onClick={onClose} 
            className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-xl font-bold hover:bg-slate-700 transition-all"
          >
            취소
          </button>
          <button 
            onClick={onAddFriend} 
            className="flex-[2] py-4 bg-[#EC4899] text-white rounded-xl font-black shadow-lg hover:bg-pink-600 transition-all"
          >
            등록하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default FriendModal;