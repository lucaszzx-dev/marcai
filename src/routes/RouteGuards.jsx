import { Navigate, Outlet, useLocation } from "react-router-dom";
import Spinner from "../components/common/Spinner";
import { useAuth } from "../features/auth/AuthContext";
import { isSupabaseConfigured } from "../lib/supabase";
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (!isSupabaseConfigured) return <Navigate to="/configuracao" replace />;
  if (loading)
    return (
      <main className="center-page">
        <Spinner label="Verificando sua sessão…" />
      </main>
    );
  return user ? (
    <Outlet />
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
}
export function GuestRoute() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <main className="center-page">
        <Spinner label="Carregando…" />
      </main>
    );
  return user ? <Navigate to="/app" replace /> : <Outlet />;
}
