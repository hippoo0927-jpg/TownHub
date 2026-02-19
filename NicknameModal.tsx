import React from 'react';

interface NicknameModalProps {
  isOpen: boolean;
  value: string;
  onChange: (val: string) => void;
  onSave: () => void;
}

const NicknameModal: React.FC<NicknameModalProps> = ({ isOpen, value, onChange, onSave }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-10 max-w-md w-full text-center">
        <h3 className="text-3xl font-black text-white mb-6 italic">WELCOME!</h3>
        <p className="text-slate-400 mb-8">사용하실 닉네임을 설정해주세요.</p>
        <input 
          key="nickname-input"
          autoFocus
          type="text" 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          className="w-full p-5 bg-slate-800 rounded-2xl text-white font-bold mb-6 outline-none focus:ring-2 ring-pink-500" 
          placeholder="닉네임 입력 (최대 10자)" 
          maxLength={10} 
        />
        <button onClick={onSave} className="w-full py-5 bg-pink-500 text-white rounded-2xl font-black hover:bg-pink-600 transition-all">시작하기</button>
      </div>
    </div>
  );
};

export default NicknameModal;