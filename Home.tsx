import React from 'react';

interface UpdateLog {
  date: string;
  content: string;
}

interface HomeProps {
  onStart: () => void;
  updateLogs: UpdateLog[];
  isLogsLoading: boolean;
  onViewAllLogs: () => void;
  onPolicyClick: (type: 'TERMS' | 'PRIVACY' | 'DISCLAIMER') => void;
}

const BmcButton: React.FC = () => (
  <button 
    onClick={() => window.open('https://www.buymeacoffee.com/hippoo0927c', '_blank')}
    className="w-full py-4 bg-[#FFDD00] text-[#000000] rounded-2xl font-black text-xs uppercase tracking-tight shadow-xl hover:bg-[#FFC400] active:scale-95 transition-all flex items-center justify-center gap-2"
  >
    <span className="text-lg">☕</span>
    <span>Buy me a coffee</span>
  </button>
);

const Home: React.FC<HomeProps> = ({ onStart, updateLogs, isLogsLoading, onViewAllLogs, onPolicyClick }) => {
  return (
    <div className="min-h-full flex flex-col pt-10 lg:pt-32 pb-20 px-6 lg:px-20 overflow-y-auto custom-scrollbar no-scrollbar">
      <div className="max-w-7xl mx-auto w-full flex-1">
        <div className="text-center mb-24 space-y-10 animate-in fade-in duration-1000">
          <div className="inline-block px-6 py-2 bg-pink-500/10 border border-pink-500/20 rounded-full text-pink-500 font-black text-[11px] tracking-[0.4em] uppercase mb-4 shadow-xl">Open Beta Version</div>
          <h2 className="text-5xl lg:text-[140px] font-black italic tracking-tighter text-white leading-[0.85]">TOWN <span className="text-[#EC4899]">SQUARE</span><br/><span className="text-slate-700">ART STUDIO</span></h2>
          <p className="text-slate-400 text-lg lg:text-3xl font-medium max-w-3xl mx-auto leading-relaxed">상상을 현실로 만드는 가장 완벽한 방법.<br/><span className="text-white">Town Hub의 정밀한 픽셀 엔진</span>을 지금 경험해보세요.</p>
          <div className="flex flex-col items-center gap-8 mt-14">
            <button onClick={onStart} className="px-16 py-8 bg-[#EC4899] text-white rounded-[40px] lg:rounded-[60px] font-black text-2xl lg:text-4xl hover:scale-105 transition-all shadow-[0_0_80px_rgba(236,72,153,0.4)] transform active:scale-95 group relative overflow-hidden"><span className="relative z-10">스튜디오 시작하기</span><div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" /></button>
            <div className="lg:hidden w-full max-w-[320px]"><BmcButton /></div>
          </div>
        </div>
        
        <div className="mt-48 grid lg:grid-cols-2 gap-24 border-t border-slate-900 pt-32">
          <div className="space-y-16">
            <h3 className="text-4xl lg:text-5xl font-black text-white italic flex items-center gap-6"><span className="w-16 h-1 bg-[#EC4899]"></span> FAQ</h3>
            <div className="space-y-12">
              <div className="group bg-slate-900/20 p-8 rounded-[40px] border border-slate-900 hover:border-pink-500/20 transition-all"><h4 className="text-[#EC4899] font-black text-2xl mb-5 group-hover:translate-x-2 transition-transform">Q. 이미지가 초록색/왜곡되어 보입니다.</h4><p className="text-slate-400 text-xl leading-relaxed font-medium">Town Hub는 Redmean 색차 공식을 적용하고 파란색 가중치를 강화했습니다. 원본 이미지의 대비가 강할수록 더욱 정확한 매핑이 이루어집니다.</p></div>
              <div className="group bg-slate-900/20 p-8 rounded-[40px] border border-slate-900 hover:border-pink-500/20 transition-all"><h4 className="text-[#EC4899] font-black text-2xl mb-5 group-hover:translate-x-2 transition-transform">Q. 저장되는 ZIP 파일에는 무엇이 있나요?</h4><p className="text-slate-400 text-xl leading-relaxed font-medium">그리드 사이즈로 분할된 가이드 이미지(좌표 및 5x5 보조선 포함)와 전체 원본 픽셀 데이터가 압축되어 제공됩니다.</p></div>
            </div>
          </div>
          
          <div className="space-y-16">
            <div className="flex items-center justify-between">
              <h3 onClick={onViewAllLogs} className="text-4xl lg:text-5xl font-black text-white italic flex items-center gap-6 cursor-pointer hover:text-[#EC4899] transition-colors group">
                <span className="w-16 h-1 bg-[#EC4899]"></span> LATEST UPDATES
                <span className="text-sm not-italic font-bold text-slate-600 group-hover:translate-x-2 transition-transform">View All ➔</span>
              </h3>
            </div>
            <div className="space-y-6">
              {isLogsLoading ? (
                <div className="p-10 bg-slate-900/20 rounded-[40px] border border-slate-900 text-slate-500 font-black italic text-xl animate-pulse">업데이트 내역을 불러오는 중입니다...</div>
              ) : updateLogs.length > 0 ? (
                updateLogs.slice(0, 3).map((log, idx) => (
                  <div key={idx} className="flex items-start gap-5 p-8 bg-slate-900/30 rounded-[40px] border border-slate-900 hover:border-[#EC4899]/30 transition-all group">
                    <span className="text-3xl mt-1">🚀</span>
                    <div className="flex flex-col"><span className="text-[#EC4899] font-black font-mono text-sm tracking-tighter uppercase mb-1">{log.date}</span><span className="text-slate-200 text-xl font-bold group-hover:text-white transition-colors">{log.content}</span></div>
                  </div>
                ))
              ) : (
                <div className="p-10 bg-slate-900/20 rounded-[40px] border border-slate-900 text-slate-600 italic text-xl">업데이트 내역을 불러올 수 없습니다.</div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-48 bg-gradient-to-br from-slate-900/50 to-transparent p-12 lg:p-24 rounded-[80px] border border-slate-900">
           <h3 className="text-4xl lg:text-6xl font-black text-white italic mb-20">Art Studio <span className="text-[#EC4899]">Guide & Tips</span></h3>
           <div className="grid md:grid-cols-2 gap-16 lg:gap-24">
              <div className="space-y-6 group"><div className="text-5xl lg:text-6xl mb-4 group-hover:scale-110 transition-transform">💡</div><h5 className="text-2xl lg:text-3xl font-black text-white italic">01. 선명도를 높이는 대비 조절</h5><p className="text-slate-400 text-lg lg:text-xl leading-relaxed">원본 이미지의 <span className="text-white font-bold">대비(Contrast)를 높여보세요.</span> 파란색 왜곡 방지 로직과 시너지를 일으켜 훨씬 뚜렷한 도안이 생성됩니다.</p></div>
              <div className="space-y-6 group"><div className="text-5xl lg:text-6xl mb-4 group-hover:scale-110 transition-transform">🎨</div><h5 className="text-2xl lg:text-3xl font-black text-white italic">02. 5x5 그리드 가이드 활용</h5><p className="text-slate-400 text-lg lg:text-xl leading-relaxed">워크스페이스와 내보내기 파일에는 <span className="text-[#EC4899] font-bold">5x5 단위 보조선</span>이 포함되어 있습니다. 인게임에서 픽셀을 찍을 때 훨씬 빠르고 정확하게 카운팅이 가능합니다.</p></div>
              <div className="space-y-6 group"><div className="text-5xl lg:text-6xl mb-4 group-hover:scale-110 transition-transform">✍️</div><h5 className="text-2xl lg:text-3xl font-black text-white italic">03. 텍스트 레이어의 지혜</h5><p className="text-slate-400 text-lg lg:text-xl leading-relaxed">이미지에 포함된 글자는 뭉개질 확률이 높습니다. 별도로 <span className="text-white font-bold">텍스트 레이어</span>를 추가하여 깔끔한 가독성을 확보하세요.</p></div>
              <div className="space-y-6 group"><div className="text-5xl lg:text-6xl mb-4 group-hover:scale-110 transition-transform">🔍</div><h5 className="text-2xl lg:text-3xl font-black text-white italic">04. 세부 디테일 검토</h5><p className="text-slate-400 text-lg lg:text-xl leading-relaxed">변환 직후 팔레트 목록에서 각 색상의 비중을 확인하세요. 5x5 단위로 픽셀을 찍어 내려가며 도안을 완성하세요.</p></div>
           </div>
        </div>
      </div>
      
      <footer className="mt-64 border-t border-slate-900 pt-32 pb-20">
        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-3 gap-24">
          <div className="space-y-8"><h4 className="text-white font-black italic text-3xl tracking-tighter">TOWN HUB</h4><p className="text-slate-500 text-xl leading-relaxed font-medium">Town Hub는 두근두근타운 유저들을 위한 비영리 팬 메이드 서비스입니다.</p></div>
          <div className="space-y-8 text-slate-500 text-xl"><h4 className="text-white font-black italic text-3xl uppercase tracking-tighter">Policy</h4><ul className="space-y-4 font-bold"><li onClick={() => onPolicyClick('TERMS')} className="hover:text-white cursor-pointer transition-colors">이용약관</li><li onClick={() => onPolicyClick('PRIVACY')} className="hover:text-white cursor-pointer transition-colors text-[#EC4899]">개인정보처리방침</li><li onClick={() => onPolicyClick('DISCLAIMER')} className="hover:text-white cursor-pointer transition-colors">면책사항</li></ul></div>
          <div className="space-y-8 text-slate-500 text-xl"><h4 className="text-white font-black italic text-3xl uppercase tracking-tighter">Contact</h4><div className="space-y-4 font-medium"><p className="flex items-center gap-4 hover:text-white transition-colors cursor-pointer font-bold">📧 hyuneitv@gmail.com</p><p className="opacity-40">© 2026 Town Hub Studio.</p></div></div>
        </div>
        <div className="mt-20 flex justify-center lg:hidden w-full max-w-[320px] mx-auto"><BmcButton /></div>
      </footer>
    </div>
  );
};

export default Home;