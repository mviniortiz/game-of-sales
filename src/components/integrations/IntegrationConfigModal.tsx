import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Sparkles,
  Zap,
  PlayCircle,
  FileCode,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { IntegrationSpec } from "@/config/integrationsConfig";

type Tab = "overview" | "setup" | "webhook" | "make" | "events";

interface IntegrationConfig {
  id: string;
  company_id: string;
  user_id: string;
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
  { id: "overview", label: "Visão geral", icon: Sparkles },
  { id: "setup", label: "Como conectar", icon: Rocket },
  { id: "webhook", label: "Credenciais", icon: Webhook },
  { id: "events", label: "Eventos", icon: Zap },
  { id: "make", label: "Via Make", icon: Workflow },
];

export const IntegrationConfigModal = ({ spec, open, onClose, onSaved }: IntegrationConfigModalProps) => {
  const { user, companyId } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [token, setToken] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
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
        setIsActive(config.is_active || false);
        setConfigId(config.id);
      } else {
        setToken("");
        setIsActive(false);
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
      return;
    }

    setIsSaving(true);
    try {
      const configData = {
        company_id: companyId,
        user_id: user.id,
        platform: spec.platform,
        hottok: token.trim(),
        is_active: isActive,
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
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(`Erro ao salvar: ${msg}`);
    } finally {
      setIsSaving(false);
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
      setIsActive(false);
      setToken("");
      toast.success(`${spec.name} desconectada`);
      onSaved?.();
      onClose();
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
      <DialogContent className="max-w-[95vw] sm:max-w-[760px] p-0 bg-card border-border overflow-hidden max-h-[90vh] flex flex-col">
        {/* ─── Header ──────────────────────────────────────────── */}
        <div className="relative px-6 pt-6 pb-5 border-b border-border/60 bg-gradient-to-br from-muted/30 to-transparent">
          <DialogHeader className="text-left">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-white ring-1 ring-border shadow-sm p-2.5 flex items-center justify-center shrink-0">
                <img src={spec.logo} alt={spec.name} className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-xl font-bold text-foreground tracking-tight">
                    {spec.name}
                  </DialogTitle>
                  {isActive && (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                      ATIVA
                    </Badge>
                  )}
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {spec.tagline}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold hidden sm:inline">
                  {isActive ? "Ligada" : "Desligada"}
                </span>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-1 mt-5 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {TABS.map((tab) => {
              const TabIcon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all
                    ${active
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }
                  `}
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
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            </div>
          ) : (
            <>
              {/* ─── Overview ───────────────────────────────── */}
              {activeTab === "overview" && (
                <div className="space-y-5">
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {spec.description}
                  </p>

                  <div>
                    <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      O que essa integração faz
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {spec.features.map((feature) => (
                        <div
                          key={feature}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/50"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-xs text-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Lock className="w-3 h-3" />
                      Segurança
                    </h3>
                    <div className="space-y-1.5">
                      {spec.securityNotes.map((note, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/70 shrink-0 mt-0.5" />
                          <span>{note}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                    <p className="text-xs text-foreground/80 flex-1">
                      Pronto para conectar? Vá para a aba <strong className="text-emerald-400">Como conectar</strong> e siga o passo-a-passo.
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-emerald-400 hover:text-emerald-300"
                      onClick={() => setActiveTab("setup")}
                    >
                      Começar
                      <ChevronRight className="w-3 h-3 ml-0.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ─── Setup Steps ────────────────────────────── */}
              {activeTab === "setup" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-0.5">
                      Passo-a-passo de conexão
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Leva menos de 5 minutos. Depois é tempo real para sempre.
                    </p>
                  </div>

                  <ol className="space-y-3">
                    {spec.setupSteps.map((step, i) => (
                      <li key={i} className="relative pl-10">
                        {/* Connecting line */}
                        {i < spec.setupSteps.length - 1 && (
                          <div className="absolute left-[14px] top-7 bottom-[-12px] w-px bg-border" />
                        )}
                        {/* Number */}
                        <div className="absolute left-0 top-0 w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[11px] font-bold text-emerald-400">
                          {i + 1}
                        </div>
                        <div className="p-3 rounded-lg border border-border/60 bg-card/60">
                          <h4 className="text-sm font-semibold text-foreground">{step.title}</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                            {step.description}
                          </p>
                          {step.note && (
                            <div className="mt-2 flex items-start gap-1.5 p-2 rounded-md bg-amber-500/5 border border-amber-500/15">
                              <Lock className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                              <span className="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed">
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
                    className="group flex items-center justify-between w-full p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-emerald-500/30 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-emerald-400" />
                      <span className="text-xs font-medium text-foreground">{spec.dashboardLabel}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              )}

              {/* ─── Webhook credentials ──────────────────── */}
              {activeTab === "webhook" && (
                <div className="space-y-5">
                  {/* URL */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        URL do webhook
                      </Label>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono">
                        {spec.webhook.method}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={spec.webhook.url}
                        readOnly
                        className="bg-muted/30 border-border text-xs font-mono"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopy(spec.webhook.url, "url")}
                        className="shrink-0"
                      >
                        {copiedUrl ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Cole essa URL no painel da {spec.name} como destino do webhook/postback.
                    </p>
                  </div>

                  {/* Auth header */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Header de autenticação
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={spec.webhook.authHeader}
                        readOnly
                        className="bg-muted/30 border-border text-xs font-mono"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopy(spec.webhook.authHeader, "header")}
                        className="shrink-0"
                      >
                        {copiedHeader ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {spec.webhook.authType === "hmac"
                        ? "Validação HMAC-SHA256 — o secret abaixo é usado para verificar a assinatura."
                        : "A plataforma deve enviar o token nesse header em cada request."}
                    </p>
                  </div>

                  {/* Token input */}
                  <div className="space-y-1.5 pt-2 border-t border-border/40">
                    <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      {spec.webhook.authFieldLabel}
                    </Label>
                    <Input
                      type="password"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder={spec.webhook.authFieldPlaceholder}
                      className="bg-background border-border font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground">{spec.webhook.authFieldHelp}</p>
                  </div>
                </div>
              )}

              {/* ─── Events ───────────────────────────────── */}
              {activeTab === "events" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-0.5">
                      Eventos suportados
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Cada evento da {spec.name} é processado automaticamente no seu CRM.
                    </p>
                  </div>

                  <div className="divide-y divide-border/40 rounded-lg border border-border/60 bg-card/60 overflow-hidden">
                    {spec.events.map((event) => (
                      <div key={event.label} className="flex items-start gap-3 p-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <code className="text-[11px] font-mono text-emerald-400 font-semibold">
                            {event.label}
                          </code>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {event.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Sample payload */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Payload de exemplo (esperado)
                      </span>
                    </div>
                    <pre className="text-[11px] font-mono text-foreground/80 p-3 rounded-lg bg-muted/30 border border-border/60 overflow-x-auto leading-relaxed">
{samplePayload}
                    </pre>
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      Formatos variam por plataforma. O adapter do Vyzon normaliza automaticamente.
                    </p>
                  </div>
                </div>
              )}

              {/* ─── Via Make ─────────────────────────────── */}
              {activeTab === "make" && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 shrink-0">
                      <Workflow className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Integrar via Make (Integromat)
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {spec.make.description}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 rounded-lg border border-border/60 bg-card/60">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                          1
                        </span>
                        <span className="text-xs font-semibold text-foreground">Módulo Trigger</span>
                      </div>
                      <code className="block text-[11px] font-mono text-muted-foreground pl-8">
                        {spec.make.trigger_module}
                      </code>
                    </div>

                    <div className="flex justify-center">
                      <ChevronRight className="w-4 h-4 text-muted-foreground rotate-90" />
                    </div>

                    <div className="p-3 rounded-lg border border-border/60 bg-card/60">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                          2
                        </span>
                        <span className="text-xs font-semibold text-foreground">Módulo Action</span>
                      </div>
                      <code className="block text-[11px] font-mono text-muted-foreground pl-8">
                        {spec.make.action_module}
                      </code>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/15">
                    <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1.5 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      Configuração do HTTP module
                    </h4>
                    <div className="space-y-1 text-[11px] font-mono text-muted-foreground">
                      <div>
                        <span className="text-foreground/60">URL:</span> {spec.webhook.url}
                      </div>
                      <div>
                        <span className="text-foreground/60">Method:</span> POST
                      </div>
                      <div>
                        <span className="text-foreground/60">Headers:</span> {spec.webhook.authHeader}: {`{seu_token}`}
                      </div>
                      <div>
                        <span className="text-foreground/60">Body:</span> JSON — payload da plataforma
                      </div>
                    </div>
                  </div>

                  <a
                    href="https://www.make.com/en/integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between w-full p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-purple-500/30 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <PlayCircle className="w-4 h-4 text-muted-foreground group-hover:text-purple-400" />
                      <span className="text-xs font-medium text-foreground">Abrir Make.com</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-400 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              )}
            </>
          )}
        </div>

        {/* ─── Footer ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 px-6 py-3 border-t border-border/60 bg-muted/20">
          <div>
            {configId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="h-8 text-xs text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
              >
                {isDisconnecting ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Unlink className="w-3.5 h-3.5 mr-1.5" />
                )}
                Desconectar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
              Fechar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !token.trim()}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {configId ? "Salvar alterações" : "Conectar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
