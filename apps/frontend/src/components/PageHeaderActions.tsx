import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, LogOut, Menu, ShoppingBag, Target, UserRound, UserRoundPen, X, type LucideIcon } from 'lucide-react';
import { readProfile, saveLoginUser } from '../lib/profileStorage';
import { mockProgressServer } from '../mocks/mockProgressServer';
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
  const [panel, setPanel] = useState<'navigation' | 'account' | null>(null);
  const profile = readProfile();

  const close = () => setPanel(null);
  const go = (path: string) => {
    close();
    navigate(path);
  };

  const signOut = () => {
    localStorage.removeItem('token');
    saveLoginUser(null);
    mockProgressServer.setAccount(null);
    close();
    navigate('/');
  };

  return (
    <>
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="메뉴 열기"
              title="메뉴"
              onClick={() => setPanel('navigation')}
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
          <button
            type="button"
            aria-label="계정 메뉴 열기"
            title="계정"
            onClick={() => setPanel('account')}
            className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            <UserRound size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      {panel && (
        <div className="fixed inset-0 z-50" role="presentation">
          <button type="button" aria-label="메뉴 닫기" onClick={close} className="absolute inset-0 bg-black/35" />
          <section
            role="dialog"
            aria-modal="true"
            aria-label={panel === 'navigation' ? '페이지 메뉴' : '계정 메뉴'}
            className={`absolute inset-y-0 ${panel === 'navigation' ? 'left-0' : 'right-0'} w-[min(84vw,340px)] bg-white shadow-xl p-5 flex flex-col gap-5`}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <p className="text-base font-bold text-gray-900">{panel === 'navigation' ? 'FitBuddy' : profile.nickname}</p>
                <p className="mt-0.5 text-xs text-gray-500">{panel === 'navigation' ? '이동할 화면 선택' : profile.userId}</p>
              </div>
              <button type="button" onClick={close} aria-label="닫기" className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-gray-100">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {panel === 'navigation' ? (
              <nav className="space-y-1">
                {LINKS.map(({ label, path, Icon }) => {
                  const active = location.pathname === path;
                  return (
                    <button
                      key={path}
                      type="button"
                      onClick={() => go(path)}
                      aria-current={active ? 'page' : undefined}
                      className={`w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold ${active ? 'bg-emerald-50 text-emerald-800' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      <Icon size={18} aria-hidden="true" />
                      {label}
                    </button>
                  );
                })}
              </nav>
            ) : (
              <div className="space-y-2">
                <button type="button" onClick={() => go('/mypage/profile')} className="w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  <UserRoundPen size={18} aria-hidden="true" />프로필 수정
                </button>
                <button type="button" onClick={signOut} className="w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50">
                  <LogOut size={18} aria-hidden="true" />로그아웃
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
};