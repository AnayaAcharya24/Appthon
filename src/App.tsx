import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import {
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
  VerifyEmailPage,
} from './pages/AuthPages';
import { PrivacyPolicyPage, TermsPage } from './pages/LegalPages';
import { VerifyCertificatePage } from './pages/VerifyCertificatePage';
import { StudentDashboard } from './pages/StudentDashboard';
import { JudgePortal } from './pages/JudgePortal';
import { AdminPortal } from './pages/AdminPortal';
import type { UserRole } from './types/appthon';

function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080810] text-sm text-white/70">
        Loading session...
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'Judge') return <Navigate to="/judge" replace />;
    if (
      ['Super Admin', 'Event Manager', 'Registration Manager', 'Read-only Staff'].includes(
        user.role
      )
    ) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/verify" element={<VerifyCertificatePage />} />
          <Route path="/verify/:certificateId" element={<VerifyCertificatePage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['Student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/judge"
            element={
              <ProtectedRoute allowedRoles={['Judge']}>
                <JudgePortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute
                allowedRoles={[
                  'Super Admin',
                  'Event Manager',
                  'Registration Manager',
                  'Read-only Staff',
                ]}
              >
                <AdminPortal />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
