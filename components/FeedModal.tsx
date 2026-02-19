import React, { useState, useRef } from 'react';

interface FeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onSubmit: (data: { title: string; content: string; mediaUrls: string[]; mediaType: string; category: string; tags: string[]; isEditorPick: boolean }) => void;
}

const CATEGORIES = ["🎨 갤러리", "📚 꿀팁/강좌", "🤝 파티모집"];

const FeedModal: React.FC<FeedModalProps> = ({ isOpen, onClose, isAdmin, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    mediaUrls: [] as string[],
    mediaType: "none",
    category: CATEGORIES[0],
    tagsString: "",
    isEditorPick: false
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      const uploadedUrls: string[] = [...formData.mediaUrls];
      let primaryType = formData.mediaType;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fd = new FormData();
        fd.append('file', file);
        fd.append('upload_preset', 'town_hub_preset');
        
        const res = await fetch('https://api.cloudinary.com/v1_1/duhiasxcm/image/upload', { 
          method: 'POST', 
          body: fd 
        });
        
        if (res.ok) {
          const data = await res.json();
          uploadedUrls.push(data.secure_url);
          if (primaryType === 'none') {
            primaryType = data.resource_type === 'video' ? 'video' : 'image';
          }
        }
      }

      setFormData({ 
        ...formData, 
        mediaUrls: uploadedUrls, 
        mediaType: primaryType 
      });
      alert(`${files.length}개의 파일 업로드 시도 완료!`);
    } catch (e) {
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeMedia = (index: number) => {
    const newUrls = [...formData.mediaUrls];
    newUrls.splice(index, 1);
    setFormData({ 
      ...formData, 
      mediaUrls: newUrls,
      mediaType: newUrls.length === 0 ? 'none' : formData.mediaType
    });
  };

  const handleFormSubmit = () => {
    if (!formData.title.trim() || !formData.content.trim()) return alert("제목과 내용을 입력해주세요.");
    const tags = formData.tagsString.split(',').map(t => t.trim()).filter(t => t !== "");
    onSubmit({
      ...formData,
      tags,
      mediaType: formData.mediaType as any
    });
    setFormData({ title: "", content: "", mediaUrls: [], mediaType: "none", category: CATEGORIES[0], tagsString: "", isEditorPick: false });
  };

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-8 lg:p-12 max-w-2xl w-full shadow-2xl my-8 animate-in zoom-in-95 duration-300">
        <h3 className="text-3xl font-black text-white mb-8 italic uppercase tracking-tighter text-center">Create New Feed</h3>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Category</label>
               <select 
                 value={formData.category}
                 onChange={e => setFormData({...formData, category: e.target.value})}
                 className="w-full p-4 bg-slate-800 rounded-2xl text-white font-bold outline-none border border-slate-700 appearance-none cursor-pointer"
               >
                 {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
             </div>
             <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Media Upload</label>
               <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full p-4 bg-slate-800 rounded-2xl text-slate-300 font-black text-xs border border-slate-700 hover:border-pink-500 transition-all">
                 {isUploading ? 'Uploading...' : 'Add Images/Videos'}
               </button>
               <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileChange} />
             </div>
          </div>

          {/* 업로드된 미디어 미리보기 */}
          {formData.mediaUrls.length > 0 && (
            <div className="flex gap-2 overflow-x-auto p-2 bg-slate-800/50 rounded-2xl custom-scrollbar">
              {formData.mediaUrls.map((url, idx) => (
                <div key={idx} className="relative w-20 h-20 shrink-0 group">
                  <img src={url} className="w-full h-full object-cover rounded-xl border border-slate-700" alt="Preview" />
                  <button 
                    onClick={() => removeMedia(idx)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >✕</button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Post Title</label>
            <input 
              type="text"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              placeholder="제목을 입력하세요"
              className="w-full p-4 bg-slate-800 rounded-2xl text-white font-bold outline-none focus:ring-2 ring-pink-500 border border-slate-700"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Content</label>
            <textarea 
              value={formData.content}
              onChange={e => setFormData({...formData, content: e.target.value})}
              placeholder="당신의 작품이나 꿀팁을 공유해보세요. (최대 500자)"
              maxLength={500}
              className="w-full p-4 bg-slate-800 rounded-2xl text-white font-bold h-40 outline-none focus:ring-2 ring-pink-500 border border-slate-700 resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Tags (Comma separated)</label>
            <input 
              type="text"
              value={formData.tagsString}
              onChange={e => setFormData({...formData, tagsString: e.target.value})}
              placeholder="pixel, town, tips..."
              className="w-full p-4 bg-slate-800 rounded-2xl text-white font-bold outline-none border border-slate-700"
            />
          </div>

          {isAdmin && (
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={formData.isEditorPick} 
                onChange={e => setFormData({...formData, isEditorPick: e.target.checked})}
                className="w-5 h-5 accent-pink-500 bg-slate-800 border-slate-700" 
              />
              <span className="text-xs font-black text-slate-400 group-hover:text-pink-500 uppercase italic">Register as Notice (Editor Pick)</span>
            </label>
          )}
        </div>

        <div className="flex gap-4 mt-10">
          <button onClick={onClose} className="flex-1 py-5 bg-slate-800 text-slate-400 rounded-3xl font-black hover:bg-slate-700 transition-all uppercase text-xs">Cancel</button>
          <button onClick={handleFormSubmit} className="flex-[2] py-5 bg-[#EC4899] text-white rounded-3xl font-black shadow-lg hover:bg-pink-600 transition-all uppercase text-xs">Post Now</button>
        </div>
      </div>
    </div>
  );
};

export default FeedModal;