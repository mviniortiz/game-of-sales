import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { AuthField } from "@/components/auth/AuthField";

// AUTH.1 — recuperar senha no MESMO sistema visual do login/cadastro
// (dark, vz-input, entrada em stagger). Antes era um card esmeralda isolado.
// Email preenchido quando vem do login via router state. Reenviar de verdade
// (chama resetPasswordForEmail de novo) com cooldown de 30s.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const RecuperarSenha = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState(
        (((location.state as { email?: string } | null)?.email) ?? "").toLowerCase(),
    );
    const [erro, setErro] = useState<string | null>(null);
    const [erroKey, setErroKey] = useState(0);
    const [loading, setLoading] = useState(false);
    const [enviado, setEnviado] = useState(false);
    const [reenvioCooldown, setReenvioCooldown] = useState(0);

    useEffect(() => {
        if (reenvioCooldown <= 0) return;
        const t = window.setTimeout(() => setReenvioCooldown((s) => s - 1), 1000);
        return () => window.clearTimeout(t);
    }, [reenvioCooldown]);

    const envia = async () => {
        setLoading(true);
        try {
            const redirectUrl = `${window.location.origin}/redefinir-senha`;
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: redirectUrl,
            });
            if (error) {
                setErro("Não foi possível enviar agora. Tente de novo em instantes.");
                setErroKey((k) => k + 1);
            } else {
                setEnviado(true);
                setReenvioCooldown(30);
            }
        } catch {
            setErro("Erro ao processar sua solicitação.");
            setErroKey((k) => k + 1);
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!email.trim()) { setErro("Informe seu email."); setErroKey((k) => k + 1); return; }
        if (!EMAIL_RE.test(email.trim())) { setErro("Email inválido."); setErroKey((k) => k + 1); return; }
        setErro(null);
        await envia();
    };

    return (
        <div className="lp-v2" style={{ minHeight: "100vh", backgroundColor: "#07080A", color: "#fff" }}>
            <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col px-6 py-8 sm:px-8">
                <div className="self-start landing-fade-in-up">
                    <button
                        onClick={() => navigate("/auth")}
                        className="inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors"
                        style={{ color: "rgba(255,255,255,0.5)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.85)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Voltar para o login
                    </button>
                </div>

                <div className="flex flex-1 items-center">
                    {!enviado ? (
                        <div className="w-full py-12">
                            <div style={{ filter: "brightness(0) invert(1)" }} className="landing-fade-in-up landing-delay-100">
                                <ThemeLogo className="h-6 w-auto" />
                            </div>
                            <h1 className="lp-display mt-8 landing-fade-in-up landing-delay-150" style={{ fontSize: "clamp(2rem, 3.6vw, 2.6rem)", lineHeight: 1.05, letterSpacing: "-0.03em", color: "#fff" }}>
                                Recuperar senha
                            </h1>
                            <p className="mt-2.5 landing-fade-in-up landing-delay-200" style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.98rem", lineHeight: 1.5 }}>
                                Digite seu email e enviamos o link pra você criar uma nova.
                            </p>

                            <form className="mt-8 flex flex-col gap-5 landing-fade-in-up landing-delay-300" onSubmit={onSubmit} noValidate>
                                <AuthField
                                    label="Email"
                                    type="email"
                                    placeholder="voce@suaagencia.com"
                                    value={email}
                                    onChange={(v) => { setEmail(v); if (erro) setErro(null); }}
                                    autoComplete="email"
                                    autoFocus
                                    error={erro}
                                    errorKey={erroKey}
                                />
                                <button type="submit" disabled={loading} className="vz-btn vz-btn--light mt-1 w-full disabled:opacity-50">
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Enviando…
                                        </span>
                                    ) : (
                                        "Enviar link de recuperação"
                                    )}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="w-full py-12 text-center">
                            <div
                                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
                                style={{ background: "rgba(52,211,153,0.12)", animation: "landing-fade-in-up 0.4s cubic-bezier(0.22,1,0.36,1) both" }}
                            >
                                <MailCheck className="h-7 w-7" style={{ color: "#34D399" }} />
                            </div>
                            <h1 className="lp-display mt-7" style={{ fontSize: "clamp(1.8rem, 3.2vw, 2.3rem)", lineHeight: 1.05, letterSpacing: "-0.03em", color: "#fff" }}>
                                Email enviado
                            </h1>
                            <p className="mt-3 text-[14.5px]" style={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                                Se <strong style={{ color: "#fff", fontWeight: 600 }}>{email.trim()}</strong> tiver conta, o link chega em instantes. Confira o spam também.
                            </p>
                            <button
                                type="button"
                                onClick={envia}
                                disabled={loading || reenvioCooldown > 0}
                                className="mt-8 inline-flex items-center gap-2 text-[13.5px] underline underline-offset-4 transition-opacity disabled:opacity-50"
                                style={{ color: "rgba(255,255,255,0.65)" }}
                            >
                                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                {reenvioCooldown > 0 ? `Pode reenviar em ${reenvioCooldown}s` : "Não chegou? Reenviar"}
                            </button>
                            <div className="mt-9">
                                <button
                                    type="button"
                                    onClick={() => navigate("/auth", { state: { email: email.trim() } })}
                                    className="rounded-full px-6 py-3 text-[14px] font-semibold transition-opacity hover:opacity-90"
                                    style={{ background: "#fff", color: "#0B1220" }}
                                >
                                    Voltar para o login
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecuperarSenha;
