import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CaretDown, Check } from "@phosphor-icons/react";
import { ButtonV2 } from "./ButtonV2";
import { EvaOrb } from "./EvaOrb";
import { primeEvaAudio } from "./useGeminiLive";

// LP.7 (v2) — passo 1 da demo guiada: intake. Coleta e-mail CORPORATIVO + site
// (sem backend nesta versão; nada é enviado). Valida e-mail pessoal e domínio.
interface DemoIntakeStepProps {
    email: string;
    site: string;
    heardFrom: string;
    setEmail: (v: string) => void;
    setSite: (v: string) => void;
    setHeardFrom: (v: string) => void;
    onStart: () => void;
}

const HEARD_OPTIONS = ["Google", "Instagram", "LinkedIn", "Indicação", "YouTube", "Outro"];

// Dropdown próprio (o <select> nativo destoava do design): botão no estilo dos
// inputs da landing, chevron que gira, painel com entrada suave e opções com
// hover + check. Fecha em clique-fora e Esc; ARIA listbox básico.
function HeardDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const reduce = useReducedMotion();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
    }, [open]);

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label="Onde você nos encontrou"
                className="vz-input-light flex w-full items-center justify-between text-left transition-colors"
                style={{ color: value ? "var(--lp-ink)" : "rgba(5,5,5,0.42)" }}
            >
                <span>{value || "Selecione…"}</span>
                <motion.span
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: reduce ? 0 : 0.18, ease: "easeOut" }}
                    className="inline-flex shrink-0"
                    style={{ color: "rgba(5,5,5,0.45)" }}
                    aria-hidden="true"
                >
                    <CaretDown size={15} weight="bold" />
                </motion.span>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.ul
                        role="listbox"
                        initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-x-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-[12px] py-1.5"
                        style={{
                            background: "#FFFFFF",
                            border: "1px solid var(--lp-line)",
                            boxShadow: "0 14px 34px -10px rgba(13,20,33,0.22), 0 4px 10px rgba(13,20,33,0.07)",
                            transformOrigin: "top",
                        }}
                    >
                        {HEARD_OPTIONS.map((opt) => {
                            const on = value === opt;
                            return (
                                <li key={opt} role="option" aria-selected={on}>
                                    <button
                                        type="button"
                                        onClick={() => { onChange(on ? "" : opt); setOpen(false); }}
                                        className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[14px] transition-colors hover:bg-[rgba(13,20,33,0.04)]"
                                        style={{ color: "var(--lp-ink)", fontWeight: on ? 600 : 400 }}
                                    >
                                        {opt}
                                        {on && <Check size={14} weight="bold" style={{ color: "var(--lp-blue)" }} />}
                                    </button>
                                </li>
                            );
                        })}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
}

// Aceita e-mail pessoal (gmail etc.) — muitos donos de agência usam. Menos
// fricção = mais demos. Só valida o formato básico, sem bloquear.
function emailError(e: string): string {
    const v = e.trim().toLowerCase();
    if (!v) return "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Digite um e-mail válido.";
    return "";
}

function siteError(s: string): string {
    const v = s.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    if (!v) return "";
    // precisa ser um domínio de verdade (ex .com, .com.br, .io)
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(v) || !/\.[a-z]{2,}$/.test(v)) {
        return "Informe o site da empresa, com domínio (ex: suaagencia.com).";
    }
    return "";
}

export const DemoIntakeStep = ({ email, site, heardFrom, setEmail, setSite, setHeardFrom, onStart }: DemoIntakeStepProps) => {
    const [emailTouched, setEmailTouched] = useState(false);
    const [siteTouched, setSiteTouched] = useState(false);
    const eErr = emailError(email);
    const sErr = siteError(site);
    // Site é OPCIONAL e não bloqueia (só mostra dica se digitado errado). Pra
    // iniciar basta um e-mail com formato válido — fricção mínima.
    const ready = !!email.trim() && !eErr;
    const showErr = (touched: boolean, err: string) => touched && !!err;
    return (
        <div className="vz-modal-step grid flex-1 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col justify-center gap-6 px-7 py-10 sm:px-10">
                <div className="flex justify-center lg:hidden">
                    <EvaOrb state="idle" size={96} />
                </div>
                <div>
                    <h2 className="lp-display" style={{ fontSize: "clamp(1.8rem,3.6vw,2.6rem)", lineHeight: 1.08, letterSpacing: "-0.03em", color: "var(--lp-ink)" }}>
                        Veja a EVA trabalhando em uma conversa realista
                    </h2>
                    <p className="mt-3 max-w-md text-[15px]" style={{ color: "rgba(5,5,5,0.62)", lineHeight: 1.55 }}>
                        Entenda como ela lê o atendimento, sugere o próximo passo e mantém seu time no controle.
                    </p>
                </div>

                <div className="flex max-w-md flex-col gap-3">
                    <div>
                        <input
                            type="email"
                            className="vz-input-light w-full"
                            placeholder="Seu melhor e-mail"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onBlur={() => setEmailTouched(true)}
                            aria-label="E-mail corporativo"
                            aria-invalid={showErr(emailTouched, eErr)}
                            autoFocus
                        />
                        {showErr(emailTouched, eErr) && (
                            <p className="mt-1.5 text-[13px]" style={{ color: "#c0392b" }}>{eErr}</p>
                        )}
                    </div>
                    <div>
                        <input
                            className="vz-input-light w-full"
                            placeholder="Site da sua agência (opcional)"
                            value={site}
                            onChange={(e) => setSite(e.target.value)}
                            onBlur={() => setSiteTouched(true)}
                            aria-label="Site da agência"
                            aria-invalid={showErr(siteTouched, sErr)}
                        />
                        {showErr(siteTouched, sErr) && (
                            <p className="mt-1.5 text-[13px]" style={{ color: "#c0392b" }}>{sErr}</p>
                        )}
                    </div>
                    <div className="mt-1">
                        <label className="mb-2 block text-[13px]" style={{ color: "rgba(5,5,5,0.55)" }}>
                            Onde você nos encontrou? <span style={{ color: "var(--lp-ink-40)" }}>(opcional)</span>
                        </label>
                        <HeardDropdown value={heardFrom} onChange={setHeardFrom} />
                    </div>
                    <div className="mt-1">
                        <ButtonV2 onClick={() => { primeEvaAudio(); onStart(); }} variant="primary" showArrow disabled={!ready}>Iniciar demo ao vivo</ButtonV2>
                    </div>
                </div>

                <p className="lp-mono" style={{ color: "var(--lp-ink-40)" }}>Experiência demonstrativa. Nenhuma mensagem será enviada.</p>
            </div>

            <div className="relative hidden items-center justify-center overflow-hidden lg:flex" style={{ background: "linear-gradient(155deg,#f4f2ee 0%,#ece9e3 100%)" }}>
                <EvaOrb state="idle" size={168} />
            </div>
        </div>
    );
};
