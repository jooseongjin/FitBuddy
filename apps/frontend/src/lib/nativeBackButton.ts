// Android 하드웨어 뒤로가기 처리
// - @capacitor/app 의 backButton 리스너가 없으면 Android 기본 동작으로 앱이 바로 종료된다.
// - 시작 화면(로그인·홈)에서는 앱을 종료하고, 그 밖의 화면에서는 이전 화면으로 돌아간다.
// - 웹(브라우저)에서는 아무것도 하지 않는다.

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

const EXIT_PATHS = new Set(['/', '/dashboard']);

let registered = false;

export const setupNativeBackButton = () => {
  if (registered || !Capacitor.isNativePlatform()) return;
  registered = true;
  void App.addListener('backButton', ({ canGoBack }) => {
    if (EXIT_PATHS.has(window.location.pathname) || !canGoBack) {
      void App.exitApp();
      return;
    }
    window.history.back();
  });
};
