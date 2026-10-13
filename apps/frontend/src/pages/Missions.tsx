import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Gem, Home, Target, ShoppingBag, User, ChevronRight } from 'lucide-react';

export const Missions: React.FC = () => {
  const navigate = useNavigate();

  const missionList = [
    {
      id: '1',
      title: '아침 스트레칭',
      desc: '목과 어깨를 천천히 풀어주세요.',
      status: 'completed',
      progress: '10/10분',
      reward: '+40 FP',
    },
    {
      id: '2',
      title: '가볍게 8천 보',
      desc: '편안한 속도로 걸어보세요.',
      status: 'in_progress',
      progress: '6,842/8,000',
      reward: '+120 FP',
    },
    {
      id: '3',
      title: '스쿼트 루틴',
      desc: '올바른 자세로 천천히 앉았다 서요.',
      status: 'in_progress',
      progress: '12/20회',
      reward: '+80 FP',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 max-w-md mx-auto shadow-md">
      {/* 상단 헤더 */}
      <div className="bg-white p-4 sticky top-0 border-b flex justify-between items-center z-10">
        <div>
          <h1 className="text-base font-bold text-gray-800">오늘의 맞춤 미션</h1>
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
        {/* 캐릭터 응원 배너 */}
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

        {/* 미션 리스트 */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-gray-800">운동 미션</h2>
            <span className="text-xs text-gray-500">진행중 2 · 완료 1</span>
          </div>

          {missionList.map((m) => (
            <div
              key={m.id}
              onClick={() => navigate(`/missions/${m.id}`)}
              className={`bg-white p-4 rounded-xl border transition cursor-pointer flex justify-between items-center ${
                m.status === 'in_progress' ? 'border-emerald-500 shadow-sm' : 'border-gray-200'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-800">{m.title}</h3>
                  <span className="text-xs text-emerald-600 font-semibold">{m.progress}</span>
                </div>
                <p className="text-xs text-gray-400">{m.desc}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-600">{m.reward}</span>
                <span
                  className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${
                    m.status === 'completed'
                      ? 'bg-gray-100 text-gray-500'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {m.status === 'completed' ? '완료됨' : '진행중'}
                </span>
                <ChevronRight size={16} className="text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 하단 GNB */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t flex justify-around py-2.5 z-20">
        <div onClick={() => navigate('/dashboard')} className="flex flex-col items-center text-gray-400 cursor-pointer">
          <Home size={20} />
          <span className="text-[10px] mt-0.5">홈</span>
        </div>
        <div className="flex flex-col items-center text-emerald-600 cursor-pointer">
          <Target size={20} />
          <span className="text-[10px] font-bold mt-0.5">미션</span>
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