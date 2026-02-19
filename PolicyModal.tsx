import React from 'react';

type PolicyType = 'TERMS' | 'PRIVACY' | 'DISCLAIMER' | null;

interface PolicyModalProps {
  activePolicy: PolicyType;
  onClose: () => void;
}

const PolicyModal: React.FC<PolicyModalProps> = ({ activePolicy, onClose }) => {
  // 1. activePolicy 상태가 없으면 렌더링하지 않음
  if (!activePolicy) return null;

  const contentMap = {
    TERMS: { 
      title: "이용약관", 
      text: "본 서비스를 통해 생성된 모든 결과물의 저작권 책임은 전적으로 사용자에게 있습니다. 사용자는 업로드하는 이미지가 타인의 저작권을 침해하지 않음을 보증해야 하며, 본 서비스는 결과물 사용으로 인해 발생하는 어떠한 저작권 분쟁이나 법적 문제에도 책임을 지지 않습니다. 또한, 시스템 오류나 브라우저 환경에 따른 데이터 손실 또는 결과물의 부정확성에 대해 본 서비스는 일체의 책임을 지지 않음을 명시합니다." 
    },
    PRIVACY: { 
      title: "개인정보 처리방침", 
      text: `Town Square(이하 '본 서비스')는 사용자의 개인정보를 소중히 여기며, 개인정보보호법 및 관련 법령을 준수합니다.

1. 개인정보의 수집 및 이용 (Google 로그인)
본 서비스는 구글(Google) 인증 서비스를 통해 안전한 로그인 및 유저 식별 기능을 제공하며, 사용자의 동의 하에 최소한의 정보를 수집합니다.
• 수집 항목: 이름(닉네임), 구글 이메일 주소, 프로필 이미지 URL
• 이용 목적: 사용자 본인 식별, 커뮤니티(디스코드 및 친구 등록) 서비스 제공, 중복 신청 방지
• 보유 기간: 사용자의 회원 탈퇴 요청 시 또는 서비스 종료 시까지 (목적 달성 후 즉시 파기)

2. 이미지 데이터 보호 정책 (Local Processing)
본 서비스는 '개인정보 최소화' 원칙에 따라 사용자가 업로드한 이미지를 서버로 전송하거나 별도의 데이터베이스에 저장하지 않습니다.
• 모든 이미지 변환 및 픽셀 추출 작업은 사용자의 브라우저 메모리 내(Local)에서만 수행됩니다.
• 작업 중인 데이터는 브라우저 종료 시 휘발되며 외부로 유출되지 않습니다.

3. 제3자 서비스 및 분석 도구 활용
서비스 품질 향상 및 맞춤형 환경 제공을 위해 다음의 글로벌 솔루션을 활용합니다.
• 분석 및 광고: Google Analytics 4(GA4), Google Tag Manager(GTM), Google AdSense
• 쿠키(Cookie) 활용: 서비스 방문 통계 분석 및 맞춤형 광고 노출을 위해 쿠키가 사용될 수 있으며, 사용자는 브라우저 설정을 통해 이를 거부할 수 있습니다.

4. 개인정보 보호 문의
본 서비스는 사용자의 권리를 존중합니다. 개인정보와 관련한 문의나 계정 데이터 삭제 요청은 고객지원팀을 통해 처리하실 수 있습니다.`
    },
    DISCLAIMER: { 
      title: "면책사항", 
      text: "본 변환 결과는 원본 이미지에 따라 실제 인게임 결과와 차이가 발생할 수 있습니다. 시스템의 보정 로직은 완벽한 정확성을 보장하지 않으며, 사용자는 도안 제작 전 최종 검토를 수행해야 합니다. 서비스 이용 중 발생하는 데이터 손실에 대해서는 복구가 불가능할 수 있음을 알려드립니다." 
    }
  };

  // 현재 선택된 정책 데이터 가져오기
  const current = contentMap[activePolicy as keyof typeof contentMap];

  return (
    <div 
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" 
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-[48px] p-10 lg:p-16 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-300" 
        onClick={e => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button 
          onClick={onClose} 
          className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors text-2xl p-2"
        >
          ✕
        </button>

        {/* 제목 */}
        <h3 className="text-3xl lg:text-4xl font-black italic text-white mb-8 border-l-4 border-[#EC4899] pl-6 uppercase tracking-tighter shrink-0">
          {current.title}
        </h3>

        {/* 본문 (스크롤 가능 영역) */}
        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
          <p className="text-slate-400 text-lg lg:text-xl leading-relaxed whitespace-pre-wrap font-medium">
            {current.text}
          </p>
        </div>

        {/* 하단 버튼 */}
        <button 
          onClick={onClose} 
          className="mt-12 w-full py-5 bg-white text-slate-900 rounded-3xl font-black text-lg hover:bg-[#EC4899] hover:text-white transition-all shrink-0"
        >
          확인했습니다
        </button>
      </div>
    </div>
  );
};

export default PolicyModal;