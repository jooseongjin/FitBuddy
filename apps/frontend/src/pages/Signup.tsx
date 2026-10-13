import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import api from '../api/axios';

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!nickname) newErrors.nickname = '닉네임을 입력해주세요.';
    if (!email || !emailRegex.test(email)) newErrors.email = '올바른 이메일 주소를 입력해주세요.';
    if (!userId) newErrors.userId = '아이디를 입력해주세요.';
    if (!password || password.length < 8) newErrors.password = '영문·숫자를 포함해 8자 이상 입력하세요.';
    if (password !== passwordConfirm) newErrors.passwordConfirm = '비밀번호가 일치하지 않아요.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      // API-01 회원가입 API 호출
      await api.post('/auth/signup', {
        user_id: userId,
        email,
        password,
        nickname,
      });

      alert('가입을 환영합니다! 맞춤 설문을 시작합니다.');
      navigate('/onboarding/step1');
    } catch (err: any) {
      if (err.response?.status === 409) {
        setErrors({ server: '이미 사용 중인 아이디 또는 이메일입니다.' });
      } else {
        setErrors({ server: '가입 처리 중 오류가 발생했습니다.' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-emerald-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">FitBuddy에 오신 걸 환영해요!</h1>
          <p className="text-xs text-gray-500 mt-1">기본 정보를 입력하면 나에게 맞는 가벼운 운동 미션을 준비해 드릴게요.</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">닉네임</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="두리가 부를 이름"
              className={`w-full px-4 py-2.5 rounded-xl border ${errors.nickname ? 'border-red-500' : 'border-gray-200'} text-sm`}
            />
            {errors.nickname && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12}/>{errors.nickname}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">아이디</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="아이디 입력"
              className={`w-full px-4 py-2.5 rounded-xl border ${errors.userId ? 'border-red-500' : 'border-gray-200'} text-sm`}
            />
            {errors.userId && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12}/>{errors.userId}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일 주소를 입력하세요"
              className={`w-full px-4 py-2.5 rounded-xl border ${errors.email ? 'border-red-500' : 'border-gray-200'} text-sm`}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12}/>{errors.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8자 이상 입력하세요"
              className={`w-full px-4 py-2.5 rounded-xl border ${errors.password ? 'border-red-500' : 'border-gray-200'} text-sm`}
            />
            {errors.password && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12}/>{errors.password}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">비밀번호 확인</label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="비밀번호를 한 번 더 입력하세요"
              className={`w-full px-4 py-2.5 rounded-xl border ${errors.passwordConfirm ? 'border-red-500' : 'border-gray-200'} text-sm`}
            />
            {errors.passwordConfirm && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12}/>{errors.passwordConfirm}</p>}
          </div>

          {errors.server && <p className="text-red-500 text-xs text-center font-semibold pt-1">{errors.server}</p>}

          <button
            type="submit"
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition mt-2"
          >
            가입하고 맞춤 설문 시작
          </button>
        </form>

        <div className="text-center text-xs text-gray-500">
          이미 계정이 있나요?{' '}
          <Link to="/" className="text-emerald-600 font-bold underline">
            로그인
          </Link>
        </div>
      </div>
    </div>
  );
};