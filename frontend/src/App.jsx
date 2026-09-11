import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import LandlordDashboard from './pages/landlord/LandlordDashboard';
import LandlordIntake from './pages/landlord/LandlordIntake';
import LandlordDisputeDetail from './pages/landlord/LandlordDisputeDetail';
import TenantDashboard from './pages/tenant/TenantDashboard';
import TenantDisputeDetail from './pages/tenant/TenantDisputeDetail';
import MediatorDashboard from './pages/mediator/MediatorDashboard';
import MediatorCaseDetail from './pages/mediator/MediatorCaseDetail';
import SettlementView from './pages/settlement/SettlementView';

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F5]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#B68400] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading GharPay session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect user to their appropriate role home
    switch (user.role) {
      case 'LANDLORD':
        return <Navigate to="/landlord" replace />;
      case 'TENANT':
        return <Navigate to="/tenant" replace />;
      case 'MEDIATOR':
        return <Navigate to="/mediator" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-[#F7F7F5] flex flex-col text-[#111111] antialiased">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Landlord Routes */}
              <Route
                path="/landlord"
                element={
                  <ProtectedRoute allowedRoles={['LANDLORD']}>
                    <LandlordDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/landlord/intake"
                element={
                  <ProtectedRoute allowedRoles={['LANDLORD']}>
                    <LandlordIntake />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/landlord/dispute/:id"
                element={
                  <ProtectedRoute allowedRoles={['LANDLORD']}>
                    <LandlordDisputeDetail />
                  </ProtectedRoute>
                }
              />

              {/* Tenant Routes */}
              <Route
                path="/tenant"
                element={
                  <ProtectedRoute allowedRoles={['TENANT']}>
                    <TenantDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tenant/dispute/:id"
                element={
                  <ProtectedRoute allowedRoles={['TENANT']}>
                    <TenantDisputeDetail />
                  </ProtectedRoute>
                }
              />

              {/* Mediator Routes */}
              <Route
                path="/mediator"
                element={
                  <ProtectedRoute allowedRoles={['MEDIATOR']}>
                    <MediatorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mediator/dispute/:id"
                element={
                  <ProtectedRoute allowedRoles={['MEDIATOR']}>
                    <MediatorCaseDetail />
                  </ProtectedRoute>
                }
              />

              {/* Settlement Page (accessible by any logged in party) */}
              <Route
                path="/settlement/:id"
                element={
                  <ProtectedRoute>
                    <SettlementView />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <footer className="bg-white border-t border-[#E5E5E5] py-6 text-center text-xs text-[#737373]">
            <p>© 2026 GharPay ODR Platform. Security deposit dispute resolution for Karnataka, India.</p>
            <p className="mt-1">GharPay is an Online Dispute Resolution platform and not a court of law.</p>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}
