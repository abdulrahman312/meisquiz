import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { Login } from './components/Login';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { AdminDashboard } from './components/AdminDashboard';

const ProtectedRoute: React.FC<{ children: React.ReactNode, role?: 'admin' | 'employee' }> = ({ children, role }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (role && user.role !== role) {
    // Redirect if role doesn't match
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/quiz" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Application...</div>;

  return (
    <Routes>
      <Route path="/" element={
        user ? (user.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/quiz" />) : <Login />
      } />
      
      <Route path="/quiz" element={
        <ProtectedRoute role="employee">
          <EmployeeDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/admin" element={
        <ProtectedRoute role="admin">
          <AdminDashboard />
        </ProtectedRoute>
      } />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;