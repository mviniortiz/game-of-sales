import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { AuthPreview } from "@/components/auth/AuthPreview";
import { AuthField } from "@/components/auth/AuthField";
import { APP_HOME } from "@/config/routes";

// LP.6/AUTH.1 — login premium dark. Duas colunas: form à esquerda, painel que
// VENDE à direita (orb + cartão de rascunho da EVA). AUTH.1: validação inline
// com erro no campo (não toast), toggle de senha, aviso de caps lock, Google
// com loading próprio, email viaja pra recuperação/cadastro via router state.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const LoginV2 = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { signIn, user, profile, isSuperAdmin, companyId, loading: authLoading } = useAuth();
    const [email, setEmail] = useState(
        // volta da recuperação/cadastro com o email preenchido (amarração do fluxo)
        (((location.state as { email?: string } | null)?.email) ?? "").toLowerCase(),
    );
    const [senha, setSenha] = useState("");
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [showSenha, setShowSenha] = useState(false);
    const [capsOn, setCapsOn] = useState(false);
    const [erros, setErros] = useState<{ email?: string; senha?: string; form?: string }>({});
    const [erroKey, setErroKey] = useState(0);

    // já logado (com contexto válido) → vai pro app
    useEffect(() => {
        const ok = !!profile && (profile.is_super_admin || isSuperAdmin || !!companyId);
        if (!authLoading && user && ok) navigate(APP_HOME, { replace: true });
    }, [authLoading, user, profile, isSuperAdmin, companyId, navigate]);

    const trackCaps = (e: KeyboardEvent<HTMLInputElement>) =>
        setCapsOn(e.getModifierState?.("CapsLock") ?? false);

    const validaEmail = () => {
        if (!email.trim()) return "Informe seu email.";
        if (!EMAIL_RE.test(email.trim())) return "Email inválido.";
        return null;
    };

    const handleGoogle = async () => {
        setGoogleLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}${APP_HOME}`,
                    queryParams: { access_type: "offline", prompt: "consent" },
                },
            });
            if (error) { toast.error("Não foi possível entrar com Google: " + error.message); setGoogleLoading(false); }
        } catch {
            toast.error("Erro no login com Google.");
            setGoogleLoading(false);
        }
    };

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const emailErro = validaEmail();
        const senhaErro = !senha ? "Informe sua senha." : senha.length < 8 ? "A senha tem no mínimo 8 caracteres." : null;
        setErros({ email: emailErro ?? undefined, senha: senhaErro ?? undefined });
        setErroKey((k) => k + 1);
        if (emailErro || senhaErro) return;

        setLoading(true);
        try {
            const { error } = await signIn(email.trim(), senha);
            if (error) {
                if (error.message.includes("Invalid login credentials")) {
                    // erro inline no form, com caminho direto pra recuperação
                    setErros({ form: "Email ou senha inválidos." });
                    setErroKey((k) => k + 1);
                } else {
                    setErros({ form: error.message });
                    setErroKey((k) => k + 1);
                }
            } else {
                toast.success("Login realizado!");
            }
        } catch {
            setErros({ form: "Erro ao processar o login. Tente de novo." });
            setErroKey((k) => k + 1);
        } finally {
            setLoading(false);
        }
    };

    const busy = loading || authLoading;

    return (
        <div className="lp-v2 vz-auth-claro" style={{ minHeight: "100vh", backgroundColor: "#F6F4EF", color: "#0B1220" }}>
            <div className="grid min-h-screen lg:grid-cols-[0.88fr_1.12fr]">
                {/* ── Coluna do formulário ───────────────────────────── */}
                <div className="relative flex flex-col px-6 py-8 sm:px-12 sm:py-10">
                    <div className="flex items-center gap-3 self-start landing-fade-in-up">
                        <button
                            onClick={() => navigate("/")}
                            className="flex items-center opacity-90 transition-opacity hover:opacity-100"
                            aria-label="Vyzon"
                           
                        >
                            <ThemeLogo variant="default" className="h-6 w-auto" />
                        </button>
                        <span className="h-4 w-px" style={{ background: "rgba(11,18,32,0.14)" }} aria-hidden />
                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            className="inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors"
                            style={{ color: "rgba(11,18,32,0.62)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(11,18,32,0.9)")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(11,18,32,0.62)")}
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Voltar ao site
                        </button>
                    </div>

                    <div className="flex flex-1 items-center">
                        <div className="mx-auto w-full max-w-[380px] py-12">
                            <h1 className="lp-display landing-fade-in-up landing-delay-100" style={{ fontSize: "clamp(2.3rem, 4vw, 2.9rem)", lineHeight: 1, letterSpacing: "-0.03em", color: "#0B1220" }}>
                                Entrar
                            </h1>
                            <p className="mt-2.5 landing-fade-in-up landing-delay-150" style={{ color: "rgba(11,18,32,0.66)", fontSize: "1rem" }}>
                                Acesse suas propostas e conversas.
                            </p>

                            <button
                                type="button"
                                onClick={handleGoogle}
                                disabled={busy || googleLoading}
                                className="mt-9 flex w-full items-center justify-center gap-2.5 rounded-full py-3 text-[14px] font-semibold transition-transform active:scale-[0.98] disabled:opacity-50 landing-fade-in-up landing-delay-200"
                                style={{ background: "#fff", color: "#0B1220", border: "1px solid #D7DEE9" }}
                            >
                                {googleLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Conectando ao Google…
                                    </>
                                ) : (
                                    <>
                                        <svg width="17" height="17" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                        Entrar com Google
                                    </>
                                )}
                            </button>

                            <div className="my-6 flex items-center gap-3 landing-fade-in-up landing-delay-250">
                                <span className="h-px flex-1" style={{ background: "rgba(11,18,32,0.1)" }} />
                                <span className="text-[11px]" style={{ color: "rgba(11,18,32,0.58)" }}>ou com email</span>
                                <span className="h-px flex-1" style={{ background: "rgba(11,18,32,0.1)" }} />
                            </div>

                            <form className="flex flex-col gap-5 landing-fade-in-up landing-delay-300" onSubmit={onSubmit} noValidate>
                                <AuthField
                                    label="Email"
                                    type="email"
                                    placeholder="voce@suaempresa.com"
                                    value={email}
                                    onChange={(v) => { setEmail(v); if (erros.email || erros.form) setErros({}); }}
                                    onBlur={() => { const e = validaEmail(); if (email.trim()) setErros((p) => ({ ...p, email: e ?? undefined })); }}
                                    autoComplete="email"
                                    autoFocus
                                    error={erros.email}
                                    errorKey={erroKey}
                                />
                                <AuthField
                                    label="Senha"
                                    type={showSenha ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={senha}
                                    onChange={(v) => { setSenha(v); if (erros.senha || erros.form) setErros({}); }}
                                    onKeyDown={trackCaps}
                                    onKeyUp={trackCaps}
                                    autoComplete="current-password"
                                    error={erros.senha}
                                    errorKey={erroKey}
                                    rightSlot={
                                        <button
                                            type="button"
                                            onClick={() => setShowSenha((s) => !s)}
                                            aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                                            style={{ color: "rgba(11,18,32,0.58)" }}
                                            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(11,18,32,0.86)")}
                                            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(11,18,32,0.58)")}
                                        >
                                            {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    }
                                />
                                {capsOn && (
                                    <p className="-mt-3 text-[12px]" style={{ color: "rgba(251,191,36,0.85)" }} aria-live="polite">
                                        Caps Lock ativado.
                                    </p>
                                )}

                                {erros.form && (
                                    <div key={`f${erroKey}`} className="vz-shake rounded-xl px-3.5 py-2.5" style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)" }} role="alert">
                                        <p className="text-[13px]" style={{ color: "#BE123C" }}>{erros.form}</p>
                                        {erros.form.includes("inválidos") && (
                                            <button
                                                type="button"
                                                onClick={() => navigate("/recuperar-senha", { state: { email: email.trim() } })}
                                                className="mt-1 text-[12.5px] underline underline-offset-4"
                                                style={{ color: "rgba(11,18,32,0.78)" }}
                                            >
                                                Recuperar senha com este email
                                            </button>
                                        )}
                                    </div>
                                )}

                                <button type="submit" disabled={busy} className="vz-btn vz-btn--primary mt-3 w-full disabled:opacity-50">
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Entrando…
                                        </span>
                                    ) : (
                                        "Entrar"
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => navigate("/recuperar-senha", { state: { email: email.trim() } })}
                                    className="self-center text-[13px] transition-colors"
                                    style={{ color: "rgba(11,18,32,0.62)" }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(11,18,32,0.9)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(11,18,32,0.62)")}
                                >
                                    Esqueci minha senha
                                </button>
                            </form>

                            <p className="mt-10 text-[13px] landing-fade-in-up landing-delay-400" style={{ color: "rgba(11,18,32,0.58)" }}>
                                Ainda não tem conta?{" "}
                                <button type="button" onClick={() => navigate("/criar-conta?plan=pro", { state: { email: email.trim() } })} style={{ color: "rgba(11,18,32,0.88)", fontWeight: 500 }} className="hover:underline">
                                    Criar conta grátis
                                </button>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="relative hidden p-4 sm:p-5 lg:block">
                    <AuthPreview modo="login" />
                </div>
            </div>
        </div>
    );
};

export default LoginV2;
