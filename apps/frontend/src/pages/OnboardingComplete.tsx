import axios from 'axios';
import api from '../api/axios';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export const OnboardingComplete: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  // 화면 요약 박스 표시용 데이터 읽기
  const goal = localStorage.getItem('onboarding_goal') || 'stamina';
  const place = localStorage.getItem('onboarding_place') || 'indoor';

  const goalLabel: Record<string, string> = {
    diet: '체중 감량 (다이어트)',
    muscle: '근력 키우기',
    stamina: '기초 체력 기르기',
  };

  const placeLabel: Record<string, string> = {
    indoor: '실내 운동',
    outdoor: '야외 운동',
  };

  useEffect(() => {
    const saveOnboardingData = async () => {
      try {
        const payload = {
          goal,
          exercise_experience: localStorage.getItem('onboarding_exp') || 'none',
          exercise_place: place,
          avoid_motion: JSON.parse(localStorage.getItem('onboarding_avoid') || '[]'),
          body_limit: JSON.parse(localStorage.getItem('onboarding_limit') || '[]'),
        };

        try {
          await api.post('/onboarding', payload);
        } catch (error) {
          if (
            !axios.isAxiosError<{ code?: string }>(error) ||
            error.response?.data?.code !== 'ONBOARDING_EXISTS'
          ) {
            throw error;
          }
          await api.put('/onboarding', payload);
        }
        setStatus('success');
      } catch (err) {
        console.error(err);
        setStatus('error');
      }
    };

    saveOnboardingData();
  }, [goal, place]);

  return (
    <div className="min-h-screen bg-emerald-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 space-y-6 text-center">
        <div className="relative inline-block my-2">
          <div className="text-6xl">🦦</div>
          {status === 'success' && (
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1 text-white">
              <CheckCircle size={18} />
            </div>
          )}
        </div>

        {status === 'loading' && (
          <div>
            <h2 className="text-lg font-bold text-gray-800">맞춤 운동 정보를 저장하고 있어요...</h2>
            <p className="text-xs text-gray-500 mt-1">잠시만 기다려주세요.</p>
          </div>
        )}

        {status === 'success' && (
          <>
            <div>
              <h2 className="text-xl font-bold text-gray-800">가입과 설문을 모두 마쳤어요!</h2>
              <p className="text-xs text-gray-500 mt-1">두리와 함께 나만의 운동 습관을 만들어봐요.</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl text-left border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-1">나의 시작 계획</p>
              <p className="text-sm font-bold text-gray-800">
                {goalLabel[goal] || '기초 체력 기르기'} · {placeLabel[place] || '실내 운동'}
              </p>
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition"
            >
              홈 시작하기
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div>
              <h2 className="text-lg font-bold text-red-600">설문 정보 저장에 실패했어요</h2>
              <p className="text-xs text-gray-500 mt-1">로그인 상태나 백엔드 서버 연결을 확인해주세요.</p>
            </div>

            <button
              onClick={() => navigate('/onboarding/step1')}
              className="w-full py-3.5 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-xl text-sm transition"
            >
              처음부터 다시 시도하기
            </button>
          </>
        )}
      </div>
    </div>
  );
};