import { create } from 'zustand';

interface UserState {
  userId: string;
  nickname: string;
  points: number;
  token: string | null;
  setAuth: (userId: string, nickname: string, token: string, points?: number) => void;
  updatePoints: (newPoints: number) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  userId: '',
  nickname: '',
  points: 0,
  token: localStorage.getItem('token'),

  // 로그인 성공 시 정보 저장
  setAuth: (userId, nickname, token, points = 0) => {
    localStorage.setItem('token', token);
    set({ userId, nickname, token, points });
  },

  // 미션 완료 시 FitPoint 업데이트
  updatePoints: (newPoints) => {
    set({ points: newPoints });
  },

  // 로그아웃 시 정보 삭제
  logout: () => {
    localStorage.removeItem('token');
    set({ userId: '', nickname: '', points: 0, token: null });
  },
}));