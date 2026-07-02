import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";

// Route guard: unauthenticated users are sent to /login; users lacking the
// required role are sent to `fallbackTo` (the admin app points this at /login
// so a non-admin session can never loop through its protected routes).
const RequireAuth = ({
  role,
  fallbackTo = "/",
  children,
}: {
  role?: string;
  fallbackTo?: string;
  children: ReactElement;
}) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (role && user.role !== role) return <Navigate to={fallbackTo} replace />;
  return children;
};

export default RequireAuth;
