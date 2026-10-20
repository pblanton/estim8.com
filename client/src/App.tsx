import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LandingPage } from './pages/landing/LandingPage';
import { RegisterPage } from './pages/auth/Register';
import { VerifyEmailPage } from './pages/auth/VerifyEmail';
import { SetPasswordPage } from './pages/auth/SetPassword';
import { LoginPage } from './pages/auth/Login';
import { FacilitatorDashboard } from './pages/dashboard/FacilitatorDashboard';
import { SessionCreatePage } from './pages/session/SessionCreate';
import { SessionEditPage } from './pages/session/SessionEdit';
import { TopicEditorPage } from './pages/topic/TopicEditor';
import { JoinLandingPage } from './pages/join/JoinLanding';
import { SessionRoomPage } from './pages/play/SessionRoom';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <FacilitatorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions/new"
        element={
          <ProtectedRoute>
            <SessionCreatePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions/:sessionId"
        element={
          <ProtectedRoute>
            <SessionEditPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions/:sessionId/topics/:topicId/edit"
        element={
          <ProtectedRoute>
            <TopicEditorPage />
          </ProtectedRoute>
        }
      />

      <Route path="/join/:joinCode" element={<JoinLandingPage />} />
      <Route path="/play/:joinCode" element={<SessionRoomPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
