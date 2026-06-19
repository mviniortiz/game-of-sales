import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

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
    // Logado sem empresa (ex.: entrou via Google) → completa o cadastro simples
    // (/criar-conta detecta o modo SSO e pede só o nome da agência).
    const needsCompany = !!profile && !profile.is_super_admin && !companyId && !isSuperAdmin;
    if (needsCompany) {
      navigate("/criar-conta", { replace: true });
      return;
    }
  }, [user, loading, profile, companyId, isSuperAdmin, navigate, signOut]);

  if (loading) {
    return <BrandedLoader label="Carregando..." />;
  }

  if (!user) {
    return null;
  }

  // Profile ainda carregando: loader amigável (effect de signOut cuida se persistir)
  if (!profile) {
    return <BrandedLoader label="Carregando perfil..." />;
  }

  // Sem company — effect já redirecionou pro onboarding, renderiza nada
  if (!profile.is_super_admin && !companyId) {
    return null;
  }

  return <>{children}</>;
};
