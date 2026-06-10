// ─────────────────────────────────────────────────────────────────────────────
// InboxListPreview (EVA.INBOX.3) — página TEMPORÁRIA de validação da nova
// lista de conversas do Inbox, com os DOIS estados lado a lado:
//   A = EVA Studio configurado (prioriza por valor, etiquetas-motivo)
//   B = Studio vazio (se cala sobre valor, ordena por tempo de espera)
//
// Dados 100% mock (cenário "Agência Metria Growth"). Score/temperatura são
// placeholder via `signals` — NÃO existe cálculo real aqui.
// Remover esta página + rota /inbox-list-preview depois de integrar.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { toast } from "sonner";
import {
    InboxPriorityList,
    type InboxLeadSignal,
} from "@/components/inbox/InboxPriorityList";
import type { Chat } from "@/hooks/useEvolutionAPI";

const minAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();

function chat(
    id: string,
    name: string,
    text: string,
    minutesAgo: number,
    unread: number,
    isMe = false,
): Chat {
    return {
        id,
        name,
        unreadCount: unread,
        lastMessage: { text, time: minAgo(minutesAgo), isMe },
        phone: `+55 11 9${id.padStart(4, "0")}-0000`,
        isGroup: false,
    };
}

const MOCK_CHATS: Chat[] = [
    chat("1", "Renata Souza", "Consegue me mandar os valores ainda hoje?", 35, 2),
    chat("2", "Carlos Mendes", "Fechado, só preciso alinhar com meu sócio amanhã cedo.", 12, 1),
    chat("3", "Ana Beatriz", "Vou pensar e te falo, ok?", 240, 1),
    chat("4", "Pedro Galvão", "Você: Nosso plano de social começa em R$ 1.800/mês.", 300, 0, true),
    chat("5", "Marcos Tavares", "manda mais detalhe", 90, 17),
    chat("6", "Juliana Freitas", "Você: Perfeito, qualquer coisa me chama!", 1500, 0, true),
    chat("7", "Bistrô da Vila", "quanto custa?", 2880, 1),
    // O lixo: contatos sem conversa
    { id: "8", name: "+55 11 98876-1123", unreadCount: 0, phone: "+55 11 98876-1123", isGroup: false },
    { id: "9", name: "+55 21 99450-8821", unreadCount: 0, phone: "+55 21 99450-8821", isGroup: false },
    { id: "10", name: "+55 31 97712-0034", unreadCount: 0, phone: "+55 31 97712-0034", isGroup: false },
];

// Placeholder do cálculo real: prioridade + motivo + espera, por chat.
const MOCK_SIGNALS: Record<string, InboxLeadSignal> = {
    "1": { priority: "quente", reason: "pediu proposta", waitingMinutes: 35 },
    "2": { priority: "quente", reason: "perto de fechar", waitingMinutes: 12 },
    "3": { priority: "esfriando", reason: "sem resposta há 4h", waitingMinutes: 240 },
    "4": { priority: "esfriando", reason: "sumiu depois do preço", waitingMinutes: null },
    "5": { priority: "frio", reason: "pouco contexto", waitingMinutes: 90 },
    "6": { priority: "frio", reason: "aguardando o lead", waitingMinutes: null },
    "7": { priority: "frio", reason: "pouco contexto", waitingMinutes: 2880 },
};

const PANELS = [
    { key: "a", label: "ESTADO A: Studio configurado", studioConfigured: true },
    { key: "b", label: "ESTADO B: Studio vazio (fallback honesto)", studioConfigured: false },
] as const;

export default function InboxListPreview() {
    const [selected, setSelected] = useState<string | null>("1");

    return (
        <div style={{ minHeight: "100vh", background: "#EFF2F7", padding: "32px 24px" }}>
            <div style={{ maxWidth: 880, margin: "0 auto" }}>
                <p
                    style={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.09em",
                        color: "#1E293B",
                        marginBottom: 4,
                    }}
                >
                    Preview local
                </p>
                <h1 style={{ fontSize: 18, fontWeight: 700, color: "#0B1220", marginBottom: 6 }}>
                    Lista do Inbox: prioridade com o porquê
                </h1>
                <p style={{ fontSize: 12.5, color: "#64748B", marginBottom: 24, lineHeight: 1.5 }}>
                    Dados mock; prioridade vem de placeholder (sem cálculo real). Teste o
                    toggle "Por horário", o collapse de contatos sem conversa e a busca.
                </p>

                <div style={{ display: "flex", gap: 24, alignItems: "stretch", flexWrap: "wrap" }}>
                    {PANELS.map((p) => (
                        <div key={p.key} style={{ width: 340 }}>
                            <p
                                style={{
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                    color: "#1E293B",
                                    marginBottom: 8,
                                }}
                            >
                                {p.label}
                            </p>
                            <div
                                style={{
                                    height: 680,
                                    borderRadius: 16,
                                    overflow: "hidden",
                                    border: "1px solid #D9E2EC",
                                    boxShadow: "0 18px 40px -28px rgba(15,23,42,0.35)",
                                }}
                            >
                                <InboxPriorityList
                                    chats={MOCK_CHATS}
                                    signals={MOCK_SIGNALS}
                                    studioConfigured={p.studioConfigured}
                                    selectedChatId={selected}
                                    onSelect={setSelected}
                                    onOpenStudio={() =>
                                        toast.info("Iria pro /eva-studio (mock do preview)")
                                    }
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
