// 계정 API (비밀번호 변경)
// TODO: 백엔드에 비밀번호 변경 API가 아직 없음 (TRD에도 미정). 아래 형식으로 추가 요청
//   PUT /api/v1/auth/password  (Bearer 인증)
//   요청: { current_password, new_password }
//   성공: 200 { success: true }
//   실패: 401 { code: 'INVALID_CREDENTIALS' } 현재 비밀번호 불일치 / 400 VALIDATION_ERROR / 401 UNAUTHORIZED·INVALID_TOKEN 로그인 만료

import axios from 'axios';
import api from './axios';
import { ApiError } from './progressTypes';

type ErrorBody = { code?: string; message?: string };

export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  try {
    await api.put('/auth/password', { current_password: currentPassword, new_password: newPassword });
  } catch (error) {
    if (!axios.isAxiosError(error)) throw new ApiError('UNKNOWN_ERROR', '알 수 없는 오류가 발생했어요.');
    const status = error.response?.status;
    const body = error.response?.data as ErrorBody | undefined;
    if (!error.response) {
      throw new ApiError('NETWORK_ERROR', '서버와 연결할 수 없어요. 잠시 후 다시 시도해 주세요.');
    }
    if (status === 404) {
      throw new ApiError('NOT_AVAILABLE', '비밀번호 변경 기능이 아직 서버에 준비되지 않았어요.');
    }
    if (status === 401 && (body?.code === 'UNAUTHORIZED' || body?.code === 'INVALID_TOKEN')) {
      throw new ApiError('LOGIN_EXPIRED', '로그인이 만료됐어요. 다시 로그인한 뒤 변경해 주세요.');
    }
    if (status === 401) {
      throw new ApiError('WRONG_PASSWORD', '현재 비밀번호가 맞지 않아요.');
    }
    if (status === 400) {
      throw new ApiError('VALIDATION_ERROR', body?.message ?? '입력한 비밀번호를 다시 확인해 주세요.');
    }
    throw new ApiError(body?.code ?? 'SERVER_ERROR', body?.message ?? '비밀번호를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
};
