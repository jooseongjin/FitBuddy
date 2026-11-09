import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarDays, ChevronRight, CircleAlert, Info, KeyRound, Lock, Mail, PawPrint, UserRound } from 'lucide-react';
import { MockTag } from '../components/progress/MockTag';
import {
  GOAL_OPTIONS,
  NICKNAME_MAX,
  TIME_OPTIONS,
  displayName,
  formatJoinedAt,
  readProfile,
  saveProfile,
  validateProfile,
  type EditableProfile,
} from '../lib/profileStorage';

const CARD = 'bg-white rounded-2xl border border-gray-100 shadow-sm';

/** 선택지 하나 (온보딩 화면과 같은 카드 모양) */
const Choice: React.FC<{ selected: boolean; title: string; onSelect: () => void; name: string }> = ({ selected, title, onSelect, name }) => (
  <label
    className={`flex items-center justify-between gap-2 rounded-xl border-2 px-3.5 py-3 cursor-pointer transition ${
      selected ? 'border-[#59B985] bg-[#DDF3E8]/50' : 'border-gray-100 bg-white hover:border-gray-200'
    }`}
  >
    <input type="radio" name={name} className="sr-only" checked={selected} onChange={onSelect} />
    <span className="text-sm font-bold text-gray-800 whitespace-nowrap">{title}</span>
    <span
      aria-hidden="true"
      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? 'border-[#59B985] bg-[#59B985]' : 'border-gray-300'}`}
    >
      {selected && <span className="w-2 h-2 rounded-full bg-white" />}
    </span>
  </label>
);

/** 입력 칸 한 줄 (아이콘 + 라벨 + 입력 + 오류) */
const Field: React.FC<{
  id: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  maxLength?: number;
  error?: string;
  help?: React.ReactNode;
  placeholder?: string;
}> = ({ id, label, icon, value, onChange, type = 'text', maxLength, error, help, placeholder }) => (
  <div className="px-4 py-3 space-y-1.5">
    <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
      {icon}
      {label}
    </label>
    <input
      id={id}
      type={type}
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      aria-invalid={error !== undefined}
      className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#59B985]/40 ${
        error ? 'border-rose-400' : 'border-gray-200'
      }`}
    />
    {help}
    {error && (
      <p role="alert" className="flex items-center gap-1 text-xs font-bold text-rose-600">
        <CircleAlert size={13} aria-hidden="true" />
        {error}
      </p>
    )}
  </div>
);

/** 읽기 전용 한 줄 (아이디·가입일) */
const ReadOnlyRow: React.FC<{ label: string; icon: React.ReactNode; value: string; note?: string }> = ({ label, icon, value, note }) => (
  <div className="px-4 py-3 flex items-center justify-between gap-3">
    <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
      {icon}
      {label}
    </span>
    <span className="text-right">
      <span className="flex items-center justify-end gap-1 text-sm text-gray-700">
        {value}
        <Lock size={12} className="text-gray-300" aria-label="수정 불가" />
      </span>
      {note && <span className="block text-[10px] text-gray-400">{note}</span>}
    </span>
  </div>
);

// 내 정보 수정 — 마이페이지 설정 > 프로필 [수정]
// 로그인한 계정 정보를 보여주고 닉네임·이메일·운동 정보를 수정한다 (지금은 임시 값 + 브라우저 저장)
export const ProfileEdit: React.FC = () => {
  const navigate = useNavigate();
  const [initial] = useState(readProfile);
  const [form, setForm] = useState<EditableProfile>({
    nickname: initial.nickname,
    email: initial.email,
    goal: initial.goal,
    minutes: initial.minutes,
  });
  const [errors, setErrors] = useState<Partial<Record<'nickname' | 'email', string>>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const update = (patch: Partial<EditableProfile>) => {
    setForm((previous) => ({ ...previous, ...patch }));
    setErrors((previous) => {
      const next = { ...previous };
      if ('nickname' in patch) delete next.nickname;
      if ('email' in patch) delete next.email;
      return next;
    });
  };

  const changed =
    form.nickname.trim() !== initial.nickname ||
    form.email.trim() !== initial.email ||
    form.goal !== initial.goal ||
    form.minutes !== initial.minutes;

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    const problems = validateProfile(form);
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;
    if (!saveProfile(form, initial.userId)) {
      setSaveError('이 브라우저에서는 저장할 수 없어요. 사생활 보호 모드를 끄고 다시 시도해 주세요.');
      return;
    }
    navigate('/mypage', { state: { toast: '내 정보를 저장했어요' } });
  };

  return (
    <div className="min-h-screen bg-[#F8F5EC] pb-8 max-w-md mx-auto shadow-md">
      <div className="bg-white sticky top-0 z-10 shadow-sm px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <button type="button" onClick={() => navigate('/mypage')} aria-label="마이페이지로" className="cursor-pointer text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-bold text-gray-800">내 정보 수정</h1>
        <MockTag show={initial.isMock} />
      </div>

      <form onSubmit={handleSave} className="p-4 space-y-4" noValidate>
        {/* 로그인한 계정 요약 */}
        <section className={`${CARD} p-4 flex items-center gap-3`} aria-label="내 계정">
          <span className="shrink-0 w-14 h-14 rounded-full bg-[#DDF3E8] text-[#2F8A5B] flex items-center justify-center">
            <PawPrint size={26} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-base font-bold text-gray-800 truncate">{displayName(form.nickname)}</p>
            <p className="text-xs text-gray-500 truncate">@{initial.userId}</p>
            {form.email.trim() && <p className="text-[11px] text-gray-400 truncate">{form.email}</p>}
          </div>
        </section>

        {/* 계정 정보 */}
        <section className="space-y-2" aria-label="계정 정보">
          <h2 className="px-1 text-sm font-bold text-gray-800">계정 정보</h2>
          <div className={`${CARD} divide-y divide-gray-50`}>
            <Field
              id="nickname"
              label="닉네임"
              icon={<UserRound size={13} aria-hidden="true" />}
              value={form.nickname}
              maxLength={NICKNAME_MAX}
              onChange={(nickname) => update({ nickname })}
              error={errors.nickname}
              help={
                <p className="flex justify-between text-[11px] text-gray-400">
                  <span>홈 인사말과 마이페이지에 '{displayName(form.nickname)}'으로 보여요</span>
                  <span className="tabular-nums">
                    {form.nickname.trim().length}/{NICKNAME_MAX}
                  </span>
                </p>
              }
            />
            <Field
              id="email"
              label="이메일"
              type="email"
              icon={<Mail size={13} aria-hidden="true" />}
              value={form.email}
              onChange={(email) => update({ email })}
              error={errors.email}
              placeholder="이메일 주소를 입력해 주세요"
            />
            <ReadOnlyRow label="아이디" icon={<UserRound size={13} aria-hidden="true" />} value={initial.userId} note="아이디는 바꿀 수 없어요" />
            <ReadOnlyRow label="가입일" icon={<CalendarDays size={13} aria-hidden="true" />} value={initial.joinedAt ? formatJoinedAt(initial.joinedAt) : '정보 없음'} />
          </div>
        </section>

        {/* 운동 정보 (온보딩 설문 답변) */}
        <section className="space-y-2" aria-label="운동 정보">
          <h2 className="px-1 text-sm font-bold text-gray-800">운동 정보</h2>
          <div className={`${CARD} p-4 space-y-4`}>
            <fieldset className="space-y-2">
              <legend className="mb-1.5 text-xs font-bold text-gray-500">운동 목표</legend>
              {GOAL_OPTIONS.map((option) => (
                <Choice key={option.id} name="goal" title={option.title} selected={form.goal === option.id} onSelect={() => update({ goal: option.id })} />
              ))}
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="mb-1.5 text-xs font-bold text-gray-500">하루 운동 시간</legend>
              <div className="grid grid-cols-3 gap-2">
                {TIME_OPTIONS.map((option) => (
                  <Choice
                    key={option.id}
                    name="minutes"
                    title={`${option.id}분`}
                    selected={form.minutes === option.id}
                    onSelect={() => update({ minutes: option.id })}
                  />
                ))}
              </div>
            </fieldset>
          </div>
        </section>

        {/* 보안 */}
        <section className="space-y-2" aria-label="보안">
          <h2 className="px-1 text-sm font-bold text-gray-800">보안</h2>
          {/* TODO: 비밀번호 변경 API가 없어 비활성 (현재 비밀번호 확인 → 새 비밀번호 저장은 서버에서 처리해야 함) */}
          <button
            type="button"
            disabled
            className={`${CARD} w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left cursor-not-allowed`}
          >
            <span className="flex items-center gap-2 text-sm font-bold text-gray-400">
              <KeyRound size={16} aria-hidden="true" />
              비밀번호 변경
            </span>
            <span className="flex items-center gap-0.5 text-[11px] font-bold text-gray-400">
              준비 중
              <ChevronRight size={14} aria-hidden="true" />
            </span>
          </button>
        </section>

        <p className="flex items-start gap-1.5 rounded-xl bg-white px-3 py-2 text-[11px] text-gray-500">
          <Info size={13} className="mt-px shrink-0 text-gray-400" aria-hidden="true" />
          {initial.isMock
            ? '로그인하지 않아 임시 계정 정보로 보여줘요. 로그인하면 로그인한 계정 정보가 표시돼요.'
            : '로그인한 계정 정보예요. 이메일·가입일은 로그인 정보에 없어 비어 있을 수 있어요.'}{' '}
          수정한 내용은 이 기기에만 저장되고, 프로필 API가 준비되면 서버에 저장할 예정이에요.
        </p>

        {saveError && (
          <p role="alert" className="flex items-center gap-1 text-xs font-bold text-rose-600">
            <CircleAlert size={13} aria-hidden="true" />
            {saveError}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={!changed}
            className="h-11 w-full rounded-full bg-[#59B985] text-sm font-bold text-white cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          >
            저장하기
          </button>
          <button type="button" onClick={() => navigate('/mypage')} className="h-10 w-full rounded-full text-sm font-bold text-gray-500 cursor-pointer">
            취소
          </button>
        </div>
      </form>
    </div>
  );
};
