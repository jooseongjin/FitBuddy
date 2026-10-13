import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const OnboardingStep2: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTime, setSelectedTime] = useState<string>('10');

  const times = [
    { id: '5', title: '5분 정도', desc: '바쁜 날에도 아주 가볍게' },
    { id: '10', title: '10분 정도', desc: '스트레칭과 기초 운동부터' },
    { id: '20', title: '20분 정도', desc: '조금 더 여유 있게 움직이기' },
  ];

  const handleComplete = () => {
    localStorage.setItem('onboarding_time', selectedTime);
    navigate('/onboarding/complete');
  };

  return (
    <div className="min-h-screen bg-emerald-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-emerald-600">2 / 2 · 하루 운동 시간</p>
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full w-full"></div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-xl flex items-center gap-3">
          <div className="text-2xl">🦦</div>
          <div>
            <p className="text-xs font-bold text-blue-800">짧게 시작해도 충분해요!</p>
            <p className="text-xs text-blue-600">꾸준함이 가장 중요해요.</p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-800">하루에 얼마나 움직일 수 있나요?</h2>
          <p className="text-xs text-gray-500 mt-1">부담 없이 할 수 있는 시간을 하나 골라주세요.</p>
        </div>

        <div className="space-y-3">
          {times.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedTime(item.id)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition flex justify-between items-center ${
                selectedTime === item.id
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
                  selectedTime === item.id ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
                }`}
              >
                {selectedTime === item.id && <div className="w-2 h-2 rounded-full bg-white"></div>}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleComplete}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition"
        >
          설문 완료
        </button>
      </div>
    </div>
  );
};