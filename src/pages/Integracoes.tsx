import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePlan } from "@/hooks/usePlan";
import { UpgradePrompt } from "@/components/shared/UpgradePrompt";
import {
  Search,
  ThumbsUp,
  Settings,
  Puzzle,
  Activity,
  ArrowUpRight,
  Shield,
  Plug,
  Inbox,
  ShoppingCart,
  CreditCard,
  Calendar,
  Bell,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { IntegrationConfigModal } from "@/components/integrations/IntegrationConfigModal";
import { GoogleCalendarConfigModal } from "@/components/integrations/GoogleCalendarConfigModal";
import { ChannelConfigModal, CHANNEL_SPECS, type ChannelPlatform } from "@/components/integrations/ChannelConfigModal";
import { WebhookHeartbeat } from "@/components/integrations/WebhookHeartbeat";
import { INTEGRATIONS_CONFIG } from "@/config/integrationsConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// Import logo images
import googleCalendarLogo from "@/assets/integrations/google-calendar.webp";
import celetusLogo from "@/assets/integrations/celetus.webp";
import caktoLogo from "@/assets/integrations/cakto.webp";
import greennLogo from "@/assets/integrations/greenn.webp";
import hotmartLogo from "@/assets/integrations/hotmart-logo-png_seeklogo-485917.webp";
import kiwifyLogo from "@/assets/integrations/kiwify-logo-png_seeklogo-537186.webp";
import rdstationLogo from "@/assets/integrations/rdstation.svg";
import braipLogo from "@/assets/integrations/braip.webp";
import monetizzeLogo from "@/assets/integrations/monetizze.webp";
import eduzzLogo from "@/assets/integrations/eduzz.webp";
import mercadopagoLogo from "@/assets/integrations/mercadopago.webp";
import pagarmeLogo from "@/assets/integrations/pagarme.svg";
import stripeLogo from "@/assets/integrations/stripe.svg";
import asaasLogo from "@/assets/integrations/asaas.svg";
import zapierLogo from "@/assets/integrations/zapier.svg";
import notazzLogo from "@/assets/integrations/notazz.png";
import googleSheetsLogo from "@/assets/integrations/google-sheets.svg";
import slackLogo from "@/assets/integrations/slack.svg";
import discordLogo from "@/assets/integrations/discord.svg";

// ── Types ──────────────────────────────────────────────────────────
type IntegrationStatus = "active" | "available" | "roadmap";
type IntegrationCategory =
  | "all"
  | "lead_capture"
  | "checkout"
  | "payment"
  | "notifications"
  | "productivity";

interface Integration {
  id: string;
  name: string;
  description: string;
  logo?: string;
  logoText?: string;
  logoBg: string;
  logoColor?: string;
  status: IntegrationStatus;
  category: IntegrationCategory;
  votes?: number;
  features?: string[];
}

interface WebhookLog {
  id: string;
  platform: string;
  event_type: string | null;
  status: string | null;
  error_message: string | null;
  created_at: string;
}

// ── Integration Data ───────────────────────────────────────────────
const INTEGRATIONS: Integration[] = [
  // ── Captura de leads ────────────────────────────────────
  {
    id: "google-sheets",
    name: "Google Sheets",
    description: "Cada linha nova na planilha vira um deal no pipeline em tempo real via Apps Script",
    logo: googleSheetsLogo,
    logoBg: "bg-white",
    status: "available",
    category: "lead_capture",
    features: ["onEdit real-time", "Snippet pronto", "Sem Zapier"],
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Conecte 7.000+ apps — Typeform, Mailchimp, Calendly, Sheets",
    logo: zapierLogo,
    logoBg: "bg-white",
    status: "available",
    category: "lead_capture",
    features: ["7.000+ apps", "No-code", "Payload custom"],
  },
  {
    id: "rdstation",
    name: "RD Station",
    description: "Sincronize leads, conversões e oportunidades do RD Station Marketing e CRM",
    logo: rdstationLogo,
    logoBg: "bg-white",
    status: "available",
    category: "lead_capture",
    features: ["Conversões", "Oportunidades", "Leads", "CRM Sync"],
  },

  // ── Checkouts de infoproduto ────────────────────────────
  {
    id: "hotmart",
    name: "Hotmart",
    description: "Importe vendas e comissões automaticamente via webhook",
    logo: hotmartLogo,
    logoBg: "bg-white",
    status: "available",
    category: "checkout",
    features: ["Vendas", "Reembolsos", "Chargebacks"],
  },
  {
    id: "kiwify",
    name: "Kiwify",
    description: "Webhooks em tempo real para vendas e reembolsos",
    logo: kiwifyLogo,
    logoBg: "bg-white",
    status: "available",
    category: "checkout",
    features: ["Vendas", "Assinaturas", "HMAC-SHA256"],
  },
  {
    id: "greenn",
    name: "Greenn",
    description: "Importe recorrências e assinaturas automaticamente",
    logo: greennLogo,
    logoBg: "bg-white",
    status: "available",
    category: "checkout",
    features: ["Recorrências", "Transações", "Webhooks"],
  },
  {
    id: "cakto",
    name: "Cakto",
    description: "Conecte vendas e relatórios financeiros via webhook",
    logo: caktoLogo,
    logoBg: "bg-white",
    status: "available",
    category: "checkout",
    features: ["Vendas", "Reembolsos", "Chargebacks"],
  },
  {
    id: "braip",
    name: "Braip",
    description: "Sincronize vendas de produtores e afiliados via postback",
    logo: braipLogo,
    logoBg: "bg-white",
    status: "available",
    category: "checkout",
    features: ["Pedidos", "Afiliados", "Postbacks"],
  },
  {
    id: "monetizze",
    name: "Monetizze",
    description: "Importe vendas, reembolsos e boletos da Monetizze",
    logo: monetizzeLogo,
    logoBg: "bg-white",
    status: "available",
    category: "checkout",
    features: ["Vendas", "Boletos", "Reembolsos"],
  },
  {
    id: "eduzz",
    name: "Eduzz",
    description: "Conecte vendas de cursos e produtos digitais da Eduzz",
    logo: eduzzLogo,
    logoBg: "bg-white",
    status: "available",
    category: "checkout",
    features: ["Faturas", "Assinaturas", "Reembolsos"],
  },

  // ── Gateways de pagamento ───────────────────────────────
  {
    id: "asaas",
    name: "Asaas",
    description: "Cobrança recorrente, PIX, boleto e cartão em tempo real",
    logo: asaasLogo,
    logoBg: "bg-white",
    status: "available",
    category: "payment",
    features: ["PIX / Boleto / Cartão", "Assinaturas", "Chargebacks"],
  },
  {
    id: "mercadopago",
    name: "Mercado Pago",
    description: "Receba pagamentos aprovados, PIX, reembolsos e cancelamentos do MP",
    logo: mercadopagoLogo,
    logoBg: "bg-white",
    status: "available",
    category: "payment",
    features: ["PIX & cartão", "Reembolsos", "Webhook nativo"],
  },
  {
    id: "celetus",
    name: "Celetus",
    description: "Sincronize transações e leads da plataforma Celetus",
    logo: celetusLogo,
    logoBg: "bg-white",
    status: "roadmap",
    category: "payment",
    votes: 23,
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Integre pagamentos internacionais e assinaturas recorrentes",
    logo: stripeLogo,
    logoBg: "bg-white",
    status: "roadmap",
    category: "payment",
    votes: 15,
  },
  {
    id: "pagarme",
    name: "Pagar.me",
    description: "Sincronize transações e pagamentos da Pagar.me",
    logo: pagarmeLogo,
    logoBg: "bg-white",
    status: "roadmap",
    category: "payment",
    votes: 12,
  },

  // ── Produtividade ───────────────────────────────────────
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sincronize agendamentos e calls de vendas automaticamente",
    logo: googleCalendarLogo,
    logoBg: "bg-white",
    status: "available",
    category: "productivity",
    features: ["Sync automático", "Bidirecional", "15min refresh"],
  },
  {
    id: "notazz",
    name: "Notazz",
    description: "Emissão automática de NF-e e NFS-e com callback de status",
    logo: notazzLogo,
    logoBg: "bg-white",
    status: "available",
    category: "productivity",
    features: ["NF-e / NFS-e", "Callback de status", "PDF/XML no deal"],
  },

  // ── Notificações (saída) ────────────────────────────────
  {
    id: "slack",
    name: "Slack",
    description: "A EVA avisa o time no canal a cada venda fechada e quando a meta é batida",
    logo: slackLogo,
    logoBg: "bg-white",
    status: "available",
    category: "notifications",
    features: ["Venda fechada", "Meta batida", "Mensagem da EVA"],
  },
  {
    id: "discord",
    name: "Discord",
    description: "Notificações de vendas e metas no servidor do time, escritas pela EVA",
    logo: discordLogo,
    logoBg: "bg-white",
    status: "available",
    category: "notifications",
    features: ["Venda fechada", "Meta batida", "Mensagem da EVA"],
  },
];

const FILTER_TABS: { id: IntegrationCategory; label: string; icon: React.ElementType }[] = [
  { id: "all", label: "Todas", icon: Puzzle },
  { id: "lead_capture", label: "Captura de leads", icon: Inbox },
  { id: "checkout", label: "Checkouts", icon: ShoppingCart },
  { id: "payment", label: "Pagamentos", icon: CreditCard },
  { id: "notifications", label: "Notificações", icon: Bell },
  { id: "productivity", label: "Produtividade", icon: Calendar },
];

const GROUP_ORDER: Exclude<IntegrationCategory, "all">[] = [
  "lead_capture",
  "checkout",
  "payment",
  "notifications",
  "productivity",
];

const GROUP_META: Record<Exclude<IntegrationCategory, "all">, { label: string; sub: string; icon: React.ElementType }> = {
  lead_capture: {
    label: "Captura de leads",
    sub: "Planilhas, formulários e CRMs que alimentam seu pipeline",
    icon: Inbox,
  },
  checkout: {
    label: "Checkouts de infoproduto",
    sub: "Hotmart, Kiwify e afins — vendas entram como deal",
    icon: ShoppingCart,
  },
  payment: {
    label: "Gateways de pagamento",
    sub: "Cobrança recorrente, PIX e cartão com webhook",
    icon: CreditCard,
  },
  notifications: {
    label: "Notificações do time",
    sub: "A EVA avisa o time sobre vendas e metas no Slack ou Discord",
    icon: Bell,
  },
  productivity: {
    label: "Produtividade",
    sub: "Agenda, fiscal e rotina do time comercial",
    icon: Calendar,
  },
};

const PLATFORM_NAMES: Record<string, string> = {
  hotmart: "Hotmart",
  kiwify: "Kiwify",
  greenn: "Greenn",
  "google-calendar": "Google Calendar",
  rdstation: "RD Station",
  cakto: "Cakto",
  braip: "Braip",
  monetizze: "Monetizze",
  eduzz: "Eduzz",
  asaas: "Asaas",
  zapier: "Zapier",
  notazz: "Notazz",
  mercadopago: "Mercado Pago",
};

const EVENT_LABELS: Record<string, string> = {
  PURCHASE_APPROVED: "Venda aprovada",
  PURCHASE_COMPLETE: "Compra finalizada",
  PURCHASE_REFUNDED: "Reembolso",
  PURCHASE_CANCELED: "Cancelamento",
  PURCHASE_CHARGEBACK: "Chargeback",
  order_approved: "Pedido aprovado",
  order_refunded: "Reembolso",
  order_chargedback: "Chargeback",
  subscription_created: "Assinatura criada",
  subscription_canceled: "Assinatura cancelada",
  purchase_approved: "Compra aprovada",
  purchase_refunded: "Reembolso",
  purchase_canceled: "Cancelamento",
  purchase_chargeback: "Chargeback",
  "order.paid": "Pedido pago",
  "order.refunded": "Reembolso",
  "order.canceled": "Cancelamento",
  "order.chargeback": "Chargeback",
  venda_realizada: "Venda realizada",
  venda_reembolsada: "Reembolso",
  venda_cancelada: "Cancelamento",
  venda_chargeback: "Chargeback",
  boleto_gerado: "Boleto gerado",
  invoice_paid: "Fatura paga",
  invoice_refunded: "Reembolso",
  invoice_canceled: "Cancelamento",
  invoice_chargeback: "Chargeback",
  contract_canceled: "Assinatura cancelada",
  PAYMENT_CREATED: "Cobrança criada",
  PAYMENT_CONFIRMED: "Pagamento confirmado",
  PAYMENT_RECEIVED: "Pagamento recebido",
  PAYMENT_OVERDUE: "Cobrança vencida",
  PAYMENT_REFUNDED: "Reembolso",
  PAYMENT_DELETED: "Cobrança deletada",
  PAYMENT_CHARGEBACK_REQUESTED: "Chargeback",
  lead_created: "Lead criado",
  deal_won: "Deal ganho",
  sale_approved: "Venda aprovada",
  deal_lost: "Deal perdido",
  cancellation: "Cancelamento",
  refund: "Reembolso",
  NF_AUTHORIZED: "NF autorizada",
  NF_REJECTED: "NF rejeitada",
  NF_CANCELLED: "NF cancelada",
  NF_PROCESSING: "NF em processamento",
  NF_ERROR: "Erro na NF",
  "WEBHOOK.CONVERTED": "Conversão de lead",
  "WEBHOOK.MARKED_OPPORTUNITY": "Oportunidade marcada",
  crm_deal_created: "Deal criado no CRM",
  crm_deal_updated: "Deal atualizado no CRM",
  "payment.created": "Pagamento criado (MP)",
  "payment.updated": "Pagamento atualizado (MP)",
  approved: "Pagamento aprovado",
  refunded: "Reembolso",
  cancelled: "Cancelamento",
  rejected: "Pagamento rejeitado",
};

// ── Status helpers ──────────────────────────────────────────────────
const statusDot = (status: string | null) => {
  switch (status) {
    case "success": return "#16A34A";
    case "error": return "#DC2626";
    case "processing": return "#D97706";
    default: return "#94A3B8";
  }
};

// ── Integration Card ──────────────────────────────────────────────
const IntegrationCard = ({
  integration,
  effectiveStatus,
  lastEvent,
  eventCount,
  onConnect,
  onManage,
}: {
  integration: Integration;
  effectiveStatus: IntegrationStatus;
  lastEvent?: WebhookLog | null;
  eventCount?: number;
  onConnect?: () => void;
  onManage?: () => void;
}) => {
  const [votes, setVotes] = useState(integration.votes || 0);
  const [hasVoted, setHasVoted] = useState(false);

  const handleVote = () => {
    if (!hasVoted) {
      setVotes(v => v + 1);
      setHasVoted(true);
    }
  };

  const isActive = effectiveStatus === "active";
  const isRoadmap = effectiveStatus === "roadmap";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="group relative flex flex-col h-full rounded-2xl overflow-hidden transition-colors"
      style={{
        background: isRoadmap ? "#F8FAFC" : "#FFFFFF",
        border: `1px solid ${isActive ? "rgba(22,163,74,0.28)" : "#E6EDF5"}`,
        boxShadow: "0 1px 2px rgba(11,18,32,0.04)",
      }}
    >
      <div className="p-5 flex-1 flex flex-col">
        {/* Header row: Logo + Status */}
        <div className="flex items-start justify-between mb-3.5">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center bg-white p-2 overflow-hidden"
            style={{ border: "1px solid #EEF2F7" }}
          >
            {integration.logo ? (
              <img src={integration.logo} alt={integration.name} className="w-full h-full object-contain" />
            ) : (
              <span className="text-base font-bold" style={{ color: "#0B1220" }}>
                {integration.logoText}
              </span>
            )}
          </div>

          {isActive && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "#ECFDF3" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#16A34A" }} />
              <span className="text-[10px] font-semibold uppercase" style={{ color: "#16A34A", letterSpacing: "0.04em" }}>
                Conectado
              </span>
            </span>
          )}
          {isRoadmap && (
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: "#F1F5F9", color: "#94A3B8" }}>
              Em breve
            </span>
          )}
        </div>

        {/* Name & Description */}
        <h3 className="text-[15px] font-semibold mb-1 tracking-tight" style={{ color: "#0B1220" }}>{integration.name}</h3>
        <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: "#64748B" }}>{integration.description}</p>

        {/* Feature pills (até 3 — resto vai pro modal) */}
        {integration.features && !isRoadmap && (
          <div className="flex flex-wrap gap-1.5 mt-3.5">
            {integration.features.slice(0, 3).map((feature) => (
              <span
                key={feature}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium"
                style={{ background: "#F8FAFC", color: "#64748B", border: "1px solid #EEF2F7" }}
              >
                {feature}
              </span>
            ))}
          </div>
        )}

        {/* Active: último evento (compacto) */}
        {isActive && lastEvent && (
          <div className="mt-3.5 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statusDot(lastEvent.status) }} />
              <span className="text-[11px] truncate" style={{ color: "#64748B" }}>
                {EVENT_LABELS[lastEvent.event_type || ""] || lastEvent.event_type || "Evento"}
              </span>
            </span>
            <span className="text-[10px] tabular-nums shrink-0" style={{ color: "#94A3B8" }}>
              {formatDistanceToNow(new Date(lastEvent.created_at), { addSuffix: true, locale: ptBR })}
            </span>
          </div>
        )}

        <div className="flex-1" />
      </div>

      {/* Footer */}
      <div className="px-5 py-3" style={{ borderTop: "1px solid #EEF2F7", background: "#FCFDFE" }}>
        {isActive && (
          <div className="flex items-center justify-between">
            <span className="text-[11px]" style={{ color: "#94A3B8" }}>
              {eventCount !== undefined && eventCount > 0 ? `${eventCount} eventos este mês` : "Recebendo eventos"}
            </span>
            <button
              onClick={onManage}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors hover:bg-[#F1F5F9]"
              style={{ color: "#475569" }}
            >
              <Settings className="w-3.5 h-3.5" />
              Gerenciar
            </button>
          </div>
        )}

        {effectiveStatus === "available" && (
          <button
            onClick={onConnect}
            className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-lg text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors"
          >
            <Plug className="w-3.5 h-3.5" />
            Conectar
          </button>
        )}

        {isRoadmap && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] tabular-nums" style={{ color: "#94A3B8" }}>
              <span className="font-semibold" style={{ color: "#0B1220" }}>{votes}</span> votos
            </span>
            <button
              onClick={handleVote}
              disabled={hasVoted}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors disabled:cursor-default"
              style={hasVoted
                ? { background: "#ECFDF3", color: "#16A34A", borderColor: "rgba(22,163,74,0.2)" }
                : { borderColor: "#E6EDF5", color: "#475569" }}
            >
              <ThumbsUp className={`w-3 h-3 ${hasVoted ? "fill-current" : ""}`} />
              {hasVoted ? "Votado" : "Votar"}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ── Type for integration config ──────────────────────────────────────
interface IntegrationConfig {
  id: string;
  company_id: string;
  platform: string;
  is_active: boolean;
}

// ── Main Component ──────────────────────────────────────────────────
const Integracoes = () => {
  const { needsUpgrade } = usePlan();
  const { companyId } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<IntegrationCategory>("all");
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [googleCalendarModalOpen, setGoogleCalendarModalOpen] = useState(false);
  const [channelPlatform, setChannelPlatform] = useState<ChannelPlatform | null>(null);
  const [activeIntegrationIds, setActiveIntegrationIds] = useState<Set<string>>(new Set());
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);

  useEffect(() => {
    const success = searchParams.get("success");
    const errorCode = searchParams.get("error");
    if (!success && !errorCode) return;

    if (success === "true") {
      toast.success("Google Calendar conectado com sucesso");
    } else if (errorCode) {
      const messages: Record<string, string> = {
        auth_failed: "Autorização do Google cancelada",
        invalid_state: "Sessão OAuth inválida, tente novamente",
        state_expired: "Sessão OAuth expirou, tente novamente",
        invalid_state_signature: "Assinatura OAuth inválida, tente novamente",
        token_failed: "Falha ao trocar código por token",
        db_failed: "Falha ao salvar tokens no perfil",
        connection_failed: "Erro inesperado na conexão",
      };
      toast.error(messages[errorCode] || `Erro: ${errorCode}`);
    }

    const next = new URLSearchParams(searchParams);
    next.delete("success");
    next.delete("error");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Check Google Calendar status
  const checkGoogleCalendarStatus = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("google_access_token, google_token_expires_at")
        .eq("id", userId)
        .single();

      if (data?.google_access_token) {
        const expiresAt = data.google_token_expires_at ? new Date(data.google_token_expires_at) : null;
        setGoogleCalendarConnected(!(expiresAt && expiresAt < new Date()));
      } else {
        setGoogleCalendarConnected(false);
      }
    } catch {
      setGoogleCalendarConnected(false);
    }
  }, []);

  // Fetch active integrations
  const loadIntegrationStatuses = useCallback(async () => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from("integration_configs" as any)
        .select("platform, is_active")
        .eq("company_id", companyId)
        .eq("is_active", true);

      if (error || !data) return;
      setActiveIntegrationIds(new Set((data as unknown as IntegrationConfig[]).map(c => c.platform)));
    } catch {}
  }, [companyId]);

  // Fetch webhook logs
  const { data: webhookLogs = [] } = useQuery({
    queryKey: ["webhook-logs", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("webhook_logs")
        .select("id, platform, event_type, status, error_message, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) return [];
      return (data || []) as WebhookLog[];
    },
    enabled: !!companyId,
    refetchInterval: 30000, // refresh every 30s
  });

  // Webhook stats
  const webhookStats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonth = webhookLogs.filter(l => new Date(l.created_at) >= startOfMonth);
    const successCount = thisMonth.filter(l => l.status === "success").length;
    const errorCount = thisMonth.filter(l => l.status === "error").length;
    const totalCount = thisMonth.length;

    // Group by platform for last event
    const lastByPlatform: Record<string, WebhookLog> = {};
    const countByPlatform: Record<string, number> = {};

    for (const log of webhookLogs) {
      if (!lastByPlatform[log.platform]) {
        lastByPlatform[log.platform] = log;
      }
      if (new Date(log.created_at) >= startOfMonth) {
        countByPlatform[log.platform] = (countByPlatform[log.platform] || 0) + 1;
      }
    }

    return { totalCount, successCount, errorCount, lastByPlatform, countByPlatform };
  }, [webhookLogs]);

  useEffect(() => { loadIntegrationStatuses(); }, [loadIntegrationStatuses]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) checkGoogleCalendarStatus(data.user.id);
    });
  }, [checkGoogleCalendarStatus]);

  const handleIntegrationSaved = () => {
    loadIntegrationStatuses();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) checkGoogleCalendarStatus(data.user.id);
    });
  };

  const handleManageIntegration = (id: string) => {
    if (id === "google-calendar") {
      setGoogleCalendarModalOpen(true);
      return;
    }
    if (id === "slack" || id === "discord") {
      setChannelPlatform(id);
      return;
    }
    if (id === "google-sheets") {
      navigate("/configuracoes/webhooks-leads?create=google_sheets");
      return;
    }
    if (INTEGRATIONS_CONFIG[id]) {
      setSelectedPlatform(id);
    }
  };

  const handleConnect = (id: string) => handleManageIntegration(id);

  if (needsUpgrade('integrations')) {
    return <UpgradePrompt feature="integrations" />;
  }

  const allIntegrations = INTEGRATIONS;

  const getEffectiveStatus = (integration: Integration): IntegrationStatus => {
    if (integration.id === "google-calendar") return googleCalendarConnected ? "active" : "available";
    if (activeIntegrationIds.has(integration.id)) return "active";
    return integration.status;
  };

  const filteredIntegrations = allIntegrations.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === "all" || i.category === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const activeIntegrations = filteredIntegrations.filter(i => getEffectiveStatus(i) === "active");
  const availableIntegrations = filteredIntegrations.filter(i => getEffectiveStatus(i) === "available");
  const roadmapIntegrations = filteredIntegrations.filter(i => getEffectiveStatus(i) === "roadmap");

  const connectedCount = allIntegrations.filter(i => getEffectiveStatus(i) === "active").length;

  return (
    <>
      <div className="space-y-6">
        {/* Stats + filtros + busca (o título "Integrações" vem do layout de Configurações) */}
        <div className="flex flex-col gap-4">
          {/* Mini stats */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 rounded-xl px-3.5 py-2" style={{ background: "#FFFFFF", border: "1px solid #E6EDF5", boxShadow: "0 1px 2px rgba(11,18,32,0.04)" }}>
              <span className="text-[11px] font-semibold uppercase" style={{ color: "#64748B", letterSpacing: "0.04em" }}>Conectadas</span>
              <span className="text-sm font-bold tabular-nums flex items-center gap-1.5" style={{ color: "#0B1220" }}>
                {connectedCount}
                {connectedCount > 0 && <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#16A34A" }} />}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-xl px-3.5 py-2" style={{ background: "#FFFFFF", border: "1px solid #E6EDF5", boxShadow: "0 1px 2px rgba(11,18,32,0.04)" }}>
              <span className="text-[11px] font-semibold uppercase" style={{ color: "#64748B", letterSpacing: "0.04em" }}>Eventos no mês</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: "#0B1220" }}>{webhookStats.totalCount}</span>
            </div>
            {webhookStats.errorCount > 0 && (
              <div className="flex items-center gap-2 rounded-xl px-3.5 py-2" style={{ background: "#FEF2F2", border: "1px solid rgba(220,38,38,0.18)" }}>
                <span className="text-[11px] font-semibold uppercase" style={{ color: "#DC2626", letterSpacing: "0.04em" }}>Erros</span>
                <span className="text-sm font-bold tabular-nums" style={{ color: "#DC2626" }}>{webhookStats.errorCount}</span>
              </div>
            )}
          </div>

          {/* Filtros + busca */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1 p-1 rounded-xl overflow-x-auto no-scrollbar" style={{ background: "#F1F5F9" }}>
              {FILTER_TABS.map(tab => {
                const TabIcon = tab.icon;
                const active = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
                    style={active
                      ? { background: "#FFFFFF", color: "#0B1220", boxShadow: "0 1px 2px rgba(11,18,32,0.06)" }
                      : { color: "#64748B" }}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Busca */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94A3B8" }} />
              <input
                type="text"
                placeholder="Buscar integração..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 h-9 text-sm rounded-lg outline-none transition-colors focus:border-[#2563EB]"
                style={{ background: "#FFFFFF", border: "1px solid #E6EDF5", color: "#0B1220" }}
              />
            </div>
          </div>
        </div>

        {/* ── Content ────────────────────────────────────────── */}
        <div className="space-y-9">

          {/* ── Connected Integrations ──────────────────────── */}
          {activeIntegrations.length > 0 && (
            <section>
              <div className="flex items-end justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#16A34A" }} />
                    <h2 className="text-[11px] font-semibold uppercase" style={{ color: "#16A34A", letterSpacing: "0.06em" }}>Conectadas</h2>
                  </div>
                  <p className="text-[13px]" style={{ color: "#94A3B8" }}>
                    {activeIntegrations.length} {activeIntegrations.length === 1 ? "integração ativa" : "integrações ativas"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {activeIntegrations.map(integration => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    effectiveStatus="active"
                    lastEvent={webhookStats.lastByPlatform[integration.id]}
                    eventCount={webhookStats.countByPlatform[integration.id]}
                    onManage={() => handleManageIntegration(integration.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Available Integrations ─────────────────────── */}
          {availableIntegrations.length > 0 && (
            activeFilter === "all" ? (
              <div className="space-y-10">
                {GROUP_ORDER.map((groupKey) => {
                  const groupItems = availableIntegrations.filter((i) => i.category === groupKey);
                  if (groupItems.length === 0) return null;
                  const meta = GROUP_META[groupKey];
                  const GroupIcon = meta.icon;
                  return (
                    <section key={groupKey}>
                      <div className="flex items-end justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <GroupIcon className="h-3.5 w-3.5" style={{ color: "#2563EB" }} />
                            <h2 className="text-[11px] font-semibold uppercase" style={{ color: "#64748B", letterSpacing: "0.06em" }}>
                              {meta.label}
                            </h2>
                            <span className="text-[10px] tabular-nums" style={{ color: "#94A3B8" }}>
                              {groupItems.length}
                            </span>
                          </div>
                          <p className="text-[13px]" style={{ color: "#94A3B8" }}>{meta.sub}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {groupItems.map((integration) => (
                          <IntegrationCard
                            key={integration.id}
                            integration={integration}
                            effectiveStatus="available"
                            onConnect={() => handleConnect(integration.id)}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <section>
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <h2 className="text-[11px] font-semibold uppercase mb-1" style={{ color: "#64748B", letterSpacing: "0.06em" }}>
                      {GROUP_META[activeFilter as Exclude<IntegrationCategory, "all">]?.label ?? "Disponíveis"}
                    </h2>
                    <p className="text-[13px]" style={{ color: "#94A3B8" }}>
                      {availableIntegrations.length} {availableIntegrations.length === 1 ? "plataforma pronta" : "plataformas prontas"} para conectar
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {availableIntegrations.map((integration) => (
                    <IntegrationCard
                      key={integration.id}
                      integration={integration}
                      effectiveStatus="available"
                      onConnect={() => handleConnect(integration.id)}
                    />
                  ))}
                </div>
              </section>
            )
          )}

          {/* ── Atividade dos webhooks ─────────────────── */}
          {webhookLogs.length > 0 && (
            <section>
              <div className="flex items-end justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="h-3.5 w-3.5" style={{ color: "#2563EB" }} />
                    <h2 className="text-[11px] font-semibold uppercase" style={{ color: "#64748B", letterSpacing: "0.06em" }}>
                      Atividade
                    </h2>
                  </div>
                  <p className="text-[13px]" style={{ color: "#94A3B8" }}>
                    Eventos recebidos dos seus webhooks
                  </p>
                </div>
              </div>
              <WebhookHeartbeat
                logs={webhookLogs}
                stats={webhookStats}
                platformNames={PLATFORM_NAMES}
                eventLabels={EVENT_LABELS}
              />
            </section>
          )}

          {/* ── Roadmap ──────────────────────────────────────── */}
          {roadmapIntegrations.length > 0 && (
            <section>
              <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
                <div>
                  <h2 className="text-[11px] font-semibold uppercase mb-1" style={{ color: "#64748B", letterSpacing: "0.06em" }}>
                    Em breve
                  </h2>
                  <p className="text-[13px]" style={{ color: "#94A3B8" }}>
                    Vote nas próximas integrações que quer ver no Vyzon
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: "rgba(37,99,235,0.08)", color: "#2563EB" }}>
                  <ThumbsUp className="w-3 h-3" />
                  Votação aberta
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {roadmapIntegrations.map(integration => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    effectiveStatus="roadmap"
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Solicitar integração ──────────────────────── */}
          <div className="rounded-2xl p-5 sm:p-6" style={{ background: "#F8FAFC", border: "1px dashed #D8E2F0" }}>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(37,99,235,0.08)" }}>
                <Puzzle className="w-5 h-5" style={{ color: "#2563EB" }} />
              </div>
              <div className="flex-1 min-w-[240px]">
                <h3 className="font-semibold text-[15px] tracking-tight" style={{ color: "#0B1220" }}>
                  Precisa de outra integração?
                </h3>
                <p className="text-[13px] mt-0.5" style={{ color: "#64748B" }}>
                  Conte qual plataforma você usa, priorizamos as mais votadas
                </p>
              </div>
              <button
                className="shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold transition-colors hover:bg-[#F1F5F9]"
                style={{ border: "1px solid #E6EDF5", color: "#2563EB", background: "#FFFFFF" }}
              >
                Solicitar integração
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ── Footer ───────────────────────────────────────── */}
          <div className="flex items-center justify-between text-[11px] pt-5 flex-wrap gap-2" style={{ borderTop: "1px solid #EEF2F7", color: "#94A3B8" }}>
            <span className="flex items-center gap-1.5">
              <Shield className="h-3 w-3" />
              Dados criptografados e protegidos
            </span>
            <Link to="/politica-privacidade" className="transition-colors hover:underline" style={{ color: "#2563EB" }}>
              Política de Privacidade
            </Link>
          </div>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────── */}
      {selectedPlatform && INTEGRATIONS_CONFIG[selectedPlatform] && (
        <IntegrationConfigModal
          spec={INTEGRATIONS_CONFIG[selectedPlatform]}
          open={!!selectedPlatform}
          onClose={() => setSelectedPlatform(null)}
          onSaved={handleIntegrationSaved}
        />
      )}
      <GoogleCalendarConfigModal
        open={googleCalendarModalOpen}
        onClose={() => setGoogleCalendarModalOpen(false)}
        onSaved={handleIntegrationSaved}
      />
      {channelPlatform && (
        <ChannelConfigModal
          spec={CHANNEL_SPECS[channelPlatform]}
          open={!!channelPlatform}
          onClose={() => setChannelPlatform(null)}
          onSaved={handleIntegrationSaved}
        />
      )}
    </>
  );
};

export default Integracoes;
