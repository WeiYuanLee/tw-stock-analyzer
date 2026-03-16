import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminStore } from '../store/adminStore';

function AdminProtectedRoute({ children }) {
  const { isAuthenticated } = useAdminStore();

  if (!isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

export default AdminProtectedRoute;
