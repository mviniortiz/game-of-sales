import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getAttribution } from "@/lib/attribution";
import { trackBehavior, FUNNEL_EVENTS } from "@/lib/analytics";
import { toast } from "sonner";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { CloudWaveOrb } from "@/components/landing-v2/CloudWaveOrb";

// Cadastro SIMPLES (substitui o wizard de onboarding): 1 tela → conta criada com
// trial de 14 dias ativo (sem cartão) → direto pro app. Trata 2 modos: (a) novo
// usuário (nome+empresa+email+senha ou Google); (b) usuário que entrou via Google
// e ainda não tem empresa (pede só o nome da empresa). Rota /criar-conta.
const PLAN_LABEL: Record<string, string> = { starter: "Starter", plus: "Plus", pro: "Pro" };

const SignupV2 = () => {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const plan = (params.get("plan") || "plus").toLowerCase();
    const { user, profile, companyId, isSuperAdmin, loading: authLoading, signUp, signIn, refreshProfile } = useAuth();

    const [nome, setNome] = useState("");
    const [empresa, setEmpresa] = useState("");
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [loading, setLoading] = useState(false);
    // email pra onde foi o link de confirmação; quando setado, troca o form
    // pela tela de "confirme seu email" (conta criada mas sem sessão ainda).
    const [confirmSentTo, setConfirmSentTo] = useState<string | null>(null);

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
        if (!authLoading && user && ok) navigate("/inicio", { replace: true });
    }, [authLoading, user, profile, isSuperAdmin, companyId, navigate]);

    // cria a company já com o trial de 14 dias ligado; devolve o id
    const createCompanyWithTrial = async (): Promise<string> => {
        const trialEnds = new Date(Date.now() + 14 * 86400000).toISOString();
        const attribution = getAttribution() || {};
        const base = { name: empresa.trim(), plan, subscription_status: "trialing", trial_ends_at: trialEnds, ...attribution };
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
        if (!empresa.trim()) { toast.error("Informe o nome da sua agência."); return; }
        if (!ssoMode) {
            if (!nome.trim()) { toast.error("Informe seu nome."); return; }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { toast.error("Email inválido."); return; }
            if (senha.length < 8) { toast.error("A senha deve ter no mínimo 8 caracteres."); return; }
        }
        setLoading(true);
        try {
            if (ssoMode) {
                await createCompanyWithTrial();
                try { await refreshProfile(); } catch { /* noop */ }
                toast.success("Tudo pronto! 14 dias grátis liberados.");
                navigate("/inicio", { replace: true });
                return;
            }
            const id = await createCompanyWithTrial();
            const { error, needsConfirmation } = await signUp(email.trim(), senha, nome.trim(), id);
            if (error) {
                const m = (error.message || "").toLowerCase();
                if (m.includes("rate limit") || m.includes("too many")) {
                    const { error: siErr } = await signIn(email.trim(), senha);
                    if (!siErr) { toast.success("Conta criada! 14 dias grátis liberados."); navigate("/inicio", { replace: true }); return; }
                    await supabase.from("companies").delete().eq("id", id);
                    toast.error("Muitas tentativas. Aguarde alguns minutos e tente de novo.");
                    return;
                }
                await supabase.from("companies").delete().eq("id", id);
                if (m.includes("already registered") || m.includes("already been registered")) {
                    toast.error("Esse email já tem conta. Tente fazer login.");
                } else {
                    toast.error(error.message || "Não foi possível criar a conta.");
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
            toast.error(err instanceof Error ? err.message : "Não foi possível criar a conta.");
        } finally {
            setLoading(false);
        }
    };

    const busy = loading || authLoading;
    const planNice = PLAN_LABEL[plan] || "Plus";

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
                        onClick={() => navigate("/auth")}
                        className="mt-9 rounded-full px-6 py-3 text-[14px] font-semibold transition-opacity hover:opacity-90"
                        style={{ background: "#fff", color: "#0B1220" }}
                    >
                        Já confirmei, fazer login
                    </button>
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
                                {ssoMode ? "Só falta o nome da sua agência." : `14 dias grátis no plano ${planNice}, sem cartão.`}
                            </p>

                            {!ssoMode && (
                                <>
                                    <button type="button" onClick={handleGoogle} disabled={busy} className="mt-9 flex w-full items-center justify-center gap-2.5 rounded-full py-3 text-[14px] font-semibold transition-colors disabled:opacity-50 landing-fade-in-up landing-delay-200" style={{ background: "#fff", color: "#0B1220" }}>
                                        <svg width="17" height="17" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                        Criar conta com Google
                                    </button>
                                    <div className="my-6 flex items-center gap-3">
                                        <span className="h-px flex-1" style={{ background: "rgba(255,255,255,0.12)" }} />
                                        <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>ou com email</span>
                                        <span className="h-px flex-1" style={{ background: "rgba(255,255,255,0.12)" }} />
                                    </div>
                                </>
                            )}

                            <form className={`flex flex-col gap-5 landing-fade-in-up landing-delay-300 ${ssoMode ? "mt-9" : ""}`} onSubmit={onSubmit}>
                                {!ssoMode && (
                                    <label className="flex flex-col gap-2">
                                        <span className="text-[12.5px]" style={{ color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>Seu nome</span>
                                        <input className="vz-input" placeholder="Como te chamamos?" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" autoFocus />
                                    </label>
                                )}
                                <label className="flex flex-col gap-2">
                                    <span className="text-[12.5px]" style={{ color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>Nome da agência</span>
                                    <input className="vz-input" placeholder="Sua agência" value={empresa} onChange={(e) => setEmpresa(e.target.value)} autoComplete="organization" autoFocus={ssoMode} />
                                </label>
                                {!ssoMode && (
                                    <>
                                        <label className="flex flex-col gap-2">
                                            <span className="text-[12.5px]" style={{ color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>Email</span>
                                            <input type="email" className="vz-input" placeholder="voce@suaagencia.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                                        </label>
                                        <label className="flex flex-col gap-2">
                                            <span className="text-[12.5px]" style={{ color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>Senha</span>
                                            <input type="password" className="vz-input" placeholder="Mínimo 8 caracteres" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" />
                                        </label>
                                    </>
                                )}

                                <button type="submit" disabled={busy} className="vz-btn vz-btn--light mt-3 w-full disabled:opacity-50">
                                    {busy ? "Criando…" : ssoMode ? "Entrar na Vyzon" : "Começar 14 dias grátis"}
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
