import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ProSearch } from './pages/ProSearch';
import { ProDetails } from './pages/ProDetails';
import { ProOnboarding } from './pages/ProOnboarding';
import { MyJobs } from './pages/MyJobs';
import { JobDetails } from './pages/JobDetails';
import { AdminDashboard } from './pages/AdminDashboard';
import { BootstrapAdmin } from './pages/BootstrapAdmin';

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/pros" element={<ProSearch />} />
                <Route path="/pros/:id" element={<ProDetails />} />
                
                <Route
                  path="/jobs"
                  element={
                    <ProtectedRoute>
                      <MyJobs />
                    </ProtectedRoute>
                  }
                />
                
                <Route
                  path="/jobs/:id"
                  element={
                    <ProtectedRoute>
                      <JobDetails />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/pro/onboarding"
                  element={
                    <ProtectedRoute allowedRoles={['pro']}>
                      <ProOnboarding />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route path="/admin/bootstrap" element={<BootstrapAdmin />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;
