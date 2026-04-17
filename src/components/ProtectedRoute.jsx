import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from './ui/Spinner';

/**
 * Wraps a route to require authentication.
 * - Waits for the initial /auth/me re-validation to complete before redirecting.
 *   This prevents a flash-to-login on every hard refresh when the token is valid.
 * - Optional `roles` prop restricts access to certain roles.
 */
export default function ProtectedRoute({ children, roles }) {
  const { user, authLoading } = useAuth();
  const location = useLocation();

  // Show a loading screen while AuthContext re-validates the stored token.
  // Without this, every page refresh would flash the login screen briefly.
  if (authLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
