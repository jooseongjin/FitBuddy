import React, { useEffect, useId, useRef, useState } from 'react';
import { BookOpen, ChevronDown, X } from 'lucide-react';
import { progressApi } from '../api/progressClient';
import { MOCK_POLICY } from '../mocks/mockPolicy';

// FitBuddy 이용 가이드 패널 — 상단 오른쪽 캐릭터 메뉴의 [이용 가이드]에서 열림
// 가이드 답변은 현재 코드 동작 기준: 미션 보상(mockProgressServer·MissionDetail), Streak·복구(streakRules), 상점(Shop)

const isMock = progressApi.isMock;
const repairCost = MOCK_POLICY.repair.costPoints;
const repairLimit = MOCK_POLICY.repair.monthlyLimit.basic;

type Faq = { q: string; a: React.ReactNode };

const FAQS: Faq[] = [
  {
    q: '보상은 언제 받나요?',
    a: (
      <>
        <p>미션마다 목표(예: 10분, 8,000걸음)가 있어요. 목표를 채우면 미션이 <b>'보상 받기'</b> 상태가 돼요.</p>
        <p>미션 화면에서 [보상 받기]를 누르면 FitPoint와 경험치(XP)를 받아요. 목표를 채우기 전에는 버튼이 잠겨 있어요.</p>
        <p>같은 미션의 보상은 하루에 한 번만 받을 수 있어요.</p>
      </>
    ),
  },
  {
    q: 'FitPoint와 XP는 어떻게 다른가요?',
    a: (
      <>
        <p>미션 보상을 받으면 두 가지가 함께 쌓이는데, 쓰임이 달라요.</p>
        <p>
          <b>FitPoint(FP)는 쓰는 포인트</b>예요. 상점에서 캐릭터 아이템을 사거나, 놓친 연속 기록을 복구할 때 써요. 쓰면 그만큼 줄어들고,
          적립·사용 내역은 마이페이지의 FitPoint를 누르면 볼 수 있어요.
        </p>
        <p>
          <b>XP는 쌓이는 경험치</b>예요. 캐릭터 레벨을 올리는 데만 쓰이고, 쓰거나 줄어들지 않아요. 그래서 FitPoint로 아이템을 사도 레벨은 그대로예요.
        </p>
      </>
    ),
  },
  {
    q: '하루에 미션 두 개를 하면 연속 기록도 두 번 오르나요?',
    a: (
      <>
        <p>아니요. 연속 기록은 하루에 한 번만 올라요.</p>
        <p>그날 처음 보상을 받을 때 +1일이 되고, 두 번째 미션부터는 FitPoint와 XP만 받아요. 연속 일수는 그대로예요.</p>
      </>
    ),
  },
  {
    q: '어제 놓친 기록은 어떻게 복구하나요?',
    a: (
      <>
        <p>어제 하루만 빠졌을 때 복구할 수 있어요. 홈이나 마이페이지의 연속 기록 카드에서 [기록 복구하기]를 누르세요.</p>
        <p>
          복구에는 {repairCost !== null && isMock ? `${repairCost.toLocaleString()} FP` : 'FitPoint'}가 들고, 한 달에 {isMock ? `${repairLimit}번` : '정해진 횟수만큼'}까지 할 수 있어요.
          {isMock && ' (임시 값)'}
        </p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>오늘 미션 보상을 받기 전에만 복구할 수 있어요.</li>
          <li>이틀 이상 빠졌으면 복구할 수 없어요. 오늘 미션을 완료하면 1일부터 다시 시작해요.</li>
          <li>이번 달 횟수를 다 쓰면 다음 달 1일에 다시 생겨요.</li>
          <li>복구는 연속 일수를 지켜 주는 기능이에요. +1일은 오늘 미션을 완료해야 돼요.</li>
        </ul>
      </>
    ),
  },
  {
    q: '레벨은 어떻게 오르나요?',
    a: (
      <>
        <p>미션 보상으로 XP가 쌓이면 레벨이 자동으로 올라요. 다음 레벨까지 남은 XP는 마이페이지에서 확인할 수 있어요.</p>
        <p>레벨이 오르면 축하 화면이 한 번 나와요.</p>
      </>
    ),
  },
  {
    q: '아이템은 어떻게 사고 입히나요?',
    a: (
      <>
        <p>상점에서 아이템을 고르고 [미리 착용하기]로 먼저 입혀 볼 수 있어요. 미리 착용은 무료이고, 상점을 나가면 원래 모습으로 돌아가요.</p>
        <p>마음에 들면 FitPoint로 구매한 뒤 [장착하기]를 누르세요. 해제해도 아이템은 계속 가지고 있어요. 환불은 되지 않아요.</p>
        <p>착용 상태는 캐릭터(두리·나비·보리)마다 따로 저장돼요.</p>
      </>
    ),
  },
];

const AccordionItem: React.FC<{ faq: Faq }> = ({ faq }) => {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <li className="rounded-xl bg-white border border-gray-100">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={id}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-3 text-left cursor-pointer"
      >
        <span className="text-[13px] font-bold text-gray-800">{faq.q}</span>
        <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div id={id} className="px-3.5 pb-3.5 space-y-1.5 text-[12px] leading-relaxed text-gray-600">
          {faq.a}
        </div>
      )}
    </li>
  );
};

/**
 * 이용 가이드 패널 (왼쪽에서 열림). 상단 오른쪽 캐릭터 메뉴의 [이용 가이드]에서 연다.
 * 닫으면 onClose (메뉴 버튼으로 포커스를 돌려주는 건 부모가 처리)
 */
export const GuidePanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const close = onClose;

  return (
    <div className="fixed inset-0 z-50 flex bg-gray-900/40 animate-fb-fade-in" onClick={close} role="presentation">
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-menu-title"
        onClick={(event) => event.stopPropagation()}
        className="h-full w-[86%] max-w-[340px] bg-[#F8F5EC] shadow-2xl outline-none overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <h2 id="help-menu-title" className="text-base font-bold text-gray-800">
            FitBuddy 이용 가이드
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center cursor-pointer"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          <section className="space-y-2" aria-label="자주 묻는 질문">
            <p className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
              <BookOpen size={14} className="text-[#2F8A5B]" aria-hidden="true" />
              궁금한 질문을 눌러 보세요
            </p>
            <ul className="space-y-2">
              {FAQS.map((faq) => (
                <AccordionItem key={faq.q} faq={faq} />
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};
