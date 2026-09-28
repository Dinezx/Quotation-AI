import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fbf9f4]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#172033]/20 border-t-[#B87333] rounded-full animate-spin" />
          <span className="text-xs font-mono font-semibold text-[#64748B] tracking-wider uppercase">
            Verifying Industrial Session...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
