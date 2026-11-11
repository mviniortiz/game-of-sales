import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Check, CheckCircle2, Circle, Clock, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthField } from "@/components/auth/AuthField";
import { MolduraEntrada, SeloEntrada } from "@/components/auth/MolduraEntrada";
import { APP_HOME } from "@/config/routes";

// Escolher senha: aonde chegam o link de "recuperar senha", o convite de
// integradora nova e o link de acesso direto. A sessão vem do link
// (PASSWORD_RECOVERY ou SIGNED_IN); sem ela em alguns segundos, ou com erro no
// endereço, o link venceu e a tela diz isso em vez de ficar em "Verificando".
// Texto neutro de propósito: serve pra quem troca e pra quem cria a primeira.
const ESPERA_LINK_MS = 8000;
const MIN = 8;

type Fase = "abrindo" | "pronto" | "venceu" | "salvo";

/** Erro que o Supabase devolve no endereço quando o link venceu ou já foi usado. */
const erroNoEndereco = () => {
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const q = new URLSearchParams(window.location.search);
    return !!(h.get("error_code") || h.get("error") || q.get("error_code") || q.get("error"));
};

const RedefinirSenha = () => {
    const navigate = useNavigate();
    const [fase, setFase] = useState<Fase>(() => (erroNoEndereco() ? "venceu" : "abrindo"));
    const [senha, setSenha] = useState("");
    const [confirma, setConfirma] = useState("");
    const [ver, setVer] = useState(false);
    const [loading, setLoading] = useState(false);
    const [erros, setErros] = useState<{ senha?: string; confirma?: string; form?: string }>({});
    const [erroKey, setErroKey] = useState(0);

    useEffect(() => {
        if (fase !== "abrindo") return;
        const pronto = () => setFase((f) => (f === "abrindo" ? "pronto" : f));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) pronto();
        });
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) pronto();
        });
        const t = window.setTimeout(() => setFase((f) => (f === "abrindo" ? "venceu" : f)), ESPERA_LINK_MS);
        return () => {
            subscription.unsubscribe();
            window.clearTimeout(t);
        };
    }, [fase]);

    useEffect(() => {
        if (fase !== "salvo") return;
        const t = window.setTimeout(() => navigate(APP_HOME, { replace: true }), 1400);
        return () => window.clearTimeout(t);
    }, [fase, navigate]);

    const temTamanho = senha.length >= MIN;
    const iguais = !!confirma && confirma === senha;

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const next: typeof erros = {};
        if (!senha) next.senha = "Escolha uma senha.";
        else if (!temTamanho) next.senha = `Use pelo menos ${MIN} caracteres.`;
        if (!confirma) next.confirma = "Repita a senha.";
        else if (!iguais) next.confirma = "As duas senhas estão diferentes.";
        setErros(next);
        setErroKey((k) => k + 1);
        if (Object.keys(next).length > 0) return;

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: senha });
            if (!error) {
                setFase("salvo");
                return;
            }
            const code = (error as { code?: string }).code ?? "";
            if (code === "session_not_found" || /session/i.test(error.message)) {
                setFase("venceu");
                return;
            }
            setErros({
                form:
                    code === "same_password"
                        ? "Essa já é a sua senha atual. Escolha outra."
                        : code === "weak_password"
                          ? "Senha fraca demais. Use mais caracteres, misturando letras e números."
                          : "Não deu para salvar a senha. Tente de novo.",
            });
            setErroKey((k) => k + 1);
        } catch {
            setErros({ form: "Não deu para salvar. Confira sua internet e tente de novo." });
            setErroKey((k) => k + 1);
        } finally {
            setLoading(false);
        }
    };

    const olho = (
        <button
            type="button"
            onClick={() => setVer((s) => !s)}
            aria-label={ver ? "Ocultar senha" : "Mostrar senha"}
            className="vz-toque flex h-8 w-8 items-center justify-center rounded-lg text-[var(--vyz-text-muted)] transition-colors duration-150 hover:text-[var(--vyz-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)]"
        >
            {ver ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
    );

    const titulo = "text-[32px] font-semibold leading-[38px] tracking-[-0.025em] text-[var(--vyz-text-primary)]";
    const sub = "mt-2 text-[15px] leading-6 text-[var(--vyz-text-muted)]";

    return (
        <MolduraEntrada kick="Acesso" frase="Quase lá." destaque="Só falta a senha.">
            {fase === "abrindo" && (
                <div role="status" aria-live="polite" className="flex items-center gap-3 text-[15px] text-[var(--vyz-text-muted)]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Abrindo seu link…
                </div>
            )}

            {fase === "venceu" && (
                <div role="alert">
                    <SeloEntrada tom="alerta">
                        <Clock className="h-5 w-5" />
                    </SeloEntrada>
                    <h1 className={`mt-5 ${titulo}`}>Esse link venceu</h1>
                    <p className={sub}>Links de senha valem por 1 hora e funcionam uma vez só. Peça um novo e use o mais recente.</p>
                    <div className="mt-7 flex flex-col gap-3">
                        <button type="button" onClick={() => navigate("/recuperar-senha")} className="vz-btn vz-btn--primary min-h-[48px] w-full">
                            Pedir link novo
                        </button>
                        <button type="button" onClick={() => navigate("/auth")} className="vz-senha__secundario">
                            Voltar para o login
                        </button>
                    </div>
                </div>
            )}

            {fase === "salvo" && (
                <div role="status">
                    <SeloEntrada tom="bom">
                        <CheckCircle2 className="h-5 w-5" />
                    </SeloEntrada>
                    <h1 className={`mt-5 ${titulo}`}>Senha salva</h1>
                    <p className={`${sub} flex items-center gap-2`}>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Entrando no Vyzon…
                    </p>
                </div>
            )}

            {fase === "pronto" && (
                <>
                    <h1 className={titulo}>Escolha sua senha</h1>
                    <p className={sub}>É com ela que você entra no Vyzon daqui pra frente.</p>

                    <form className="mt-7 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
                        <AuthField
                            label="Senha"
                            type={ver ? "text" : "password"}
                            placeholder={`Pelo menos ${MIN} caracteres`}
                            value={senha}
                            onChange={(v) => {
                                setSenha(v);
                                if (erros.senha || erros.form) setErros((p) => ({ ...p, senha: undefined, form: undefined }));
                            }}
                            autoComplete="new-password"
                            autoFocus
                            error={erros.senha}
                            errorKey={erroKey}
                            rightSlot={olho}
                        />
                        <AuthField
                            label="Repita a senha"
                            type={ver ? "text" : "password"}
                            placeholder="A mesma de cima"
                            value={confirma}
                            onChange={(v) => {
                                setConfirma(v);
                                if (erros.confirma || erros.form) setErros((p) => ({ ...p, confirma: undefined, form: undefined }));
                            }}
                            autoComplete="new-password"
                            error={erros.confirma}
                            errorKey={erroKey}
                        />

                        <ul className="vz-senha__regras" aria-live="polite">
                            <li data-ok={temTamanho}>
                                {temTamanho ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
                                {MIN} caracteres ou mais
                            </li>
                            <li data-ok={iguais}>
                                {iguais ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
                                As duas iguais
                            </li>
                        </ul>

                        {erros.form && (
                            <div key={`f${erroKey}`} className="vz-shake vz-entrada__erro rounded-[10px] px-3.5 py-2.5" role="alert">
                                <p className="text-[13px]">{erros.form}</p>
                            </div>
                        )}

                        <button type="submit" disabled={loading} aria-busy={loading} className="vz-btn vz-btn--primary mt-2 min-h-[48px] w-full disabled:opacity-60">
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Salvando…
                                </span>
                            ) : (
                                "Salvar senha e entrar"
                            )}
                        </button>
                    </form>
                </>
            )}
        </MolduraEntrada>
    );
};

export default RedefinirSenha;
