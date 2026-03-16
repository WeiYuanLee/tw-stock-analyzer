import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';
import { useAdminStore } from './store/adminStore';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import StockAnalysis from './pages/StockAnalysis';
import AIAssistant from './pages/AIAssistant';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminOrders from './pages/AdminOrders';
import AdminSubscriptions from './pages/AdminSubscriptions';

// Components
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';

function App() {
  const { initialize, isAuthenticated } = useAuthStore();
  const { initialize: initAdmin } = useAdminStore();

  useEffect(() => {
    initialize();
    initAdmin();
  }, []);

  return (
    <Router>
      <Routes>
        {/* Admin routes - no Navbar */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route 
          path="/admin/dashboard" 
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          } 
        />
        <Route 
          path="/admin/users" 
          element={
            <AdminProtectedRoute>
              <AdminUsers />
            </AdminProtectedRoute>
          } 
        />
        <Route 
          path="/admin/orders" 
          element={
            <AdminProtectedRoute>
              <AdminOrders />
            </AdminProtectedRoute>
          } 
        />
        <Route 
          path="/admin/subscriptions" 
          element={
            <AdminProtectedRoute>
              <AdminSubscriptions />
            </AdminProtectedRoute>
          } 
        />
        
        {/* User routes - with Navbar */}
        <Route path="*" element={
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify/:token" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/analysis" 
                element={
                  <ProtectedRoute>
                    <StockAnalysis />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/ai" 
                element={
                  <ProtectedRoute>
                    <AIAssistant />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
