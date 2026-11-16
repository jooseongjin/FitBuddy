import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, LogIn, LogOut } from 'lucide-react';
import { CharacterAvatar } from './CharacterAvatar';
import { GuidePanel } from './GuidePanel';
import { logout, readAuthState } from '../lib/accountSession';
import { displayName } from '../lib/profileStorage';

/**
 * 상단 오른쪽 캐릭터 메뉴 (상점·마이페이지 공용)
 * - 버튼: 지금 캐릭터 + 실제 착용 아이템 + 적용 배경 아바타
 * - 메뉴: 현재 계정 정보, [이용 가이드](질문 패널 열기), 로그인했으면 [로그아웃] / 아니면 [로그인]
 * 계정 정보는 실제 로그인 상태(토큰) 기준. 비회원 체험 경로가 따로 없어 '체험 중' 같은 문구는 쓰지 않음
 */
export const AccountMenu: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [auth, setAuth] = useState(readAuthState);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // 열 때마다 최신 인증 상태로
  const toggle = () => {
    if (!open) setAuth(readAuthState());
    setOpen((value) => !value);
  };

  const openGuide = () => {
    setOpen(false);
    setGuideOpen(true);
  };

  const closeGuide = useCallback(() => {
    setGuideOpen(false);
    buttonRef.current?.focus();
  }, []);

  // 바깥 클릭·Esc로 메뉴 닫기
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label="캐릭터 메뉴 (계정·이용 가이드·로그인·로그아웃)"
        aria-haspopup="menu"
        aria-expanded={open}
        className="block rounded-full cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#59B985]"
      >
        <CharacterAvatar className="w-9 h-9" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="캐릭터 메뉴"
          className="absolute right-0 top-11 z-50 w-60 rounded-2xl bg-white border border-gray-100 shadow-xl overflow-hidden animate-fb-fade-in"
        >
          {/* 현재 계정 */}
          <div className="flex items-center gap-2.5 p-3.5 border-b border-gray-100">
            <CharacterAvatar className="w-11 h-11" />
            <div className="min-w-0">
              {auth.loggedIn ? (
                <>
                  <p className="text-sm font-bold text-gray-800 truncate">{displayName(auth.nickname)}</p>
                  <p className="text-xs text-gray-500 truncate">@{auth.userId}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-gray-800">로그인하지 않았어요</p>
                  <p className="text-xs text-gray-500">로그인하면 내 계정으로 이용할 수 있어요</p>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={openGuide}
            className="w-full flex items-center gap-2 px-3.5 py-3 text-left text-[13px] font-bold text-gray-700 cursor-pointer hover:bg-gray-50"
          >
            <BookOpen size={16} className="text-[#2F8A5B]" aria-hidden="true" />
            이용 가이드
          </button>
          {auth.loggedIn ? (
            <button
              type="button"
              role="menuitem"
              onClick={logout}
              className="w-full flex items-center gap-2 px-3.5 py-3 text-left text-[13px] font-bold text-gray-700 border-t border-gray-100 cursor-pointer hover:bg-gray-50"
            >
              <LogOut size={16} className="text-gray-400" aria-hidden="true" />
              로그아웃
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              onClick={() => navigate('/')}
              className="w-full flex items-center gap-2 px-3.5 py-3 text-left text-[13px] font-bold text-[#2F8A5B] border-t border-gray-100 cursor-pointer hover:bg-gray-50"
            >
              <LogIn size={16} aria-hidden="true" />
              로그인
            </button>
          )}
        </div>
      )}

      {guideOpen && <GuidePanel onClose={closeGuide} />}
    </div>
  );
};
