import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isAllowedRole, getDefaultRouteByRole } from '../utils/roleRoutes';

/**
 * Wraps routes that require authentication.
 * Redirects to /login if not authenticated.
 */
export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loader-overlay">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner spinner-lg" />
          <p className="text-secondary text-sm">Loading workspace…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles.length && !isAllowedRole(user?.role, allowedRoles)) {
    return <Navigate to={getDefaultRouteByRole(user?.role)} replace />;
  }

  return children;
}
