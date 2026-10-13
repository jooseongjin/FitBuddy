import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const OnboardingStep1: React.FC = () => {
  const navigate = useNavigate();
  const [selectedGoal, setSelectedGoal] = useState<string>('habit');

  const goals = [
    { id: 'habit', title: '운동 습관 만들기', desc: '작은 미션부터 꾸준히 시작해요.' },
    { id: 'stamina', title: '기초 체력 기르기', desc: '쉽고 짧은 운동으로 체력을 쌓아요.' },
    { id: 'health', title: '건강하게 몸 관리하기', desc: '무리 없이 몸을 가볍게 움직여요.' },
  ];

  const handleNext = () => {
    localStorage.setItem('onboarding_goal', selectedGoal);
    navigate('/onboarding/step2');
  };

  return (
    <div className="min-h-screen bg-emerald-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-emerald-600">1 / 2 · 운동 목표</p>
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full w-1/2"></div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-xl flex items-center gap-3">
          <div className="text-2xl">🦦</div>
          <div>
            <p className="text-xs font-bold text-blue-800">처음이어도 괜찮아요!</p>
            <p className="text-xs text-blue-600">두리가 함께할게요.</p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-800">어떤 마음으로 운동을 시작하나요?</h2>
          <p className="text-xs text-gray-500 mt-1">잘하지 않아도 괜찮아요. 하나만 골라주세요.</p>
        </div>

        <div className="space-y-3">
          {goals.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedGoal(item.id)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition flex justify-between items-center ${
                selectedGoal === item.id
                  ? 'border-emerald-500 bg-emerald-50/50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div>
                <p className="text-sm font-bold text-gray-800">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedGoal === item.id ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
                }`}
              >
                {selectedGoal === item.id && <div className="w-2 h-2 rounded-full bg-white"></div>}
              </div>
            </div>
          ))}
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