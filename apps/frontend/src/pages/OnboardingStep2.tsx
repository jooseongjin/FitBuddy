import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const OnboardingStep2: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPlace, setSelectedPlace] = useState<string>('indoor');

  const places = [
    { id: 'indoor', title: '실내 (집 / 헬스장)', desc: '층간소음이나 매트 환경을 고려해 추천해요' },
    { id: 'outdoor', title: '야외 (공원 / 운동장)', desc: '야외에서 할 수 있는 동작 위주로 추천해요' },
  ];

  const handleNext = () => {
    localStorage.setItem('onboarding_place', selectedPlace);
    navigate('/onboarding/step3');
  };

  return (
    <div className="min-h-screen bg-emerald-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-emerald-600">2 / 3 · 운동 장소</p>
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full w-2/3"></div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-xl flex items-center gap-3">
          <div className="text-2xl">🦦</div>
          <div>
            <p className="text-xs font-bold text-blue-800">어디서든 움직일 수 있어요!</p>
            <p className="text-xs text-blue-600">장소에 맞춰 안전한 동작을 골라드릴게요.</p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-800">주로 어디서 운동하시나요?</h2>
          <p className="text-xs text-gray-500 mt-1">가장 편하게 움직일 수 있는 장소를 골라주세요.</p>
        </div>

        <div className="space-y-3">
          {places.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedPlace(item.id)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition flex justify-between items-center ${
                selectedPlace === item.id ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div>
                <p className="text-sm font-bold text-gray-800">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedPlace === item.id ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
              }`}>
                {selectedPlace === item.id && <div className="w-2 h-2 rounded-full bg-white"></div>}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigate('/onboarding/step1')}
            className="w-1/3 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition"
          >
            이전
          </button>
          <button
            onClick={handleNext}
            className="w-2/3 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition"
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
};