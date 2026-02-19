import React, { useState, useRef } from 'react';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

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
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이미지 파일인지 확인
    if (!file.type.startsWith('image/')) {
      alert("이미지 파일만 업로드 가능합니다.");
      return;
    }

    // 용량 제한 (예: 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("파일 크기는 5MB 이하여야 합니다.");
      return;
    }

    try {
      setIsUploading(true);
      const storage = getStorage();
      const storageRef = ref(storage, `profiles/${Date.now()}_${file.name}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      setFormData({ ...formData, imageURL: downloadURL });
      alert("이미지 업로드 완료!");
    } catch (error) {
      console.error("Upload error:", error);
      alert("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

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
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Character Photo</label>
            <div className="flex flex-col gap-3">
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={`w-full p-4 rounded-2xl font-bold border-2 border-dashed transition-all flex items-center justify-center gap-2 ${
                  isUploading 
                    ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed' 
                    : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-pink-500 hover:text-white'
                }`}
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-t-pink-500 border-slate-600 rounded-full animate-spin"></div>
                    <span>업로드 중...</span>
                  </>
                ) : (
                  <>
                    <span>{formData.imageURL ? '이미지 변경하기' : '이미지 파일 선택'}</span>
                  </>
                )}
              </button>
              {formData.imageURL && !isUploading && (
                <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-700 mx-auto">
                  <img src={formData.imageURL} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
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
            disabled={isUploading}
            className={`flex-[2] py-5 text-white rounded-3xl font-black shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all uppercase text-xs ${
              isUploading ? 'bg-pink-500/50 cursor-not-allowed' : 'bg-[#EC4899] hover:bg-pink-600'
            }`}
          >
            {isUploading ? 'Uploading...' : 'Submit Profile'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FriendModal;