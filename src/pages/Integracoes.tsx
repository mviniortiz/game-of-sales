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
  Check,
  ExternalLink,
  Puzzle,
  Activity,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ArrowUpRight,
  Wifi,
  WifiOff,
  BarChart3,
  RefreshCw,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { HotmartConfigModal } from "@/components/integrations/HotmartConfigModal";
import { KiwifyConfigModal } from "@/components/integrations/KiwifyConfigModal";
import { GreennConfigModal } from "@/components/integrations/GreennConfigModal";
import { GoogleCalendarConfigModal } from "@/components/integrations/GoogleCalendarConfigModal";
import { WhatsappConfigModal } from "@/components/integrations/WhatsappConfigModal";
import { RDStationConfigModal } from "@/components/integrations/RDStationConfigModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PRODUCT_FEATURES } from "@/config/features";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// Import logo images
import googleCalendarLogo from "@/assets/integrations/google-calendar.png";
import celetusLogo from "@/assets/integrations/celetus.png";
import caktoLogo from "@/assets/integrations/cakto.png";
import greennLogo from "@/assets/integrations/greenn.png";
import hotmartLogo from "@/assets/integrations/hotmart-logo-png_seeklogo-485917.png";
import kiwifyLogo from "@/assets/integrations/kiwify-logo-png_seeklogo-537186.png";

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
const WHATSAPP_INTEGRATION: Integration = {
  id: "evolution-api",
  name: "Evolution API (WhatsApp)",
  description: "Conecte seu WhatsApp via QR Code e utilize no CRM",
  logoBg: "bg-emerald-500",
  logoText: "WA",
  logoColor: "text-white",
  status: "available",
  category: "productivity",
  features: ["Chat no CRM", "Envio de mensagens", "QR Code"],
};

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
    logoBg: "bg-violet-600",
    logoText: "RD",
    logoColor: "text-white",
    status: "available",
    category: "sales",
    features: ["Conversões", "Oportunidades", "Leads", "CRM Sync"],
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
    id: "cakto",
    name: "Cakto",
    description: "Conecte vendas e relatórios financeiros",
    logo: caktoLogo,
    logoBg: "bg-white",
    status: "roadmap",
    category: "sales",
    votes: 18,
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
  "evolution-api": "WhatsApp",
  rdstation: "RD Station",
};

const EVENT_LABELS: Record<string, string> = {
  PURCHASE_APPROVED: "Venda aprovada",
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

const getStatusLabel = (status: string | null) => {
  switch (status) {
    case "success": return "Sucesso";
    case "error": return "Erro";
    case "processing": return "Processando";
    case "received": return "Recebido";
    default: return status || "—";
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className={`
        relative flex flex-col h-full rounded-xl border transition-all duration-200 overflow-hidden
        ${isActive
          ? "bg-card border-emerald-500/30 shadow-sm shadow-emerald-500/5"
          : isRoadmap
            ? "bg-card/60 border-border/50 opacity-75"
            : "bg-card border-border hover:border-emerald-500/30 hover:shadow-md hover:shadow-emerald-500/5"
        }
      `}
    >
      {/* Active glow line */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500/50 via-emerald-400 to-emerald-500/50" />
      )}

      <div className="p-4 flex-1 flex flex-col">
        {/* Header row: Logo + Status */}
        <div className="flex items-start justify-between mb-3">
          <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${integration.logoBg} p-1.5 ring-1 ring-border overflow-hidden`}>
            {integration.logo ? (
              <img src={integration.logo} alt={integration.name} className="w-full h-full object-contain" />
            ) : (
              <span className={`text-lg font-bold ${integration.logoColor || "text-foreground"}`}>
                {integration.logoText}
              </span>
            )}
          </div>

          {isActive && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Ativo</span>
            </div>
          )}
          {isRoadmap && (
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
              Em Breve
            </Badge>
          )}
        </div>

        {/* Name & Description */}
        <h3 className="text-sm font-semibold text-foreground mb-1">{integration.name}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{integration.description}</p>

        {/* Feature pills */}
        {integration.features && (
          <div className="flex flex-wrap gap-1 mb-3">
            {integration.features.map((feature) => (
              <span
                key={feature}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted/50 text-muted-foreground border border-border/50"
              >
                {feature}
              </span>
            ))}
          </div>
        )}

        {/* Active: Last event info */}
        {isActive && lastEvent && (
          <div className="mt-auto mb-3 p-2 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(lastEvent.status).dot}`} />
                <span className="text-[10px] text-muted-foreground">
                  {EVENT_LABELS[lastEvent.event_type || ""] || lastEvent.event_type || "Evento"}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground/60">
                {formatDistanceToNow(new Date(lastEvent.created_at), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
            {eventCount !== undefined && eventCount > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <BarChart3 className="h-2.5 w-2.5 text-muted-foreground/50" />
                <span className="text-[10px] text-muted-foreground/50">{eventCount} eventos este mês</span>
              </div>
            )}
          </div>
        )}

        {/* Spacer for consistent card height */}
        {!isActive && !isRoadmap && <div className="flex-1" />}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border/50 bg-muted/20">
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
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white h-8 text-xs font-medium"
            size="sm"
            onClick={onConnect}
          >
            <Zap className="w-3.5 h-3.5" />
            Conectar
          </Button>
        )}

        {isRoadmap && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground tabular-nums">{votes} votos</span>
            <Button
              variant={hasVoted ? "secondary" : "outline"}
              size="sm"
              onClick={handleVote}
              disabled={hasVoted}
              className={`gap-1 h-7 text-xs ${hasVoted ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : ""}`}
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

// ── Webhook Log Row ─────────────────────────────────────────────────
const WebhookLogRow = ({ log }: { log: WebhookLog }) => {
  const colors = getStatusColor(log.status);

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors group min-w-[500px]">
      {/* Status dot */}
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />

      {/* Platform */}
      <span className="text-xs font-medium text-foreground/80 w-20 flex-shrink-0 truncate">
        {PLATFORM_NAMES[log.platform] || log.platform}
      </span>

      {/* Event */}
      <span className="text-xs text-muted-foreground flex-1 truncate">
        {EVENT_LABELS[log.event_type || ""] || log.event_type || "—"}
      </span>

      {/* Status badge */}
      <Badge variant="outline" className={`${colors.bg} ${colors.text} ${colors.border} text-[10px] px-1.5 py-0 flex-shrink-0`}>
        {getStatusLabel(log.status)}
      </Badge>

      {/* Timestamp */}
      <span className="text-[10px] text-muted-foreground/50 w-24 text-right flex-shrink-0 tabular-nums">
        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
      </span>
    </div>
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
  const { companyId, isSuperAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<IntegrationCategory>("all");
  const [hotmartModalOpen, setHotmartModalOpen] = useState(false);
  const [kiwifyModalOpen, setKiwifyModalOpen] = useState(false);
  const [greennModalOpen, setGreennModalOpen] = useState(false);
  const [googleCalendarModalOpen, setGoogleCalendarModalOpen] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [rdstationModalOpen, setRdstationModalOpen] = useState(false);
  const [activeIntegrationIds, setActiveIntegrationIds] = useState<Set<string>>(new Set());
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [showLogs, setShowLogs] = useState(true);

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
    const modals: Record<string, (v: boolean) => void> = {
      "google-calendar": setGoogleCalendarModalOpen,
      hotmart: setHotmartModalOpen,
      kiwify: setKiwifyModalOpen,
      greenn: setGreennModalOpen,
      "evolution-api": setWhatsappModalOpen,
      rdstation: setRdstationModalOpen,
    };
    modals[id]?.(true);
  };

  const handleConnect = (id: string) => handleManageIntegration(id);

  if (needsUpgrade('integrations')) {
    return <UpgradePrompt feature="integrations" />;
  }

  const allIntegrations = isSuperAdmin ? [WHATSAPP_INTEGRATION, ...INTEGRATIONS] : INTEGRATIONS;

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
        <div className="border-b border-border bg-card">
          <div className="px-4 sm:px-6 py-5">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <Puzzle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    Hub de Integrações
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Conecte suas plataformas de vendas e automatize seu CRM
                  </p>
                </div>
              </div>

              {/* Search */}
              <div className="relative w-64 hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar integrações..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            {/* Stats Strip + Filters */}
            <div className="flex items-center justify-between gap-4">
              {/* Filter Tabs */}
              <div className="flex gap-1">
                {FILTER_TABS.map(tab => {
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveFilter(tab.id)}
                      className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                        ${activeFilter === tab.id
                          ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }
                      `}
                    >
                      <TabIcon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Quick Stats */}
              <div className="hidden md:flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{connectedCount}</span> conectadas
                  </span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{webhookStats.totalCount}</span> eventos/mês
                  </span>
                </div>
                {webhookStats.errorCount > 0 && (
                  <>
                    <div className="w-px h-4 bg-border" />
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                      <span className="text-xs text-rose-400 font-medium">
                        {webhookStats.errorCount} erros
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Content ────────────────────────────────────────── */}
        <div className="px-4 sm:px-6 py-6 space-y-8">

          {/* Mobile Search */}
          <div className="sm:hidden relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar integrações..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* ── Connected Integrations ──────────────────────── */}
          {activeIntegrations.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Conectadas
                </h2>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 py-0">
                  {activeIntegrations.length}
                </Badge>
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
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Disponíveis
                </h2>
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] px-1.5 py-0">
                  {availableIntegrations.length}
                </Badge>
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

          {/* ── Webhook Activity Feed ─────────────────────── */}
          {webhookLogs.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-blue-400" />
                    Atividade de Webhooks
                  </h2>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                    Últimos 50
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLogs(!showLogs)}
                  className="h-7 px-2 text-xs gap-1 text-muted-foreground"
                >
                  {showLogs ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {showLogs ? "Ocultar" : "Mostrar"}
                </Button>
              </div>

              <AnimatePresence>
                {showLogs && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-card border border-border rounded-xl overflow-hidden overflow-x-auto">
                      {/* Header */}
                      <div className="px-4 py-2.5 border-b border-border/50 bg-muted/30 flex items-center gap-3 min-w-[500px]">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold w-8">St</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold w-20">Plataforma</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold flex-1">Evento</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold w-16 text-center">Status</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold w-24 text-right">Quando</span>
                      </div>

                      {/* Rows */}
                      <div className="max-h-[320px] overflow-y-auto divide-y divide-border/30">
                        {webhookLogs.slice(0, 20).map((log) => (
                          <WebhookLogRow key={log.id} log={log} />
                        ))}
                      </div>

                      {/* Summary footer */}
                      <div className="px-4 py-2.5 border-t border-border/50 bg-muted/20 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5 text-[10px]">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400 font-medium">{webhookStats.successCount}</span>
                            <span className="text-muted-foreground">sucesso</span>
                          </span>
                          {webhookStats.errorCount > 0 && (
                            <span className="flex items-center gap-1.5 text-[10px]">
                              <XCircle className="h-3 w-3 text-rose-400" />
                              <span className="text-rose-400 font-medium">{webhookStats.errorCount}</span>
                              <span className="text-muted-foreground">erros</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground/50">
                          Este mês: {webhookStats.totalCount} eventos
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )}

          {/* ── Roadmap ──────────────────────────────────────── */}
          {roadmapIntegrations.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Roadmap
                </h2>
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] px-1.5 py-0">
                  Vote nas próximas
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
          <div className="p-5 rounded-xl border border-dashed border-border bg-muted/20">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                <Puzzle className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm">
                  Precisa de outra integração?
                </h3>
                <p className="text-xs text-muted-foreground">
                  Conte-nos qual plataforma você usa e priorizaremos no roadmap
                </p>
              </div>
              <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5" />
                Solicitar
              </Button>
            </div>
          </div>

          {/* ── Footer ───────────────────────────────────────── */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 pt-4 border-t border-border/50">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3 w-3" />
              Dados criptografados e protegidos
            </span>
            <Link to="/politica-privacidade" className="text-emerald-500 hover:underline">
              Política de Privacidade
            </Link>
          </div>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────── */}
      <HotmartConfigModal open={hotmartModalOpen} onClose={() => setHotmartModalOpen(false)} onSaved={handleIntegrationSaved} />
      <KiwifyConfigModal open={kiwifyModalOpen} onClose={() => setKiwifyModalOpen(false)} onSaved={handleIntegrationSaved} />
      <GreennConfigModal open={greennModalOpen} onClose={() => setGreennModalOpen(false)} onSaved={handleIntegrationSaved} />
      <GoogleCalendarConfigModal open={googleCalendarModalOpen} onClose={() => setGoogleCalendarModalOpen(false)} onSaved={handleIntegrationSaved} />
      <RDStationConfigModal open={rdstationModalOpen} onClose={() => setRdstationModalOpen(false)} onSaved={handleIntegrationSaved} />
      {isSuperAdmin && <WhatsappConfigModal open={whatsappModalOpen} onClose={() => setWhatsappModalOpen(false)} />}
    </>
  );
};

export default Integracoes;
