import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ShoppingBag, Target, User, type LucideIcon } from 'lucide-react';
import { ICON_SIZE } from './categoryIcons';

export type BottomNavTab = 'home' | 'missions' | 'shop' | 'mypage';

// 기존 페이지들의 하단 GNB와 같은 구조/경로 (홈·미션·상점·마이페이지)
const NAV_ITEMS: { key: BottomNavTab; label: string; path: string; icon: LucideIcon }[] = [
  { key: 'home', label: '홈', path: '/dashboard', icon: Home },
  { key: 'missions', label: '미션', path: '/missions', icon: Target },
  { key: 'shop', label: '상점', path: '/shop', icon: ShoppingBag },
  { key: 'mypage', label: '마이페이지', path: '/mypage', icon: User },
];

/** 하단 고정 GNB. 현재 탭은 그린으로 강조하고 이동하지 않음 */
export const BottomNav: React.FC<{ active: BottomNavTab }> = ({ active }) => {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 flex justify-around py-2.5 z-20">
      {NAV_ITEMS.map(({ key, label, path, icon: Icon }) => {
        const current = key === active;
        return (
          <div
            key={key}
            onClick={current ? undefined : () => navigate(path)}
            className={`flex flex-col items-center cursor-pointer ${current ? 'text-[#59B985]' : 'text-gray-400'}`}
          >
            <Icon size={ICON_SIZE.nav} />
            <span className={`text-[10px] mt-0.5 ${current ? 'font-bold' : ''}`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
};
