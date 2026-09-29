import type { DailyPriority } from "@/hooks/useCommandCenterData";
import type { CockpitData } from "@/hooks/useCockpitData";
import type { EvaDiary } from "@/hooks/useEvaDiary";
import type { FunnelStage } from "./PipelineFunnel";

// Dados de exemplo para o ?preview= do Início (só em dev). Os nomes da fila, os
// leads por dia e a mediana de 1h00 vêm do print real da Central; os
// orçamentos, do exemplo do useQuoteBoard.
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
export const AGORA_SAMPLE_PRIORITIES: DailyPriority[] = [
    {
        id: "s1", title: "Responda Carla Ribeiro agora", description: "Última mensagem recebida há 54h.",
        reason: "Alta intenção segundo a EVA, sem resposta", priority: "critical", actionLabel: "Abrir conversa",
        href: "/inbox", source: "conversation", conversationId: "c-p1", contactName: "Carla Ribeiro",
        createdAt: hoursAgo(54), chatJid: "5521999990001@s.whatsapp.net",
    },
    {
        id: "s2", title: "Mayara Sampaio sem resposta há mais de 24h", description: "Lead novo pelo WhatsApp.",
        reason: "lead novo, ainda sem orçamento", priority: "high", actionLabel: "Abrir conversa",
        href: "/inbox", source: "conversation", conversationId: "c-s2", contactName: "Mayara Sampaio",
        createdAt: hoursAgo(26), chatJid: "5521999990002@s.whatsapp.net",
    },
    {
        id: "s3", title: "Serviços mais pedidos nos últimos dias", description: "Sinais de mercado agregados.",
        reason: "Sinais de mercado agregados", priority: "low", actionLabel: "Ver", href: "/eva-studio", source: "eva",
    },
];

const dayKey = (offset: number) => {
    const d = new Date(Date.now() - offset * 86_400_000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const LEADS_BY_OFFSET: Record<number, number> = { 13: 1, 5: 1, 3: 1, 2: 2 };
const WON_BY_OFFSET: Record<number, number> = { 8: 1, 2: 1 };

export const SAMPLE_COCKPIT: CockpitData = {
    wonMonthTotal: 35_500,
    wonMonthCount: 2,
    monthGoal: 60_000,
    days: Array.from({ length: 14 }, (_, i) => {
        const offset = 13 - i;
        const day = dayKey(offset);
        const [, m, d] = day.split("-");
        return { day, label: `${Number(d)}/${Number(m)}`, leads: LEADS_BY_OFFSET[offset] ?? 0, won: WON_BY_OFFSET[offset] ?? 0 };
    }),
    responseMedianMin: 60,
};

export const SAMPLE_FUNNEL: FunnelStage[] = [
    { key: "lead", name: "Novo lead", count: 3, totalValue: 0, values: [0, 0, 0] },
    { key: "qualification", name: "Qualificação", count: 2, totalValue: 30_800, values: [18_800, 12_000] },
    { key: "proposal", name: "Proposta", count: 5, totalValue: 133_700, values: [61_200, 23_900, 18_400, 15_900, 14_300] },
    { key: "negotiation", name: "Negociação", count: 1, totalValue: 142_000, values: [142_000] },
    { key: "closed_won", name: "Ganho", count: 2, totalValue: 35_500, values: [23_900, 11_600] },
];

const at = (daysBack: number, h: number, m: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysBack);
    d.setHours(h, m, 0, 0);
    return d;
};

export const SAMPLE_DIARY: EvaDiary = {
    eventos: [
        { id: "e1", quando: at(0, 9, 12), texto: "Escreveu a retomada de Padaria Trigo Bom e mandou no seu WhatsApp para aprovar", rascunho: true },
        { id: "e2", quando: at(0, 8, 40), texto: "Abriu uma oportunidade para Mayara Sampaio", rascunho: false },
        { id: "e3", quando: at(1, 18, 5), texto: "Registrou a proposta em PDF enviada a Carlos Menezes: R$ 23.900", rascunho: false },
        { id: "e4", quando: at(1, 16, 30), texto: "Moveu Condomínio Vila Verde de etapa", rascunho: false },
        { id: "e5", quando: at(1, 15, 2), texto: "Leu 6 conversas", rascunho: false },
    ],
    rascunhos: [{ id: "r1", codigo: "B7", quem: "Padaria Trigo Bom", noWhatsapp: true }],
    traces: [
        {
            runId: "t1",
            hora: at(0, 9, 11),
            sobre: "Padaria Trigo Bom",
            passos: [
                { ordem: 1, texto: "Leu a conversa", duracaoMs: 212 },
                { ordem: 2, texto: "Pensou no próximo passo", duracaoMs: 1840 },
                { ordem: 3, texto: "Escreveu a mensagem", duracaoMs: 96 },
            ],
        },
    ],
    loading: false,
};
