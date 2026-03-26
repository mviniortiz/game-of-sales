import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Server, Wifi, WifiOff, MemoryStick, Cpu, RefreshCw,
  AlertTriangle, CheckCircle2, XCircle, Loader2, Activity,
  Building2, Trash2
} from "lucide-react";

interface InstanceInfo {
  instanceName: string;
  state: string;
  connected: boolean;
  userId: string | null;
  userName: string | null;
  avatarUrl: string | null;
  companyId: string | null;
  companyName: string | null;
}

interface MonitorSummary {
  total: number;
  connected: number;
  disconnected: number;
  estimatedRamMb: number;
}

interface MonitorData {
  success: boolean;
  evolutionOnline: boolean;
  error?: string;
  instances: InstanceInfo[];
  summary: MonitorSummary;
}

// Oracle Free Tier ARM: 24GB RAM total, ~22GB usable
const VPS_TOTAL_RAM_MB = 22_000;
const RAM_WARNING_THRESHOLD = 0.7; // 70%
const RAM_CRITICAL_THRESHOLD = 0.85; // 85%

const getInitials = (name: string) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const EvolutionMonitor = () => {
  const { activeCompanyId } = useTenant();
  const [deletingInstance, setDeletingInstance] = useState<string | null>(null);

  const handleDeleteInstance = useCallback(async (instanceName: string) => {
    if (!confirm(`Tem certeza que deseja deletar a instância "${instanceName}"? Essa ação não pode ser desfeita.`)) {
      return;
    }
    setDeletingInstance(instanceName);
    try {
      const response = await supabase.functions.invoke("evolution-whatsapp", {
        body: {
          action: "deleteInstance",
          companyId: activeCompanyId,
          targetInstanceName: instanceName,
        },
      });
      if (response.error) throw new Error(response.error.message);
      toast.success(`Instância "${instanceName}" deletada`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Erro ao deletar instância");
    } finally {
      setDeletingInstance(null);
    }
  }, [activeCompanyId]);

  const {
    data: monitor,
    isLoading,
    refetch,
    dataUpdatedAt,
  } = useQuery<MonitorData>({
    queryKey: ["evolution-monitor"],
    queryFn: async () => {
      const response = await supabase.functions.invoke("evolution-whatsapp", {
        body: {
          action: "monitor",
          companyId: activeCompanyId,
        },
      });
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data as MonitorData;
    },
    staleTime: 30_000,
    refetchInterval: 60_000, // auto-refresh every minute
  });

  const summary = monitor?.summary || { total: 0, connected: 0, disconnected: 0, estimatedRamMb: 0 };
  const instances = monitor?.instances || [];
  const evolutionOnline = monitor?.evolutionOnline ?? false;

  const ramPercent = VPS_TOTAL_RAM_MB > 0 ? (summary.estimatedRamMb / VPS_TOTAL_RAM_MB) * 100 : 0;
  const ramStatus =
    ramPercent >= RAM_CRITICAL_THRESHOLD * 100
      ? "critical"
      : ramPercent >= RAM_WARNING_THRESHOLD * 100
        ? "warning"
        : "ok";

  // Group instances by company
  const byCompany = instances.reduce<Record<string, { name: string; instances: InstanceInfo[] }>>(
    (acc, inst) => {
      const key = inst.companyId || "orphan";
      if (!acc[key]) {
        acc[key] = { name: inst.companyName || "Sem empresa", instances: [] };
      }
      acc[key].instances.push(inst);
      return acc;
    },
    {},
  );

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("pt-BR")
    : "--";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold text-foreground">Evolution API Monitor</h2>
            <p className="text-sm text-muted-foreground">
              Status da VPS Oracle · Atualizado: {lastUpdated}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {isLoading && !monitor && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {monitor && (
        <>
          {/* Status Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {/* API Status */}
            <Card className={`border ${evolutionOnline ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${evolutionOnline ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
                    {evolutionOnline ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">API Status</p>
                    <p className={`text-sm font-bold ${evolutionOnline ? "text-emerald-500" : "text-red-500"}`}>
                      {evolutionOnline ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Instances */}
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Server className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Instâncias</p>
                    <p className="text-lg font-bold text-foreground">{summary.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Connected */}
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Wifi className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Conectadas</p>
                    <p className="text-lg font-bold text-emerald-500">{summary.connected}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Disconnected */}
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                    <WifiOff className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Desconectadas</p>
                    <p className="text-lg font-bold text-orange-500">{summary.disconnected}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* RAM Estimate */}
            <Card className={`border ${ramStatus === "critical" ? "border-red-500/30 bg-red-500/5" : ramStatus === "warning" ? "border-amber-500/30 bg-amber-500/5" : "border-border/50"}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${ramStatus === "critical" ? "bg-red-500/20" : ramStatus === "warning" ? "bg-amber-500/20" : "bg-purple-500/20"}`}>
                    <MemoryStick className={`h-5 w-5 ${ramStatus === "critical" ? "text-red-500" : ramStatus === "warning" ? "text-amber-500" : "text-purple-500"}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">RAM Estimada</p>
                    <p className={`text-lg font-bold ${ramStatus === "critical" ? "text-red-500" : ramStatus === "warning" ? "text-amber-500" : "text-foreground"}`}>
                      {summary.estimatedRamMb >= 1000
                        ? `${(summary.estimatedRamMb / 1000).toFixed(1)}GB`
                        : `${summary.estimatedRamMb}MB`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RAM Progress Bar */}
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Uso estimado de RAM na VPS</span>
                </div>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {summary.estimatedRamMb >= 1000
                    ? `${(summary.estimatedRamMb / 1000).toFixed(1)}GB`
                    : `${summary.estimatedRamMb}MB`}
                  {" / "}
                  {(VPS_TOTAL_RAM_MB / 1000).toFixed(0)}GB
                </span>
              </div>
              <Progress
                value={Math.min(ramPercent, 100)}
                className={`h-3 ${ramStatus === "critical" ? "[&>div]:bg-red-500" : ramStatus === "warning" ? "[&>div]:bg-amber-500" : ""}`}
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">
                  ~150MB por instância · {summary.total} instâncias
                </p>
                {ramStatus !== "ok" && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${ramStatus === "critical" ? "text-red-500" : "text-amber-500"}`}>
                    <AlertTriangle className="h-3 w-3" />
                    {ramStatus === "critical" ? "Uso crítico!" : "Atenção: uso elevado"}
                  </div>
                )}
              </div>

              {/* Capacity projection */}
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  Capacidade estimada: <span className="text-foreground font-medium">
                    ~{Math.floor(VPS_TOTAL_RAM_MB / 150)} instâncias
                  </span> max na Oracle Free Tier (24GB ARM)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Alert if Evolution is offline */}
          {!evolutionOnline && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-500">Evolution API Offline</p>
                    <p className="text-xs text-red-400 mt-0.5">
                      {monitor.error || "Não foi possível conectar à Evolution API. Verifique se o serviço está rodando na VPS."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instances by Company */}
          {Object.keys(byCompany).length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Instâncias por Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-4">
                  {Object.entries(byCompany).map(([companyId, group]) => (
                    <div key={companyId}>
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-semibold text-foreground">{group.name}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {group.instances.filter((i) => i.connected).length}/{group.instances.length} online
                        </Badge>
                      </div>

                      <div className="grid gap-1.5 pl-6">
                        {group.instances.map((inst) => {
                          const isOrphan = !inst.userName;
                          const isDeleting = deletingInstance === inst.instanceName;

                          return (
                            <div
                              key={inst.instanceName}
                              className={`flex items-center gap-3 p-2.5 rounded-lg text-sm ${
                                inst.connected
                                  ? "bg-emerald-500/5 border border-emerald-500/10"
                                  : "bg-muted/30 border border-transparent"
                              }`}
                            >
                              {/* Status dot */}
                              <div className={`h-2 w-2 rounded-full flex-shrink-0 ${inst.connected ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30"}`} />

                              {/* Avatar */}
                              <Avatar className="h-7 w-7 flex-shrink-0">
                                <AvatarImage src={inst.avatarUrl || ""} />
                                <AvatarFallback className="text-[10px]">
                                  {inst.userName ? getInitials(inst.userName) : "?"}
                                </AvatarFallback>
                              </Avatar>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <span className="text-foreground font-medium truncate block">
                                  {inst.userName || inst.instanceName}
                                </span>
                                {/* Show instance name below for identified users, or orphan label */}
                                {inst.userName ? (
                                  <span className="text-[10px] text-muted-foreground truncate block">
                                    {inst.instanceName}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-amber-500 truncate block">
                                    Instância órfã — sem usuário vinculado
                                  </span>
                                )}
                              </div>

                              {/* State badge */}
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  inst.connected
                                    ? "border-emerald-500/30 text-emerald-500"
                                    : "border-muted-foreground/20 text-muted-foreground"
                                }`}
                              >
                                {inst.state}
                              </Badge>

                              {/* Delete button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 flex-shrink-0"
                                onClick={() => handleDeleteInstance(inst.instanceName)}
                                disabled={isDeleting}
                                title={`Deletar instância ${inst.instanceName}`}
                              >
                                {isDeleting ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {instances.length === 0 && evolutionOnline && (
            <Card className="border-border/50">
              <CardContent className="py-8">
                <div className="text-center">
                  <Server className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhuma instância WhatsApp criada ainda.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
