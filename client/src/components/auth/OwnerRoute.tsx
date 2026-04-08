import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { ReactNode } from 'react';

export default function OwnerRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/owner/login" replace />;
  }

  if (user.role !== 'owner') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
