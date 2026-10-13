import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { OnboardingStep1 } from './pages/OnboardingStep1';
import { OnboardingStep2 } from './pages/OnboardingStep2';
import { OnboardingComplete } from './pages/OnboardingComplete';
import { Dashboard } from './pages/Dashboard';
import { Missions } from './pages/Missions';
import { MissionDetail } from './pages/MissionDetail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/onboarding/step1" element={<OnboardingStep1 />} />
        <Route path="/onboarding/step2" element={<OnboardingStep2 />} />
        <Route path="/onboarding/complete" element={<OnboardingComplete />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/missions" element={<Missions />} />
        <Route path="/missions/:id" element={<MissionDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;