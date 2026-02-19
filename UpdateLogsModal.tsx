import React from 'react';

interface UpdateLog {
  date: string;
  content: string;
}

interface UpdateLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: UpdateLog[];
}

const UpdateLogsModal: React.FC<UpdateLogsModalProps> = ({ isOpen, onClose, logs }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-[56px] p-10 lg:p-16 max-w-4xl w-full max-h-[85vh] shadow-2xl relative flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-10 right-10 text-slate-500 hover:text-white transition-colors text-2xl">✕</button>
        <h3 className="text-4xl lg:text-5xl font-black italic text-white mb-10 border-l-4 border-[#EC4899] pl-6 uppercase tracking-tighter">Town Hub History</h3>
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-4">
           {logs.map((log, idx) => (
             <div key={idx} className="flex flex-col md:flex-row md:items-center gap-4 p-8 bg-slate-800/40 rounded-[32px] border border-slate-800 hover:border-slate-700 transition-all">
                <div className="md:w-32 shrink-0"><span className="text-[#EC4899] font-black font-mono text-xs uppercase tracking-widest">{log.date}</span></div>
                <div className="flex-1"><span className="text-slate-200 text-lg font-bold leading-snug">{log.content}</span></div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default UpdateLogsModal;