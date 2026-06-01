import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Loader2,
  Unlink,
  ExternalLink,
  ChevronRight,
  Send,
  Check,
  ShoppingCart,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatError } from "@/lib/utils";
import slackLogo from "@/assets/integrations/slack.svg";
import discordLogo from "@/assets/integrations/discord.svg";

export type ChannelPlatform = "slack" | "discord";

interface ChannelSpec {
  platform: ChannelPlatform;
  name: string;
  logo: string;
  tagline: string;
  urlLabel: string;
  urlPlaceholder: string;
  urlHint: string;
  dashboardUrl: string;
  dashboardLabel: string;
  steps: { title: string; description: string }[];
}

export const CHANNEL_SPECS: Record<ChannelPlatform, ChannelSpec> = {
  slack: {
    platform: "slack",
    name: "Slack",
    logo: slackLogo,
    tagline: "Notificações de vendas no canal do time",
    urlLabel: "Incoming Webhook URL",
    urlPlaceholder: "https://hooks.slack.com/services/T0.../B0.../xxxx",
    urlHint: "A URL começa com https://hooks.slack.com/services/",
    dashboardUrl: "https://api.slack.com/apps",
    dashboardLabel: "Abrir api.slack.com/apps",
    steps: [
      { title: "Crie (ou abra) um app no Slack", description: "Em api.slack.com/apps, clique em Create New App > From scratch e escolha o workspace." },
      { title: "Ative Incoming Webhooks", description: "No menu do app, abra Incoming Webhooks e ligue a chave Activate Incoming Webhooks." },
      { title: "Adicione um webhook ao canal", description: "Clique em Add New Webhook to Workspace e escolha o canal onde as vendas vão aparecer." },
      { title: "Copie a URL e cole abaixo", description: "O Slack gera uma Webhook URL. Copie e cole no campo abaixo." },
    ],
  },
  discord: {
    platform: "discord",
    name: "Discord",
    logo: discordLogo,
    tagline: "Notificações de vendas no servidor do time",
    urlLabel: "Webhook URL",
    urlPlaceholder: "https://discord.com/api/webhooks/.../...",
    urlHint: "A URL começa com https://discord.com/api/webhooks/",
    dashboardUrl: "https://support.discord.com/hc/pt-br/articles/228383668",
    dashboardLabel: "Como criar um webhook no Discord",
    steps: [
      { title: "Abra as configurações do canal", description: "No servidor, passe o mouse no canal e clique no ícone de engrenagem (Editar canal)." },
      { title: "Vá em Integrações > Webhooks", description: "Abra a aba Integrações e clique em Webhooks." },
      { title: "Crie um novo webhook", description: "Clique em Novo webhook, dê um nome (ex: Vyzon) e escolha o canal." },
      { title: "Copie a URL e cole abaixo", description: "Clique em Copiar URL do webhook e cole no campo abaixo." },
    ],
  },
};

const EVENTS: { id: string; label: string; description: string; icon: React.ElementType }[] = [
  { id: "sale_closed", label: "Venda fechada", description: "A cada venda aprovada, a EVA comemora no canal", icon: ShoppingCart },
  { id: "goal_reached", label: "Meta batida", description: "Quando um vendedor atinge a meta do mês", icon: Target },
];

interface Props {
  spec: ChannelSpec;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const ChannelConfigModal = ({ spec, open, onClose, onSaved }: Props) => {
  const { companyId } = useAuth();
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["sale_closed", "goal_reached"]);
  const [configId, setConfigId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    if (open && companyId) loadConfig();
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
        const cfg = data as any;
        setUrl(cfg.hottok || "");
        setConfigId(cfg.id);
        setIsConnected(Boolean(cfg.is_active && cfg.hottok));
        if (Array.isArray(cfg.settings?.events) && cfg.settings.events.length) {
          setEvents(cfg.settings.events);
        }
      } else {
        setUrl("");
        setConfigId(null);
        setIsConnected(false);
        setEvents(["sale_closed", "goal_reached"]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const validUrl = (() => {
    try {
      const u = new URL(url.trim());
      if (u.protocol !== "https:") return false;
      const host = u.hostname.toLowerCase();
      if (spec.platform === "slack") return host === "hooks.slack.com";
      return ["discord.com", "discordapp.com", "ptb.discord.com", "canary.discord.com"].includes(host);
    } catch {
      return false;
    }
  })();

  const toggleEvent = (id: string) => {
    setEvents((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  };

  const handleTest = async () => {
    if (!validUrl) {
      toast.error("Cole uma Webhook URL válida primeiro");
      return;
    }
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("notify-channel", {
        body: { test: true, platform: spec.platform, webhook_url: url.trim() },
      });
      if (error) throw error;
      if (data?.ok) {
        toast.success(`Mensagem de teste enviada pro ${spec.name}`);
      } else {
        toast.error("O canal recusou a mensagem. Confira a URL.");
      }
    } catch (error) {
      toast.error(`Falha no teste: ${formatError(error)}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!companyId) {
      toast.error("Empresa não identificada");
      return;
    }
    if (!validUrl) {
      toast.error("Cole uma Webhook URL válida");
      return;
    }
    if (events.length === 0) {
      toast.error("Selecione ao menos um evento");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        company_id: companyId,
        platform: spec.platform,
        hottok: url.trim(),
        is_active: true,
        settings: { events },
      };
      const { error } = await supabase
        .from("integration_configs" as any)
        .upsert(payload, { onConflict: "company_id,platform" });
      if (error) throw error;
      toast.success(`${spec.name} conectado com sucesso`);
      onSaved?.();
      onClose();
    } catch (error) {
      toast.error(`Erro ao salvar: ${formatError(error)}`);
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
        .update({ is_active: false })
        .eq("id", configId);
      if (error) throw error;
      setIsConnected(false);
      toast.success(`${spec.name} desconectado`);
      onSaved?.();
      onClose();
    } catch (error) {
      toast.error(`Erro ao desconectar: ${formatError(error)}`);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[620px] p-0 overflow-hidden max-h-[90vh] flex flex-col" style={{ background: "#FFFFFF", border: "1px solid #E6EDF5" }}>
        {/* Header */}
        <div className="px-6 pt-6 pb-5" style={{ borderBottom: "1px solid #E6EDF5", background: "#FBFCFE" }}>
          <DialogHeader className="text-left">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-white shadow-sm p-3 flex items-center justify-center shrink-0" style={{ border: "1px solid #EEF2F7" }}>
                <img src={spec.logo} alt={spec.name} className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-xl font-bold tracking-tight" style={{ color: "#0B1220" }}>{spec.name}</DialogTitle>
                  {isConnected && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase" style={{ background: "#ECFDF3", color: "#16A34A", letterSpacing: "0.04em" }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#16A34A" }} />
                      Conectado
                    </span>
                  )}
                </div>
                <DialogDescription className="text-xs mt-0.5" style={{ color: "#64748B" }}>{spec.tagline}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2563EB" }} />
            </div>
          ) : (
            <>
              {/* Passos */}
              <div>
                <h3 className="text-[10px] font-semibold uppercase mb-3" style={{ color: "#94A3B8", letterSpacing: "0.06em" }}>Como obter a URL</h3>
                <ol className="space-y-3">
                  {spec.steps.map((step, i) => (
                    <li key={i} className="relative pl-9">
                      {i < spec.steps.length - 1 && (
                        <div className="absolute left-[13px] top-7 bottom-[-12px] w-px" style={{ background: "#E6EDF5" }} />
                      )}
                      <div className="absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: "rgba(37,99,235,0.08)", color: "#2563EB" }}>
                        {i + 1}
                      </div>
                      <h4 className="text-[13px] font-semibold" style={{ color: "#0B1220" }}>{step.title}</h4>
                      <p className="text-xs leading-relaxed mt-0.5" style={{ color: "#64748B" }}>{step.description}</p>
                    </li>
                  ))}
                </ol>
                <a
                  href={spec.dashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between w-full mt-3 p-2.5 rounded-xl transition-colors hover:bg-[#F8FAFC]"
                  style={{ border: "1px solid #E6EDF5" }}
                >
                  <span className="flex items-center gap-2 text-xs font-medium" style={{ color: "#0B1220" }}>
                    <ExternalLink className="w-3.5 h-3.5" style={{ color: "#2563EB" }} />
                    {spec.dashboardLabel}
                  </span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" style={{ color: "#94A3B8" }} />
                </a>
              </div>

              {/* URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase" style={{ color: "#0B1220", letterSpacing: "0.04em" }}>{spec.urlLabel}</label>
                <div className="flex gap-2">
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={spec.urlPlaceholder}
                    className="flex-1 h-10 px-3 rounded-lg text-sm font-mono outline-none transition-colors focus:border-[#2563EB]"
                    style={{ background: "#FFFFFF", border: "1px solid #E6EDF5", color: "#0B1220" }}
                  />
                  <button
                    onClick={handleTest}
                    disabled={!validUrl || isTesting}
                    className="shrink-0 inline-flex items-center gap-1.5 h-10 px-3 rounded-lg text-xs font-semibold transition-colors hover:bg-[#F1F5F9] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ border: "1px solid #E6EDF5", color: "#2563EB" }}
                  >
                    {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Testar
                  </button>
                </div>
                <p className="text-[11px]" style={{ color: "#94A3B8" }}>{spec.urlHint}</p>
              </div>

              {/* Eventos */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase" style={{ color: "#0B1220", letterSpacing: "0.04em" }}>O que notificar</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EVENTS.map((ev) => {
                    const active = events.includes(ev.id);
                    const Icon = ev.icon;
                    return (
                      <button
                        key={ev.id}
                        onClick={() => toggleEvent(ev.id)}
                        className="flex items-start gap-2.5 p-3 rounded-xl text-left transition-colors"
                        style={active
                          ? { background: "rgba(37,99,235,0.05)", border: "1px solid rgba(37,99,235,0.3)" }
                          : { background: "#FFFFFF", border: "1px solid #E6EDF5" }}
                      >
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: active ? "rgba(37,99,235,0.1)" : "#F1F5F9" }}>
                          <Icon className="w-4 h-4" style={{ color: active ? "#2563EB" : "#94A3B8" }} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-semibold" style={{ color: "#0B1220" }}>{ev.label}</span>
                            {active && <Check className="w-3.5 h-3.5" style={{ color: "#2563EB" }} />}
                          </div>
                          <p className="text-[11px] mt-0.5 leading-snug" style={{ color: "#64748B" }}>{ev.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-3" style={{ borderTop: "1px solid #E6EDF5", background: "#FBFCFE" }}>
          <div>
            {configId && isConnected && (
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="inline-flex items-center h-8 px-2.5 rounded-lg text-xs font-medium transition-colors hover:bg-[#FEF2F2]"
                style={{ color: "#DC2626" }}
              >
                {isDisconnecting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5 mr-1.5" />}
                Desconectar
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="h-9 px-4 rounded-lg text-xs font-medium transition-colors hover:bg-[#F1F5F9]" style={{ border: "1px solid #E6EDF5", color: "#475569" }}>
              Fechar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !validUrl || events.length === 0}
              className="inline-flex items-center justify-center h-9 px-4 rounded-lg text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {isConnected ? "Salvar alterações" : "Conectar"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
