import { useState } from "react";
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

// provedores de e-mail pessoal mais comuns no BR — bloqueados (queremos corporativo)
const PERSONAL_EMAIL_DOMAINS = new Set([
    "gmail.com", "googlemail.com", "hotmail.com", "hotmail.com.br", "outlook.com", "outlook.com.br",
    "live.com", "msn.com", "yahoo.com", "yahoo.com.br", "ymail.com", "icloud.com", "me.com",
    "aol.com", "proton.me", "protonmail.com", "bol.com.br", "uol.com.br", "terra.com.br",
    "ig.com.br", "globo.com", "globomail.com", "r7.com", "zipmail.com.br",
]);

function emailError(e: string): string {
    const v = e.trim().toLowerCase();
    if (!v) return "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Digite um e-mail válido.";
    const domain = v.split("@")[1] || "";
    if (PERSONAL_EMAIL_DOMAINS.has(domain)) return "Use o e-mail corporativo da sua agência, não um e-mail pessoal.";
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
    const ready = !!email.trim() && !!site.trim() && !eErr && !sErr;
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
                            placeholder="Seu e-mail corporativo"
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
                            placeholder="Site da sua agência (ex: suaagencia.com)"
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
                        <select
                            className="vz-input-light w-full"
                            value={heardFrom}
                            onChange={(e) => setHeardFrom(e.target.value)}
                            aria-label="Onde você nos encontrou"
                            style={{ appearance: "none", backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23667' stroke-width='2.5'><path d='M6 9l6 6 6-6'/></svg>\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center", paddingRight: 38 }}
                        >
                            <option value="">Selecione…</option>
                            {HEARD_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
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
