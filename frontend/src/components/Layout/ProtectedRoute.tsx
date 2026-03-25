import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../hooks/useAppDispatch';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
