import React, { useState } from 'react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetNickname: string;
  onConfirm: (reason: string, detail: string) => void;
}

const REPORT_REASONS = ["도배/스팸", "부적절한 닉네임", "욕설/비방", "허위 정보", "저작권 침해", "기타"];

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, targetNickname, onConfirm }) => {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [detail, setDetail] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!detail.trim()) return alert("상세 내용을 입력해주세요.");
    onConfirm(reason, detail);
    setDetail("");
  };

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-300">
        <h3 className="text-3xl font-black text-white mb-2 italic uppercase tracking-tighter text-center">Report User</h3>
        <p className="text-center text-slate-500 text-sm mb-8">대상: <span className="text-pink-500 font-bold">{targetNickname}</span></p>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">신고 사유 선택</label>
            <select 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-4 bg-slate-800 rounded-2xl text-white font-bold outline-none focus:ring-2 ring-red-500 border border-slate-700 appearance-none cursor-pointer"
            >
              {REPORT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">상세 내용 (필수)</label>
            <textarea 
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="신고 사유를 구체적으로 적어주세요."
              className="w-full p-4 bg-slate-800 rounded-2xl text-white font-bold h-32 outline-none focus:ring-2 ring-red-500 border border-slate-700 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-4 mt-10">
          <button onClick={onClose} className="flex-1 py-5 bg-slate-800 text-slate-400 rounded-3xl font-black hover:bg-slate-700 transition-all uppercase text-xs">Cancel</button>
          <button onClick={handleSubmit} className="flex-[2] py-5 bg-red-600 text-white rounded-3xl font-black shadow-lg hover:bg-red-700 transition-all uppercase text-xs">Submit Report</button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;