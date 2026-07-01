import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";

// Route guard: unauthenticated users are sent to /login; users lacking the
// required role (e.g. ADMIN for /admin) are sent back to the main app.
const RequireAuth = ({ role, children }: { role?: string; children: ReactElement }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
};

export default RequireAuth;
