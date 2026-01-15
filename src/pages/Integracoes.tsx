import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { HotmartConfigModal } from "@/components/integrations/HotmartConfigModal";
import { GoogleCalendarConfigModal } from "@/components/integrations/GoogleCalendarConfigModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Import logo images
import googleCalendarLogo from "@/assets/integrations/google-calendar.png";
import celetusLogo from "@/assets/integrations/celetus.png";
import caktoLogo from "@/assets/integrations/cakto.png";
import greennLogo from "@/assets/integrations/greenn.png";
import hotmartLogo from "@/assets/integrations/hotmart-logo-png_seeklogo-485917.png";
import kiwifyLogo from "@/assets/integrations/kiwify-logo-png_seeklogo-537186.png";

// Integration status types
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
}

// Integration data - Using actual logo images where available
const INTEGRATIONS: Integration[] = [
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sincronize agendamentos e calls de vendas automaticamente",
    logo: googleCalendarLogo,
    logoBg: "bg-white",
    status: "available", // Base status - will be overridden if user is connected
    category: "productivity",
  },
  {
    id: "hotmart",
    name: "Hotmart",
    description: "Importe vendas e comissões automaticamente via webhook",
    logo: hotmartLogo,
    logoBg: "bg-white",
    status: "available",
    category: "sales",
  },
  {
    id: "kiwify",
    name: "Kiwify",
    description: "Webhooks em tempo real para vendas e reembolsos",
    logo: kiwifyLogo,
    logoBg: "bg-white",
    status: "available",
    category: "sales",
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
  {
    id: "greenn",
    name: "Greenn",
    description: "Importe recorrências e assinaturas automaticamente",
    logo: greennLogo,
    logoBg: "bg-white",
    status: "roadmap",
    category: "sales",
    votes: 12,
  },
];

// Filter tabs
const FILTER_TABS: { id: IntegrationCategory; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "sales", label: "Vendas" },
  { id: "productivity", label: "Produtividade" },
];

// Integration Card Component
const IntegrationCard = ({ integration, onConnect, onManage }: { integration: Integration; onConnect?: () => void; onManage?: () => void }) => {
  const [votes, setVotes] = useState(integration.votes || 0);
  const [hasVoted, setHasVoted] = useState(false);

  const handleVote = () => {
    if (!hasVoted) {
      setVotes(v => v + 1);
      setHasVoted(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`
        relative flex flex-col h-full p-5 rounded-2xl border
        bg-white dark:bg-slate-800
        border-slate-200 dark:border-slate-700
        hover:border-indigo-300 dark:hover:border-indigo-500/50
        hover:shadow-lg hover:shadow-indigo-500/5 dark:hover:shadow-indigo-500/10
        transition-all duration-200
        ${integration.status === "roadmap" ? "opacity-80" : ""}
      `}
    >
      {/* Status Badge */}
      <div className="absolute top-4 right-4">
        {integration.status === "active" && (
          <Badge className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Ativo
          </Badge>
        )}
        {integration.status === "roadmap" && (
          <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30">
            Em Breve
          </Badge>
        )}
      </div>

      {/* Logo */}
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${integration.logoBg} mb-4 p-2 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden`}>
        {integration.logo ? (
          <img
            src={integration.logo}
            alt={integration.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <span className={`text-2xl font-bold ${integration.logoColor || "text-slate-900"}`}>
            {integration.logoText}
          </span>
        )}
      </div>

      {/* Content */}
      <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
        {integration.name}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 flex-1 mb-4 line-clamp-2">
        {integration.description}
      </p>

      {/* Footer Actions */}
      <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-700">
        {integration.status === "active" && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <Check className="w-3.5 h-3.5" />
              Conectado
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={onManage}
            >
              <Settings className="w-3 h-3" />
              Gerenciar
            </Button>
          </div>
        )}

        {integration.status === "available" && (
          <Button
            className="w-full gap-2 bg-indigo-600 hover:bg-indigo-500 text-white h-8 text-sm"
            size="sm"
            onClick={onConnect}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Conectar
          </Button>
        )}

        {integration.status === "roadmap" && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {votes} votos
            </span>
            <Button
              variant={hasVoted ? "secondary" : "outline"}
              size="sm"
              onClick={handleVote}
              disabled={hasVoted}
              className={`gap-1 h-7 text-xs ${hasVoted ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400" : ""}`}
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

// Type for integration config from database
interface IntegrationConfig {
  id: string;
  company_id: string;
  platform: string;
  is_active: boolean;
}

// Main Component - Full Width Layout
const Integracoes = () => {
  const { needsUpgrade } = usePlan();
  const { companyId } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<IntegrationCategory>("all");
  const [hotmartModalOpen, setHotmartModalOpen] = useState(false);
  const [googleCalendarModalOpen, setGoogleCalendarModalOpen] = useState(false);
  const [activeIntegrationIds, setActiveIntegrationIds] = useState<Set<string>>(new Set());
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);

  // Check Google Calendar connection status (per-user, not per-company)
  const checkGoogleCalendarStatus = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("google_access_token, google_token_expires_at")
        .eq("id", userId)
        .single();

      if (data?.google_access_token) {
        // Check if token is expired
        const expiresAt = data.google_token_expires_at ? new Date(data.google_token_expires_at) : null;
        const now = new Date();
        setGoogleCalendarConnected(!(expiresAt && expiresAt < now));
      } else {
        setGoogleCalendarConnected(false);
      }
    } catch (error) {
      console.error("Error checking Google Calendar status:", error);
      setGoogleCalendarConnected(false);
    }
  }, []);

  // Fetch active integrations from database
  const loadIntegrationStatuses = useCallback(async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("integration_configs" as any)
        .select("platform, is_active")
        .eq("company_id", companyId)
        .eq("is_active", true);

      if (error) {
        console.error("Error loading integration statuses:", error);
        return;
      }

      if (data) {
        const configs = data as unknown as IntegrationConfig[];
        const activeIds = new Set<string>(
          configs.map((config) => config.platform)
        );
        setActiveIntegrationIds(activeIds);
      }
    } catch (error) {
      console.error("Error loading integration statuses:", error);
    }
  }, [companyId]);

  // Load on mount and when companyId changes
  useEffect(() => {
    loadIntegrationStatuses();
  }, [loadIntegrationStatuses]);

  // Check Google Calendar status separately (user-level, not company-level)
  useEffect(() => {
    if (supabase.auth.getUser) {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user?.id) {
          checkGoogleCalendarStatus(data.user.id);
        }
      });
    }
  }, [checkGoogleCalendarStatus]);

  // Handle when modal saves - refresh statuses
  const handleIntegrationSaved = () => {
    loadIntegrationStatuses();
    // Also refresh Google Calendar status
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) {
        checkGoogleCalendarStatus(data.user.id);
      }
    });
  };

  // Handle manage button click
  const handleManageIntegration = (integrationId: string) => {
    if (integrationId === "google-calendar") {
      setGoogleCalendarModalOpen(true);
    } else if (integrationId === "hotmart") {
      setHotmartModalOpen(true);
    }
  };

  // Feature gate check
  if (needsUpgrade('integrations')) {
    return <UpgradePrompt feature="integrations" />;
  }

  // Filter integrations and compute effective status
  const filteredIntegrations = INTEGRATIONS.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === "all" || integration.category === activeFilter;
    return matchesSearch && matchesFilter;
  });

  // Compute effective status: if DB says it's active, show as active
  const getEffectiveStatus = (integration: Integration): IntegrationStatus => {
    // Special case: Google Calendar uses user-level token, not company-level config
    if (integration.id === "google-calendar") {
      return googleCalendarConnected ? "active" : "available";
    }
    if (activeIntegrationIds.has(integration.id)) {
      return "active";
    }
    return integration.status;
  };

  // Group by effective status (considering database)
  const activeIntegrations = filteredIntegrations.filter(i => getEffectiveStatus(i) === "active");
  const availableIntegrations = filteredIntegrations.filter(i => getEffectiveStatus(i) === "available");
  const roadmapIntegrations = filteredIntegrations.filter(i => getEffectiveStatus(i) === "roadmap");

  return (
    <>
      <div className="w-full h-full min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Header - Full Width, Left Aligned */}
        <div className="w-full bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="w-full px-6 py-5">
            {/* Title Row - Left Aligned */}
            <div className="flex items-start gap-3 mb-1">
              <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-500/20">
                <Puzzle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Hub de Integrações
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Conecte suas plataformas de vendas e automatize seu CRM
                </p>
              </div>
            </div>

            {/* Actions Row - Filters Left, Search Right */}
            <div className="flex items-center justify-between mt-5">
              {/* Filter Tabs - Left */}
              <div className="flex gap-1">
                {FILTER_TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id)}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                      ${activeFilter === tab.id
                        ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }
                    `}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search - Right */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Buscar integrações..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content - Full Width, Left Aligned */}
        <div className="w-full p-6 space-y-8">

          {/* Connected Integrations */}
          {activeIntegrations.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide">
                  Conectadas
                </h2>
                <Badge variant="secondary" className="text-xs">
                  {activeIntegrations.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {activeIntegrations.map(integration => (
                  <IntegrationCard
                    key={integration.id}
                    integration={{ ...integration, status: "active" }}
                    onManage={() => handleManageIntegration(integration.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Available Integrations */}
          {availableIntegrations.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide">
                  Plataformas de Vendas
                </h2>
                <Badge className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-0 text-xs">
                  Novo
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {availableIntegrations.map(integration => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    onConnect={
                      integration.id === "hotmart"
                        ? () => setHotmartModalOpen(true)
                        : integration.id === "google-calendar"
                          ? () => setGoogleCalendarModalOpen(true)
                          : undefined
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {/* Roadmap - More Compact */}
          {roadmapIntegrations.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide">
                  Roadmap
                </h2>
                <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0 text-xs">
                  Vote nas próximas
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {roadmapIntegrations.map(integration => (
                  <IntegrationCard key={integration.id} integration={integration} />
                ))}
              </div>
            </section>
          )}

          {/* Request Integration CTA */}
          <div className="p-5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 shrink-0">
                <Puzzle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                  Precisa de outra integração?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Conte-nos qual plataforma você usa
                </p>
              </div>
              <Button variant="outline" size="sm" className="shrink-0">
                Solicitar
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="text-xs text-slate-500 dark:text-slate-400 pt-6 border-t border-slate-200 dark:border-slate-800">
            Ao conectar integrações, você concorda com nossa{" "}
            <Link to="/politica-privacidade" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              Política de Privacidade
            </Link>
          </div>
        </div>
      </div>

      {/* Hotmart Config Modal */}
      <HotmartConfigModal
        open={hotmartModalOpen}
        onClose={() => setHotmartModalOpen(false)}
        onSaved={handleIntegrationSaved}
      />

      {/* Google Calendar Config Modal */}
      <GoogleCalendarConfigModal
        open={googleCalendarModalOpen}
        onClose={() => setGoogleCalendarModalOpen(false)}
        onSaved={handleIntegrationSaved}
      />
    </>
  );
};

export default Integracoes;
