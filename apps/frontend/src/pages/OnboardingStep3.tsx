import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const OnboardingStep3: React.FC = () => {
  const navigate = useNavigate();
  const place = localStorage.getItem('onboarding_place') || 'indoor';

  const [avoidMotion, setAvoidMotion] = useState<string[]>([]);
  const [bodyLimit, setBodyLimit] = useState<string[]>([]);

  const avoidOptions = [
    { id: 'jump', label: '점프 동작 (층간소음)' },
    { id: 'prone', label: '엎드리는 동작' },
    { id: 'knee_bend', label: '무릎 깊게 굽히기' },
    { id: 'floor', label: '바닥에 눕는 동작' },
  ];

  const limitOptions = [
    { id: 'knee', label: '무릎' },
    { id: 'back', label: '허리' },
    { id: 'shoulder', label: '어깨' },
    { id: 'wrist', label: '손목' },
    { id: 'ankle', label: '발목' },
  ];

  const toggleItem = (id: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (list.includes(id)) {
      setList(list.filter((item) => item !== id));
    } else {
      setList([...list, id]);
    }
  };

  const handleComplete = () => {
    // 실내일 때만 avoid_motion 저장 (백엔드 주석 반영)
    localStorage.setItem('onboarding_avoid', JSON.stringify(place === 'indoor' ? avoidMotion : []));
    localStorage.setItem('onboarding_limit', JSON.stringify(bodyLimit));
    navigate('/onboarding/complete');
  };

  return (
    <div className="min-h-screen bg-emerald-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-emerald-600">3 / 3 · 피할 동작 및 불편 부위</p>
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full w-full"></div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-xl flex items-center gap-3">
          <div className="text-2xl">🦦</div>
          <div>
            <p className="text-xs font-bold text-blue-800">다치지 않는 게 제일 중요해요!</p>
            <p className="text-xs text-blue-600">해당 사항이 없으면 선택하지 않고 넘어가도 돼요.</p>
          </div>
        </div>

        {/* 4. 피할 동작 (실내 선택 시에만 노출) */}
        {place === 'indoor' && (
          <div className="space-y-2.5">
            <h2 className="text-base font-bold text-gray-800">피하고 싶은 동작이 있나요? (중복 가능)</h2>
            <div className="grid grid-cols-2 gap-2">
              {avoidOptions.map((item) => {
                const isSelected = avoidMotion.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItem(item.id, avoidMotion, setAvoidMotion)}
                    className={`p-3 rounded-xl border-2 text-xs font-semibold text-left transition ${
                      isSelected ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-gray-100 text-gray-700 hover:border-gray-200'
                    }`}
                  >
                    {isSelected ? '✓ ' : ''}{item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. 불편 부위 */}
        <div className="space-y-2.5">
          <h2 className="text-base font-bold text-gray-800">불편하거나 조심해야 할 부위가 있나요?</h2>
          <div className="flex flex-wrap gap-2">
            {limitOptions.map((item) => {
              const isSelected = bodyLimit.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleItem(item.id, bodyLimit, setBodyLimit)}
                  className={`px-4 py-2.5 rounded-xl border-2 text-xs font-semibold transition ${
                    isSelected ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-gray-100 text-gray-700 hover:border-gray-200'
                  }`}
                >
                  {isSelected ? '✓ ' : ''}{item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigate('/onboarding/step2')}
            className="w-1/3 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition"
          >
            이전
          </button>
          <button
            onClick={handleComplete}
            className="w-2/3 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition"
          >
            설문 완료
          </button>
        </div>
      </div>
    </div>
  );
};