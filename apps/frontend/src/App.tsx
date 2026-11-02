import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { OnboardingStep1 } from './pages/OnboardingStep1';
import { OnboardingStep2 } from './pages/OnboardingStep2';
import { OnboardingComplete } from './pages/OnboardingComplete';
import { Dashboard } from './pages/Dashboard';
import { Missions } from './pages/Missions';
import { MissionDetail } from './pages/MissionDetail';
import { Shop } from './pages/Shop';
import { MyPage } from './pages/MyPage';
import { CharacterStoreProvider } from './context/CharacterStoreProvider';
import { ProgressStoreProvider } from './context/ProgressStoreProvider';

// 개발 서버에서만 쓰는 UI 미리보기 (/dev/ui). 배포 빌드에서는 import.meta.env.DEV가 false라 코드가 포함되지 않음
const DevUiPreview = import.meta.env.DEV ? lazy(() => import('./pages/dev/DevUiPreview')) : null;

function App() {
  return (
    <BrowserRouter>
      {/* 상점/마이페이지가 공유하는 FitPoint·보유·착용 상태 + 레벨·XP·Streak 상태 */}
      <CharacterStoreProvider>
        <ProgressStoreProvider>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/onboarding/step1" element={<OnboardingStep1 />} />
          <Route path="/onboarding/step2" element={<OnboardingStep2 />} />
          <Route path="/onboarding/complete" element={<OnboardingComplete />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/missions" element={<Missions />} />
          <Route path="/missions/:id" element={<MissionDetail />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/mypage" element={<MyPage />} />
          {DevUiPreview && (
            <Route
              path="/dev/ui"
              element={
                <Suspense fallback={null}>
                  <DevUiPreview />
                </Suspense>
              }
            />
          )}
        </Routes>
        </ProgressStoreProvider>
      </CharacterStoreProvider>
    </BrowserRouter>
  );
}

export default App;