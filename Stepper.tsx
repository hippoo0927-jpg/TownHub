import React from 'react';
import { AppStep, StudioMode } from './types';

interface StepperProps {
  step: AppStep;
  studioMode: StudioMode;
}

const Stepper: React.FC<StepperProps> = ({ step, studioMode }) => {
  const steps: { key: AppStep; label: string }[] = [
    { key: 'MODE_SELECT', label: '모드 선택' },
    ...(studioMode === 'PATTERN' ? [{ key: 'SETUP' as AppStep, label: '규격 설정' }] : []),
    { key: 'UPLOAD', label: '업로드' },
    { key: 'FRAME', label: '레이아웃' },
    ...(studioMode === 'BOOK_COVER' ? [{ key: 'TEXT' as AppStep, label: '텍스트' }] : []),
    { key: 'EDITOR', label: '완성' }
  ];
  const currentIdx = steps.findIndex(s => s.key === step);
  return (
    <div className="flex items-center justify-center w-full max-w-4xl mx-auto px-4 py-6">
      {steps.map((s, i) => (
        <React.Fragment key={s.key}>
          <div className="flex flex-col items-center relative">
            <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center font-black text-xs transition-all duration-500 ${i <= currentIdx ? 'bg-[#EC4899] text-white shadow-[0_0_15px_rgba(236,72,153,0.5)] scale-110' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>{i < currentIdx ? '✓' : i + 1}</div>
            <span className={`absolute -bottom-6 whitespace-nowrap text-[10px] lg:text-[11px] font-bold tracking-tighter ${i <= currentIdx ? 'text-[#EC4899]' : 'text-slate-600'}`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (<div className={`flex-1 h-[2px] mx-2 lg:mx-4 transition-all duration-1000 ${i < currentIdx ? 'bg-[#EC4899]' : 'bg-slate-800'}`} />)}
        </React.Fragment>
      ))}
    </div>
  );
};

export default Stepper;