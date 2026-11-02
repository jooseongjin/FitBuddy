import React from 'react';

/** mock API 사용 중일 때 정책 값 옆에 붙이는 "임시 값" 표시 (실제 정책처럼 보이지 않도록) */
export const MockTag: React.FC<{ show: boolean; label?: string }> = ({ show, label = '임시 값' }) =>
  show ? (
    <span
      title="백엔드와 협의 전 화면 확인용 예시 값이에요"
      className="inline-flex items-center shrink-0 text-[10px] font-bold px-1.5 py-px rounded-md bg-amber-50 text-amber-700 border border-dashed border-amber-300 leading-tight"
    >
      {label}
    </span>
  ) : null;
