// Página de calibração da EvaEntity (temporária). Rota: /eva-entity-test
// Mostra os 4 estados ao vivo, em 3 tamanhos, + um grande interativo pra sentir
// o ritmo. Ainda NÃO plugado na lógica real — `state` é manual aqui.
import { useState } from "react";
import { EvaEntity, type EvaEntityState } from "@/components/eva/EvaEntity";

const STATES: EvaEntityState[] = ["idle", "thinking", "alert", "done", "listening"];

const STATE_NOTE: Record<EvaEntityState, string> = {
    idle: "respiro lento (~4s), quase imperceptível — o padrão",
    thinking: "nós pulsam (~1s) + sinal correndo nas linhas — refetch / chat respondendo",
    alert: "coral, pulso tenso e curto (~1.2s) — ação crítica pendente",
    done: "respiro profundo e lento, verde — missão concluída",
    listening: "slate apagado, respiro mínimo (~6.5s) — em escuta, sem contexto pra sugerir",
};

export default function EvaEntityTest() {
    const [active, setActive] = useState<EvaEntityState>("idle");
    return (
        <div className="min-h-screen px-6 py-10" style={{ background: "#F7F8FB" }}>
            <div className="mx-auto w-full max-w-[920px]">
                <h1 className="text-[24px] font-bold" style={{ color: "#0B1220", letterSpacing: "-0.02em" }}>
                    EvaEntity — calibração dos 4 estados
                </h1>
                <p className="text-[13.5px] mt-1" style={{ color: "#475569" }}>
                    Ainda não plugado em criticalCount/refetch. Ajuste o ritmo aqui; os tempos vivem nas classes
                    <code className="mx-1 px-1.5 py-0.5 rounded" style={{ background: "#EEF1F6", color: "#334155" }}>vz-eva-*</code>
                    do index.css. Ative "reduzir movimento" no SO pra testar o fallback (fica estático, mas muda de cor).
                </p>

                {/* Grid dos 4 estados, cada um em 3 tamanhos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-7">
                    {STATES.map((s) => (
                        <div
                            key={s}
                            className="rounded-2xl p-5"
                            style={{ background: "#FFFFFF", border: "1px solid #E4E9F2", boxShadow: "0 1px 2px rgba(15,23,42,0.04)" }}
                        >
                            <div className="flex items-center gap-5">
                                <EvaEntity size={28} state={s} />
                                <EvaEntity size={48} state={s} />
                                <EvaEntity size={84} state={s} />
                            </div>
                            <div className="mt-3.5">
                                <code className="text-[12px] font-bold" style={{ color: "#3C3489" }}>state="{s}"</code>
                                <p className="text-[12px] mt-0.5" style={{ color: "#475569" }}>{STATE_NOTE[s]}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Interativo grande */}
                <div
                    className="rounded-2xl p-7 mt-5 flex flex-col items-center gap-5"
                    style={{ background: "#FFFFFF", border: "1px solid #E4E9F2" }}
                >
                    <EvaEntity size={150} state={active} />
                    <div className="flex flex-wrap gap-2 justify-center">
                        {STATES.map((s) => {
                            const on = active === s;
                            return (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setActive(s)}
                                    className="h-9 px-4 rounded-lg text-[13px] font-semibold transition-colors"
                                    style={{
                                        background: on ? "#3C3489" : "#FFFFFF",
                                        color: on ? "#FFFFFF" : "#475569",
                                        border: `1px solid ${on ? "#3C3489" : "#E2E8F0"}`,
                                    }}
                                >
                                    {s}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-[12px]" style={{ color: "#64748B" }}>
                        A troca de cor entre estados anima (transição de 0.4s), pra ver o "vira coral / vira verde".
                    </p>
                </div>
            </div>
        </div>
    );
}
