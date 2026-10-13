import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gem } from 'lucide-react';

export const MissionDetail = () => {
  const navigate = useNavigate();
  const [isCompleted, setIsCompleted] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleComplete = () => {
    setIsCompleted(true);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 max-w-md mx-auto shadow-md relative">
      {/* 상단 헤더 */}
      <div className="bg-white p-4 sticky top-0 border-b flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/missions')}>
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-base font-bold text-gray-800">운동 미션</h1>
        </div>
        <span className="text-cyan-600 text-xs font-semibold flex items-center gap-1">
          <Gem size={14} /> 2,480 FitPoint
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* 미션 타이틀 배너 */}
        <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 flex justify-between items-center">
          <div>
            <span className="bg-blue-200 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
              LEVEL 08 · 두리
            </span>
            <h2 className="text-base font-bold text-gray-800 mt-1">가볍게 8천 보</h2>
            <p className="text-xs text-blue-600 mt-0.5">목표 달성 보상 · +120 FP</p>
          </div>
          <div className="text-4xl">🦦</div>
        </div>

        {/* 진행 상태 카드 */}
        <div className="bg-white p-4 rounded-xl border space-y-2">
          <div className="flex justify-between text-xs font-bold">
            <span className={isCompleted ? 'text-emerald-600' : 'text-gray-700'}>
              {isCompleted ? '✓ 완료됨' : '진행중'}
            </span>
            <span className="text-gray-500">8,000 / 8,000걸음</span>
          </div>

          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-emerald-400'} w-full`}></div>
          </div>

          <p className="text-xs text-emerald-600 font-medium pt-1">
            {isCompleted ? '+120 FP 획득 · 보상 지급 완료' : '목표를 달성했어요! 보상을 받아보세요.'}
          </p>
        </div>

        {/* 가이드 안내 */}
        <div className="bg-white p-4 rounded-xl border space-y-3">
          <h3 className="text-xs font-bold text-gray-800">이렇게 걸어보세요</h3>
          <ol className="space-y-2 text-xs text-gray-600">
            <li className="flex gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px]">
                1
              </span>
              <span>편한 운동화를 신고 가볍게 몸을 풀어요.</span>
            </li>
            <li className="flex gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px]">
                2
              </span>
              <span>대화할 수 있는 편안한 속도로 걸어요.</span>
            </li>
            <li className="flex gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px]">
                3
              </span>
              <span>오늘 누적 8,000걸음을 채우면 완료!</span>
            </li>
          </ol>
        </div>

        {/* 하단 액션 버튼 */}
        <button
          onClick={handleComplete}
          disabled={isCompleted}
          className={`w-full py-3.5 rounded-xl text-sm font-semibold transition ${
            isCompleted
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          {isCompleted ? '획득한 보상 확인' : '미션 완료 및 보상 받기'}
        </button>
      </div>

      {/* 보상 모달 (SCR-MOD-01) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-xs rounded-2xl p-6 text-center space-y-4 animate-fade-in">
            <div className="text-5xl">🦦</div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">가볍게 8천 보, 해냈어요!</h3>
              <p className="text-xs text-gray-500 mt-1">오늘의 보상을 받았어요.</p>
            </div>

            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 space-y-1">
              <div className="flex items-center justify-center gap-1 text-emerald-600 font-bold text-lg">
                <Gem size={20} />
                <span>+120 FitPoint</span>
              </div>
              <p className="text-xs text-gray-500">현재 보유: 2,600 FitPoint</p>
            </div>

            <button
              onClick={() => {
                setShowModal(false);
                navigate('/dashboard');
              }}
              className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl text-xs"
            >
              홈으로 이동
            </button>
          </div>
        </div>
      )}
    </div>
  );
};