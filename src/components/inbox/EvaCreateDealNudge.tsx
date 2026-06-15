// VYZON.AGENTS.2 — Degrau do "upgrade de confiança" (nível 2: sugere e faz).
//
// Quando a EVA qualifica intenção de compra (deve_criar_oportunidade) numa
// conversa que está FORA do pipeline e o modo híbrido automático NÃO está ligado,
// ela se oferece proativamente para criar o card — com um mini-confirma (o gestor
// vê os dados que ela usaria) e 1 clique. É o passo entre "sugere resposta" e
// "cria sozinha", para o gestor ganhar confiança vendo a EVA acertar.
//
// Presentacional puro: toda a lógica de criação vive no EvaPanel.
import { Check, ArrowRight, Loader2, Pencil } from "lucide-react";
import { EvaNode } from "@/components/landing/EvaNode";

const ORCAMENTO_LABEL: Record<string, string> = {
    informado: "Orçamento informado",
    baixo: "Orçamento baixo",
    adequado: "Orçamento adequado",
    alto: "Orçamento alto",
};

interface EvaCreateDealNudgeProps {
    customerName: string;
    phone?: string | null;
    servico?: string | null;
    score?: number | null;
    orcamento?: string | null;
    /** Rótulo da etapa de entrada (ex.: "Qualificação"). */
    entryStage?: string;
    creating?: boolean;
    onConfirm: () => void;
    onAdjust: () => void;
}

export function EvaCreateDealNudge({
    customerName,
    phone,
    servico,
    score,
    orcamento,
    entryStage = "Qualificação",
    creating = false,
    onConfirm,
    onAdjust,
}: EvaCreateDealNudgeProps) {
    const chips: string[] = [];
    if (servico) chips.push(servico);
    if (typeof score === "number") chips.push(`Score ${score}`);
    if (orcamento && orcamento !== "nao_informado" && ORCAMENTO_LABEL[orcamento]) {
        chips.push(ORCAMENTO_LABEL[orcamento]);
    }
    chips.push(`Entra em ${entryStage}`);

    return (
        <div
            className="rounded-xl overflow-hidden"
            style={{
                background: "linear-gradient(180deg, rgba(109,40,217,0.05), rgba(37,99,235,0.04))",
                border: "1px solid rgba(109,40,217,0.28)",
                boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -16px rgba(109,40,217,0.25)",
            }}
        >
            <div className="px-4 pt-3.5 pb-3">
                {/* Cabeçalho: marca EVA + selo do modelo assistido */}
                <div className="flex items-center justify-between gap-2 mb-2">
                    <p
                        className="text-[10px] uppercase inline-flex items-center gap-1.5"
                        style={{ color: "#6D28D9", fontWeight: 700, letterSpacing: "0.08em" }}
                    >
                        <EvaNode size={10} color="#6D28D9" />
                        Novo lead pronto pro pipeline
                    </p>
                    <span
                        className="text-[9.5px] uppercase px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(109,40,217,0.1)", color: "#6D28D9", fontWeight: 700, letterSpacing: "0.06em" }}
                    >
                        EVA sugere · você confirma
                    </span>
                </div>

                <p className="text-[12.5px] mb-2.5" style={{ color: "#334155", lineHeight: 1.5 }}>
                    A EVA detectou intenção de compra. Posso adicionar este lead ao pipeline
                    com os dados abaixo.
                </p>

                {/* Mini-confirma: o que ela vai criar */}
                <div
                    className="rounded-lg px-3 py-2.5 mb-3"
                    style={{ background: "#FFFFFF", border: "1px solid #E5EAF1" }}
                >
                    <p className="text-[13px] font-semibold" style={{ color: "#0B1220" }}>
                        {customerName}
                    </p>
                    {phone && (
                        <p className="text-[11.5px] mt-0.5" style={{ color: "#64748B" }}>
                            {phone}
                        </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {chips.map((c) => (
                            <span
                                key={c}
                                className="text-[10.5px] px-2 py-0.5 rounded-full"
                                style={{ background: "#F1F5F9", color: "#475569", fontWeight: 600 }}
                            >
                                {c}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={creating}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] text-white flex-1 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{
                            background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                            fontWeight: 700,
                            boxShadow: "0 1px 2px rgba(37,99,235,0.3)",
                        }}
                    >
                        {creating ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Criando...
                            </>
                        ) : (
                            <>
                                <Check className="h-3.5 w-3.5" />
                                Criar no pipeline
                                <ArrowRight className="h-3.5 w-3.5" />
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={onAdjust}
                        disabled={creating}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] transition-colors disabled:opacity-60"
                        style={{ background: "rgba(15,23,42,0.04)", color: "#475569", fontWeight: 600 }}
                    >
                        <Pencil className="h-3 w-3" />
                        Ajustar antes
                    </button>
                </div>
            </div>
        </div>
    );
}
