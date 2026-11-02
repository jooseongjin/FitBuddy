// /dev/ui — 개발 환경 전용 UI 미리보기·테스트 페이지
// App.tsx에서 import.meta.env.DEV일 때만 라우트를 등록하고 lazy로 불러오므로 배포 빌드에는 포함되지 않는다.
// 이 페이지의 조작(mock 서버 상태 변경)은 실제 서비스 기능이 아니다.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, Play } from 'lucide-react';
import { mockProgressServer, type FailMode, type StreakScenario } from '../../mocks/mockProgressServer';
import { MOCK_POLICY } from '../../mocks/mockPolicy';
import { progressApi } from '../../api/progressClient';
import { ApiError, type CharacterProgress, type MissionRewardResult, type Plan, type RepairInfo, type StreakState } from '../../api/progressTypes';
import type { RepairRequest } from '../../api/progressApi';
import { useProgress } from '../../context/progressStore';
import { useCharacterStore } from '../../context/characterStore';
import { addDays, kstDateKey, nextMonthFirst } from '../../domain/kst';
import { recentDays } from '../../domain/streakRules';
import { clearCelebratedLevel, readCelebratedLevel } from '../../lib/celebrationStorage';
import { EMPTY_EQUIPPED, findCharacter, getEquippedParts } from '../../data/characterItems';
import { CHARACTER_NICKNAME } from '../../config/progressConfig';
import { CharacterStage } from '../../components/CharacterStage';
import { FitPointChip } from '../../components/FitPointChip';
import { LevelCard } from '../../components/progress/LevelCard';
import { XpGainBadge } from '../../components/progress/XpGainBadge';
import { LevelUpCelebration } from '../../components/progress/LevelUpCelebration';
import { StreakBadge } from '../../components/progress/StreakBadge';
import { WeekStrip } from '../../components/progress/WeekStrip';
import { StreakPlusOne } from '../../components/progress/StreakPlusOne';
import { StreakRiskBanner } from '../../components/progress/StreakRiskBanner';
import { StreakRepairNotice } from '../../components/progress/StreakRepairNotice';
import { StreakRepairSheet } from '../../components/progress/StreakRepairSheet';
import { StreakCard } from '../../components/progress/StreakCard';
import { MissionRewardEffects } from '../../components/progress/MissionRewardEffects';
import { Toast } from '../../components/progress/Toast';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const Btn: React.FC<{ onClick: () => void; active?: boolean; children: React.ReactNode; tone?: 'mint' | 'gray' | 'sky' | 'rose' }> = ({
  onClick,
  active,
  children,
  tone = 'gray',
}) => {
  const tones = {
    mint: 'bg-[#59B985] text-white',
    gray: 'bg-white text-gray-700 border border-gray-200',
    sky: 'bg-[#DCEEFF] text-sky-800',
    rose: 'bg-rose-50 text-rose-600 border border-rose-200',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 px-3 rounded-full text-[12px] font-bold cursor-pointer hover:brightness-95 ${
        active ? 'bg-gray-800 text-white' : tones[tone]
      }`}
    >
      {children}
    </button>
  );
};

const Panel: React.FC<{ title: string; note?: string; children: React.ReactNode }> = ({ title, note, children }) => (
  <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
    <div>
      <h2 className="text-sm font-black text-gray-800">{title}</h2>
      {note && <p className="text-[11px] text-gray-500 mt-0.5">{note}</p>}
    </div>
    {children}
  </section>
);

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-wrap items-center gap-1.5">
    <span className="w-24 shrink-0 text-[11px] font-bold text-gray-500">{label}</span>
    {children}
  </div>
);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[11px] font-bold text-gray-400">{children}</p>
);

type SheetPreview = {
  title: string;
  plan: Plan;
  balance: number;
  repair: Partial<RepairInfo>;
  submit: 'success' | 'fail' | 'slow';
};

export const DevUiPreview: React.FC = () => {
  const isMockApi = progressApi === mockProgressServer;
  const progress = useProgress();
  const { fitPoint, setFitPoint, currentCharacterId, equippedByCharacter } = useCharacterStore();
  const [, setVersion] = useState(0);
  useEffect(() => mockProgressServer.subscribe(() => setVersion((v) => v + 1)), []);
  const snapshot = mockProgressServer.devSnapshot();

  const [today] = useState(() => kstDateKey(new Date()));
  const [lastReward, setLastReward] = useState<{ result: MissionRewardResult; seq: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [replay, setReplay] = useState(0);
  const [popKey, setPopKey] = useState('a');
  const [celebration, setCelebration] = useState<{ from: number; to: number } | null>(null);
  const [sheet, setSheet] = useState<SheetPreview | null>(null);
  const [liveSheetOpen, setLiveSheetOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; seq: number } | null>(null);

  const parts = useMemo(
    () => getEquippedParts(findCharacter(currentCharacterId), equippedByCharacter[currentCharacterId] ?? EMPTY_EQUIPPED),
    [currentCharacterId, equippedByCharacter],
  );

  // mock 서버를 바꾼 뒤 화면 상태 다시 불러오기
  const apply = useCallback(
    (change: () => void) => {
      change();
      void progress.refresh();
    },
    [progress],
  );

  const showToast = (text: string) => setToast((previous) => ({ message: text, seq: (previous?.seq ?? 0) + 1 }));

  const completeMission = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await mockProgressServer.devCompleteMission();
      progress.applyMissionReward(result);
      setLastReward((previous) => ({ result, seq: (previous?.seq ?? 0) + 1 }));
    } catch (error) {
      setMessage(error instanceof ApiError ? `미션 완료 실패: ${error.message}` : '미션 완료 실패');
    } finally {
      setBusy(false);
    }
  };

  const addXp = (amount: number) => {
    const result = mockProgressServer.devAddXp(amount);
    progress.applyMissionReward(result);
    setLastReward((previous) => ({ result, seq: (previous?.seq ?? 0) + 1 }));
  };

  // ---- 정적 미리보기용 샘플 ----
  const sampleProgress = (kind: 'progress' | 'pending' | 'max'): CharacterProgress =>
    kind === 'progress'
      ? { level: 8, totalEarnedXp: 3200, currentLevelXp: 2800, nextLevelXp: 3600, isMaxLevel: false }
      : kind === 'pending'
        ? { level: 8, totalEarnedXp: 3200, currentLevelXp: null, nextLevelXp: null, isMaxLevel: false }
        : { level: 20, totalEarnedXp: 19420, currentLevelXp: 19000, nextLevelXp: null, isMaxLevel: true };

  const allStatusesWeek: StreakState['week'] = recentDays(today).map((date, index) => ({
    date,
    status: (['missed', 'done', 'repaired', 'done', 'done', 'done', 'today_pending'] as const)[index],
  }));
  const todayDoneWeek: StreakState['week'] = allStatusesWeek.map((day, index) =>
    index === 6 ? { ...day, status: 'today_done' } : day,
  );

  const sampleRepair = (patch: Partial<RepairInfo>): RepairInfo => ({
    status: 'available',
    missedDate: addDays(today, -1),
    brokenStreak: 7,
    cost: MOCK_POLICY.repair.costPoints,
    freeRemaining: 0,
    monthlyRemaining: 1,
    resetsOn: nextMonthFirst(today),
    ...patch,
  });

  const sheetStreak = (preview: SheetPreview): StreakState => ({
    currentStreak: 0,
    lastCompletedDate: addDays(today, -2),
    todayCompleted: false,
    isBroken: true,
    plan: preview.plan,
    repair: sampleRepair(preview.repair),
    week: [],
    serverNow: new Date(`${today}T21:00:00+09:00`).toISOString(),
  });

  const fakeSubmit = (mode: SheetPreview['submit']): ((request: RepairRequest) => Promise<void>) => async () => {
    if (mode === 'slow') {
      await sleep(8000);
      return;
    }
    await sleep(700);
    if (mode === 'fail') throw new ApiError('NETWORK_ERROR', '연결이 불안정해 처리하지 못했어요. 잠시 후 다시 시도해 주세요.');
  };

  const SHEET_PREVIEWS: SheetPreview[] = [
    { title: 'Basic · FP 복구', plan: 'basic', balance: 2480, repair: {}, submit: 'success' },
    { title: 'Premium · 무료/FP 선택', plan: 'premium', balance: 2480, repair: { freeRemaining: 1, monthlyRemaining: 3 }, submit: 'success' },
    { title: 'FP 부족 (Basic)', plan: 'basic', balance: 120, repair: {}, submit: 'success' },
    { title: 'FP 부족 (Premium · 무료 남음)', plan: 'premium', balance: 120, repair: { freeRemaining: 1, monthlyRemaining: 2 }, submit: 'success' },
    { title: '이번 달 횟수 소진', plan: 'basic', balance: 2480, repair: { status: 'monthly_limit', monthlyRemaining: 0 }, submit: 'success' },
    { title: '복구 불가 (이틀 이상)', plan: 'basic', balance: 2480, repair: { status: 'expired', missedDate: null }, submit: 'success' },
    { title: '처리 중 (8초)', plan: 'basic', balance: 2480, repair: {}, submit: 'slow' },
    { title: '실패 → 다시 시도', plan: 'basic', balance: 2480, repair: {}, submit: 'fail' },
  ];

  const scenarios: { key: StreakScenario; label: string }[] = [
    { key: 'kept_pending', label: '유지 · 오늘 미완료' },
    { key: 'kept_done', label: '유지 · 오늘 완료' },
    { key: 'missed_one', label: '어제 빠짐 (복구 가능)' },
    { key: 'missed_two', label: '이틀 빠짐 (복구 불가)' },
    { key: 'monthly_used', label: '어제 빠짐 + 횟수 소진' },
    { key: 'fresh', label: '기록 없음' },
  ];

  const stored = readCelebratedLevel();

  return (
    <div className="min-h-screen bg-[#F8F5EC] pb-16">
      <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black text-gray-800">
              <FlaskConical size={20} className="text-[#2F8A5B]" aria-hidden="true" />
              FitBuddy UI 미리보기 <span className="text-[11px] font-bold text-white bg-gray-800 rounded-md px-1.5 py-0.5">DEV 전용</span>
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              개발 서버에서만 열리는 테스트 페이지예요. 아래 조작은 mock 서버 값만 바꾸며 실제 서비스 기능이 아니에요.
            </p>
          </div>
          <nav className="flex gap-1.5">
            <Link to="/shop" className="h-8 px-3 rounded-full bg-[#59B985] text-white text-[12px] font-bold inline-flex items-center">
              상점 열기
            </Link>
            <Link to="/mypage" className="h-8 px-3 rounded-full bg-[#59B985] text-white text-[12px] font-bold inline-flex items-center">
              마이페이지 열기
            </Link>
          </nav>
        </header>

        {!isMockApi && (
          <p className="rounded-xl bg-rose-50 border border-rose-100 px-3 py-2 text-xs font-bold text-rose-600">
            지금은 실제 API(VITE_PROGRESS_API=http)를 쓰고 있어 mock 조작이 화면에 반영되지 않아요.
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* ---------- 조작 ---------- */}
          <Panel title="① mock 서버 조작" note="값을 바꾸면 공용 상태를 다시 불러와 상점·마이페이지에도 그대로 반영돼요.">
            <div className="space-y-2.5">
              <Row label={`FP ${fitPoint.toLocaleString()}`}>
                <Btn onClick={() => setFitPoint(2480)}>2,480 (기본)</Btn>
                <Btn onClick={() => setFitPoint(120)}>120 (부족)</Btn>
                <Btn onClick={() => setFitPoint(10000)}>10,000</Btn>
              </Row>
              <Row label="구독">
                <Btn active={snapshot.plan === 'basic'} onClick={() => apply(() => mockProgressServer.devSetPlan('basic'))}>
                  Basic
                </Btn>
                <Btn active={snapshot.plan === 'premium'} onClick={() => apply(() => mockProgressServer.devSetPlan('premium'))}>
                  Premium
                </Btn>
              </Row>
              <Row label={`레벨 Lv.${snapshot.level}`}>
                <Btn active={snapshot.levelTableEnabled} onClick={() => apply(() => mockProgressServer.devSetLevelTableEnabled(true))}>
                  XP 기준 있음(임시)
                </Btn>
                <Btn active={!snapshot.levelTableEnabled} onClick={() => apply(() => mockProgressServer.devSetLevelTableEnabled(false))}>
                  XP 기준 미정
                </Btn>
                <Btn onClick={() => apply(() => mockProgressServer.devSetLevel(8, 3200))}>Lv.8 (3,200 XP)</Btn>
                <Btn onClick={() => apply(() => mockProgressServer.devSetNearMaxLevel())}>최고 레벨 직전</Btn>
                <Btn onClick={() => apply(() => mockProgressServer.devSetLevel(20, 19420))}>최고 레벨</Btn>
              </Row>
              <Row label="Streak">
                {scenarios.map((scenario) => (
                  <Btn key={scenario.key} onClick={() => apply(() => mockProgressServer.devSetScenario(scenario.key))}>
                    {scenario.label}
                  </Btn>
                ))}
              </Row>
              <Row label={`날짜 ${snapshot.today}`}>
                <Btn onClick={() => apply(() => mockProgressServer.devAdvanceDays(1))}>하루 넘기기</Btn>
                <Btn onClick={() => apply(() => mockProgressServer.devAdvanceDays(2))}>이틀 넘기기</Btn>
              </Row>
              <Row label={`KST 시각 ${snapshot.hourOverride ?? '실제'}`}>
                <Btn active={snapshot.hourOverride === null} onClick={() => apply(() => mockProgressServer.devSetHour(null))}>
                  실제 시각
                </Btn>
                <Btn active={snapshot.hourOverride === 19} onClick={() => apply(() => mockProgressServer.devSetHour(19))}>
                  19시 (배너 X)
                </Btn>
                <Btn active={snapshot.hourOverride === 20} onClick={() => apply(() => mockProgressServer.devSetHour(20))}>
                  20시 (배너 O)
                </Btn>
              </Row>
              <Row label="API 응답">
                {(['none', 'next', 'always'] as FailMode[]).map((mode) => (
                  <Btn key={mode} active={snapshot.failMode === mode} onClick={() => mockProgressServer.devSetFailMode(mode)}>
                    {mode === 'none' ? '성공' : mode === 'next' ? '다음 1회 실패' : '항상 실패'}
                  </Btn>
                ))}
              </Row>
              <Row label={`지연 ${snapshot.latencyMs}ms`}>
                {[0, 450, 1500].map((ms) => (
                  <Btn key={ms} active={snapshot.latencyMs === ms} onClick={() => mockProgressServer.devSetLatency(ms)}>
                    {ms}ms
                  </Btn>
                ))}
              </Row>
              <Row label={`축하 기록 ${stored.level ?? '없음'}`}>
                <Btn onClick={() => { clearCelebratedLevel(); setVersion((v) => v + 1); }}>지우기 (첫 진입 상태)</Btn>
              </Row>
              <Row label="전체">
                <Btn tone="rose" onClick={() => { setFitPoint(2480); apply(() => mockProgressServer.devReset()); }}>
                  mock 초기화
                </Btn>
                <Btn onClick={() => void progress.refresh()}>다시 불러오기</Btn>
              </Row>
            </div>
          </Panel>

          {/* ---------- 미션 완료 흉내 ---------- */}
          <Panel
            title="② 미션 완료 흉내 (팀원 화면 연동 테스트)"
            note="실제로는 미션 완료 화면이 API 응답을 useProgress().applyMissionReward(result)로 넘기면 같은 효과가 나요."
          >
            <div className="flex flex-wrap gap-1.5">
              <Btn tone="mint" onClick={() => void completeMission()}>
                {busy ? '처리 중…' : `미션 완료 (+${MOCK_POLICY.missionBasePoint} FP·XP)`}
              </Btn>
              <Btn tone="sky" onClick={() => addXp(1000)}>+1,000 XP</Btn>
              <Btn tone="sky" onClick={() => addXp(2500)}>+2,500 XP (여러 레벨)</Btn>
            </div>
            {message && <p className="text-xs font-bold text-rose-600">{message}</p>}
            <div className="min-h-40 rounded-2xl bg-[#F8F5EC] flex flex-col items-center justify-center gap-2 p-4">
              {lastReward ? (
                <>
                  <MissionRewardEffects key={lastReward.seq} result={lastReward.result} />
                  <p className="text-[11px] text-gray-500 text-center">
                    +{lastReward.result.earnedPoint} FP · +{lastReward.result.earnedXp} XP · Lv.{lastReward.result.level.before} → Lv.
                    {lastReward.result.level.after} · Streak {lastReward.result.streak.increased ? `${lastReward.result.streak.previous}→${lastReward.result.streak.current}` : '변화 없음 (오늘 이미 +1)'}
                  </p>
                </>
              ) : (
                <p className="text-xs text-gray-400">버튼을 누르면 XP 획득·Streak +1·레벨업 효과가 여기와 화면 위에 나타나요</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-gray-500">헤더 FP 칩</span>
              <FitPointChip amount={fitPoint} />
            </div>
          </Panel>
        </div>

        {/* ---------- 실제 연결 상태 ---------- */}
        <Panel title="③ 현재 상태로 그린 화면 요소" note="마이페이지와 같은 컴포넌트·같은 공용 상태를 사용해요.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Streak 카드 (UI 8·9·11·11-1)</Label>
              {progress.streak ? (
                <StreakCard
                  streak={progress.streak}
                  isMock={progress.isMock}
                  onOpenRepair={() => setLiveSheetOpen(true)}
                  onGoMissions={() => showToast('미션 화면으로 이동 (/missions)')}
                />
              ) : (
                <p className="text-xs text-gray-400">{progress.status === 'error' ? progress.errorMessage : '불러오는 중…'}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>레벨 카드 + XP 진행 바 (UI 4·5)</Label>
              {progress.character && <LevelCard progress={progress.character} isMock={progress.isMock} />}
              <Label>캐릭터 착용 효과 (UI 1) — 숨쉬기 + pop</Label>
              <CharacterStage
                equippedParts={parts}
                label="미리보기 캐릭터"
                statusText="버튼을 눌러 pop 실행"
                motionKey={popKey}
              />
              <Btn onClick={() => setPopKey((key) => key + 'a')}>
                <Play size={12} className="inline -mt-0.5" aria-hidden="true" /> 착용 효과 실행
              </Btn>
            </div>
          </div>
        </Panel>

        {/* ---------- 모든 상태 갤러리 ---------- */}
        <Panel title="④ 상태별 갤러리" note="고정된 예시 값으로 모든 상태를 한 번에 확인해요. 숫자는 화면 확인용 예시입니다.">
          <div className="grid gap-5 md:grid-cols-3">
            <div className="space-y-2">
              <Label>UI 4·5 진행 중 (임시 기준)</Label>
              <LevelCard progress={sampleProgress('progress')} isMock />
              <Label>UI 4·5 기준 미정</Label>
              <LevelCard progress={sampleProgress('pending')} />
              <Label>UI 4·5 최고 레벨</Label>
              <LevelCard progress={sampleProgress('max')} />
            </div>
            <div className="space-y-2">
              <Label>UI 8 Streak 배지</Label>
              <div className="flex flex-col items-start gap-1.5">
                <StreakBadge days={8} todayCompleted isBroken={false} />
                <StreakBadge days={7} todayCompleted={false} isBroken={false} />
                <StreakBadge days={0} todayCompleted={false} isBroken />
              </div>
              <Label>UI 9 최근 7일 기록 (미달성·달성·복구·오늘 미완료 / 오늘 완료)</Label>
              <div className="bg-white rounded-2xl p-3 border border-gray-100 space-y-3">
                <WeekStrip week={allStatusesWeek} />
                <WeekStrip week={todayDoneWeek} />
              </div>
              <Label>UI 11 위험 배너</Label>
              <StreakRiskBanner days={7} onGoMissions={() => showToast('미션 화면으로 이동 (/missions)')} />
              <Label>UI 11-1 복구 안내 (가능 · 소진 · 불가)</Label>
              <StreakRepairNotice repair={sampleRepair({})} onOpen={() => setSheet(SHEET_PREVIEWS[0])} />
              <StreakRepairNotice repair={sampleRepair({ status: 'monthly_limit', monthlyRemaining: 0 })} onOpen={() => {}} />
              <StreakRepairNotice repair={sampleRepair({ status: 'expired' })} onOpen={() => {}} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>UI 6 XP 획득 · UI 10 Streak +1</Label>
                <Btn onClick={() => setReplay((r) => r + 1)}>
                  <Play size={12} className="inline -mt-0.5" aria-hidden="true" /> 다시 실행
                </Btn>
              </div>
              <div className="h-14 rounded-2xl bg-white border border-gray-100 flex items-center justify-center">
                <XpGainBadge key={`xp-${replay}`} amount={120} />
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <StreakPlusOne key={`s1-${replay}`} increased previous={7} current={8} restarted={false} />
                <StreakPlusOne key={`s2-${replay}`} increased previous={0} current={1} restarted />
              </div>
              <Label>UI 7 레벨업 축하</Label>
              <div className="flex flex-wrap gap-1.5">
                <Btn tone="sky" onClick={() => setCelebration({ from: 8, to: 9 })}>Lv.8 → 9</Btn>
                <Btn tone="sky" onClick={() => setCelebration({ from: 8, to: 10 })}>Lv.8 → 10 (여러 레벨)</Btn>
              </div>
              <Label>UI 12 복구 팝업 (상태별)</Label>
              <div className="flex flex-wrap gap-1.5">
                {SHEET_PREVIEWS.map((preview) => (
                  <Btn key={preview.title} onClick={() => setSheet(preview)}>
                    {preview.title}
                  </Btn>
                ))}
              </div>
              <Label>UI 13 복구 완료 토스트</Label>
              <Btn onClick={() => showToast('7일 연속 기록을 지켰어요!')}>토스트 보기</Btn>
            </div>
          </div>
        </Panel>

        <Panel title="⑤ mock 서버 값" note={`오늘(KST) ${snapshot.today} · 임시 정책 값은 mocks/mockPolicy.ts`}>
          <pre className="max-h-72 overflow-auto rounded-xl bg-gray-900 text-gray-100 text-[11px] p-3">
            {JSON.stringify(
              {
                level: snapshot.level,
                totalXp: snapshot.totalXp,
                plan: snapshot.plan,
                record: snapshot.record,
                dayOffset: snapshot.dayOffset,
                hourOverride: snapshot.hourOverride,
                failMode: snapshot.failMode,
                celebratedLevel: stored.level,
              },
              null,
              2,
            )}
          </pre>
        </Panel>
      </div>

      {celebration && (
        <LevelUpCelebration
          key={`${celebration.from}-${celebration.to}`}
          from={celebration.from}
          to={celebration.to}
          equippedParts={parts}
          characterName={CHARACTER_NICKNAME}
          onClose={() => setCelebration(null)}
        />
      )}
      {sheet && (
        <StreakRepairSheet
          key={sheet.title}
          streak={sheetStreak(sheet)}
          balance={sheet.balance}
          isMock
          onClose={() => setSheet(null)}
          onSubmit={fakeSubmit(sheet.submit)}
          onSuccess={(days) => {
            setSheet(null);
            showToast(`${days}일 연속 기록을 지켰어요!`);
          }}
          onGoMissions={() => {
            setSheet(null);
            showToast('미션 화면으로 이동 (/missions)');
          }}
        />
      )}
      {liveSheetOpen && progress.streak && (
        <StreakRepairSheet
          streak={progress.streak}
          balance={fitPoint}
          isMock={progress.isMock}
          onClose={() => setLiveSheetOpen(false)}
          onSubmit={progress.repairStreak}
          onSuccess={(days) => {
            setLiveSheetOpen(false);
            showToast(`${days}일 연속 기록을 지켰어요!`);
          }}
          onGoMissions={() => {
            setLiveSheetOpen(false);
            showToast('미션 화면으로 이동 (/missions)');
          }}
        />
      )}
      {toast && <Toast key={toast.seq} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
};

export default DevUiPreview;
