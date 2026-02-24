import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, profile, companyId, isSuperAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const invalidSessionCleanupInProgress = useRef(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }

    const missingProfile = !!user && !profile;
    const missingCompanyContext = !!user && !!profile && !profile.is_super_admin && !companyId && !isSuperAdmin;

    if (!loading && (missingProfile || missingCompanyContext) && !invalidSessionCleanupInProgress.current) {
      invalidSessionCleanupInProgress.current = true;
      void signOut().finally(() => {
        invalidSessionCleanupInProgress.current = false;
      });
    }
  }, [user, loading, profile, companyId, isSuperAdmin, navigate, signOut]);

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

  if (!user) {
    return null;
  }

  if (!profile) {
    return null;
  }

  if (!profile.is_super_admin && !companyId) {
    return null;
  }

  return <>{children}</>;
};
