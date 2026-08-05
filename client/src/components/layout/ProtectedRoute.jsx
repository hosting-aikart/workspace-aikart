import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isAllowedRole, getDefaultRouteByRole } from '../../utils/roleRoutes';

import { AppSkeleton } from '../common/Skeleton';

/**
 * Wraps routes that require authentication.
 * Redirects to /login if not authenticated.
 */
export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AppSkeleton />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles.length && !isAllowedRole(user?.role, allowedRoles)) {
    return <Navigate to={getDefaultRouteByRole(user?.role)} replace />;
  }

  return children;
}
