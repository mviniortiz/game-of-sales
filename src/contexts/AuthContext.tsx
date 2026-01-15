import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  companyId: string | null;
  profile: {
    nome: string;
    avatar_url: string | null;
    is_super_admin: boolean;
    company_id: string | null;
  } | null;
  refreshProfile: () => Promise<void>;
  signUp: (email: string, password: string, nome: string, companyId?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    nome: string;
    avatar_url: string | null;
    is_super_admin: boolean;
    company_id: string | null;
  } | null>(null);
  const navigate = useNavigate();

  const loadProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("nome, avatar_url, is_super_admin, company_id")
        .eq("id", userId)
        .single();

      if (data) {
        setProfile(data);
        setIsSuperAdmin(data.is_super_admin || false);
        setCompanyId(data.company_id);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await loadProfile(user.id);
    }
  };

  const clearAuthState = () => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
    setIsSuperAdmin(false);
    setCompanyId(null);
    localStorage.removeItem("activeCompanyId");
  };

  useEffect(() => {
    let mounted = true;

    const checkAdminRole = async (userId: string) => {
      try {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();

        if (mounted) {
          setIsAdmin(!!data);
        }
      } catch (error) {
        console.error("Error checking admin role:", error);
        if (mounted) {
          setIsAdmin(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        if (event === "TOKEN_REFRESH_FAILED") {
          console.warn("Token refresh failed; clearing session");
          clearAuthState();
          navigate("/auth");
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        // Defer async operations to prevent blocking
        if (session?.user) {
          setTimeout(() => {
            Promise.all([
              checkAdminRole(session.user.id),
              loadProfile(session.user.id)
            ]).finally(() => {
              if (mounted) setLoading(false);
            });
          }, 0);
        } else {
          clearAuthState();
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        Promise.all([
          checkAdminRole(session.user.id),
          loadProfile(session.user.id)
        ]).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }).catch((error) => {
      console.error("Error getting session:", error);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, nome: string, companyId?: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          nome,
          company_id: companyId || '00000000-0000-0000-0000-000000000001'
        }
      }
    });

    if (!error) {
      navigate("/dashboard");
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) {
      navigate("/dashboard");
    }

    return { error };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error during signOut:", error);
    } finally {
      clearAuthState();
      navigate("/auth");
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isAdmin,
      isSuperAdmin,
      companyId,
      profile,
      refreshProfile,
      signUp,
      signIn,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
