import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type AuthProfile = {
  nome: string;
  avatar_url: string | null;
  is_super_admin: boolean;
  company_id: string | null;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  companyId: string | null;
  profile: AuthProfile | null;
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
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const integrityResetInProgress = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);
  const navigate = useNavigate();

  const clearProfileState = () => {
    setProfile(null);
    setIsSuperAdmin(false);
    setCompanyId(null);
  };

  const loadProfile = async (userId: string): Promise<"ok" | "missing" | "invalid" | "error"> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("nome, avatar_url, is_super_admin, company_id")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error loading profile:", error);
        clearProfileState();
        return "error";
      }

      if (!data) {
        console.warn("[AuthContext] Auth user has no profile row:", userId);
        clearProfileState();
        return "missing";
      }

      // Regular users must be linked to a company. Super admins can operate without
      // a default company because TenantContext can select one later.
      if (!data.is_super_admin && !data.company_id) {
        console.warn("[AuthContext] Profile is missing company_id for non-super-admin user:", userId);
        clearProfileState();
        return "invalid";
      }

      setProfile(data);
      setIsSuperAdmin(data.is_super_admin || false);
      setCompanyId(data.company_id);
      return "ok";
    } catch (error) {
      console.error("Error loading profile:", error);
      clearProfileState();
      return "error";
    }
  };

  const refreshProfile = async () => {
    // Primary: use user from state (fast path)
    if (user?.id) {
      await loadProfile(user.id);
      return;
    }
    // Fallback: state may not yet reflect new session (e.g. right after
    // supabase.auth.signUp() before onAuthStateChange fires). Read directly
    // from the Supabase client to get the freshest session.
    const { data: { session: freshSession } } = await supabase.auth.getSession();
    if (freshSession?.user?.id) {
      setUser(freshSession.user);
      setSession(freshSession);
      await loadProfile(freshSession.user.id);
    }
  };

  const clearAuthState = () => {
    setUser(null);
    setSession(null);
    clearProfileState();
    setIsAdmin(false);
    localStorage.removeItem("activeCompanyId");
  };

  const forceSignOutForInvalidAccount = async (reason: string) => {
    if (integrityResetInProgress.current) return;

    integrityResetInProgress.current = true;
    console.warn("[AuthContext] Forcing sign-out due to invalid account state:", reason);

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error during forced signOut:", error);
    } finally {
      clearAuthState();
      setLoading(false);
      navigate("/auth", {
        replace: true,
        state: { authError: "invalid_profile", reason },
      });
      integrityResetInProgress.current = false;
    }
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

        if ((event as string) === "TOKEN_REFRESH_FAILED") {
          console.warn("Token refresh failed; clearing session");
          clearAuthState();
          navigate("/auth");
          setLoading(false);
          return;
        }

        const newUserId = session?.user?.id ?? null;
        const isSameUser = newUserId !== null && newUserId === currentUserIdRef.current;

        // On TOKEN_REFRESHED for the same user (tab return), only update the
        // session token silently — avoid re-rendering the entire tree.
        if (isSameUser && event === "TOKEN_REFRESHED") {
          setSession(prev => {
            if (prev?.access_token === session?.access_token) return prev;
            return session;
          });
          return;
        }

        // Duplicate SIGNED_IN for same user — skip heavy profile reload but
        // still ensure loading is false so ProtectedRoute doesn't block.
        if (isSameUser && event === "SIGNED_IN") {
          setSession(prev => {
            if (prev?.access_token === session?.access_token) return prev;
            return session;
          });
          setLoading(false);
          return;
        }

        currentUserIdRef.current = newUserId;
        setSession(session);
        setUser(session?.user ?? null);

        // Defer async operations to prevent blocking
        if (session?.user) {
          setLoading(true);
          setTimeout(() => {
            Promise.all([
              checkAdminRole(session.user.id),
              loadProfile(session.user.id)
            ]).then(async ([, profileStatus]) => {
              if (!mounted) return;

              if (profileStatus === "missing" || profileStatus === "invalid") {
                await forceSignOutForInvalidAccount(profileStatus);
              }
            }).finally(() => {
              if (mounted && !integrityResetInProgress.current) setLoading(false);
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

      currentUserIdRef.current = session?.user?.id ?? null;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setLoading(true);
        Promise.all([
          checkAdminRole(session.user.id),
          loadProfile(session.user.id)
        ]).then(async ([, profileStatus]) => {
          if (!mounted) return;

          if (profileStatus === "missing" || profileStatus === "invalid") {
            await forceSignOutForInvalidAccount(profileStatus);
          }
        }).finally(() => {
          if (mounted && !integrityResetInProgress.current) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }).catch((error) => {
      console.error("Error getting session:", error);
      if (mounted) setLoading(false);
    });

    // Cross-tab logout sync: detect when another tab signs out by
    // listening for the Supabase auth token being removed from storage.
    const handleStorageChange = (e: StorageEvent) => {
      // Supabase stores its session under a key matching this pattern
      if (e.key && e.key.includes("auth-token") && e.newValue === null) {
        clearAuthState();
        navigate("/auth");
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener("storage", handleStorageChange);
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

  // Stabilize session reference — consumers never use the session object
  // directly, so we keep a ref to avoid re-renders on token refresh.
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;
  const stableSession = useMemo(() => session, [session?.access_token]);

  const contextValue = useMemo(() => ({
    user,
    session: stableSession,
    loading,
    isAdmin,
    isSuperAdmin,
    companyId,
    profile,
    refreshProfile,
    signUp,
    signIn,
    signOut
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [user, loading, isAdmin, isSuperAdmin, companyId, profile]);

  return (
    <AuthContext.Provider value={contextValue}>
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
