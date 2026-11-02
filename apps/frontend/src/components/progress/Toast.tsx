import React, { useEffect, useEffectEvent } from 'react';
import { ShieldCheck } from 'lucide-react';

/**
 * 짧은 알림 (UI 13 복구 완료 안내 등)
 * 하단 메뉴 위에 2.5초 표시 후 사라짐. 다시 띄우려면 부모에서 key를 바꾼다.
 */
export const Toast: React.FC<{ message: string; onClose: () => void; duration?: number; icon?: React.ReactNode }> = ({
  message,
  onClose,
  duration = 2500,
  icon,
}) => {
  // 부모가 다시 그려져도 타이머가 처음부터 다시 시작되지 않도록 onClose는 effect 의존성에서 분리
  const close = useEffectEvent(() => onClose());
  useEffect(() => {
    const timer = setTimeout(() => close(), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-gray-800/95 px-4 py-2.5 text-[13px] font-bold text-white shadow-lg animate-fb-toast"
      >
        {icon ?? <ShieldCheck size={16} className="text-[#DDF3E8]" aria-hidden="true" />}
        {message}
      </div>
    </div>
  );
};
