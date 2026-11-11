import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { SOLAR_SEGMENT } from "@/lib/eva/blueprint";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getAttribution } from "@/lib/attribution";
import { trackBehavior, FUNNEL_EVENTS } from "@/lib/analytics";
import { logLandingEvent } from "@/lib/landingFunnel";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { EvaBot } from "@/components/eva/EvaBot";
import { PageLoader } from "@/components/ui/PageLoader";
import { AuthField } from "@/components/auth/AuthField";
import { scorePassword, STRENGTH_META } from "@/components/auth/password";
import { APP_HOME } from "@/config/routes";
import { rotuloPasso } from "@/lib/primeiroAcesso";

// Cadastro SIMPLES: 1 tela → conta criada sem plano (sem teste grátis) →
// Raio-X automático no app. Trata 2 modos: (a) novo usuário
// (WhatsApp+email+senha; o botão do Google saiu em 03/11/2026); (b) usuário logado ainda sem empresa
// (conta antiga do Google, ou quem confirmou o email depois): pede só o WhatsApp.
// Cada campo a mais derrubava quem chega do anúncio; nome da pessoa e da
// empresa saem do email e podem ser trocados depois em Configurações.
// A conta nasce ANTES da empresa: se a conta falha, não sobra empresa órfã
// (companies não tem policy de DELETE). Rota /criar-conta.
// Aceita com ou sem 55 e com máscara; grava sempre 55 + DDD + número.
function whatsDigitos(v: string): string {
    const d = v.replace(/\D/g, "");
    return d.length === 10 || d.length === 11 ? "55" + d : d;
}
const whatsValido = (v: string) => /^55\d{10,11}$/.test(whatsDigitos(v));
// Máscara enquanto digita: (48) 99999-9999. Quem cola com 55 na frente perde
// o 55 só na tela; whatsDigitos põe de volta.
function mascaraWhats(v: string): string {
    let d = v.replace(/\D/g, "");
    if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
    d = d.slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : "";
    const meio = d.length === 11 ? 7 : 6;
    if (d.length <= meio) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, meio)}-${d.slice(meio)}`;
}

const EMAIL_PESSOAL = /^(gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|icloud|me|bol|uol|terra|ig|globo|r7|proton|protonmail)\./;
const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// "joao.silva@solarsul.com.br" → "Joao silva"
function nomeDoEmail(email: string): string {
    const local = email.split("@")[0] ?? "";
    return capitalizar(local.replace(/[._\-+\d]+/g, " ").trim()) || "Você";
}

// Email de empresa vira o nome da empresa ("solarsul.com.br" → "Solarsul");
// Gmail e parecidos não dizem nada, então fica um nome genérico.
function empresaDoEmail(email: string): string {
    const dominio = (email.split("@")[1] ?? "").toLowerCase();
    if (!dominio || EMAIL_PESSOAL.test(dominio)) return "Minha empresa";
    return capitalizar(dominio.split(".")[0]);
}
const FUNNEL_PAGE = "signup";
// Toda conta nova nasce sem assinatura, e o grátis é o Raio-X. Ir direto, sem
// o desvio por Orçamentos (que também leva, agora que o refreshProfile relê o
// papel admin criado no onboarding_assign_company).
const RAIO_X = "/raio-x";

const SignupV2 = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [params] = useSearchParams();
    // Mantido só pra analytics/atribuição de origem: a conta nasce sem plano
    // (o banco força isso no guard_company_billing).
    const plan = (params.get("plan") || "pro").toLowerCase();
    // Vira companies.segment, que escolhe o pacote da Lume e os nomes do funil.
    // Solar é o único segmento que o blueprint reconhece; qualquer outro valor
    // (ou nenhum) cairia no pacote de agência, então todo cadastro nasce solar.
    const segment = SOLAR_SEGMENT;
    const { user, profile, companyId, isSuperAdmin, loading: authLoading, signUp, signIn, refreshProfile } = useAuth();

    // Veio do login (só e-mail) ou do formulário do Raio-X na home (todos os
    // campos): a pessoa não digita de novo o que acabou de digitar.
    const veio = (location.state as { email?: string; nome?: string; empresa?: string; whats?: string } | null) ?? {};
    const nome = (veio.nome ?? "").trim();
    const empresa = (veio.empresa ?? "").trim();
    const [whats, setWhats] = useState(veio.whats ?? "");
    const [email, setEmail] = useState((veio.email ?? "").toLowerCase());
    const veioPreenchido = !!(veio.nome && veio.email);
    const [senha, setSenha] = useState("");
    const [loading, setLoading] = useState(false);
    const [erros, setErros] = useState<{ whats?: string; email?: string; senha?: string; form?: string; formAction?: "login" }>({});
    const [erroKey, setErroKey] = useState(0);
    const [showSenha, setShowSenha] = useState(false);
    // email pra onde foi o link de confirmação; quando setado, troca o form
    // pela tela de "confirme seu email" (conta criada mas sem sessão ainda).
    const [confirmSentTo, setConfirmSentTo] = useState<string | null>(null);
    const [reenviando, setReenviando] = useState(false);
    const [reenvioCooldown, setReenvioCooldown] = useState(0);

    // true entre o signUp e a empresa vinculada: nesse intervalo o usuário já
    // existe sem empresa, e o form não pode virar o modo "Quase lá".
    const [criandoConta, setCriandoConta] = useState(false);
    // logado mas ainda sem empresa → só completar empresa e WhatsApp
    const ssoMode = !authLoading && !!user && !companyId && !isSuperAdmin && !criandoConta;

    // Analytics: início do registro (chegou no cadastro), com o plano escolhido.
    useEffect(() => {
        trackBehavior(FUNNEL_EVENTS.REGISTER_START, { plan });
        // Mesmo funil da home (landing_events, mesma sessão e UTM): o GA4 só
        // carrega após a 1ª interação e não mostra onde o clique do anúncio parou.
        logLandingEvent(FUNNEL_PAGE, "solar", "view");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // já logado e com empresa → vai pro app (quem está criando a conta agora
    // segue para o Raio-X pelo próprio envio)
    useEffect(() => {
        const ok = !!profile && (profile.is_super_admin || isSuperAdmin || !!companyId);
        if (!authLoading && user && ok && !criandoConta) navigate(APP_HOME, { replace: true });
    }, [authLoading, user, profile, isSuperAdmin, companyId, criandoConta, navigate]);

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

    // Conta criada é o Lead da campanha do Meta (o Raio-X automático começa
    // aqui). Analytics nunca derruba o cadastro.
    const marcarLead = () => {
        try {
            (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq?.("track", "Lead", { content_name: "raio_x_auto" });
        } catch {
            /* sem pixel */
        }
        trackBehavior(FUNNEL_EVENTS.REGISTER_COMPLETE, { plan });
    };

    // Cria a empresa sem plano e vincula o usuário logado como admin. O
    // WhatsApp fica em companies.phone: é por ele que o Markus chama quem
    // travou no meio e ele já vem preenchido no código de conexão.
    const createCompany = async () => {
        const attribution = getAttribution() || {};
        const base = { name: empresa || empresaDoEmail(email.trim() || user?.email || ""), phone: whatsDigitos(whats), plan: "free", subscription_status: "inactive", segment, ...attribution };
        // id gerado no cliente: dispensa o .select() pós-insert, que dependia de
        // policy de SELECT que o usuário ainda sem vínculo não tem.
        const id = globalThis.crypto.randomUUID();
        const { error } = await supabase.from("companies").insert({ id, ...base } as never);
        if (error) throw new Error(error.message);
        // Vínculo só via RPC SECURITY DEFINER (trava 1o-vínculo/company-vazia).
        const { error: rpcErr } = await supabase.rpc("onboarding_assign_company", { target_company_id: id });
        if (rpcErr) throw new Error(rpcErr.message);
        try { await refreshProfile(); } catch { /* noop */ }
    };

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const next: typeof erros = {};
        if (!whatsValido(whats)) next.whats = "Informe o WhatsApp com DDD.";
        if (!ssoMode) {
            if (!email.trim()) next.email = "Informe seu email.";
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) next.email = "Email inválido.";
            if (!senha) next.senha = "Escolha uma senha.";
            else if (senha.length < 8) next.senha = "Mínimo de 8 caracteres.";
        }
        setErros(next);
        setErroKey((k) => k + 1);
        if (Object.keys(next).length > 0) {
            logLandingEvent(FUNNEL_PAGE, "solar", "form_error", { fields: Object.keys(next).join(",") });
            return;
        }

        logLandingEvent(FUNNEL_PAGE, "solar", "form_submit", { step: ssoMode ? "company" : "account" });
        setLoading(true);
        try {
            if (ssoMode) {
                setCriandoConta(true);
                await createCompany();
                marcarLead();
                toast.success("Conta criada.");
                navigate(RAIO_X, { replace: true });
                return;
            }
            setCriandoConta(true);
            const { error, needsConfirmation } = await signUp(email.trim(), senha, nome || nomeDoEmail(email.trim()));
            if (error) {
                setCriandoConta(false);
                const m = (error.message || "").toLowerCase();
                logLandingEvent(FUNNEL_PAGE, "solar", "form_error", { reason: m.slice(0, 80) });
                if (m.includes("rate limit") || m.includes("too many")) {
                    // a conta pode já ter sido criada numa tentativa anterior: entra e,
                    // se faltar empresa, o modo "Quase lá" pede de novo
                    const { error: siErr } = await signIn(email.trim(), senha);
                    if (!siErr) { navigate(APP_HOME, { replace: true }); return; }
                    setErros({ form: "Muitas tentativas. Aguarde alguns minutos e tente de novo." });
                    setErroKey((k) => k + 1);
                    return;
                }
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
                setCriandoConta(false);
                // Conta criada mas sem sessão: a confirmação de email está ativa.
                // Mostrar a tela dedicada em vez de navegar (senão a pessoa cai
                // no login sem entender o que aconteceu).
                trackBehavior(FUNNEL_EVENTS.REGISTER_START, { step: "confirm_email_sent", plan });
                logLandingEvent(FUNNEL_PAGE, "solar", "form_submit", { step: "confirm_email" });
                marcarLead();
                setConfirmSentTo(email.trim().toLowerCase());
                return;
            }
            await createCompany();
            marcarLead();
            toast.success("Conta criada.");
            navigate(RAIO_X, { replace: true });
        } catch (err) {
            setCriandoConta(false);
            logLandingEvent(FUNNEL_PAGE, "solar", "form_error", { reason: (err instanceof Error ? err.message : "erro").slice(0, 80) });
            setErros({ form: err instanceof Error ? err.message : "Não foi possível criar a conta." });
            setErroKey((k) => k + 1);
        } finally {
            setLoading(false);
        }
    };

    const busy = loading || authLoading;

    // Erro só depois que a pessoa sai do campo com algo digitado: no meio da
    // digitação não aparece nada.
    const validarWhats = () => {
        if (whats && !whatsValido(whats)) setErros((p) => ({ ...p, whats: "Confira o DDD e o número." }));
    };
    const validarEmail = () => {
        if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) setErros((p) => ({ ...p, email: "Confira o email." }));
    };

    // Enquanto a auth resolve (ex.: retorno do OAuth Google), não mostra o
    // formulário de email: evita o flash do form errado antes do ssoMode ligar.
    if (authLoading) {
        return (
            <div className="lp-v2 lp-solar vz-cadastro">
                <PageLoader />
            </div>
        );
    }

    // Conta criada, confirmação de email pendente: tela dedicada no lugar do form.
    if (confirmSentTo) {
        return (
            <div className="lp-v2 lp-solar vz-auth-claro vz-cadastro flex items-center justify-center px-6 py-10">
                <div className="w-full max-w-[420px] landing-fade-in-up">
                    <ThemeLogo variant="default" className="h-6 w-auto" />
                    <div className="vz-cadastro__passos mt-10" aria-hidden>
                        <span className="vz-cadastro__passo vz-cadastro__passo--agora" />
                        <span className="vz-cadastro__passo" />
                        <span className="vz-cadastro__passo" />
                    </div>
                    <h1 className="vs-display mt-6 text-[36px] leading-[1.05]">Confirme seu email</h1>
                    <p className="mt-4 text-[16px] leading-relaxed" style={{ color: "var(--lp-ink-muted)" }}>
                        A conta foi criada. Mandamos um link para <strong style={{ color: "var(--lp-ink)" }}>{confirmSentTo}</strong>. Clique nele para entrar e fazer o seu Raio-X.
                    </p>
                    <p className="vz-cadastro__dica mt-3">Não chegou em alguns minutos? Confira o spam. O link vale por 24 horas.</p>
                    <div className="mt-8 flex flex-col gap-3">
                        <button type="button" onClick={() => navigate("/auth")} className="vs-btn w-full">
                            Já confirmei, entrar
                        </button>
                        <button
                            type="button"
                            onClick={reenviarConfirmacao}
                            disabled={reenviando || reenvioCooldown > 0}
                            className="vz-cadastro__google disabled:opacity-50"
                        >
                            {reenviando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                            {reenvioCooldown > 0 ? `Pode reenviar em ${reenvioCooldown}s` : "Reenviar o email"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="lp-v2 lp-solar vz-auth-claro vz-cadastro">
            <div className="grid min-h-screen lg:grid-cols-[1fr_1fr]">
                <div className="flex flex-col px-5 py-6 sm:px-12 sm:py-9">
                    <div className="flex items-center justify-between gap-3 landing-fade-in">
                        <button type="button" onClick={() => navigate("/")} className="vz-toque flex items-center" aria-label="Vyzon, voltar ao site">
                            <ThemeLogo variant="default" className="h-6 w-auto" />
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            className="vz-toque inline-flex items-center gap-1.5 text-[14px] font-medium transition-colors hover:text-[var(--lp-ink)]"
                            style={{ color: "var(--lp-ink-muted)" }}
                        >
                            <ArrowLeft className="h-4 w-4" aria-hidden />
                            Voltar ao site
                        </button>
                    </div>

                    <div className="flex flex-1 items-center">
                        <div className="vz-cadastro__miolo mx-auto w-full max-w-[400px] py-10 lg:py-12">
                            <div className="landing-fade-in-up">
                                <div className="vz-cadastro__passos" aria-hidden>
                                    <span className="vz-cadastro__passo vz-cadastro__passo--agora" />
                                    <span className="vz-cadastro__passo" />
                                    <span className="vz-cadastro__passo" />
                                </div>
                                <p className="mt-3 text-[13px] font-semibold" style={{ color: "var(--lp-ink-muted)" }}>
                                    {ssoMode ? `${rotuloPasso(0)}: falta só o WhatsApp` : `${rotuloPasso(0)}. Depois: conectar o WhatsApp e ver as propostas paradas.`}
                                </p>
                                <h1 className="vz-cadastro__titulo vs-display mt-5 text-[40px] leading-[1.02] sm:text-[46px]">{ssoMode ? "Quase lá" : "Crie sua conta"}</h1>
                                <p className="mt-3 text-[16px] leading-relaxed" style={{ color: "var(--lp-ink-muted)" }}>
                                    {ssoMode
                                        ? "Com o seu WhatsApp, a gente já deixa a conexão pronta."
                                        : veioPreenchido
                                          ? "Trouxemos o que você digitou. Só falta escolher uma senha."
                                          : "Grátis e sem cartão. Em 3 minutos você vê quanto está parado no seu WhatsApp."}
                                </p>
                            </div>

                            <form className="vz-cadastro__form mt-8 flex flex-col gap-5 landing-fade-in-up landing-delay-100" onSubmit={onSubmit} noValidate>
                                <div className="flex flex-col gap-1.5">
                                    <AuthField
                                        label="Seu WhatsApp"
                                        type="tel"
                                        placeholder="(48) 99999-9999"
                                        value={whats}
                                        onChange={(v) => { setWhats(mascaraWhats(v)); if (erros.whats) setErros((p) => ({ ...p, whats: undefined })); }}
                                        onBlur={validarWhats}
                                        autoComplete="tel-national"
                                        autoFocus={ssoMode || !veioPreenchido}
                                        error={erros.whats}
                                        errorKey={erroKey}
                                    />
                                    {!erros.whats && <p className="vz-cadastro__dica">Com DDD. Se a conexão travar, é por ele que a gente te ajuda.</p>}
                                </div>
                                {!ssoMode && (
                                    <>
                                        <AuthField
                                            label="Email"
                                            type="email"
                                            placeholder="voce@suaempresa.com"
                                            value={email}
                                            onChange={(v) => { setEmail(v); if (erros.email || erros.form) setErros((p) => ({ ...p, email: undefined, form: undefined })); }}
                                            onBlur={validarEmail}
                                            autoComplete="email"
                                            error={erros.email}
                                            errorKey={erroKey}
                                        />
                                        <div className="flex flex-col gap-2">
                                            <AuthField
                                                label="Senha"
                                                type={showSenha ? "text" : "password"}
                                                placeholder="Mínimo de 8 caracteres"
                                                value={senha}
                                                onChange={(v) => { setSenha(v); if (erros.senha) setErros((p) => ({ ...p, senha: undefined })); }}
                                                autoComplete="new-password"
                                                autoFocus={veioPreenchido}
                                                error={erros.senha}
                                                errorKey={erroKey}
                                                rightSlot={
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowSenha((s) => !s)}
                                                        aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                                                        className="vz-toque flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:text-[var(--lp-ink)]"
                                                        style={{ color: "var(--lp-ink-subtle)" }}
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
                                                    <span className="text-[12.5px]" style={{ color: "var(--lp-ink-subtle)" }}>
                                                        {STRENGTH_META[scorePassword(senha)].label}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                {erros.form && (
                                    <div key={`f${erroKey}`} className="vz-shake vz-cadastro__erro" role="alert">
                                        <p className="text-[14px]" style={{ color: "var(--auth-erro)" }}>{erros.form}</p>
                                        {erros.formAction === "login" && (
                                            <button type="button" onClick={() => navigate("/auth", { state: { email: email.trim() } })} className="vz-toque vz-cadastro__link mt-1 text-[14px]">
                                                Entrar com este email
                                            </button>
                                        )}
                                    </div>
                                )}

                                <button type="submit" disabled={busy} className="vs-btn mt-2 w-full">
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                            Criando sua conta…
                                        </>
                                    ) : ssoMode ? (
                                        "Continuar para o Raio-X"
                                    ) : (
                                        "Criar conta e ver meu Raio-X"
                                    )}
                                </button>
                                <p className="vz-cadastro__dica text-center">
                                    Ao criar a conta, você aceita os{" "}
                                    <a href="/termos-de-servico" className="vz-cadastro__link font-medium">termos</a> e a{" "}
                                    <a href="/politica-privacidade" className="vz-cadastro__link font-medium">política de privacidade</a>.
                                </p>
                            </form>

                            {!ssoMode && (
                                <p className="mt-8 text-[15px] landing-fade-in landing-delay-200" style={{ color: "var(--lp-ink-muted)" }}>
                                    Já tem conta?{" "}
                                    <button type="button" onClick={() => navigate("/auth")} className="vz-toque vz-cadastro__link">
                                        Entrar
                                    </button>
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="hidden p-5 lg:block landing-fade-in landing-delay-100">
                    <LadoDoCadastro />
                </div>
            </div>
        </div>
    );
};

// Lado direito no desktop: o que vem depois da conta, no sol da home, e um
// exemplo do placar que ela vai ver (marcado como exemplo).
const PASSOS = [
    { titulo: "Criar a conta", texto: "Você está aqui. Grátis, sem cartão." },
    { titulo: "Conectar o WhatsApp", texto: "Por um código no celular ou QR Code. Nada é enviado para ninguém." },
    { titulo: "Ver as propostas paradas", texto: "Quanto somam, há quantos dias e quem chamar primeiro." },
];
const EXEMPLO = [
    { nome: "Padaria Trigo Bom", valor: "R$ 61.200", dias: 8 },
    { nome: "Carlos", valor: "R$ 23.900", dias: 5 },
];

const LadoDoCadastro = () => (
    <div className="vz-cadastro__lado flex h-full flex-col justify-center gap-12 px-10 py-12 xl:px-16">
        <p className="vs-display max-w-[460px] text-[34px] leading-[1.08] xl:text-[40px]">Em 3 minutos você vê quanto está parado no seu WhatsApp.</p>

        <div className="vs-cartao relative max-w-[460px] rounded-[22px] p-6" style={{ background: "var(--lp-white)" }}>
            <span className="vs-sentada" style={{ ["--s-eva" as string]: "88px" }}>
                <EvaBot size={88} state="alert" />
            </span>
            <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold" style={{ color: "var(--lp-ink-muted)" }}>Parado no WhatsApp</p>
                <span className="vs-carimbo vs-carimbo--neutro">Exemplo</span>
            </div>
            <p className="vs-num mt-2 text-[44px] font-semibold leading-none">R$ 85.100</p>
            <ul className="mt-4 flex flex-col divide-y" style={{ borderColor: "var(--lp-line)" }}>
                {EXEMPLO.map((e) => (
                    <li key={e.nome} className="flex items-center justify-between gap-3 py-3" style={{ borderColor: "var(--lp-line)" }}>
                        <span>
                            <span className="block text-[15px] font-semibold">{e.nome}</span>
                            <span className="vs-carimbo vs-carimbo--espera mt-1">{e.dias} dias sem resposta</span>
                        </span>
                        <span className="vs-num text-[16px] font-semibold">{e.valor}</span>
                    </li>
                ))}
            </ul>
        </div>

        <ol className="flex max-w-[460px] flex-col gap-4">
            {PASSOS.map((p, i) => (
                <li key={p.titulo} className="flex items-start gap-3.5">
                    <span aria-hidden className={`vz-cadastro__num ${i === 0 ? "vz-cadastro__num--agora" : ""}`}>{i + 1}</span>
                    <span>
                        <span className="block text-[16px] font-semibold">{p.titulo}</span>
                        <span className="block text-[15px]" style={{ color: "var(--lp-ink-muted)" }}>{p.texto}</span>
                    </span>
                </li>
            ))}
        </ol>
    </div>
);

export default SignupV2;
