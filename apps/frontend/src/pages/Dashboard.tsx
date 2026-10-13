import React from 'react';
import { Flame, Gem, Footprints, Zap, Clock, Home, Target, ShoppingBag, User } from 'lucide-react';

export const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 pb-20 max-w-md mx-auto shadow-md">
      {/* 상단 헤더 */}
      <div className="bg-white p-4 sticky top-0 border-b flex justify-between items-center z-10">
        <div>
          <h1 className="text-base font-bold text-gray-800">사용자님, 오늘도 가볍게!</h1>
          <div className="flex items-center gap-3 text-xs mt-1">
            <span className="text-orange-500 font-semibold flex items-center gap-1">
              <Flame size={14} /> 7일 연속
            </span>
            <span className="text-cyan-600 font-semibold flex items-center gap-1">
              <Gem size={14} /> 2,480 FitPoint
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 오늘의 건강 대시보드 */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-gray-800">오늘의 건강 대시보드</h2>
            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">
              좋은 페이스!
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-2">
            <div>
              <Footprints className="mx-auto text-emerald-500 mb-1" size={20} />
              <p className="text-base font-extrabold text-gray-800">6,842</p>
              <p className="text-[10px] text-gray-400">걸음 / 10,000</p>
            </div>
            <div>
              <Zap className="mx-auto text-orange-500 mb-1" size={20} />
              <p className="text-base font-extrabold text-gray-800">428</p>
              <p className="text-[10px] text-gray-400">소비 kcal</p>
            </div>
            <div>
              <Clock className="mx-auto text-blue-500 mb-1" size={20} />
              <p className="text-base font-extrabold text-gray-800">34분</p>
              <p className="text-[10px] text-gray-400">운동 시간</p>
            </div>
          </div>
        </div>

        {/* 캐릭터 레벨 배너 */}
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex justify-between items-center">
          <div>
            <span className="bg-blue-200 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
              LEVEL 08 · 두리
            </span>
            <h3 className="text-sm font-bold text-gray-800 mt-1">조금만 더 걸으면 새 배지를 받아요!</h3>
            <p className="text-xs text-blue-600 mt-0.5">앞으로 3,158걸음 · +120 FP</p>
          </div>
          <div className="text-4xl">🦦</div>
        </div>

        {/* 오늘의 맞춤 미션 */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-gray-800">오늘의 맞춤 미션</h2>
            <span className="text-xs text-gray-500">2/3 완료</span>
          </div>

          <div className="space-y-2">
            <div className="bg-white p-4 rounded-xl border flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-gray-800">아침 스트레칭</p>
                <p className="text-[11px] text-gray-400 mt-0.5">10/10분 완료</p>
              </div>
              <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-3 py-1.5 rounded-lg">완료됨</span>
            </div>

            <div className="bg-white p-4 rounded-xl border-2 border-emerald-500 flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-gray-800">가볍게 8천 보</p>
                <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">6,842 / 8,000걸음</p>
              </div>
              <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-lg">진행중</span>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 고정 GNB */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t flex justify-around py-2.5 z-20">
        <div className="flex flex-col items-center text-emerald-600 cursor-pointer">
          <Home size={20} />
          <span className="text-[10px] font-bold mt-0.5">홈</span>
        </div>
        <div className="flex flex-col items-center text-gray-400 cursor-pointer">
          <Target size={20} />
          <span className="text-[10px] mt-0.5">미션</span>
        </div>
        <div className="flex flex-col items-center text-gray-400 cursor-pointer">
          <ShoppingBag size={20} />
          <span className="text-[10px] mt-0.5">상점</span>
        </div>
        <div className="flex flex-col items-center text-gray-400 cursor-pointer">
          <User size={20} />
          <span className="text-[10px] mt-0.5">마이페이지</span>
        </div>
      </div>
    </div>
  );
};