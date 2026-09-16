import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getAttribution } from "@/lib/attribution";
import { trackBehavior, FUNNEL_EVENTS } from "@/lib/analytics";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { CloudWaveOrb } from "@/components/landing-v2/CloudWaveOrb";
import { AuthField } from "@/components/auth/AuthField";
import { scorePassword, STRENGTH_META } from "@/components/auth/password";
import { APP_HOME } from "@/config/routes";

// Cadastro SIMPLES (substitui o wizard de onboarding): 1 tela → conta criada com
// trial de 14 dias ativo (sem cartão) → direto pro app. Trata 2 modos: (a) novo
// usuário (nome+empresa+email+senha ou Google); (b) usuário que entrou via Google
// e ainda não tem empresa (pede só o nome da empresa). Rota /criar-conta.
const SignupV2 = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [params] = useSearchParams();
    // Mantido só pra analytics/atribuição de origem: independente do card
    // clicado, TODO cadastro entra em trial do Pro (14d) e degrada pro Free.
    const plan = (params.get("plan") || "pro").toLowerCase();
    const { user, profile, companyId, isSuperAdmin, loading: authLoading, signUp, signIn, refreshProfile } = useAuth();

    const [nome, setNome] = useState("");
    const [empresa, setEmpresa] = useState("");
    const [email, setEmail] = useState(
        // veio do login com o email preenchido (amarração do fluxo)
        (((location.state as { email?: string } | null)?.email) ?? "").toLowerCase(),
    );
    const [senha, setSenha] = useState("");
    const [loading, setLoading] = useState(false);
    const [erros, setErros] = useState<{ nome?: string; empresa?: string; email?: string; senha?: string; form?: string; formAction?: "login" }>({});
    const [erroKey, setErroKey] = useState(0);
    const [showSenha, setShowSenha] = useState(false);
    // email pra onde foi o link de confirmação; quando setado, troca o form
    // pela tela de "confirme seu email" (conta criada mas sem sessão ainda).
    const [confirmSentTo, setConfirmSentTo] = useState<string | null>(null);
    const [reenviando, setReenviando] = useState(false);
    const [reenvioCooldown, setReenvioCooldown] = useState(0);

    // veio do Google (logado) mas ainda sem empresa → só completar o nome da empresa
    const ssoMode = !authLoading && !!user && !companyId && !isSuperAdmin;

    // Analytics: início do registro (chegou no cadastro), com o plano escolhido.
    useEffect(() => {
        trackBehavior(FUNNEL_EVENTS.REGISTER_START, { plan });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // já logado e com empresa → vai pro app
    useEffect(() => {
        const ok = !!profile && (profile.is_super_admin || isSuperAdmin || !!companyId);
        if (!authLoading && user && ok) navigate(APP_HOME, { replace: true });
    }, [authLoading, user, profile, isSuperAdmin, companyId, navigate]);

    // Tela de confirmação: se a pessoa confirmar em outra aba, esta aqui
    // detecta a sessão nova e entra no app sozinha (sem procurar o botão).
    useEffect(() => {
        if (!confirmSentTo) return;
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            // SIGNED_IN cobre o clique no link de confirmação em outra aba.
            if (event === "SIGNED_IN") {
                navigate(APP_HOME, { replace: true });
            }
        });
        return () => subscription.unsubscribe();
    }, [confirmSentTo, navigate]);

    // Cooldown do botão reenviar (evita spam no rate limit do Supabase).
    useEffect(() => {
        if (reenvioCooldown <= 0) return;
        const t = window.setTimeout(() => setReenvioCooldown((s) => s - 1), 1000);
        return () => window.clearTimeout(t);
    }, [reenvioCooldown]);

    const reenviarConfirmacao = async () => {
        if (reenviando || reenvioCooldown > 0 || !confirmSentTo) return;
        setReenviando(true);
        try {
            const { error } = await supabase.auth.resend({ type: "signup", email: confirmSentTo });
            if (error) {
                toast.error("Não foi possível reenviar agora. Aguarde um minuto.");
            } else {
                toast.success("Email reenviado. Confira o spam também.");
                setReenvioCooldown(30);
            }
        } finally {
            setReenviando(false);
        }
    };

    // cria a company já com o trial de 14 dias ligado; devolve o id
    const createCompanyWithTrial = async (): Promise<string> => {
        const trialEnds = new Date(Date.now() + 14 * 86400000).toISOString();
        const attribution = getAttribution() || {};
        // plan: 'pro' fixo — o trial é sempre do Pro; ao expirar, resolveEffectivePlan
        // degrada a conta pro Free (não existe mais bloqueio de trial expirado).
        const base = { name: empresa.trim(), plan: "pro", subscription_status: "trialing", trial_ends_at: trialEnds, ...attribution };
        // id gerado no cliente nos DOIS caminhos: dispensa o .select() pós-insert,
        // que dependia de policy de SELECT que o usuário recém-criado não tem
        // (RLS de companies só permite ler a própria empresa DEPOIS do vínculo).
        const id = globalThis.crypto.randomUUID();
        const { error } = await supabase.from("companies").insert({ id, ...base } as never);
        if (error) throw new Error(error.message);
        if (ssoMode) {
            // associa o usuário (Google) à company — RPC SECURITY DEFINER (bypass RLS)
            // Vínculo só via RPC SECURITY DEFINER (trava 1o-vínculo/company-vazia).
            // Sem fallback de UPDATE direto: profiles agora bloqueia auto-set de role/company_id.
            const { error: rpcErr } = await supabase.rpc("onboarding_assign_company", { target_company_id: id });
            if (rpcErr) throw new Error(rpcErr.message);
        }
        return id;
    };

    const handleGoogle = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: `${window.location.origin}/criar-conta?plan=${plan}`, queryParams: { access_type: "offline", prompt: "consent" } },
            });
            if (error) { toast.error("Não foi possível entrar com Google: " + error.message); setLoading(false); }
        } catch {
            toast.error("Erro no login com Google.");
            setLoading(false);
        }
    };

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const next: typeof erros = {};
        if (!empresa.trim()) next.empresa = "Informe o nome da sua agência.";
        if (!ssoMode) {
            if (!nome.trim()) next.nome = "Informe seu nome.";
            if (!email.trim()) next.email = "Informe seu email.";
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) next.email = "Email inválido.";
            if (!senha) next.senha = "Escolha uma senha.";
            else if (senha.length < 8) next.senha = "Mínimo de 8 caracteres.";
        }
        setErros(next);
        setErroKey((k) => k + 1);
        if (Object.keys(next).length > 0) return;

        setLoading(true);
        try {
            if (ssoMode) {
                await createCompanyWithTrial();
                try { await refreshProfile(); } catch { /* noop */ }
                toast.success("Tudo pronto! 14 dias grátis liberados.");
                navigate(APP_HOME, { replace: true });
                return;
            }
            const id = await createCompanyWithTrial();
            const { error, needsConfirmation } = await signUp(email.trim(), senha, nome.trim(), id);
            if (error) {
                const m = (error.message || "").toLowerCase();
                if (m.includes("rate limit") || m.includes("too many")) {
                    const { error: siErr } = await signIn(email.trim(), senha);
                    if (!siErr) { toast.success("Conta criada! 14 dias grátis liberados."); navigate(APP_HOME, { replace: true }); return; }
                    await supabase.from("companies").delete().eq("id", id);
                    setErros({ form: "Muitas tentativas. Aguarde alguns minutos e tente de novo." });
                    setErroKey((k) => k + 1);
                    return;
                }
                await supabase.from("companies").delete().eq("id", id);
                if (m.includes("already registered") || m.includes("already been registered")) {
                    // erro com caminho de saída: leva pro login com o email preenchido
                    setErros({ form: "Esse email já tem conta.", formAction: "login" });
                    setErroKey((k) => k + 1);
                } else {
                    setErros({ form: error.message || "Não foi possível criar a conta." });
                    setErroKey((k) => k + 1);
                }
                return;
            }
            if (needsConfirmation) {
                // Conta criada mas sem sessão: a confirmação de email está ativa.
                // Mostrar a tela dedicada em vez de navegar (senão a pessoa cai
                // no login sem entender o que aconteceu).
                trackBehavior(FUNNEL_EVENTS.REGISTER_START, { step: "confirm_email_sent", plan });
                setConfirmSentTo(email.trim().toLowerCase());
                return;
            }
            // signUp() já direciona pro app; o trial está ativo na company.
            toast.success("Conta criada! 14 dias grátis liberados.");
        } catch (err) {
            setErros({ form: err instanceof Error ? err.message : "Não foi possível criar a conta." });
            setErroKey((k) => k + 1);
        } finally {
            setLoading(false);
        }
    };

    const busy = loading || authLoading;

    // Enquanto a auth resolve (ex.: retorno do OAuth Google), não mostra o
    // formulário de email — evita o flash do form errado antes do ssoMode ligar.
    if (authLoading) {
        return (
            <div className="lp-v2" style={{ minHeight: "100vh", backgroundColor: "#07080A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.95rem" }}>Carregando…</span>
            </div>
        );
    }

    // Conta criada, confirmação de email pendente: tela dedicada no lugar do form.
    if (confirmSentTo) {
        return (
            <div className="lp-v2" style={{ minHeight: "100vh", backgroundColor: "#07080A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
                <div className="w-full max-w-[420px] text-center">
                    <div style={{ filter: "brightness(0) invert(1)", display: "flex", justifyContent: "center" }}>
                        <ThemeLogo className="h-6 w-auto" />
                    </div>
                    <h1 className="lp-display mt-10" style={{ fontSize: "clamp(1.9rem, 3.4vw, 2.4rem)", lineHeight: 1.05, letterSpacing: "-0.03em", color: "#fff" }}>
                        Confirme seu email
                    </h1>
                    <p className="mt-4 text-[15px]" style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                        Sua conta foi criada. Enviamos um link de ativação para{" "}
                        <strong style={{ color: "#fff", fontWeight: 600 }}>{confirmSentTo}</strong>. Clique nele para entrar e liberar seus 14 dias grátis.
                    </p>
                    <p className="mt-4 text-[13px]" style={{ color: "rgba(255,255,255,0.4)", lineHeight: 1.55 }}>
                        Não chegou em alguns minutos? Confira a caixa de spam. O link expira em 24 horas.
                    </p>
                    <button
                        type="button"
                        onClick={reenviarConfirmacao}
                        disabled={reenviando || reenvioCooldown > 0}
                        className="mt-6 inline-flex items-center gap-2 text-[13.5px] underline underline-offset-4 transition-opacity disabled:opacity-50"
                        style={{ color: "rgba(255,255,255,0.65)" }}
                    >
                        {reenviando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {reenvioCooldown > 0
                            ? `Pode reenviar em ${reenvioCooldown}s`
                            : "Não chegou? Reenviar email"}
                    </button>
                    <div className="mt-9">
                        <button
                            type="button"
                            onClick={() => navigate("/auth")}
                            className="rounded-full px-6 py-3 text-[14px] font-semibold transition-opacity hover:opacity-90"
                            style={{ background: "#fff", color: "#0B1220" }}
                        >
                            Já confirmei, fazer login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="lp-v2" style={{ minHeight: "100vh", backgroundColor: "#07080A", color: "#fff" }}>
            <div className="grid min-h-screen lg:grid-cols-[0.88fr_1.12fr]">
                <div className="relative flex flex-col px-6 py-8 sm:px-12 sm:py-10">
                    <button onClick={() => navigate("/")} className="flex items-center self-start opacity-90 transition-opacity hover:opacity-100" aria-label="Vyzon" style={{ filter: "brightness(0) invert(1)" }}>
                        <ThemeLogo className="h-6 w-auto" />
                    </button>

                    <div className="flex flex-1 items-center">
                        <div className="mx-auto w-full max-w-[380px] py-12">
                            <h1 className="lp-display landing-fade-in-up landing-delay-100" style={{ fontSize: "clamp(2.3rem, 4vw, 2.9rem)", lineHeight: 1, letterSpacing: "-0.03em", color: "#fff" }}>
                                {ssoMode ? "Quase lá" : "Criar conta"}
                            </h1>
                            <p className="mt-2.5 landing-fade-in-up landing-delay-150" style={{ color: "rgba(255,255,255,0.55)", fontSize: "1rem" }}>
                                {ssoMode ? "Só falta o nome da sua agência." : "14 dias de Pro grátis, sem cartão. Depois, escolha o plano da sua operação."}
                            </p>

                            {!ssoMode && (
                                <>
                                    <button type="button" onClick={handleGoogle} disabled={busy} className="mt-9 flex w-full items-center justify-center gap-2.5 rounded-full py-3 text-[14px] font-semibold transition-transform active:scale-[0.98] disabled:opacity-50 landing-fade-in-up landing-delay-200" style={{ background: "#fff", color: "#0B1220" }}>
                                        {loading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#0B1220" }} />
                                                Conectando ao Google…
                                            </>
                                        ) : (
                                            <>
                                                <svg width="17" height="17" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                                Criar conta com Google
                                            </>
                                        )}
                                    </button>
                                    <div className="my-6 flex items-center gap-3">
                                        <span className="h-px flex-1" style={{ background: "rgba(255,255,255,0.12)" }} />
                                        <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>ou com email</span>
                                        <span className="h-px flex-1" style={{ background: "rgba(255,255,255,0.12)" }} />
                                    </div>
                                </>
                            )}

                            <form className={`flex flex-col gap-5 landing-fade-in-up landing-delay-300 ${ssoMode ? "mt-9" : ""}`} onSubmit={onSubmit} noValidate>
                                {!ssoMode && (
                                    <AuthField
                                        label="Seu nome"
                                        placeholder="Como te chamamos?"
                                        value={nome}
                                        onChange={(v) => { setNome(v); if (erros.nome) setErros((p) => ({ ...p, nome: undefined })); }}
                                        autoComplete="name"
                                        autoFocus
                                        error={erros.nome}
                                        errorKey={erroKey}
                                    />
                                )}
                                <AuthField
                                    label="Nome da agência"
                                    placeholder="Sua agência"
                                    value={empresa}
                                    onChange={(v) => { setEmpresa(v); if (erros.empresa) setErros((p) => ({ ...p, empresa: undefined })); }}
                                    autoComplete="organization"
                                    autoFocus={ssoMode}
                                    error={erros.empresa}
                                    errorKey={erroKey}
                                />
                                {!ssoMode && (
                                    <>
                                        <AuthField
                                            label="Email"
                                            type="email"
                                            placeholder="voce@suaagencia.com"
                                            value={email}
                                            onChange={(v) => { setEmail(v); if (erros.email || erros.form) setErros((p) => ({ ...p, email: undefined, form: undefined })); }}
                                            autoComplete="email"
                                            error={erros.email}
                                            errorKey={erroKey}
                                        />
                                        <div className="flex flex-col gap-2">
                                            <AuthField
                                                label="Senha"
                                                type={showSenha ? "text" : "password"}
                                                placeholder="Mínimo 8 caracteres"
                                                value={senha}
                                                onChange={(v) => { setSenha(v); if (erros.senha) setErros((p) => ({ ...p, senha: undefined })); }}
                                                autoComplete="new-password"
                                                error={erros.senha}
                                                errorKey={erroKey}
                                                rightSlot={
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowSenha((s) => !s)}
                                                        aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                                                        style={{ color: "rgba(255,255,255,0.4)" }}
                                                        onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
                                                        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
                                                    >
                                                        {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                }
                                            />
                                            {senha && (
                                                <div className="flex items-center gap-2.5" aria-live="polite">
                                                    <div className="vz-strength w-28">
                                                        {[1, 2, 3, 4].map((n) => (
                                                            <span
                                                                key={n}
                                                                className="vz-strength__seg"
                                                                style={n <= scorePassword(senha) ? { background: STRENGTH_META[scorePassword(senha)].color } : undefined}
                                                            />
                                                        ))}
                                                    </div>
                                                    <span className="text-[11.5px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                                                        {STRENGTH_META[scorePassword(senha)].label}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                {erros.form && (
                                    <div key={`f${erroKey}`} className="vz-shake rounded-xl px-3.5 py-2.5" style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)" }} role="alert">
                                        <p className="text-[13px]" style={{ color: "#FDA4AF" }}>{erros.form}</p>
                                        {erros.formAction === "login" && (
                                            <button
                                                type="button"
                                                onClick={() => navigate("/auth", { state: { email: email.trim() } })}
                                                className="mt-1 text-[12.5px] underline underline-offset-4"
                                                style={{ color: "rgba(255,255,255,0.7)" }}
                                            >
                                                Fazer login com este email
                                            </button>
                                        )}
                                    </div>
                                )}

                                <button type="submit" disabled={busy} className="vz-btn vz-btn--light mt-3 w-full disabled:opacity-50">
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Criando…
                                        </span>
                                    ) : (
                                        ssoMode ? "Entrar na Vyzon" : "Começar 14 dias grátis"
                                    )}
                                </button>
                            </form>

                            {!ssoMode && (
                                <p className="mt-10 text-[13px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                                    Já tem conta?{" "}
                                    <button type="button" onClick={() => navigate("/auth")} style={{ color: "rgba(255,255,255,0.82)", fontWeight: 500 }} className="hover:underline">
                                        Entrar
                                    </button>
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="relative hidden p-4 sm:p-5 lg:block landing-fade-in landing-delay-200">
                    <CloudWaveOrb palette="login" className="h-full w-full rounded-[30px]" />
                </div>
            </div>
        </div>
    );
};

export default SignupV2;
