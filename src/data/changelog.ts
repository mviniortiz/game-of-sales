export type ChangelogTag = "shipped" | "fix" | "feature" | "improvement";

export interface ChangelogItem {
  tag: ChangelogTag;
  text: string;
}

export interface ChangelogEntry {
  date: string;
  title: string;
  summary?: string;
  items: ChangelogItem[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-04-23",
    title: "Google Calendar mais robusto e build in public",
    summary: "Dois bugs do fluxo Google corrigidos e essa página aqui, começando a mostrar o que a gente faz toda semana.",
    items: [
      { tag: "fix", text: "Desconectar o Google Calendar agora remove os eventos sincronizados que ficavam órfãos no calendário." },
      { tag: "fix", text: "Ao conectar o Google Calendar, o OAuth callback redireciona direto pra página de Integrações em vez de cair no login." },
      { tag: "feature", text: "Nova página pública /changelog listando o que foi enviado pra produção." },
    ],
  },
  {
    date: "2026-04-22",
    title: "Integrações reorganizadas e Google Sheets em real-time",
    summary: "Captura de lead via Google Sheets sem Zapier, e a tela de Integrações ganhou estrutura por categoria.",
    items: [
      { tag: "feature", text: "Integração Google Sheets em real-time: cola um snippet do Apps Script gerado pela UI e cada linha nova vira lead via onEdit." },
      { tag: "improvement", text: "Página de Integrações reorganizada em quatro grupos: Captura de lead, Checkout, Pagamento e Produtividade." },
      { tag: "improvement", text: "Snippet do Apps Script (com URL e secret preenchidos) gerado e copiável direto do modal de webhook." },
      { tag: "feature", text: "Suporte a source_kind google_sheets na tabela lead_webhooks." },
    ],
  },
  {
    date: "2026-04-21",
    title: "Landing /para-agencias liberada, copy revisado",
    summary: "Retirei as promessas fictícias das landings de persona e abri a rota de Agências no menu.",
    items: [
      { tag: "shipped", text: "Landing /para-agencias saiu do 'em breve' no navbar, agora visível publicamente." },
      { tag: "improvement", text: "Copy de /para-agencias reescrito: MRR, Forecast, Renovações e Churn em vez de métricas que o produto ainda não calcula." },
      { tag: "improvement", text: "Copy de /para-infoprodutores revisado pra refletir só o que está entregue hoje via webhook." },
    ],
  },
  {
    date: "2026-04-14",
    title: "Eva AI unificada",
    summary: "O agente Eva agora funciona como Report + Copilot num único contexto compartilhado.",
    items: [
      { tag: "feature", text: "Eva combina Report e Copilot compartilhando memória (eva_memory) e resumos de conversa (conversation_summaries)." },
      { tag: "improvement", text: "Cache, deduplicação e cron de atualização da Eva em produção." },
    ],
  },
  {
    date: "2026-04-10",
    title: "Pulse: WhatsApp virou o centro de conversas",
    summary: "WhatsApp foi rebatizado e ganhou layout novo estilo Linear dark.",
    items: [
      { tag: "feature", text: "Nova área Pulse (antigo WhatsApp) com layout de 3 colunas, híbrido A+B, estilo Linear." },
      { tag: "feature", text: "Sidebar da Eva integrada ao Pulse pra contexto de conversa." },
      { tag: "improvement", text: "Polling de 10 segundos direto no Evolution, base pro próximo passo com webhook + Realtime." },
    ],
  },
  {
    date: "2026-04-05",
    title: "SDR auto-outreach (agente Markus)",
    summary: "Leads novos são abordados automaticamente por WhatsApp e email, tom humano.",
    items: [
      { tag: "feature", text: "Edge function + trigger pg_net que aborda leads por WhatsApp e email usando Claude Haiku." },
      { tag: "improvement", text: "Mensagens sem emojis e sem menção ao cargo SDR, voz natural." },
    ],
  },
  {
    date: "2026-03-28",
    title: "Onboarding unificado com checkout Mercado Pago",
    summary: "Cadastro, trial de 14 dias e pagamento transparente numa única tela.",
    items: [
      { tag: "shipped", text: "Novo onboarding unificado: registro, trial de 14 dias e checkout transparente Mercado Pago." },
      { tag: "shipped", text: "Domínio unificado vyzon.com.br: landing e app no mesmo domínio, sem subdomínio separado." },
      { tag: "feature", text: "Fluxo de agendamento de demo via Calendly + Supabase lead capture." },
    ],
  },
];
