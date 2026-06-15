// Preview isolado do card "Novo lead pronto pro pipeline" (EvaCreateDealNudge),
// para validar o visual sem depender de uma conversa real qualificada pela EVA.
// Rota: /eva-nudge-preview
import { EvaCreateDealNudge } from "@/components/inbox/EvaCreateDealNudge";
import { toast } from "sonner";

export default function EvaNudgePreview() {
    const noop = (label: string) => () => toast(label);

    return (
        <div style={{ minHeight: "100vh", background: "#EEF2F7", padding: "32px 16px" }}>
            <div style={{ maxWidth: 420, margin: "0 auto" }}>
                <h1 className="text-lg font-bold mb-1" style={{ color: "#0B1220" }}>
                    Preview · Card "Novo lead pronto pro pipeline"
                </h1>
                <p className="text-sm mb-6" style={{ color: "#64748B" }}>
                    É o card do nível 2 do upgrade de confiança, renderizado no painel da
                    EVA (Inbox) quando ela qualifica intenção de compra fora do pipeline.
                </p>

                {/* Coluna estreita simulando o painel da EVA */}
                <div className="flex flex-col gap-5" style={{ background: "#FFFFFF", padding: 16, borderRadius: 12, border: "1px solid #E5EAF1" }}>
                    <Label>Completo (nome, telefone, serviço, score, orçamento)</Label>
                    <EvaCreateDealNudge
                        customerName="Construtora Aurora · Ricardo Menezes"
                        phone="(11) 98877-6655"
                        servico="Apartamento 3 quartos · Lançamento Jardins"
                        score={82}
                        orcamento="alto"
                        onConfirm={noop("Criar no pipeline (preview)")}
                        onAdjust={noop("Ajustar antes (preview)")}
                    />

                    <Label>Mínimo (só nome)</Label>
                    <EvaCreateDealNudge
                        customerName="Lead WhatsApp"
                        onConfirm={noop("Criar no pipeline (preview)")}
                        onAdjust={noop("Ajustar antes (preview)")}
                    />

                    <Label>Carregando (durante a criação)</Label>
                    <EvaCreateDealNudge
                        customerName="Mariana Costa"
                        phone="(21) 99123-4567"
                        servico="Sala comercial"
                        score={67}
                        orcamento="adequado"
                        creating
                        onConfirm={noop("...")}
                        onAdjust={noop("...")}
                    />
                </div>
            </div>
        </div>
    );
}

function Label({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: "#94A3B8" }}>
            {children}
        </p>
    );
}
