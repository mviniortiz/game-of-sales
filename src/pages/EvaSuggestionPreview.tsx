import { EvaSuggestionCard } from "@/components/eva/EvaSuggestionCard";
import { EvaAnalyzingState } from "@/components/inbox/EvaAnalyzingState";

// Preview temporário do EvaSuggestionCard + animação de análise do Inbox
// (rota /eva-suggestion-preview). Validação visual alinhada à DNA da landing.
export default function EvaSuggestionPreview() {
    return (
        <div style={{ minHeight: "100vh", background: "#F6F4EF" }} className="px-6 py-12">
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
                    <p className="mb-3 text-[13px]" style={{ color: "#64748B" }}>EvaAnalyzingState — preview</p>
                    <div
                        className="flex flex-col rounded-2xl"
                        style={{ height: 520, background: "#F8FAFD", border: "1px solid #E6EDF5" }}
                    >
                        <EvaAnalyzingState />
                    </div>
                </div>
            </div>
        </div>
    );
}
