import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackBehavior, trackDemoConversion, FUNNEL_EVENTS } from "@/lib/analytics";
import { ButtonV2 } from "./ButtonV2";
import {
    classifyEmail,
    extractFileText,
    ACCEPTED_FILE,
    MAX_FILE_BYTES,
} from "./agentBuilderUtils";
import { getAttribution } from "@/lib/attribution";
import evaFigure from "@/assets/landing-v2/eva.webp";

// LP.6 (v2) — modal do Agent Builder (estilo Handhold). Fluxo: site (vem do
// card) → upload opcional de material + escolher com/sem contexto → e-mail de
// trabalho + privacidade → edge gera o blueprint e captura o lead → prévia.
interface AgentBuilderModalProps {
    open: boolean;
    onClose: () => void;
    url: string;
    onScheduleDemo: () => void;
}

interface Blueprint {
    empresa?: string;
    resumo?: string;
    perguntas_qualificacao?: string[];
}

type Step = "upload" | "email" | "loading" | "done" | "thin" | "error";

function hostOf(u: string) {
    try {
        return new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`).hostname.replace(/^www\./, "");
    } catch {
        return u;
    }
}

// painel visual à direita: figura da EVA atmosférica + orbs mesh flutuando
function RightVisual({ active }: { active: boolean }) {
    return (
        <div className="relative hidden overflow-hidden lg:block" style={{ background: "linear-gradient(155deg,#f4f2ee 0%,#ece9e3 100%)" }}>
            <img
                src={evaFigure}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full select-none object-cover object-center"
                style={{ opacity: 0.95, filter: "saturate(0.94) contrast(0.97)" }}
                draggable={false}
            />
            <div className="vz-agent-orb vz-orb-a" style={{ width: 64, height: 64, left: "22%", top: "16%", background: "radial-gradient(circle at 32% 26%, #DCEBFF 0%, #2563EB 64%)", opacity: active ? 1 : 0.9 }} />
            <div className="vz-agent-orb vz-orb-b" style={{ width: 84, height: 84, right: "12%", top: "30%", background: "radial-gradient(circle at 32% 26%, #D6F6FF 0%, #06B6D4 64%)" }} />
            <div className="vz-agent-orb vz-orb-c" style={{ width: 58, height: 58, left: "16%", bottom: "22%", background: "radial-gradient(circle at 34% 28%, #D6FBEC 0%, #10B981 64%)" }} />
        </div>
    );
}

const Pill = () => (
    <span className="inline-flex w-fit items-center rounded-full px-3 py-1 text-[12px]" style={{ background: "rgba(5,5,5,0.05)", color: "var(--lp-ink-90)" }}>
        Gerar agente demo
    </span>
);

export const AgentBuilderModal = ({ open, onClose, url, onScheduleDemo }: AgentBuilderModalProps) => {
    const [step, setStep] = useState<Step>("upload");
    const [file, setFile] = useState<File | null>(null);
    const [fileText, setFileText] = useState("");
    const [extracting, setExtracting] = useState(false);
    const [fileErr, setFileErr] = useState("");
    const [useContext, setUseContext] = useState(false);
    const [email, setEmail] = useState("");
    const [emailErr, setEmailErr] = useState("");
    const [agree, setAgree] = useState(false);
    const [bp, setBp] = useState<Blueprint | null>(null);
    const [closing, setClosing] = useState(false);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // fecha com animação de saída antes de desmontar
    const requestClose = () => {
        if (closing) return;
        setClosing(true);
        closeTimer.current = setTimeout(() => onClose(), 180);
    };

    // reset ao abrir; trava scroll do body; Esc fecha
    useEffect(() => {
        if (!open) return;
        setStep("upload");
        setFile(null);
        setFileText("");
        setFileErr("");
        setUseContext(false);
        setEmail("");
        setEmailErr("");
        setAgree(false);
        setBp(null);
        setClosing(false);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && requestClose();
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
            if (closeTimer.current) clearTimeout(closeTimer.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    if (!open) return null;

    const onPickFile = async (f: File | null) => {
        setFileErr("");
        if (!f) return;
        if (f.size > MAX_FILE_BYTES) {
            setFileErr("Arquivo acima de 5MB.");
            return;
        }
        setFile(f);
        setExtracting(true);
        try {
            const text = await extractFileText(f);
            if (text.replace(/\s/g, "").length < 30) {
                setFileErr("Não consegui ler texto desse arquivo. Tente .md, .txt ou outro PDF.");
                setFile(null);
                setFileText("");
            } else {
                setFileText(text);
            }
        } catch {
            setFileErr("Formato não suportado. Use PDF, TXT ou MD.");
            setFile(null);
            setFileText("");
        } finally {
            setExtracting(false);
        }
    };

    const goEmail = (withContext: boolean) => {
        setUseContext(withContext);
        setStep("email");
    };

    const generate = async () => {
        const cls = classifyEmail(email);
        if (cls === "invalid") {
            setEmailErr("Digite um e-mail válido.");
            return;
        }
        if (cls === "free") {
            setEmailErr("Use um e-mail de trabalho (domínio da sua agência).");
            return;
        }
        if (!agree) return;
        setEmailErr("");
        setStep("loading");
        try {
            const { data, error } = await supabase.functions.invoke("generate-demo-agent", {
                body: {
                    url,
                    email: email.trim(),
                    context: useContext ? fileText : "",
                    used_context: useContext,
                    attribution: getAttribution() ?? {},
                },
            });
            if (error || !data?.ok) {
                setStep("error");
                return;
            }
            // Lead capturado (demo_requests). Evento + conversão no Google Ads
            // (mesmo sinal de "demo request"; só envia se o label do Ads existir).
            trackBehavior(FUNNEL_EVENTS.AGENT_BUILDER_LEAD, { used_context: useContext });
            void trackDemoConversion({ email: email.trim(), value: 50 });
            if (data.thin) {
                setStep("thin");
                return;
            }
            setBp(data.blueprint as Blueprint);
            setStep("done");
        } catch {
            setStep("error");
        }
    };

    const emailReady = classifyEmail(email) === "ok" && agree;

    return createPortal(
        <div className="lp-v2">
        <div
            className="vz-modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4"
            data-closing={closing}
            style={{ background: "rgba(8,8,10,0.55)", backdropFilter: "blur(6px)" }}
            onMouseDown={(e) => e.target === e.currentTarget && requestClose()}
            role="dialog"
            aria-modal="true"
            aria-label="Gerar agente demo"
        >
            <div
                className="vz-modal-panel relative grid w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-2xl lg:grid-cols-[1.05fr_0.95fr]"
                data-closing={closing}
                style={{ minHeight: 440 }}
            >
                <button
                    type="button"
                    onClick={requestClose}
                    aria-label="Fechar"
                    className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full text-[18px] leading-none transition-colors"
                    style={{ background: "rgba(5,5,5,0.05)", color: "var(--lp-ink-90)" }}
                >
                    ×
                </button>

                {/* ── coluna do formulário ─────────────────────────── */}
                <div className="flex flex-col gap-5 p-8 sm:p-10">
                    <Pill />

                    <div key={step} className="vz-modal-step flex flex-1 flex-col gap-5">
                    {(step === "upload") && (
                        <>
                            <div>
                                <h2 className="lp-display" style={{ fontSize: "clamp(1.7rem,3.2vw,2.2rem)", lineHeight: 1.08, letterSpacing: "-0.025em", color: "var(--lp-ink)" }}>
                                    Dê materiais para o agente aprender
                                </h2>
                                <p className="mt-3 text-[14.5px]" style={{ color: "rgba(5,5,5,0.62)", lineHeight: 1.55 }}>
                                    Suba um material de vendas ou marketing para a EVA usar como contexto na demo. Opcional.
                                </p>
                                <p className="mt-3 text-[12.5px]" style={{ color: "var(--lp-ink-55)" }}>
                                    Site base: <span style={{ color: "var(--lp-ink-90)", fontWeight: 500 }}>{hostOf(url)}</span>
                                </p>
                            </div>

                            <label
                                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed px-5 py-4 transition-colors"
                                style={{ borderColor: "var(--lp-line)", background: "rgba(5,5,5,0.015)" }}
                            >
                                <span aria-hidden="true" style={{ color: "var(--lp-ink-90)", fontSize: 18 }}>↑</span>
                                <span className="min-w-0">
                                    <span className="block truncate text-[14px]" style={{ color: "var(--lp-ink)", fontWeight: 500 }}>
                                        {extracting ? "Lendo arquivo…" : file ? file.name : "Subir um arquivo"}
                                    </span>
                                    <span className="block text-[12px]" style={{ color: "var(--lp-ink-55)" }}>
                                        {file && !extracting ? "Clique para trocar" : "PDF, TXT ou MD até 5MB"}
                                    </span>
                                </span>
                                <input
                                    type="file"
                                    accept={ACCEPTED_FILE}
                                    className="hidden"
                                    onChange={(e) => onPickFile(e.target.files?.[0] || null)}
                                />
                            </label>
                            {fileErr && <p className="text-[12.5px]" style={{ color: "#c0392b" }}>{fileErr}</p>}

                            <div className="mt-auto flex flex-col items-start gap-3 pt-3">
                                <ButtonV2 onClick={() => goEmail(true)} variant="primary" showArrow disabled={!fileText || extracting}>
                                    Gerar com o material
                                </ButtonV2>
                                <button type="button" onClick={() => goEmail(false)} className="text-[13.5px] underline-offset-4 hover:underline" style={{ color: "var(--lp-ink-55)" }}>
                                    Gerar só com o site
                                </button>
                            </div>
                        </>
                    )}

                    {step === "email" && (
                        <>
                            <div>
                                <h2 className="lp-display" style={{ fontSize: "clamp(1.7rem,3.2vw,2.2rem)", lineHeight: 1.08, letterSpacing: "-0.025em", color: "var(--lp-ink)" }}>
                                    Seu agente está quase pronto
                                </h2>
                                <p className="mt-3 text-[14.5px]" style={{ color: "rgba(5,5,5,0.62)", lineHeight: 1.55 }}>
                                    Informe seu e-mail de trabalho para ver o agente montado com o contexto da sua agência. Sem cadastro.
                                </p>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-[12.5px]" style={{ color: "var(--lp-ink-90)", fontWeight: 600 }}>
                                    E-mail de trabalho
                                </label>
                                <input
                                    type="email"
                                    className="vz-input-light w-full"
                                    placeholder="voce@suaagencia.com.br"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (emailErr) setEmailErr("");
                                    }}
                                    onKeyDown={(e) => e.key === "Enter" && emailReady && generate()}
                                    autoFocus
                                />
                                {emailErr && <p className="mt-1.5 text-[12.5px]" style={{ color: "#c0392b" }}>{emailErr}</p>}
                            </div>

                            <label className="flex items-start gap-2.5 text-[13px]" style={{ color: "rgba(5,5,5,0.66)", lineHeight: 1.45 }}>
                                <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                                <span>
                                    Li e concordo com a{" "}
                                    <a href="/politica-privacidade" target="_blank" rel="noreferrer" className="underline underline-offset-2" style={{ color: "var(--lp-blue)" }}>
                                        Política de Privacidade
                                    </a>
                                    .
                                </span>
                            </label>

                            <div className="mt-auto flex flex-col items-start gap-3 pt-3">
                                <ButtonV2 onClick={generate} variant="primary" showArrow disabled={!emailReady}>
                                    Ver meu agente
                                </ButtonV2>
                                <button type="button" onClick={() => setStep("upload")} className="text-[13.5px]" style={{ color: "var(--lp-ink-55)" }}>
                                    Voltar
                                </button>
                            </div>
                        </>
                    )}

                    {step === "loading" && (
                        <div className="flex flex-1 flex-col justify-center">
                            <h2 className="lp-display" style={{ fontSize: "clamp(1.6rem,3vw,2.1rem)", lineHeight: 1.1, letterSpacing: "-0.025em", color: "var(--lp-ink)" }}>
                                Lendo seu site e montando o agente…
                            </h2>
                            <p className="mt-3 text-[14.5px]" style={{ color: "rgba(5,5,5,0.62)", lineHeight: 1.55 }}>
                                A EVA está identificando seus serviços, o cliente ideal e as perguntas de qualificação. Leva alguns segundos.
                            </p>
                        </div>
                    )}

                    {step === "done" && bp && (
                        <div className="flex flex-1 flex-col">
                            <p className="lp-mono" style={{ color: "var(--lp-blue)" }}>Agente de qualificação</p>
                            <p className="lp-display mt-1" style={{ fontSize: "1.7rem", letterSpacing: "-0.02em", color: "var(--lp-ink)" }}>
                                {bp.empresa || hostOf(url)}
                            </p>
                            {bp.resumo && (
                                <p className="mt-2 text-[14px]" style={{ color: "rgba(5,5,5,0.66)", lineHeight: 1.55 }}>{bp.resumo}</p>
                            )}
                            {Array.isArray(bp.perguntas_qualificacao) && bp.perguntas_qualificacao.length > 0 && (
                                <div className="mt-5">
                                    <p className="text-[12.5px]" style={{ color: "var(--lp-ink-55)", fontWeight: 600 }}>Perguntas que a EVA faria</p>
                                    <ul className="mt-2.5 flex flex-col gap-2">
                                        {bp.perguntas_qualificacao.slice(0, 4).map((q, i) => (
                                            <li key={i} className="flex items-start gap-2.5 text-[13.5px]" style={{ color: "var(--lp-ink-90)", lineHeight: 1.5 }}>
                                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--lp-blue)" }} />
                                                <span>{q}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <div className="mt-auto flex items-center gap-3 pt-6">
                                <ButtonV2 onClick={onScheduleDemo} variant="primary" showArrow>Agendar demo com esse contexto</ButtonV2>
                                <button type="button" onClick={() => setStep("upload")} className="text-[13px]" style={{ color: "var(--lp-ink-55)", fontWeight: 500 }}>Refazer</button>
                            </div>
                        </div>
                    )}

                    {(step === "thin" || step === "error") && (
                        <div className="flex flex-1 flex-col justify-center">
                            <h2 className="lp-display" style={{ fontSize: "clamp(1.5rem,2.8vw,1.9rem)", lineHeight: 1.1, letterSpacing: "-0.02em", color: "var(--lp-ink)" }}>
                                {step === "thin" ? "Não consegui ler o suficiente" : "Algo deu errado"}
                            </h2>
                            <p className="mt-3 text-[14.5px]" style={{ color: "rgba(5,5,5,0.62)", lineHeight: 1.55 }}>
                                {step === "thin"
                                    ? "Seu site não trouxe conteúdo suficiente (comum em sites em construção ou só com imagens). Suba um material com .md/.txt/.pdf ou agende uma demo que a gente monta junto."
                                    : "Tente de novo em instantes ou agende uma demo com o time."}
                            </p>
                            <div className="mt-6 flex items-center gap-3">
                                <ButtonV2 onClick={() => setStep("upload")} variant="primary">Tentar de novo</ButtonV2>
                                <button type="button" onClick={onScheduleDemo} className="text-[13.5px] underline-offset-4 hover:underline" style={{ color: "var(--lp-ink-55)" }}>Agendar demo</button>
                            </div>
                        </div>
                    )}
                    </div>
                </div>

                <RightVisual active={step === "loading"} />
            </div>
        </div>
        </div>,
        document.body,
    );
};
