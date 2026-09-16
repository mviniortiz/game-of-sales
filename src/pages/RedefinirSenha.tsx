import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { AuthField } from "@/components/auth/AuthField";
import { scorePassword, STRENGTH_META } from "@/components/auth/password";
import { APP_HOME } from "@/config/routes";

// AUTH.1 — redefinir senha no MESMO sistema visual do login/cadastro.
// Lógica preservada: sessão vem do link de recuperação (PASSWORD_RECOVERY),
// updateUser troca a senha. Sucesso → entra direto no app (a sessão já existe).
const RedefinirSenha = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [erros, setErros] = useState<{ senha?: string; confirma?: string; form?: string }>({});
    const [erroKey, setErroKey] = useState(0);

    // Supabase sets the session automatically from the recovery link hash
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
                setSessionReady(true);
            }
        });
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setSessionReady(true);
        });
        return () => subscription.unsubscribe();
    }, []);

    // Sucesso: sessão já está ativa, então o app é o próximo passo natural.
    useEffect(() => {
        if (!success) return;
        const t = window.setTimeout(() => navigate(APP_HOME, { replace: true }), 1800);
        return () => window.clearTimeout(t);
    }, [success, navigate]);

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const next: typeof erros = {};
        if (!password) next.senha = "Escolha uma nova senha.";
        else if (password.length < 8) next.senha = "Mínimo de 8 caracteres.";
        if (!confirmPassword) next.confirma = "Confirme a nova senha.";
        else if (confirmPassword !== password) next.confirma = "As senhas não coincidem.";
        setErros(next);
        setErroKey((k) => k + 1);
        if (Object.keys(next).length > 0) return;

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) {
                setErros({
                    form: error.message.includes("same_password")
                        ? "A nova senha deve ser diferente da anterior."
                        : error.message || "Erro ao redefinir senha.",
                });
                setErroKey((k) => k + 1);
            } else {
                setSuccess(true);
                toast.success("Senha redefinida com sucesso!");
            }
        } catch {
            setErros({ form: "Erro ao processar sua solicitação." });
            setErroKey((k) => k + 1);
        } finally {
            setLoading(false);
        }
    };

    const eyeToggle = (
        <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
        >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
    );

    return (
        <div className="lp-v2" style={{ minHeight: "100vh", backgroundColor: "#07080A", color: "#fff" }}>
            <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col px-6 py-8 sm:px-8">
                <div className="self-start landing-fade-in-up" style={{ filter: "brightness(0) invert(1)" }}>
                    <ThemeLogo className="h-6 w-auto" />
                </div>

                <div className="flex flex-1 items-center">
                    {success ? (
                        <div className="w-full py-12 text-center">
                            <div
                                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
                                style={{ background: "rgba(52,211,153,0.12)", animation: "landing-fade-in-up 0.4s cubic-bezier(0.22,1,0.36,1) both" }}
                            >
                                <CheckCircle2 className="h-7 w-7" style={{ color: "#34D399" }} />
                            </div>
                            <h1 className="lp-display mt-7" style={{ fontSize: "clamp(1.8rem, 3.2vw, 2.3rem)", lineHeight: 1.05, letterSpacing: "-0.03em", color: "#fff" }}>
                                Senha redefinida!
                            </h1>
                            <p className="mt-3 text-[14.5px]" style={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                                Tudo certo. Já estamos te levando pra sua central…
                            </p>
                            <div className="mt-8 flex justify-center">
                                <Loader2 className="h-4 w-4 animate-spin" style={{ color: "rgba(255,255,255,0.4)" }} />
                            </div>
                        </div>
                    ) : !sessionReady ? (
                        <div className="w-full py-12 text-center">
                            <Loader2 className="mx-auto h-7 w-7 animate-spin" style={{ color: "rgba(255,255,255,0.5)" }} />
                            <h1 className="lp-display mt-6" style={{ fontSize: "clamp(1.7rem, 3vw, 2.2rem)", lineHeight: 1.05, letterSpacing: "-0.03em", color: "#fff" }}>
                                Verificando…
                            </h1>
                            <p className="mt-3 text-[14.5px]" style={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                                Validando seu link de recuperação.
                            </p>
                            <button
                                type="button"
                                onClick={() => navigate("/recuperar-senha")}
                                className="mt-8 text-[13.5px] underline underline-offset-4"
                                style={{ color: "rgba(255,255,255,0.6)" }}
                            >
                                Link expirou? Solicitar novo
                            </button>
                        </div>
                    ) : (
                        <div className="w-full py-12">
                            <h1 className="lp-display landing-fade-in-up landing-delay-100" style={{ fontSize: "clamp(2rem, 3.6vw, 2.6rem)", lineHeight: 1.05, letterSpacing: "-0.03em", color: "#fff" }}>
                                Redefinir senha
                            </h1>
                            <p className="mt-2.5 landing-fade-in-up landing-delay-150" style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.98rem" }}>
                                Escolha a nova senha da sua conta.
                            </p>

                            <form className="mt-8 flex flex-col gap-5 landing-fade-in-up landing-delay-250" onSubmit={onSubmit} noValidate>
                                <div className="flex flex-col gap-2">
                                    <AuthField
                                        label="Nova senha"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Mínimo 8 caracteres"
                                        value={password}
                                        onChange={(v) => { setPassword(v); if (erros.senha || erros.form) setErros((p) => ({ ...p, senha: undefined, form: undefined })); }}
                                        autoComplete="new-password"
                                        autoFocus
                                        error={erros.senha}
                                        errorKey={erroKey}
                                        rightSlot={eyeToggle}
                                    />
                                    {password && (
                                        <div className="flex items-center gap-2.5" aria-live="polite">
                                            <div className="vz-strength w-28">
                                                {[1, 2, 3, 4].map((n) => (
                                                    <span
                                                        key={n}
                                                        className="vz-strength__seg"
                                                        style={n <= scorePassword(password) ? { background: STRENGTH_META[scorePassword(password)].color } : undefined}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-[11.5px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                                                {STRENGTH_META[scorePassword(password)].label}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <AuthField
                                    label="Confirmar nova senha"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Repita a senha"
                                    value={confirmPassword}
                                    onChange={(v) => { setConfirmPassword(v); if (erros.confirma || erros.form) setErros((p) => ({ ...p, confirma: undefined, form: undefined })); }}
                                    autoComplete="new-password"
                                    error={erros.confirma}
                                    errorKey={erroKey}
                                />

                                {erros.form && (
                                    <div key={`f${erroKey}`} className="vz-shake rounded-xl px-3.5 py-2.5" style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)" }} role="alert">
                                        <p className="text-[13px]" style={{ color: "#FDA4AF" }}>{erros.form}</p>
                                    </div>
                                )}

                                <button type="submit" disabled={loading} className="vz-btn vz-btn--light mt-1 w-full disabled:opacity-50">
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Redefinindo…
                                        </span>
                                    ) : (
                                        "Redefinir senha"
                                    )}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RedefinirSenha;
