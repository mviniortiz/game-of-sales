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

// Webhook URL for Kiwify
const WEBHOOK_URL = "https://omsdkjzkphflpwnbaeye.supabase.co/functions/v1/kiwify-webhook";

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

interface KiwifyConfigModalProps {
    open: boolean;
    onClose: () => void;
    onSaved?: () => void;
}

export const KiwifyConfigModal = ({ open, onClose, onSaved }: KiwifyConfigModalProps) => {
    const { user, companyId } = useAuth();
    const [signatureSecret, setSignatureSecret] = useState("");
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
                .eq("platform", "kiwify")
                .maybeSingle();

            if (error) {
                console.error("Error loading config:", error);
                return;
            }

            if (data) {
                const config = data as IntegrationConfig;
                setSignatureSecret(config.hottok || "");
                setIsActive(config.is_active || false);
                setConfigId(config.id);
            }
        } catch (error) {
            console.error("Error loading Kiwify config:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!companyId || !user?.id) {
            toast.error("Erro: Usuário não autenticado");
            return;
        }

        if (!signatureSecret.trim()) {
            toast.error("Por favor, insira o token secreto de assinatura");
            return;
        }

        setIsSaving(true);
        try {
            const configData = {
                company_id: companyId,
                platform: "kiwify",
                hottok: signatureSecret.trim(),
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
            setSignatureSecret("");

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
            <DialogContent className="max-w-[95vw] sm:max-w-[500px] bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-foreground">
                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-500/20">
                            <img
                                src="/src/assets/integrations/kiwify-logo-png_seeklogo-537186.webp"
                                alt="Kiwify"
                                className="w-6 h-6"
                            />
                        </div>
                        Conectar Kiwify
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Receba vendas da Kiwify automaticamente no seu CRM
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                    </div>
                ) : (
                    <div className="space-y-6 py-4">
                        {/* Status Badge */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">
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

                        {/* Signature Secret Input */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Label className="text-foreground">
                                    Token Secreto (Signature Secret)
                                </Label>
                                <a
                                    href="https://dashboard.kiwify.com.br/settings/webhooks"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-500 hover:text-emerald-600"
                                    title="Onde encontrar o token secreto"
                                >
                                    <HelpCircle className="w-4 h-4" />
                                </a>
                            </div>
                            <Input
                                type="password"
                                value={signatureSecret}
                                onChange={(e) => setSignatureSecret(e.target.value)}
                                placeholder="Cole seu token secreto aqui"
                                className="bg-card border-border"
                            />
                            <p className="text-xs text-muted-foreground">
                                Encontre o token secreto em: Kiwify Dashboard &rarr; Configurações &rarr; Webhooks
                            </p>
                        </div>

                        {/* Webhook URL */}
                        <div className="space-y-2">
                            <Label className="text-foreground">
                                URL do Webhook (copie para a Kiwify)
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    value={WEBHOOK_URL}
                                    readOnly
                                    className="bg-muted border-border text-xs font-mono"
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

                        {/* Instructions */}
                        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                            <h4 className="font-medium text-emerald-900 dark:text-emerald-300 mb-2 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4" />
                                Como Configurar
                            </h4>
                            <ol className="text-sm text-emerald-700 dark:text-emerald-400 space-y-1 list-decimal list-inside">
                                <li>Copie a URL do webhook acima</li>
                                <li>Acesse o painel da Kiwify &rarr; Configurações &rarr; Webhooks</li>
                                <li>Adicione a URL do webhook</li>
                                <li>Selecione os eventos: <strong>Pedido Aprovado</strong>, <strong>Reembolso</strong>, <strong>Chargeback</strong></li>
                                <li>Copie o token secreto gerado e cole aqui</li>
                                <li>Ative a integração e salve</li>
                            </ol>
                        </div>

                        {/* Open Kiwify Link */}
                        <a
                            href="https://dashboard.kiwify.com.br/settings/webhooks"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Abrir Painel de Webhooks da Kiwify
                        </a>
                    </div>
                )}

                {/* Footer */}
                <div className="flex justify-between pt-4 border-t border-border">
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

                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || !signatureSecret.trim()}
                            className="bg-emerald-600 hover:bg-emerald-500"
                        >
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Salvar Configuracao
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
