import { ButtonV2 } from "./ButtonV2";
import { EvaOrb } from "./EvaOrb";

// LP.7 (v2) — passo 1 da demo guiada: intake. Coleta e-mail + site/nome (sem
// backend nesta versão; nada é enviado). Link discreto pra versão por voz.
interface DemoIntakeStepProps {
    email: string;
    site: string;
    heardFrom: string;
    setEmail: (v: string) => void;
    setSite: (v: string) => void;
    setHeardFrom: (v: string) => void;
    onStart: () => void;
}

const emailOk = (e: string) => /\S+@\S+\.\S+/.test(e.trim());

export const DemoIntakeStep = ({ email, site, heardFrom, setEmail, setSite, setHeardFrom, onStart }: DemoIntakeStepProps) => {
    const ready = emailOk(email) && site.trim().length > 0;
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
                    <input
                        type="email"
                        className="vz-input-light w-full"
                        placeholder="Seu e-mail"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-label="E-mail"
                        autoFocus
                    />
                    <input
                        className="vz-input-light w-full"
                        placeholder="Site ou nome da agência"
                        value={site}
                        onChange={(e) => setSite(e.target.value)}
                        aria-label="Site ou nome da agência"
                    />
                    <input
                        className="vz-input-light w-full"
                        placeholder="Onde você nos encontrou? (opcional)"
                        value={heardFrom}
                        onChange={(e) => setHeardFrom(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && ready && onStart()}
                        aria-label="Onde você nos encontrou"
                    />
                    <div className="mt-1">
                        <ButtonV2 onClick={onStart} variant="primary" showArrow disabled={!ready}>Iniciar demo ao vivo</ButtonV2>
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
