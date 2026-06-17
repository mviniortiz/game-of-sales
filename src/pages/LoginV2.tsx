import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { AnimatedMeshAsset } from "@/components/landing-v2/AnimatedMeshAsset";
import meshSrc from "@/assets/landing-v2/login-mesh.webp";

// LP.6 (v2) — login premium dark, AGORA com auth real (Supabase via AuthContext).
// Duas colunas: form à esquerda, painel mesh animado à direita. Roda dentro do
// AppShell (AuthProvider). Rota /auth.
const LoginV2 = () => {
    const navigate = useNavigate();
    const { signIn, user, profile, isSuperAdmin, companyId, loading: authLoading } = useAuth();
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [loading, setLoading] = useState(false);

    // já logado (com contexto válido) → vai pro app
    useEffect(() => {
        const ok = !!profile && (profile.is_super_admin || isSuperAdmin || !!companyId);
        if (!authLoading && user && ok) navigate("/dashboard", { replace: true });
    }, [authLoading, user, profile, isSuperAdmin, companyId, navigate]);

    const handleGoogle = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}/dashboard`,
                    queryParams: { access_type: "offline", prompt: "consent" },
                },
            });
            if (error) { toast.error("Não foi possível entrar com Google: " + error.message); setLoading(false); }
        } catch (err) {
            toast.error("Erro no login com Google.");
            setLoading(false);
        }
    };

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!email || !senha) { toast.error("Preencha email e senha."); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { toast.error("Email inválido."); return; }
        if (senha.length < 8) { toast.error("A senha deve ter no mínimo 8 caracteres."); return; }
        setLoading(true);
        try {
            const { error } = await signIn(email.trim(), senha);
            if (error) {
                toast.error(error.message.includes("Invalid login credentials") ? "Email ou senha inválidos." : error.message);
            } else {
                toast.success("Login realizado!");
            }
        } catch {
            toast.error("Erro ao processar o login.");
        } finally {
            setLoading(false);
        }
    };

    const busy = loading || authLoading;

    return (
        <div className="lp-v2" style={{ minHeight: "100vh", backgroundColor: "#07080A", color: "#fff" }}>
            <div className="grid min-h-screen lg:grid-cols-[0.88fr_1.12fr]">
                {/* ── Coluna do formulário ───────────────────────────── */}
                <div className="relative flex flex-col px-6 py-8 sm:px-12 sm:py-10">
                    <button
                        onClick={() => navigate("/")}
                        className="flex items-center self-start opacity-90 transition-opacity hover:opacity-100"
                        aria-label="Vyzon"
                        style={{ filter: "brightness(0) invert(1)" }}
                    >
                        <ThemeLogo className="h-6 w-auto" />
                    </button>

                    <div className="flex flex-1 items-center">
                        <div className="mx-auto w-full max-w-[380px] py-12">
                            <h1 className="lp-display" style={{ fontSize: "clamp(2.3rem, 4vw, 2.9rem)", lineHeight: 1, letterSpacing: "-0.03em", color: "#fff" }}>
                                Entrar
                            </h1>
                            <p className="mt-2.5" style={{ color: "rgba(255,255,255,0.55)", fontSize: "1rem" }}>
                                Acesse sua central comercial.
                            </p>

                            <button
                                type="button"
                                onClick={handleGoogle}
                                disabled={busy}
                                className="mt-9 flex w-full items-center justify-center gap-2.5 rounded-full py-3 text-[14px] font-semibold transition-colors disabled:opacity-50"
                                style={{ background: "#fff", color: "#0B1220" }}
                            >
                                <svg width="17" height="17" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                Entrar com Google
                            </button>

                            <div className="my-6 flex items-center gap-3">
                                <span className="h-px flex-1" style={{ background: "rgba(255,255,255,0.12)" }} />
                                <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>ou com email</span>
                                <span className="h-px flex-1" style={{ background: "rgba(255,255,255,0.12)" }} />
                            </div>

                            <form className="flex flex-col gap-5" onSubmit={onSubmit}>
                                <label className="flex flex-col gap-2">
                                    <span className="text-[12.5px]" style={{ color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>Email</span>
                                    <input type="email" className="vz-input" placeholder="voce@suaagencia.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-[12.5px]" style={{ color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>Senha</span>
                                    <input type="password" className="vz-input" placeholder="••••••••" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
                                </label>

                                <button type="submit" disabled={busy} className="vz-btn vz-btn--light mt-3 w-full disabled:opacity-50">
                                    {busy ? "Entrando…" : "Entrar"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => navigate("/recuperar-senha")}
                                    className="self-center text-[13px] transition-colors"
                                    style={{ color: "rgba(255,255,255,0.5)" }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.85)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                                >
                                    Esqueci minha senha
                                </button>
                            </form>

                            <p className="mt-10 text-[13px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                                Ainda não tem conta?{" "}
                                <button type="button" onClick={() => navigate("/onboarding?plan=plus")} style={{ color: "rgba(255,255,255,0.82)", fontWeight: 500 }} className="hover:underline">
                                    Criar conta grátis
                                </button>
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Coluna visual (painel; só a imagem desliza dentro) ── */}
                <div className="relative hidden p-4 sm:p-5 lg:block">
                    <AnimatedMeshAsset src={meshSrc} className="h-full w-full rounded-[30px]" />
                </div>
            </div>
        </div>
    );
};

export default LoginV2;
