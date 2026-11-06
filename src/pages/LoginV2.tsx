import { lazy, Suspense, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { AuthField } from "@/components/auth/AuthField";
import { agora, fracaoDoDia, horaCurta } from "@/components/auth/horaDoDia";
import "@/components/layout/entrada.css";
import { APP_HOME } from "@/config/routes";

// AUTH.2 "Placar do dia": painel escuro da marca com o produto funcionando (a
// aprovação pelo WhatsApp, CenaAprovacao) e o formulário no fundo do app. Ao
// entrar, o botão segura "Entrando…" até o perfil chegar, o formulário some e o painel encolhe até a largura da lateral
// do app; a rota seguinte desenha a mesa com a lateral no mesmo lugar. Antes
// eram três fundos, um toast e um loader de tela cheia que montava duas vezes.
// Validação inline, toggle de senha, aviso de caps lock e email viajando pra
// recuperação/cadastro continuam do AUTH.1.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SAIDA_MS = 260;
const ULTIMO_KEY = "vyz_ultimo_login";

const lerUltimo = (): "google" | "email" | null => {
    try {
        const v = localStorage.getItem(ULTIMO_KEY);
        return v === "google" || v === "email" ? v : null;
    } catch {
        return null;
    }
};
const gravarUltimo = (v: "google" | "email") => {
    try { localStorage.setItem(ULTIMO_KEY, v); } catch { /* aba privada: só não lembra */ }
};

// A cena só existe com o painel em coluna (desktop). No celular o painel é uma
// faixa no topo e a cena empurraria o formulário; nem o chunk é baixado.
const CenaAprovacao = lazy(() => import("@/components/auth/CenaAprovacao"));
const COLUNA = "(min-width: 1024px)";
const useColuna = () => {
    const [sim, setSim] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.(COLUNA).matches);
    useEffect(() => {
        const mq = window.matchMedia?.(COLUNA);
        if (!mq) return;
        const muda = () => setSim(mq.matches);
        muda();
        mq.addEventListener?.("change", muda);
        return () => mq.removeEventListener?.("change", muda);
    }, []);
    return sim;
};

const semMovimento = () =>
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

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
    const [entrando, setEntrando] = useState(false);
    const [saindo, setSaindo] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [showSenha, setShowSenha] = useState(false);
    const [capsOn, setCapsOn] = useState(false);
    const [erros, setErros] = useState<{ email?: string; senha?: string; form?: string }>({});
    const [erroKey, setErroKey] = useState(0);
    const saidaTimer = useRef<number>();
    const [ultimo] = useState(lerUltimo);
    const [quando] = useState(agora);
    const deDia = fracaoDoDia(quando) !== null;
    const coluna = useColuna();

    // Quem chega de uma página legada escura (/crm-*, /r/*) pela navegação do
    // SPA traz o .dark junto; o login é claro e devolve o tema ao sair.
    useEffect(() => {
        const html = document.documentElement;
        const tinhaDark = html.classList.contains("dark");
        html.classList.remove("dark");
        return () => { if (tinhaDark) html.classList.add("dark"); };
    }, []);

    // Baixa a tela de Orçamentos enquanto a pessoa digita: na hora de entrar o
    // Suspense não tem chunk pra esperar e não cai no loader de tela cheia.
    useEffect(() => {
        // Falhar aqui só significa baixar depois, no Suspense de sempre.
        import("./Orcamentos").catch(() => undefined);
    }, []);

    // Logado com contexto válido → vai pro app. Se acabou de entrar, o cartão
    // sai primeiro; se já chegou logado, vai direto.
    useEffect(() => {
        const ok = !!profile && (profile.is_super_admin || isSuperAdmin || !!companyId);
        if (authLoading || !user || !ok) return;
        if (!entrando || semMovimento()) {
            navigate(APP_HOME, { replace: true });
            return;
        }
        setSaindo(true);
        saidaTimer.current = window.setTimeout(() => navigate(APP_HOME, { replace: true }), SAIDA_MS);
        return () => window.clearTimeout(saidaTimer.current);
    }, [authLoading, user, profile, isSuperAdmin, companyId, entrando, navigate]);

    // A conta foi derrubada depois do signIn (perfil inválido): solta o botão.
    useEffect(() => {
        if (entrando && !authLoading && !user) setEntrando(false);
    }, [entrando, authLoading, user]);

    const trackCaps = (e: KeyboardEvent<HTMLInputElement>) =>
        setCapsOn(e.getModifierState?.("CapsLock") ?? false);

    const validaEmail = () => {
        if (!email.trim()) return "Informe seu email.";
        if (!EMAIL_RE.test(email.trim())) return "Email inválido.";
        return null;
    };

    const handleGoogle = async () => {
        setGoogleLoading(true);
        gravarUltimo("google");
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
                // erro inline no form, com caminho direto pra recuperação
                setErros({ form: error.message.includes("Invalid login credentials") ? "Email ou senha inválidos." : error.message });
                setErroKey((k) => k + 1);
            } else {
                // Sem toast: a confirmação é a própria entrada no app.
                gravarUltimo("email");
                setEntrando(true);
            }
        } catch {
            setErros({ form: "Erro ao processar o login. Tente de novo." });
            setErroKey((k) => k + 1);
        } finally {
            setLoading(false);
        }
    };

    const ocupado = loading || entrando;
    const busy = ocupado || authLoading;
    const irRecuperar = () => navigate("/recuperar-senha", { state: { email: email.trim() } });

    return (
        <div className={`vz-auth-claro vz-login ${saindo ? "vz-login--saindo" : ""}`}>
            <section className="vz-login__painel">
                <button type="button" onClick={() => navigate("/")} className="vz-login__logo self-start" aria-label="Vyzon, voltar ao site">
                    <ThemeLogo variant="inverse" className="h-[26px] w-auto" />
                </button>
                <div className="vz-login__painel-corpo">
                    <div>
                        <p className="vz-login__kick">Hoje, {horaCurta(quando)}</p>
                        <p className="vz-login__frase">
                            {deDia ? "O sol está gerando." : "O sol já foi."}
                            <br />
                            <span>{deDia ? "Suas propostas também deveriam." : "Suas propostas continuam esperando."}</span>
                        </p>
                    </div>
                    {coluna && (
                        <div className="vz-cena-vaga" aria-hidden>
                            <div className="vz-cena-vaga__palco">
                                <Suspense fallback={null}>
                                    <CenaAprovacao quando={quando} />
                                </Suspense>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <section className="vz-login__form">
                <div className="vz-login__caixa">
                    <h1 className="text-[32px] font-semibold leading-[38px] tracking-[-0.025em] text-[var(--vyz-text-primary)]">
                        Entrar
                    </h1>
                    <p className="mt-2 text-[15px] leading-6 text-[var(--vyz-text-muted)]">
                        Veja quem está esperando a sua resposta.
                    </p>

                    <button type="button" onClick={handleGoogle} disabled={busy || googleLoading} className="vz-google mt-7">
                        {googleLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Abrindo o Google…
                            </>
                        ) : (
                            <>
                                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                Continuar com Google
                                {ultimo === "google" && <span className="vz-ultimo">Último usado</span>}
                            </>
                        )}
                    </button>

                    <div className="my-6 flex items-center gap-3">
                        <span className="h-px flex-1 bg-[var(--vyz-border-subtle)]" />
                        <span className="text-[12px] text-[var(--vyz-text-muted)]">
                            {ultimo === "email" ? "ou com email, como da última vez" : "ou com email"}
                        </span>
                        <span className="h-px flex-1 bg-[var(--vyz-border-subtle)]" />
                    </div>

                    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
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
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--vyz-text-muted)] transition-colors duration-150 hover:text-[var(--vyz-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)]"
                                >
                                    {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            }
                        />
                        {capsOn && (
                            <p className="-mt-2 text-[12px] text-[var(--vyz-text-muted)]" aria-live="polite">
                                Caps Lock ativado.
                            </p>
                        )}

                        {erros.form && (
                            <div key={`f${erroKey}`} className="vz-shake vz-entrada__erro rounded-[10px] px-3.5 py-2.5" role="alert">
                                <p className="text-[13px]">{erros.form}</p>
                                {erros.form.includes("inválidos") && (
                                    <button type="button" onClick={irRecuperar} className="mt-1 text-[13px] text-[var(--vyz-text-primary)] underline underline-offset-4">
                                        Recuperar senha com este email
                                    </button>
                                )}
                            </div>
                        )}

                        <button type="submit" disabled={busy} aria-busy={ocupado} className="vz-btn vz-btn--primary mt-2 min-h-[48px] w-full disabled:opacity-60">
                            {ocupado ? (
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
                            onClick={irRecuperar}
                            className="self-center text-[13px] text-[var(--vyz-text-muted)] transition-colors duration-150 hover:text-[var(--vyz-text-primary)]"
                        >
                            Esqueci minha senha
                        </button>
                    </form>

                    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-[13px] text-[var(--vyz-text-muted)]">
                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            className="inline-flex items-center gap-1.5 transition-colors duration-150 hover:text-[var(--vyz-text-primary)]"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Voltar ao site
                        </button>
                        <span>
                            Sem conta?{" "}
                            <button
                                type="button"
                                onClick={() => navigate("/criar-conta?plan=pro", { state: { email: email.trim() } })}
                                className="font-medium text-[var(--vyz-text-primary)] hover:underline"
                            >
                                Fazer meu Raio-X grátis
                            </button>
                        </span>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default LoginV2;
