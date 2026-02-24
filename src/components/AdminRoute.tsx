import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
      return;
    }

    if (!loading && user && !isAdmin) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, isAdmin, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return <>{children}</>;
};
