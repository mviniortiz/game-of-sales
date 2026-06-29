import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Unlink,
  BookOpen,
  Rocket,
  Webhook,
  ShieldCheck,
  Workflow,
  ChevronRight,
  CheckCircle2,
  Lock,
  Info,
  Radio,
  PlayCircle,
  FileCode,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { IntegrationSpec } from "@/config/integrationsConfig";
import { formatError } from "@/lib/utils";

type Tab = "overview" | "setup" | "webhook" | "make" | "events";

interface IntegrationConfig {
  id: string;
  company_id: string;
  platform: string;
  hottok: string | null;
  is_active: boolean;
}

interface IntegrationConfigModalProps {
  spec: IntegrationSpec;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Visão geral", icon: Info },
  { id: "setup", label: "Como conectar", icon: Rocket },
  { id: "webhook", label: "Credenciais", icon: KeyRound },
  { id: "events", label: "Eventos", icon: Radio },
  { id: "make", label: "Via Make", icon: Workflow },
];

export const IntegrationConfigModal = ({ spec, open, onClose, onSaved }: IntegrationConfigModalProps) => {
  const { user, companyId } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [token, setToken] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedHeader, setCopiedHeader] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);

  useEffect(() => {
    if (open && companyId) {
      setActiveTab("overview");
      loadConfig();
    }
  }, [open, companyId, spec.platform]);

  const loadConfig = async () => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from("integration_configs" as any)
        .select("*")
        .eq("company_id", companyId)
        .eq("platform", spec.platform)
        .maybeSingle();

      if (data) {
        const config = data as IntegrationConfig;
        setToken(config.hottok || "");
        setIsConnected(Boolean(config.is_active && config.hottok));
        setConfigId(config.id);
      } else {
        setToken("");
        setIsConnected(false);
        setConfigId(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!companyId || !user?.id) {
      toast.error("Usuário não autenticado");
      return;
    }
    if (!token.trim()) {
      toast.error(`Informe ${spec.webhook.authFieldLabel}`);
      setActiveTab("webhook");
      return;
    }

    setIsSaving(true);
    try {
      const configData = {
        company_id: companyId,
        platform: spec.platform,
        hottok: token.trim(),
        is_active: true,
      };

      if (configId) {
        const { error } = await supabase
          .from("integration_configs" as any)
          .update(configData)
          .eq("id", configId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("integration_configs" as any)
          .insert(configData);
        if (error) throw error;
      }

      toast.success(`${spec.name} conectada com sucesso!`);
      onSaved?.();
      onClose();
    } catch (error) {
      console.error("[IntegrationConfigModal] save error:", error);
      toast.error(`Erro ao salvar: ${formatError(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Só dá pra testar do navegador integrações de TOKEN simples em header próprio.
  // HMAC (assina o corpo) e Basic não validam com o token cru → ficam de fora.
  const canTest =
    spec.webhook.authType === "token" &&
    !spec.webhook.authHeader.toLowerCase().startsWith("authorization");

  // Testa a conexão: manda um ping com o token. 401 = token recusado; qualquer
  // outra coisa = token aceito (auth passou). Não cria deal (payload não casa
  // com nenhum evento real).
  const handleTest = async () => {
    if (!token.trim()) {
      toast.error(`Informe ${spec.webhook.authFieldLabel} primeiro`);
      setActiveTab("webhook");
      return;
    }
    setIsTesting(true);
    try {
      const res = await fetch(spec.webhook.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", [spec.webhook.authHeader]: token.trim() },
        body: JSON.stringify({ vyzon_connection_test: true }),
      });
      if (res.status === 401) {
        toast.error("Token recusado (401). Confira se colou o token certo da plataforma.");
      } else {
        toast.success("Conexão válida — o token foi aceito pelo webhook.");
      }
    } catch {
      toast.error("Não consegui alcançar o webhook. Tente de novo.");
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!configId) return;
    setIsDisconnecting(true);
    try {
      const { error } = await supabase
        .from("integration_configs" as any)
        .update({ is_active: false, hottok: null })
        .eq("id", configId);
      if (error) throw error;
      setIsConnected(false);
      setToken("");
      toast.success(`${spec.name} desconectada`);
      onSaved?.();
      onClose();
    } catch (error) {
      console.error("[IntegrationConfigModal] disconnect error:", error);
      toast.error(`Erro ao desconectar: ${formatError(error)}`);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleCopy = (value: string, which: "url" | "header") => {
    navigator.clipboard.writeText(value);
    if (which === "url") {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedHeader(true);
      setTimeout(() => setCopiedHeader(false), 2000);
    }
    toast.success("Copiado!");
  };

  const samplePayload = useMemo(() => {
    return JSON.stringify(
      {
        event: spec.events[0]?.label || "purchase_approved",
        data: {
          transaction_id: "TX-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
          customer: { name: "João Silva", email: "joao@exemplo.com", phone: "+5511999990000" },
          product: { id: "prod_123", name: "Curso Master" },
          amount: 297.0,
          payment_method: "credit_card",
        },
      },
      null,
      2,
    );
  }, [spec.events]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[760px] p-0 overflow-hidden max-h-[90vh] flex flex-col" style={{ background: "#FFFFFF", border: "1px solid #E6EDF5" }}>
        {/* ─── Header ──────────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: "1px solid #E6EDF5", background: "#FBFCFE" }}>
          <DialogHeader className="text-left">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-white shadow-sm p-2.5 flex items-center justify-center shrink-0" style={{ border: "1px solid #EEF2F7" }}>
                <img src={spec.logo} alt={spec.name} className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-xl font-bold tracking-tight" style={{ color: "#0B1220" }}>
                    {spec.name}
                  </DialogTitle>
                  {isConnected && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase" style={{ background: "#ECFDF3", color: "#16A34A", letterSpacing: "0.04em" }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#16A34A" }} />
                      Conectada
                    </span>
                  )}
                </div>
                <DialogDescription className="text-xs mt-0.5" style={{ color: "#64748B" }}>
                  {spec.tagline}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-1 mt-5 overflow-x-auto no-scrollbar -mx-1 px-1">
            {TABS.map((tab) => {
              const TabIcon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
                  style={active
                    ? { background: "#FFFFFF", color: "#0B1220", boxShadow: "0 1px 2px rgba(11,18,32,0.06)", border: "1px solid #E6EDF5" }
                    : { color: "#64748B" }}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Content ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2563EB" }} />
            </div>
          ) : (
            <>
              {/* ─── Overview ───────────────────────────────── */}
              {activeTab === "overview" && (
                <div className="space-y-5">
                  <p className="text-sm leading-relaxed" style={{ color: "#334155" }}>
                    {spec.description}
                  </p>

                  <div>
                    <h3 className="text-[10px] font-semibold uppercase mb-2" style={{ color: "#94A3B8", letterSpacing: "0.06em" }}>
                      O que essa integração faz
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {spec.features.map((feature) => (
                        <div
                          key={feature}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg"
                          style={{ background: "#F8FAFC", border: "1px solid #EEF2F7" }}
                        >
                          <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#16A34A" }} />
                          <span className="text-xs" style={{ color: "#0B1220" }}>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-semibold uppercase mb-2 flex items-center gap-1.5" style={{ color: "#94A3B8", letterSpacing: "0.06em" }}>
                      <Lock className="w-3 h-3" />
                      Segurança
                    </h3>
                    <div className="space-y-1.5">
                      {spec.securityNotes.map((note, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: "#64748B" }}>
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "#16A34A" }} />
                          <span>{note}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(37,99,235,0.05)", border: "1px solid rgba(37,99,235,0.15)" }}>
                    <Rocket className="w-4 h-4 shrink-0" style={{ color: "#2563EB" }} />
                    <p className="text-xs flex-1" style={{ color: "#334155" }}>
                      Pronto para conectar? Veja o passo-a-passo em <strong style={{ color: "#2563EB" }}>Como conectar</strong>.
                    </p>
                    <button
                      className="inline-flex items-center gap-0.5 h-7 px-2 rounded-lg text-xs font-semibold transition-colors hover:bg-[rgba(37,99,235,0.08)]"
                      style={{ color: "#2563EB" }}
                      onClick={() => setActiveTab("setup")}
                    >
                      Começar
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* ─── Setup Steps ────────────────────────────── */}
              {activeTab === "setup" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-0.5" style={{ color: "#0B1220" }}>
                      Passo-a-passo de conexão
                    </h3>
                    <p className="text-xs" style={{ color: "#64748B" }}>
                      Leva menos de 5 minutos. Depois é tempo real para sempre.
                    </p>
                  </div>

                  <ol className="space-y-3">
                    {spec.setupSteps.map((step, i) => (
                      <li key={i} className="relative pl-10">
                        {i < spec.setupSteps.length - 1 && (
                          <div className="absolute left-[14px] top-7 bottom-[-12px] w-px" style={{ background: "#E6EDF5" }} />
                        )}
                        <div className="absolute left-0 top-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: "rgba(37,99,235,0.08)", color: "#2563EB", border: "1px solid rgba(37,99,235,0.2)" }}>
                          {i + 1}
                        </div>
                        <div className="p-3 rounded-xl" style={{ border: "1px solid #E6EDF5", background: "#FFFFFF" }}>
                          <h4 className="text-sm font-semibold" style={{ color: "#0B1220" }}>{step.title}</h4>
                          <p className="text-xs leading-relaxed mt-0.5" style={{ color: "#64748B" }}>
                            {step.description}
                          </p>
                          {step.note && (
                            <div className="mt-2 flex items-start gap-1.5 p-2 rounded-md" style={{ background: "#FFFBEB", border: "1px solid rgba(217,119,6,0.18)" }}>
                              <Lock className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "#D97706" }} />
                              <span className="text-[11px] leading-relaxed" style={{ color: "#B45309" }}>
                                {step.note}
                              </span>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>

                  <a
                    href={spec.dashboardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between w-full p-3 rounded-xl transition-colors hover:bg-[#F8FAFC]"
                    style={{ border: "1px solid #E6EDF5" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <ExternalLink className="w-4 h-4" style={{ color: "#2563EB" }} />
                      <span className="text-xs font-medium" style={{ color: "#0B1220" }}>{spec.dashboardLabel}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" style={{ color: "#94A3B8" }} />
                  </a>

                  <button
                    onClick={() => setActiveTab("webhook")}
                    className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors"
                  >
                    <KeyRound className="w-4 h-4" />
                    Ir para as credenciais
                  </button>
                </div>
              )}

              {/* ─── Webhook credentials ──────────────────── */}
              {activeTab === "webhook" && (
                <div className="space-y-5">
                  {/* URL */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase" style={{ color: "#64748B", letterSpacing: "0.04em" }}>
                        URL do webhook
                      </label>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold" style={{ background: "#F1F5F9", color: "#64748B" }}>
                        {spec.webhook.method}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={spec.webhook.url}
                        readOnly
                        className="flex-1 h-9 px-3 rounded-lg text-xs font-mono outline-none"
                        style={{ background: "#F8FAFC", border: "1px solid #E6EDF5", color: "#334155" }}
                      />
                      <button
                        onClick={() => handleCopy(spec.webhook.url, "url")}
                        className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-[#F1F5F9]"
                        style={{ border: "1px solid #E6EDF5" }}
                      >
                        {copiedUrl ? <Check className="w-4 h-4" style={{ color: "#16A34A" }} /> : <Copy className="w-4 h-4" style={{ color: "#64748B" }} />}
                      </button>
                    </div>
                    <p className="text-[11px]" style={{ color: "#94A3B8" }}>
                      Cole essa URL no painel da {spec.name} como destino do webhook/postback.
                    </p>
                  </div>

                  {/* Auth header */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase" style={{ color: "#64748B", letterSpacing: "0.04em" }}>
                      Header de autenticação
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={spec.webhook.authHeader}
                        readOnly
                        className="flex-1 h-9 px-3 rounded-lg text-xs font-mono outline-none"
                        style={{ background: "#F8FAFC", border: "1px solid #E6EDF5", color: "#334155" }}
                      />
                      <button
                        onClick={() => handleCopy(spec.webhook.authHeader, "header")}
                        className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-[#F1F5F9]"
                        style={{ border: "1px solid #E6EDF5" }}
                      >
                        {copiedHeader ? <Check className="w-4 h-4" style={{ color: "#16A34A" }} /> : <Copy className="w-4 h-4" style={{ color: "#64748B" }} />}
                      </button>
                    </div>
                    <p className="text-[11px]" style={{ color: "#94A3B8" }}>
                      {spec.webhook.authType === "hmac"
                        ? "Validação HMAC-SHA256 — o secret abaixo é usado para verificar a assinatura."
                        : "A plataforma deve enviar o token nesse header em cada request."}
                    </p>
                  </div>

                  {/* Token input */}
                  <div className="space-y-1.5 pt-3" style={{ borderTop: "1px solid #EEF2F7" }}>
                    <label className="text-xs font-semibold uppercase flex items-center gap-1.5" style={{ color: "#0B1220", letterSpacing: "0.04em" }}>
                      <KeyRound className="w-3.5 h-3.5" style={{ color: "#2563EB" }} />
                      {spec.webhook.authFieldLabel}
                    </label>
                    <input
                      type="password"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder={spec.webhook.authFieldPlaceholder}
                      className="w-full h-10 px-3 rounded-lg text-sm font-mono outline-none transition-colors focus:border-[#2563EB]"
                      style={{ background: "#FFFFFF", border: "1px solid #E6EDF5", color: "#0B1220" }}
                    />
                    <p className="text-[11px]" style={{ color: "#94A3B8" }}>{spec.webhook.authFieldHelp}</p>
                  </div>
                </div>
              )}

              {/* ─── Events ───────────────────────────────── */}
              {activeTab === "events" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-0.5" style={{ color: "#0B1220" }}>
                      Eventos suportados
                    </h3>
                    <p className="text-xs" style={{ color: "#64748B" }}>
                      Cada evento da {spec.name} é processado automaticamente no seu CRM.
                    </p>
                  </div>

                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #E6EDF5" }}>
                    {spec.events.map((event, i) => (
                      <div key={event.label} className="flex items-start gap-3 p-3" style={i > 0 ? { borderTop: "1px solid #EEF2F7" } : undefined}>
                        <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: "#2563EB" }} />
                        <div className="flex-1 min-w-0">
                          <code className="text-[11px] font-mono font-semibold" style={{ color: "#2563EB" }}>
                            {event.label}
                          </code>
                          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#64748B" }}>
                            {event.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Sample payload */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <FileCode className="w-3.5 h-3.5" style={{ color: "#94A3B8" }} />
                      <span className="text-[10px] font-semibold uppercase" style={{ color: "#94A3B8", letterSpacing: "0.06em" }}>
                        Payload de exemplo (esperado)
                      </span>
                    </div>
                    <pre className="text-[11px] font-mono p-3 rounded-xl overflow-x-auto leading-relaxed" style={{ color: "#334155", background: "#F8FAFC", border: "1px solid #E6EDF5" }}>
{samplePayload}
                    </pre>
                    <p className="text-[11px] mt-1.5" style={{ color: "#94A3B8" }}>
                      Formatos variam por plataforma. O adapter do Vyzon normaliza automaticamente.
                    </p>
                  </div>
                </div>
              )}

              {/* ─── Via Make ─────────────────────────────── */}
              {activeTab === "make" && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(124,58,237,0.08)" }}>
                      <Workflow className="w-5 h-5" style={{ color: "#7C3AED" }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: "#0B1220" }}>
                        Integrar via Make (Integromat)
                      </h3>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#64748B" }}>
                        {spec.make.description}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 rounded-xl" style={{ border: "1px solid #E6EDF5" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold" style={{ background: "rgba(37,99,235,0.08)", color: "#2563EB" }}>
                          1
                        </span>
                        <span className="text-xs font-semibold" style={{ color: "#0B1220" }}>Módulo Trigger</span>
                      </div>
                      <code className="block text-[11px] font-mono pl-8" style={{ color: "#64748B" }}>
                        {spec.make.trigger_module}
                      </code>
                    </div>

                    <div className="flex justify-center">
                      <ChevronRight className="w-4 h-4 rotate-90" style={{ color: "#94A3B8" }} />
                    </div>

                    <div className="p-3 rounded-xl" style={{ border: "1px solid #E6EDF5" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold" style={{ background: "rgba(37,99,235,0.08)", color: "#2563EB" }}>
                          2
                        </span>
                        <span className="text-xs font-semibold" style={{ color: "#0B1220" }}>Módulo Action</span>
                      </div>
                      <code className="block text-[11px] font-mono pl-8" style={{ color: "#64748B" }}>
                        {spec.make.action_module}
                      </code>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl" style={{ background: "rgba(37,99,235,0.04)", border: "1px solid rgba(37,99,235,0.12)" }}>
                    <h4 className="text-xs font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: "#2563EB" }}>
                      <BookOpen className="w-3.5 h-3.5" />
                      Configuração do HTTP module
                    </h4>
                    <div className="space-y-1 text-[11px] font-mono" style={{ color: "#64748B" }}>
                      <div><span style={{ color: "#94A3B8" }}>URL:</span> {spec.webhook.url}</div>
                      <div><span style={{ color: "#94A3B8" }}>Method:</span> POST</div>
                      <div><span style={{ color: "#94A3B8" }}>Headers:</span> {spec.webhook.authHeader}: {`{seu_token}`}</div>
                      <div><span style={{ color: "#94A3B8" }}>Body:</span> JSON — payload da plataforma</div>
                    </div>
                  </div>

                  <a
                    href="https://www.make.com/en/integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between w-full p-3 rounded-xl transition-colors hover:bg-[#F8FAFC]"
                    style={{ border: "1px solid #E6EDF5" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <PlayCircle className="w-4 h-4" style={{ color: "#7C3AED" }} />
                      <span className="text-xs font-medium" style={{ color: "#0B1220" }}>Abrir Make.com</span>
                    </div>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" style={{ color: "#94A3B8" }} />
                  </a>
                </div>
              )}
            </>
          )}
        </div>

        {/* ─── Footer ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 px-6 py-3" style={{ borderTop: "1px solid #E6EDF5", background: "#FBFCFE" }}>
          <div>
            {configId && (
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="inline-flex items-center h-8 px-2.5 rounded-lg text-xs font-medium transition-colors hover:bg-[#FEF2F2]"
                style={{ color: "#DC2626" }}
              >
                {isDisconnecting ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Unlink className="w-3.5 h-3.5 mr-1.5" />
                )}
                Desconectar
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-lg text-xs font-medium transition-colors hover:bg-[#F1F5F9]"
              style={{ border: "1px solid #E6EDF5", color: "#475569" }}
            >
              Fechar
            </button>
            {canTest && (
              <button
                onClick={handleTest}
                disabled={isTesting || !token.trim()}
                className="inline-flex items-center justify-center h-9 px-4 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ border: "1px solid #BFD3F2", color: "#1D4ED8", background: "#FFFFFF" }}
              >
                {isTesting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5 mr-1.5" />}
                Testar conexão
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || !token.trim()}
              className="inline-flex items-center justify-center h-9 px-4 rounded-lg text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {configId ? "Salvar alterações" : "Conectar"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
