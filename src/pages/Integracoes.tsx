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
  Zap,
  AlertTriangle,
  ArrowUpRight,
  Wifi,
  BarChart3,
  Shield,
  Plug,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { IntegrationConfigModal } from "@/components/integrations/IntegrationConfigModal";
import { GoogleCalendarConfigModal } from "@/components/integrations/GoogleCalendarConfigModal";
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

// ── Types ──────────────────────────────────────────────────────────
type IntegrationStatus = "active" | "available" | "roadmap";
type IntegrationCategory = "all" | "sales" | "productivity";

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
    id: "hotmart",
    name: "Hotmart",
    description: "Importe vendas e comissões automaticamente via webhook",
    logo: hotmartLogo,
    logoBg: "bg-white",
    status: "available",
    category: "sales",
    features: ["Vendas", "Reembolsos", "Chargebacks"],
  },
  {
    id: "kiwify",
    name: "Kiwify",
    description: "Webhooks em tempo real para vendas e reembolsos",
    logo: kiwifyLogo,
    logoBg: "bg-white",
    status: "available",
    category: "sales",
    features: ["Vendas", "Assinaturas", "HMAC-SHA256"],
  },
  {
    id: "greenn",
    name: "Greenn",
    description: "Importe recorrências e assinaturas automaticamente",
    logo: greennLogo,
    logoBg: "bg-white",
    status: "available",
    category: "sales",
    features: ["Recorrências", "Transações", "Webhooks"],
  },
  {
    id: "rdstation",
    name: "RD Station",
    description: "Sincronize leads, conversões e oportunidades do RD Station Marketing e CRM",
    logo: rdstationLogo,
    logoBg: "bg-white",
    status: "available",
    category: "sales",
    features: ["Conversões", "Oportunidades", "Leads", "CRM Sync"],
  },
  {
    id: "cakto",
    name: "Cakto",
    description: "Conecte vendas e relatórios financeiros via webhook",
    logo: caktoLogo,
    logoBg: "bg-white",
    status: "available",
    category: "sales",
    features: ["Vendas", "Reembolsos", "Chargebacks"],
  },
  {
    id: "braip",
    name: "Braip",
    description: "Sincronize vendas de produtores e afiliados via postback",
    logo: braipLogo,
    logoBg: "bg-white",
    status: "available",
    category: "sales",
    features: ["Pedidos", "Afiliados", "Postbacks"],
  },
  {
    id: "monetizze",
    name: "Monetizze",
    description: "Importe vendas, reembolsos e boletos da Monetizze",
    logo: monetizzeLogo,
    logoBg: "bg-white",
    status: "available",
    category: "sales",
    features: ["Vendas", "Boletos", "Reembolsos"],
  },
  {
    id: "eduzz",
    name: "Eduzz",
    description: "Conecte vendas de cursos e produtos digitais da Eduzz",
    logo: eduzzLogo,
    logoBg: "bg-white",
    status: "available",
    category: "sales",
    features: ["Faturas", "Assinaturas", "Reembolsos"],
  },
  {
    id: "asaas",
    name: "Asaas",
    description: "Cobrança recorrente, PIX, boleto e cartão em tempo real",
    logo: asaasLogo,
    logoBg: "bg-white",
    status: "available",
    category: "sales",
    features: ["PIX / Boleto / Cartão", "Assinaturas", "Chargebacks"],
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Conecte 7.000+ apps — Typeform, Mailchimp, Calendly, Sheets",
    logo: zapierLogo,
    logoBg: "bg-white",
    status: "available",
    category: "productivity",
    features: ["7.000+ apps", "No-code", "Payload custom"],
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
  {
    id: "celetus",
    name: "Celetus",
    description: "Sincronize transações e leads da plataforma Celetus",
    logo: celetusLogo,
    logoBg: "bg-white",
    status: "roadmap",
    category: "sales",
    votes: 23,
  },
  {
    id: "mercadopago",
    name: "Mercado Pago",
    description: "Receba webhooks de pagamentos aprovados, estornos e assinaturas",
    logo: mercadopagoLogo,
    logoBg: "bg-white",
    status: "roadmap",
    category: "sales",
    votes: 19,
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Integre pagamentos internacionais e assinaturas recorrentes",
    logo: stripeLogo,
    logoBg: "bg-white",
    status: "roadmap",
    category: "sales",
    votes: 15,
  },
  {
    id: "pagarme",
    name: "Pagar.me",
    description: "Sincronize transações e pagamentos da Pagar.me",
    logo: pagarmeLogo,
    logoBg: "bg-white",
    status: "roadmap",
    category: "sales",
    votes: 12,
  },
];

const FILTER_TABS: { id: IntegrationCategory; label: string; icon: React.ElementType }[] = [
  { id: "all", label: "Todas", icon: Puzzle },
  { id: "sales", label: "Vendas", icon: Zap },
  { id: "productivity", label: "Produtividade", icon: Activity },
];

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
};

// ── Status helpers ──────────────────────────────────────────────────
const getStatusColor = (status: string | null) => {
  switch (status) {
    case "success": return { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", dot: "bg-emerald-400" };
    case "error": return { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20", dot: "bg-rose-400" };
    case "processing": return { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", dot: "bg-amber-400" };
    default: return { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20", dot: "bg-slate-400" };
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
      className={`
        group relative flex flex-col h-full rounded-xl border transition-all duration-200 overflow-hidden
        ${isActive
          ? "bg-card border-emerald-500/25"
          : isRoadmap
            ? "bg-card/40 border-border/60"
            : "bg-card border-border hover:border-emerald-500/30"
        }
      `}
    >
      {/* Active accent line */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
      )}

      <div className="p-5 flex-1 flex flex-col">
        {/* Header row: Logo + Status */}
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${integration.logoBg} p-2 ring-1 ring-border/80 overflow-hidden shadow-sm`}>
            {integration.logo ? (
              <img src={integration.logo} alt={integration.name} className="w-full h-full object-contain" />
            ) : (
              <span className={`text-base font-bold ${integration.logoColor || "text-foreground"}`}>
                {integration.logoText}
              </span>
            )}
          </div>

          {isActive && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                <span className="relative rounded-full w-1.5 h-1.5 bg-emerald-400" />
              </span>
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Ativo</span>
            </div>
          )}
          {isRoadmap && (
            <Badge variant="secondary" className="bg-muted text-muted-foreground border-border text-[10px] font-medium">
              Em Breve
            </Badge>
          )}
        </div>

        {/* Name & Description */}
        <h3 className="text-[15px] font-semibold text-foreground mb-1 tracking-tight">{integration.name}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">{integration.description}</p>

        {/* Feature pills */}
        {integration.features && !isRoadmap && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {integration.features.map((feature) => (
              <span
                key={feature}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted/60 text-muted-foreground border border-border/60"
              >
                {feature}
              </span>
            ))}
          </div>
        )}

        {/* Active: Last event info */}
        {isActive && lastEvent && (
          <div className="mt-auto mb-3 p-2.5 rounded-lg bg-muted/30 border border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusColor(lastEvent.status).dot}`} />
                <span className="text-[10px] text-muted-foreground truncate">
                  {EVENT_LABELS[lastEvent.event_type || ""] || lastEvent.event_type || "Evento"}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground/60 tabular-nums flex-shrink-0 ml-2">
                {formatDistanceToNow(new Date(lastEvent.created_at), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
            {eventCount !== undefined && eventCount > 0 && (
              <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-border/40">
                <BarChart3 className="h-2.5 w-2.5 text-muted-foreground/60" />
                <span className="text-[10px] text-muted-foreground/70 tabular-nums">{eventCount} eventos este mês</span>
              </div>
            )}
          </div>
        )}

        {/* Spacer for consistent card height */}
        {!isActive && !isRoadmap && <div className="flex-1" />}
        {isRoadmap && <div className="flex-1" />}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border/60 bg-muted/10">
        {isActive && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <Wifi className="w-3 h-3" />
              Conectado
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={onManage}
            >
              <Settings className="w-3 h-3" />
              Gerenciar
            </Button>
          </div>
        )}

        {effectiveStatus === "available" && (
          <Button
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white h-8 text-xs font-medium shadow-sm"
            size="sm"
            onClick={onConnect}
          >
            <Plug className="w-3.5 h-3.5" />
            Conectar
          </Button>
        )}

        {isRoadmap && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground tabular-nums">
              <span className="font-semibold text-foreground">{votes}</span> votos
            </span>
            <Button
              variant={hasVoted ? "secondary" : "outline"}
              size="sm"
              onClick={handleVote}
              disabled={hasVoted}
              className={`gap-1 h-7 text-xs ${hasVoted ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10" : ""}`}
            >
              <ThumbsUp className={`w-3 h-3 ${hasVoted ? "fill-current" : ""}`} />
              {hasVoted ? "Votado" : "Votar"}
            </Button>
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
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<IntegrationCategory>("all");
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [googleCalendarModalOpen, setGoogleCalendarModalOpen] = useState(false);
  const [activeIntegrationIds, setActiveIntegrationIds] = useState<Set<string>>(new Set());
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);

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
      <div className="w-full min-h-screen bg-background">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="border-b border-border/60 bg-card/40 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              {/* Title */}
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-sm">
                  <Puzzle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground tracking-tight" style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}>
                    Integrações
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Conecte suas plataformas e automatize seu fluxo de vendas
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center flex-wrap gap-3 md:gap-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Conectadas</span>
                  <span className="text-xl font-bold text-foreground tabular-nums flex items-center gap-1.5">
                    {connectedCount}
                    {connectedCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                  </span>
                </div>
                <div className="w-px h-10 bg-border hidden md:block" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Eventos/mês</span>
                  <span className="text-xl font-bold text-foreground tabular-nums">{webhookStats.totalCount}</span>
                </div>
                {webhookStats.errorCount > 0 && (
                  <>
                    <div className="w-px h-10 bg-border hidden md:block" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold text-rose-400/80 uppercase tracking-wider">Erros</span>
                      <span className="text-xl font-bold text-rose-400 tabular-nums flex items-center gap-1.5">
                        {webhookStats.errorCount}
                        <AlertTriangle className="w-4 h-4" />
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Filter tabs + search row */}
            <div className="flex flex-col gap-3 sm:gap-4 mt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-1 p-1 rounded-lg bg-muted/40 border border-border/60 overflow-x-auto max-w-full">
                {FILTER_TABS.map(tab => {
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveFilter(tab.id)}
                      className={`
                        relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                        ${activeFilter === tab.id
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                        }
                      `}
                    >
                      <TabIcon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar integrações..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm bg-background/60"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Content ────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

          {/* ── Connected Integrations ──────────────────────── */}
          {activeIntegrations.length > 0 && (
            <section>
              <div className="flex items-end justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <h2 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Conectadas</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
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
            <section>
              <div className="flex items-end justify-between mb-5">
                <div>
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Disponíveis
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {availableIntegrations.length} plataformas prontas para conectar
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {availableIntegrations.map(integration => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    effectiveStatus="available"
                    onConnect={() => handleConnect(integration.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Webhook Heartbeat Monitor ─────────────────── */}
          {webhookLogs.length > 0 && (
            <section>
              <div className="flex items-end justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="h-3.5 w-3.5 text-emerald-400" />
                    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Atividade em tempo real
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Sinal vital dos seus webhooks
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
              <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
                <div>
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Em breve
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Vote nas próximas integrações que quer ver no Vyzon
                  </p>
                </div>
                <Badge variant="outline" className="bg-amber-500/5 text-amber-500 border-amber-500/20 text-[10px]">
                  <ThumbsUp className="w-3 h-3 mr-1" />
                  Votação aberta
                </Badge>
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

          {/* ── Request Integration CTA ──────────────────────── */}
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.03] to-transparent p-6">
            <div className="flex items-center gap-5 flex-wrap">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                <Puzzle className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-[240px]">
                <h3 className="font-semibold text-foreground text-[15px] tracking-tight">
                  Precisa de outra integração?
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Conte-nos qual plataforma você usa — priorizamos as mais votadas
                </p>
              </div>
              <Button variant="outline" size="sm" className="shrink-0 gap-1.5 h-9">
                Solicitar integração
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* ── Footer ───────────────────────────────────────── */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground/70 pt-6 border-t border-border/40 flex-wrap gap-2">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3 w-3" />
              Dados criptografados e protegidos
            </span>
            <Link to="/politica-privacidade" className="text-emerald-500 hover:text-emerald-400 transition-colors">
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
    </>
  );
};

export default Integracoes;
