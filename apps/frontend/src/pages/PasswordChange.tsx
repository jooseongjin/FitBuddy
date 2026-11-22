import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, CircleAlert, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { changePassword } from '../api/accountApi';
import { ApiError } from '../api/progressTypes';
import { readAuthState } from '../lib/accountSession';

// 비밀번호 변경 — 마이페이지 > 프로필 [수정] > 보안 > 비밀번호 변경
// 비밀번호는 화면 상태에만 두고 브라우저에 저장하지 않는다. 서버(PUT /auth/password)가 현재 비밀번호를 확인하고 바꾼다.

const MIN_LENGTH = 8; // 회원가입 규칙과 같음

const PasswordField: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  invalid?: boolean;
}> = ({ id, label, value, onChange, autoComplete, invalid }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-bold text-gray-500">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={invalid}
          className={`w-full rounded-xl border bg-white pl-3.5 pr-11 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#59B985]/40 ${
            invalid ? 'border-rose-400' : 'border-gray-200'
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `${label} 숨기기` : `${label} 보기`}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-400 cursor-pointer"
        >
          {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
};

const Rule: React.FC<{ ok: boolean; text: string }> = ({ ok, text }) => (
  <li className={`flex items-center gap-1.5 text-[12px] ${ok ? 'text-[#2F8A5B] font-bold' : 'text-gray-400'}`}>
    <Check size={13} aria-hidden="true" className={ok ? 'opacity-100' : 'opacity-40'} />
    {text}
  </li>
);

export const PasswordChange: React.FC = () => {
  const navigate = useNavigate();
  const [loggedIn] = useState(() => readAuthState().loggedIn);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const longEnough = next.length >= MIN_LENGTH;
  const differs = next.length > 0 && next !== current;
  const matches = confirm.length > 0 && next === confirm;
  const canSubmit = loggedIn && current.length > 0 && longEnough && differs && matches && !submitting;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await changePassword(current, next);
      navigate('/mypage', { replace: true, state: { toast: '비밀번호를 변경했어요' } });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : '비밀번호를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.');
      // 현재 비밀번호가 틀리면 그 칸만 다시 입력
      if (caught instanceof ApiError && caught.code === 'WRONG_PASSWORD') setCurrent('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F5EC] pb-8 max-w-md mx-auto shadow-md">
      <div className="bg-white sticky top-0 z-10 shadow-sm px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <button type="button" onClick={() => navigate('/mypage/profile')} aria-label="내 정보 수정으로" className="cursor-pointer text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-bold text-gray-800">비밀번호 변경</h1>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4" noValidate>
        {!loggedIn && (
          <p role="status" className="rounded-xl bg-gray-100 px-3.5 py-2.5 text-xs text-gray-600">
            로그인한 계정에서만 비밀번호를 바꿀 수 있어요.
          </p>
        )}

        <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 space-y-4">
          <PasswordField id="current-password" label="현재 비밀번호" value={current} onChange={setCurrent} autoComplete="current-password" />
          <PasswordField
            id="new-password"
            label="새 비밀번호"
            value={next}
            onChange={setNext}
            autoComplete="new-password"
            invalid={next.length > 0 && (!longEnough || !differs)}
          />
          <PasswordField
            id="confirm-password"
            label="새 비밀번호 확인"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            invalid={confirm.length > 0 && !matches}
          />
          <ul className="space-y-1" aria-label="비밀번호 조건">
            <Rule ok={longEnough} text={`${MIN_LENGTH}자 이상`} />
            <Rule ok={differs} text="현재 비밀번호와 다르게" />
            <Rule ok={matches} text="새 비밀번호 두 번 똑같이 입력" />
          </ul>
        </section>

        {error && (
          <p role="alert" className="flex items-start gap-1.5 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-600">
            <CircleAlert size={14} className="mt-px shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className="h-11 w-full rounded-full bg-[#59B985] text-sm font-bold text-white inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          >
            {submitting && <LoaderCircle size={16} className="animate-fb-spin" aria-hidden="true" />}
            {submitting ? '변경하는 중…' : '비밀번호 변경'}
          </button>
          <button type="button" onClick={() => navigate('/mypage/profile')} className="h-10 w-full rounded-full text-sm font-bold text-gray-500 cursor-pointer">
            취소
          </button>
        </div>
      </form>
    </div>
  );
};
