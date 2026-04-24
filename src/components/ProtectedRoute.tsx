import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, profile, companyId, isSuperAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const corruptedSessionCleanupInProgress = useRef(false);

  useEffect(() => {
    if (loading) return;

    // Não logado: manda pro /auth
    if (!user) {
      navigate("/auth");
      return;
    }

    // Logado + sem profile row: estado realmente corrompido, faz signOut.
    // (Trigger handle_new_user deveria criar profile automaticamente após signup/SSO)
    if (!profile && !corruptedSessionCleanupInProgress.current) {
      corruptedSessionCleanupInProgress.current = true;
      void signOut().finally(() => {
        corruptedSessionCleanupInProgress.current = false;
      });
      return;
    }

    // Logado + profile existe + sem company_id + não é super_admin:
    // Precisa completar o onboarding. Acontece quando:
    //   1. Registro via SSO Google (profile criado sem company)
    //   2. Abandonou o wizard antes de criar a company
    //   3. Dados corrompidos
    // Redireciona pro /onboarding?step=2 — wizard pula step 1 pq isLoggedIn=true
    const needsOnboarding = !!profile && !profile.is_super_admin && !companyId && !isSuperAdmin;
    if (needsOnboarding) {
      navigate("/onboarding?step=2", { replace: true });
      return;
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

  // Profile ainda carregando: loader amigável (effect de signOut cuida se persistir)
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  // Sem company — effect já redirecionou pro onboarding, renderiza nada
  if (!profile.is_super_admin && !companyId) {
    return null;
  }

  return <>{children}</>;
};
