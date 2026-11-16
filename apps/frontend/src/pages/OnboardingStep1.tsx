import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const OnboardingStep1: React.FC = () => {
  const navigate = useNavigate();
  const [selectedGoal, setSelectedGoal] = useState<string>('stamina');
  const [selectedExp, setSelectedExp] = useState<string>('none');

  // 백엔드 DB 스키마(zod)에 정확히 일치하는 ID
  const goals = [
    { id: 'diet', title: '체중 감량 (다이어트)', desc: '가볍고 활기찬 몸을 만들어요.' },
    { id: 'muscle', title: '근력 키우기', desc: '탄탄한 기초 근력을 다져요.' },
    { id: 'stamina', title: '기초 체력 기르기', desc: '지치지 않는 체력을 쌓아요.' },
  ];

  const experiences = [
    { id: 'none', title: '거의 안 해봤어요', desc: '운동 입문자' },
    { id: 'monthly', title: '가끔 생각날 때', desc: '월 1~3회 정도' },
    { id: 'weekly', title: '주 1~3회 정도', desc: '꾸준히 하는 편' },
    { id: 'daily', title: '거의 매일 해요', desc: '운동 숙련자' },
  ];

  const handleNext = () => {
    localStorage.setItem('onboarding_goal', selectedGoal);
    localStorage.setItem('onboarding_exp', selectedExp);
    navigate('/onboarding/step2');
  };

  return (
    <div className="min-h-screen bg-emerald-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-emerald-600">1 / 3 · 목표 및 운동 경험</p>
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full w-1/3"></div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-xl flex items-center gap-3">
          <div className="text-2xl">🦦</div>
          <div>
            <p className="text-xs font-bold text-blue-800">처음이어도 괜찮아요!</p>
            <p className="text-xs text-blue-600">두리가 딱 맞는 루틴을 찾아줄게요.</p>
          </div>
        </div>

        {/* 1. 목표 선택 */}
        <div className="space-y-2.5">
          <h2 className="text-base font-bold text-gray-800">1. 어떤 목표로 운동을 시작하나요?</h2>
          {goals.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedGoal(item.id)}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex justify-between items-center ${
                selectedGoal === item.id ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div>
                <p className="text-sm font-bold text-gray-800">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedGoal === item.id ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
              }`}>
                {selectedGoal === item.id && <div className="w-2 h-2 rounded-full bg-white"></div>}
              </div>
            </div>
          ))}
        </div>

        {/* 2. 운동 경험 선택 */}
        <div className="space-y-2.5">
          <h2 className="text-base font-bold text-gray-800">2. 평소 운동 경험이 어느 정도인가요?</h2>
          <div className="grid grid-cols-2 gap-2">
            {experiences.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedExp(item.id)}
                className={`p-3 rounded-xl border-2 cursor-pointer transition ${
                  selectedExp === item.id ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <p className="text-xs font-bold text-gray-800">{item.title}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleNext}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition"
        >
          다음
        </button>
      </div>
    </div>
  );
};