import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthField } from "@/components/auth/AuthField";
import { MolduraEntrada, SeloEntrada } from "@/components/auth/MolduraEntrada";

// Recuperar senha na moldura do login (painel azul + formulário claro). O
// e-mail vem preenchido quando chega do login (router state). Reenviar chama
// resetPasswordForEmail de novo, com espera de 30s.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ESPERA_S = 30;

const RecuperarSenha = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState((((location.state as { email?: string } | null)?.email) ?? "").toLowerCase());
    const [erro, setErro] = useState<string | null>(null);
    const [erroKey, setErroKey] = useState(0);
    const [loading, setLoading] = useState(false);
    const [enviado, setEnviado] = useState(false);
    const [espera, setEspera] = useState(0);
    const [reenviado, setReenviado] = useState(false);

    useEffect(() => {
        if (espera <= 0) return;
        const t = window.setTimeout(() => setEspera((s) => s - 1), 1000);
        return () => window.clearTimeout(t);
    }, [espera]);

    const falha = (msg: string) => {
        setErro(msg);
        setErroKey((k) => k + 1);
    };

    const envia = async (reenvio = false) => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: `${window.location.origin}/redefinir-senha`,
            });
            if (error) {
                falha(/rate|security purposes/i.test(error.message) ? "Muitos pedidos seguidos. Espere um minuto e tente de novo." : "Não deu para enviar agora. Tente de novo em instantes.");
                return;
            }
            setErro(null);
            setEnviado(true);
            setReenviado(reenvio);
            setEspera(ESPERA_S);
        } catch {
            falha("Não deu para enviar agora. Confira sua internet e tente de novo.");
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return falha("Informe seu e-mail.");
        if (!EMAIL_RE.test(email.trim())) return falha("Confira o e-mail: parece faltar alguma parte.");
        await envia();
    };

    const voltarLogin = () => navigate("/auth", { state: { email: email.trim() } });

    return (
        <MolduraEntrada kick="Acesso" frase="Esqueceu a senha?" destaque="Em um minuto você volta.">
            {!enviado ? (
                <>
                    <h1 className="text-[32px] font-semibold leading-[38px] tracking-[-0.025em] text-[var(--vyz-text-primary)]">Recuperar senha</h1>
                    <p className="mt-2 text-[15px] leading-6 text-[var(--vyz-text-muted)]">
                        Digite o e-mail da sua conta. Mandamos um link para você criar uma senha nova.
                    </p>

                    <form className="mt-7 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
                        <AuthField
                            label="E-mail"
                            type="email"
                            placeholder="voce@suaempresa.com"
                            value={email}
                            onChange={(v) => {
                                setEmail(v);
                                if (erro) setErro(null);
                            }}
                            autoComplete="email"
                            autoFocus
                            error={erro}
                            errorKey={erroKey}
                        />
                        <button type="submit" disabled={loading} aria-busy={loading} className="vz-btn vz-btn--primary mt-2 min-h-[48px] w-full disabled:opacity-60">
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Enviando…
                                </span>
                            ) : (
                                "Enviar link"
                            )}
                        </button>
                    </form>

                    <button
                        type="button"
                        onClick={voltarLogin}
                        className="vz-toque mt-8 inline-flex items-center gap-1.5 text-[13px] text-[var(--vyz-text-muted)] transition-colors duration-150 hover:text-[var(--vyz-text-primary)]"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Voltar para o login
                    </button>
                </>
            ) : (
                <div role="status">
                    <SeloEntrada>
                        <MailCheck className="h-5 w-5" />
                    </SeloEntrada>
                    <h1 className="mt-5 text-[32px] font-semibold leading-[38px] tracking-[-0.025em] text-[var(--vyz-text-primary)]">Confira seu e-mail</h1>
                    <p className="mt-2 text-[15px] leading-6 text-[var(--vyz-text-muted)]">
                        Se <span className="vz-senha__email">{email.trim()}</span> tiver conta no Vyzon, o link chega em instantes. Ele vale por 1 hora.
                    </p>
                    <p className="mt-3 text-[13px] leading-5 text-[var(--vyz-text-muted)]">Não achou? Olhe no spam e em Promoções.</p>

                    <div className="mt-7 flex flex-col gap-3">
                        <button type="button" onClick={voltarLogin} className="vz-btn vz-btn--primary min-h-[48px] w-full">
                            Voltar para o login
                        </button>
                        <button type="button" onClick={() => envia(true)} disabled={loading || espera > 0} className="vz-senha__secundario">
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            {espera > 0 ? `Reenviar em ${espera}s` : "Reenviar o link"}
                        </button>
                    </div>
                    <p className="mt-4 min-h-5 text-center text-[13px] text-[var(--vyz-text-muted)]" aria-live="polite">
                        {erro ?? (reenviado && espera > 0 ? "Link novo enviado. Use o mais recente." : "")}
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setEnviado(false);
                            setErro(null);
                        }}
                        className="vz-toque mt-2 block w-full text-center text-[13px] text-[var(--vyz-text-muted)] transition-colors duration-150 hover:text-[var(--vyz-text-primary)]"
                    >
                        Usar outro e-mail
                    </button>
                </div>
            )}
        </MolduraEntrada>
    );
};

export default RecuperarSenha;
