import type { DailyPriority } from "@/hooks/useCommandCenterData";

// Dados de exemplo para o ?preview= do Início (só em dev). Os nomes da fila
// vêm do print real da Central; os orçamentos, do exemplo do useQuoteBoard.
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
