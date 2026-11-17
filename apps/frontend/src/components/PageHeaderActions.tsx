import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Menu, ShoppingBag, Target, UserRound, X, type LucideIcon } from 'lucide-react';
import { AccountMenu } from './AccountMenu';
import { FitPointChip } from './FitPointChip';

const LINKS = [
  { label: '홈', path: '/dashboard', Icon: Home },
  { label: '오늘의 미션', path: '/missions', Icon: Target },
  { label: '상점', path: '/shop', Icon: ShoppingBag },
  { label: '마이페이지', path: '/mypage', Icon: UserRound },
];

export const PageHeaderActions: React.FC<{ title: string; amount: number; TitleIcon?: LucideIcon }> = ({ title, amount, TitleIcon }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [navigationOpen, setNavigationOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="메뉴 열기"
              title="메뉴"
              onClick={() => setNavigationOpen(true)}
              className="w-9 h-9 inline-flex items-center justify-center rounded-full text-gray-700 hover:bg-gray-100"
            >
              <Menu size={19} aria-hidden="true" />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                {TitleIcon && <span className="w-6 h-6 rounded-lg bg-[#DDF3E8] text-[#2F8A5B] flex items-center justify-center"><TitleIcon size={15} aria-hidden="true" /></span>}
                <h1 className="text-base font-bold text-gray-800">{title}</h1>
              </div>
              <FitPointChip amount={amount} />
            </div>
          </div>
          <AccountMenu />
        </div>
      </header>

      {navigationOpen && (
        <div className="fixed inset-0 z-50" role="presentation">
          <button type="button" aria-label="메뉴 닫기" onClick={() => setNavigationOpen(false)} className="absolute inset-0 bg-black/35" />
          <section
            role="dialog"
            aria-modal="true"
            aria-label="페이지 메뉴"
            className="absolute inset-y-0 left-0 w-[min(84vw,340px)] bg-white shadow-xl p-5 flex flex-col gap-5"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <p className="text-base font-bold text-gray-900">FitBuddy</p>
                <p className="mt-0.5 text-xs text-gray-500">이동할 화면 선택</p>
              </div>
              <button type="button" onClick={() => setNavigationOpen(false)} aria-label="닫기" className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-gray-100">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <nav className="space-y-1">
              {LINKS.map(({ label, path, Icon }) => {
                const active = location.pathname === path;
                return (
                  <button
                    key={path}
                    type="button"
                    onClick={() => {
                      setNavigationOpen(false);
                      navigate(path);
                    }}
                    aria-current={active ? 'page' : undefined}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold ${active ? 'bg-emerald-50 text-emerald-800' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <Icon size={18} aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </nav>
          </section>
        </div>
      )}
    </>
  );
};