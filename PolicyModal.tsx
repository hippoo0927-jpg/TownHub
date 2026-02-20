import React from 'react';

// 1. 타입을 정의합니다.
type PolicyType = 'TERMS' | 'PRIVACY' | 'DISCLAIMER' | null;

interface PolicyModalProps {
  activePolicy: PolicyType;
  onClose: () => void;
}

const PolicyModal: React.FC<PolicyModalProps> = ({ activePolicy, onClose }) => {
  // activePolicy가 없으면 아무것도 보여주지 않습니다.
  if (!activePolicy) return null;

  // 2. 각 타입에 맞는 실제 HTML 파일 경로를 매핑합니다.
  const linkMap = {
    TERMS: { title: "이용약관", url: "/terms.html" },
    PRIVACY: { title: "개인정보 처리방침", url: "/privacy.html" },
    DISCLAIMER: { title: "면책사항", url: "/disclaimer.html" }
  };

  const current = linkMap[activePolicy as keyof typeof linkMap];

  return (
    <div 
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" 
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-[48px] p-10 lg:p-16 max-w-xl w-full shadow-2xl relative animate-in zoom-in-95 duration-300 text-center" 
        onClick={e => e.stopPropagation()}
      >
        {/* 제목 */}
        <h3 className="text-3xl font-black text-white mb-6 uppercase tracking-tighter">
          {current.title}
        </h3>

        <p className="text-slate-400 text-lg mb-10 leading-relaxed">
          해당 내용은 공식 문서 페이지에서<br /> 더 자세하고 전문적으로 확인하실 수 있습니다.
        </p>

        {/* 핵심: 진짜 페이지로 이동하는 버튼 */}
        <div className="flex flex-col gap-4">
          <a 
            href={current.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full py-5 bg-[#EC4899] text-white rounded-3xl font-black text-xl hover:bg-[#DB2777] transition-all shadow-lg shadow-pink-500/20"
          >
            공식 문서 보기
          </a>
          
          <button 
            onClick={onClose} 
            className="w-full py-4 bg-slate-800 text-slate-400 rounded-3xl font-bold text-md hover:text-white transition-all"
          >
            돌아가기
          </button>
        </div>
      </div>
    </div>
  );
};

export default PolicyModal;