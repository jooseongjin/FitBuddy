import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export const OnboardingComplete: React.FC = () => {
  const navigate = useNavigate();
  const time = localStorage.getItem('onboarding_time') || '10';

  return (
    <div className="min-h-screen bg-emerald-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 space-y-6 text-center">
        <div className="relative inline-block my-2">
          <div className="text-6xl">🦦</div>
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1 text-white">
            <CheckCircle size={18} />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-800">가입과 설문을 모두 마쳤어요!</h2>
          <p className="text-xs text-gray-500 mt-1">두리와 함께 나만의 운동 습관을 만들어봐요.</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl text-left border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-1">나의 시작 계획</p>
          <p className="text-sm font-bold text-gray-800">운동 습관 만들기 · 하루 {time}분 정도</p>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition"
        >
          홈 시작하기
        </button>
      </div>
    </div>
  );
};