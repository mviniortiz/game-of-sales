import { EvaSuggestionCard } from "@/components/eva/EvaSuggestionCard";
import { useState } from "react";
import { EvaAnalyzingState } from "@/components/inbox/EvaAnalyzingState";
import type { MessageLine } from "@/hooks/useEvolutionAPI";

const CONVERSA: MessageLine[] = [
    { id: "1", sender: "lead", text: "Oi, vi o orçamento que você mandou", time: "", timestamp: 1 },
    { id: "2", sender: "me", text: "Oi Fernanda! Ficou em R$ 24.900 pra 450 kWh por mês", time: "", timestamp: 2 },
    { id: "3", sender: "lead", text: "Achei um pouco caro, a minha conta de luz vem uns R$ 412", time: "", timestamp: 3 },
    { id: "4", sender: "lead", text: "Dá pra parcelar? Semana que vem eu te falo", time: "", timestamp: 4 },
];

// Preview temporário do EvaSuggestionCard + animação de análise do Inbox
// (rota /eva-suggestion-preview). Validação visual alinhada à DNA da landing.
export default function EvaSuggestionPreview() {
    const [rodada, setRodada] = useState(0);
    return (
        <div style={{ minHeight: "100vh", background: "#F3EFE4" }} className="px-6 py-12">
            <div className="mx-auto flex max-w-4xl flex-wrap items-start gap-8">
                <div className="w-full max-w-md space-y-6">
                    <p className="text-[13px]" style={{ color: "#64748B" }}>EvaSuggestionCard — preview</p>
                    <EvaSuggestionCard
                        suggestion="Claro. Antes de te passar os planos, posso entender quantos atendimentos vocês recebem por mês hoje?"
                        context="primeiro contato · interesse em planos · agência"
                    />
                    <EvaSuggestionCard suggestion="Perfeito! Te envio uma proposta ainda hoje à tarde com um diagnóstico inicial. Pode ser?" />
                    <EvaSuggestionCard suggestion="" loading />
                </div>
                <div className="w-[360px]">
                    <button type="button" className="mb-3 text-[13px] underline" style={{ color: "#64748B" }} onClick={() => setRodada((n) => n + 1)}>
                        EvaAnalyzingState — preview (rodar de novo)
                    </button>
                    <div
                        className="flex flex-col rounded-2xl"
                        style={{ height: 520, background: "#F8FAFD", border: "1px solid #E6EDF5" }}
                    >
                        <EvaAnalyzingState key={rodada} messages={CONVERSA} />
                    </div>
                </div>
            </div>
        </div>
    );
}
