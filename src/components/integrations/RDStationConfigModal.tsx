import { useState, useEffect } from "react";
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
    HelpCircle,
    ShieldCheck,
    Unlink,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Webhook URL for RD Station
const WEBHOOK_URL = "https://omsdkjzkphflpwnbaeye.supabase.co/functions/v1/rdstation-webhook";

// Local type for integration config (table not yet in generated types)
interface IntegrationConfig {
    id: string;
    company_id: string;
    user_id: string;
    platform: string;
    hottok: string | null;
    is_active: boolean;
    settings: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

interface RDStationConfigModalProps {
    open: boolean;
    onClose: () => void;
    onSaved?: () => void;
}

export const RDStationConfigModal = ({ open, onClose, onSaved }: RDStationConfigModalProps) => {
    const { user, companyId } = useAuth();
    const [apiToken, setApiToken] = useState("");
    const [authHeaderName, setAuthHeaderName] = useState("x-rd-token");
    const [isActive, setIsActive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [configId, setConfigId] = useState<string | null>(null);

    // Load existing config on open
    useEffect(() => {
        if (open && companyId) {
            loadConfig();
        }
    }, [open, companyId]);

    const loadConfig = async () => {
        if (!companyId) return;

        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("integration_configs" as any)
                .select("*")
                .eq("company_id", companyId)
                .eq("platform", "rdstation")
                .maybeSingle();

            if (error) {
                console.error("Error loading config:", error);
                return;
            }

            if (data) {
                const config = data as IntegrationConfig;
                setApiToken(config.hottok || "");
                setIsActive(config.is_active || false);
                setConfigId(config.id);
                if ((config as any).webhook_url) {
                    setAuthHeaderName((config as any).webhook_url);
                }
            }
        } catch (error) {
            console.error("Error loading RD Station config:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!companyId || !user?.id) {
            toast.error("Erro: Usuário não autenticado");
            return;
        }

        if (!apiToken.trim()) {
            toast.error("Por favor, insira o API Token");
            return;
        }

        setIsSaving(true);
        try {
            const configData = {
                company_id: companyId,
                platform: "rdstation",
                hottok: apiToken.trim(),
                is_active: isActive,
                webhook_url: authHeaderName.trim() || "x-rd-token",
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

            toast.success("Configuração salva com sucesso!");
            onSaved?.();
            onClose();
        } catch (error: any) {
            console.error("Error saving config:", error);
            toast.error("Erro ao salvar configuração: " + error.message);
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
            setApiToken("");

            toast.success("Integração desconectada com sucesso!");
            onSaved?.();
            onClose();
        } catch (error: any) {
            console.error("Error disconnecting:", error);
            toast.error("Erro ao desconectar: " + error.message);
        } finally {
            setIsDisconnecting(false);
        }
    };

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(WEBHOOK_URL);
        setCopied(true);
        toast.success("URL copiada!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-slate-900 dark:text-white">
                        <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                            <span className="text-sm font-bold text-violet-600 dark:text-violet-400 w-6 h-6 flex items-center justify-center">
                                RD
                            </span>
                        </div>
                        Conectar RD Station
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400">
                        Receba conversões da RD Station automaticamente no seu CRM
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                    </div>
                ) : (
                    <div className="space-y-6 py-4">
                        {/* Status Badge */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Status da Integração
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge
                                    variant={isActive ? "default" : "secondary"}
                                    className={isActive
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                                        : ""}
                                >
                                    {isActive ? "Ativa" : "Inativa"}
                                </Badge>
                                <Switch
                                    checked={isActive}
                                    onCheckedChange={setIsActive}
                                />
                            </div>
                        </div>

                        {/* API Token Input */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Label className="text-slate-700 dark:text-slate-300">
                                    API Token (auth_key)
                                </Label>
                                <a
                                    href="https://app.rdstation.com.br/integracoes/webhooks"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-500 hover:text-emerald-600"
                                    title="Onde configurar o webhook"
                                >
                                    <HelpCircle className="w-4 h-4" />
                                </a>
                            </div>
                            <Input
                                type="password"
                                value={apiToken}
                                onChange={(e) => setApiToken(e.target.value)}
                                placeholder="Cole seu token aqui"
                                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Token configurado como auth_key nas configurações de webhook da RD Station
                            </p>
                        </div>

                        {/* Webhook URL */}
                        <div className="space-y-2">
                            <Label className="text-slate-700 dark:text-slate-300">
                                URL do Webhook (copie para a RD Station)
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    value={WEBHOOK_URL}
                                    readOnly
                                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-mono"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={handleCopyUrl}
                                    className="shrink-0"
                                >
                                    {copied ? (
                                        <Check className="w-4 h-4 text-emerald-500" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Auth Header Name Input */}
                        <div className="space-y-2">
                            <Label className="text-slate-700 dark:text-slate-300">
                                Nome do Header de Autenticação
                            </Label>
                            <Input
                                type="text"
                                value={authHeaderName}
                                onChange={(e) => setAuthHeaderName(e.target.value)}
                                placeholder="x-rd-token"
                                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Nome do header configurado na autenticação do webhook na RD Station
                            </p>
                        </div>

                        {/* Instructions */}
                        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                            <h4 className="font-medium text-emerald-900 dark:text-emerald-300 mb-2 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4" />
                                Como Configurar
                            </h4>
                            <ol className="text-sm text-emerald-700 dark:text-emerald-400 space-y-1 list-decimal list-inside">
                                <li>Acesse o painel da RD Station &rarr; Integrações &rarr; Webhooks</li>
                                <li>Crie um novo webhook com a URL acima</li>
                                <li>Em "Autenticação", configure o header e token</li>
                                <li>Selecione os eventos: <strong>Conversão</strong>, <strong>Oportunidade</strong></li>
                                <li>Cole o token aqui e ative</li>
                            </ol>
                        </div>

                        {/* Open RD Station Link */}
                        <a
                            href="https://app.rdstation.com.br/integracoes/webhooks"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Abrir Painel de Webhooks da RD Station
                        </a>
                    </div>
                )}

                {/* Footer */}
                <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                    {/* Left side - Disconnect button (only when connected) */}
                    <div>
                        {configId && isActive && (
                            <Button
                                variant="ghost"
                                onClick={handleDisconnect}
                                disabled={isDisconnecting}
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-500/10"
                            >
                                {isDisconnecting ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Unlink className="w-4 h-4 mr-2" />
                                )}
                                Desconectar
                            </Button>
                        )}
                    </div>

                    {/* Right side - Cancel and Save */}
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || !apiToken.trim()}
                            className="bg-emerald-600 hover:bg-emerald-500"
                        >
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Salvar Configuração
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
