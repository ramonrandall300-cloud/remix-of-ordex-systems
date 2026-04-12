import { Navigate, Outlet, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const { lang } = useParams<{ lang: string }>();
  const prefix = lang || "en";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/${prefix}/auth`} replace />;
  }

  return <Outlet />;
}
