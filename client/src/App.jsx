import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

import PublicLayout from './layouts/PublicLayout';
import CitizenLayout from './layouts/CitizenLayout';
import LeaderLayout from './layouts/LeaderLayout';
import UniversityLayout from './layouts/UniversityLayout';
import CompanyLayout from './layouts/CompanyLayout';
import PlatformAdminLayout from './layouts/PlatformAdminLayout';

import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';
import LeaderRegisterPage from './pages/public/LeaderRegisterPage';
import FeaturePage from './pages/FeaturePage';

import CitizenDashboard from './pages/citizen/CitizenDashboard';
import ProblemFeedPage from './pages/citizen/ProblemFeedPage';
import ReportProblemPage from './pages/citizen/ReportProblemPage';
import MyReportsPage from './pages/citizen/MyReportsPage';
import ProblemDetailPage from './pages/citizen/ProblemDetailPage';
import LeaderDashboard from './pages/leader/LeaderDashboard';
import LeaderTeamPage from './pages/leader/TeamPage';
import LeaderProblemsPage from './pages/leader/LeaderProblemsPage';
import LeaderApplicationsPage from './pages/leader/LeaderApplicationsPage';
import UniversityProblemsPage from './pages/university/UniversityProblemsPage';
import LifecycleWorkflowsPage from './pages/admin/LifecycleWorkflowsPage';
import LeaderProjectsPage from './pages/leader/LeaderProjectsPage';
import LeaderCertificatesPage from './pages/leader/LeaderCertificatesPage';
import UniversityCompletionPage from './pages/university/UniversityCompletionPage';
import CertificateVerifyPage from './pages/public/CertificateVerifyPage';

import UniversityDashboard from './pages/university/UniversityDashboard';
import UniversityTeamsPage from './pages/university/UniversityTeamsPage';
import CompanyDashboard from './pages/company/CompanyDashboard';
import PlatformAdminDashboard from './pages/admin/PlatformAdminDashboard';

function LoadingScreen() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '70vh',
        gap: 16,
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'grid', gap: 12, placeItems: 'center' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-primary-subtle)',
            color: 'var(--color-primary)',
            fontSize: 24,
            display: 'grid',
            placeItems: 'center',
            animation: 'pulseGlow 2s ease-in-out infinite',
          }}
        >
          🏛️
        </div>
        <p style={{ color: 'var(--color-ink-muted)', fontSize: 'var(--text-sm)', fontWeight: 500, margin: 0 }}>
          Loading SamajX Platform…
        </p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { loading, sessionError, retrySession } = useAuth();
  if (loading) return <LoadingScreen />;
  if (sessionError) {
    return (
      <main
        role="alert"
        style={{
          display: 'grid',
          placeItems: 'center',
          minHeight: '80vh',
          padding: 24,
          backgroundColor: 'var(--color-bg)',
        }}
      >
        <div
          style={{
            maxWidth: 480,
            padding: 32,
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-lg)',
            textAlign: 'center',
            display: 'grid',
            gap: 16,
          }}
        >
          <div style={{ fontSize: 36 }}>⚠️</div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--color-ink)', margin: 0 }}>
            Unable to verify session
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-light)', margin: 0, lineHeight: 1.5 }}>
            {sessionError}
          </p>
          <div style={{ paddingTop: 8 }}>
            <button
              type="button"
              onClick={retrySession}
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-primary)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: 'var(--text-sm)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Retry Connection
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register/leader" element={<LeaderRegisterPage />} />
        
          <Route path="/verify/:code" element={<CertificateVerifyPage />} />
        </Route>

        <Route element={<ProtectedRoute requiredRole="citizen"><CitizenLayout /></ProtectedRoute>}>
          <Route path="/citizen" element={<CitizenDashboard />} />
          <Route path="/citizen/problems" element={<ProblemFeedPage />} />
          <Route path="/citizen/problems/:id" element={<ProblemDetailPage />} />
          <Route path="/citizen/report" element={<ReportProblemPage />} />
          <Route path="/citizen/reports" element={<MyReportsPage />} />
        </Route>

        <Route element={<ProtectedRoute requiredRole="leader"><LeaderLayout /></ProtectedRoute>}>
          <Route path="/leader" element={<LeaderDashboard />} />
          <Route path="/leader/team" element={<LeaderTeamPage />} />
          <Route path="/leader/problems" element={<LeaderProblemsPage />} />
          <Route path="/leader/applications" element={<LeaderApplicationsPage />} />
          <Route path="/leader/projects" element={<LeaderProjectsPage />} />
          <Route path="/leader/certificates" element={<LeaderCertificatesPage />} />
        </Route>

        <Route element={<ProtectedRoute requiredRole="university_admin"><UniversityLayout /></ProtectedRoute>}>
          <Route path="/admin/university" element={<UniversityDashboard />} />
          <Route path="/admin/university/teams" element={<UniversityTeamsPage />} />
          <Route path="/admin/university/problems" element={<UniversityProblemsPage />} />
          <Route path="/admin/university/applications" element={<UniversityProblemsPage />} />
          <Route path="/admin/university/evidence" element={<FeaturePage eyebrow="UNIVERSITY · EVIDENCE" title="Evidence verification" description="Review and verify member credentials." nextStep="The current university dashboard already contains the Phase 2 evidence queue. This route is a dedicated view placeholder until that workflow is extracted into its own page." />} />
          <Route path="/admin/university/completions" element={<UniversityCompletionPage />} />
        </Route>

        <Route element={<ProtectedRoute requiredRole="company"><CompanyLayout /></ProtectedRoute>}>
          <Route path="/company" element={<CompanyDashboard />} />
          <Route path="/company/projects" element={<FeaturePage eyebrow="COMPANY · PROJECT GALLERY" title="Approved projects" description="Discover completed and approved student projects with measurable civic impact." nextStep="The project gallery depends on Phase 5 project completion and company visibility APIs, which are not implemented yet." />} />
          <Route path="/company/sponsorships" element={<FeaturePage eyebrow="COMPANY · SPONSORSHIPS" title="My sponsorships" description="Track funding, mentorship, tools and internship pledges." nextStep="Sponsorship pledges and their lifecycle are Phase 5 backend features and are not implemented yet." />} />
        </Route>

        <Route element={<ProtectedRoute requiredRole="platform_admin"><PlatformAdminLayout /></ProtectedRoute>}>
          <Route path="/admin/platform" element={<PlatformAdminDashboard />} />
          <Route path="/admin/platform/universities" element={<PlatformAdminDashboard />} />
          <Route path="/admin/platform/workflows" element={<LifecycleWorkflowsPage />} />
          <Route path="/admin/platform/phase4" element={<LifecycleWorkflowsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
