import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DollarSign,
  XCircle,
  CalendarClock,
  UserCheck,
  UserX,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Package,
  CreditCard,
  Globe,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import { playSaleChime } from "@/utils/sounds";

interface CallFormProps {
  onSuccess: () => void;
}

type AttendanceStatus = "" | "show" | "no_show";
type Resultado = "" | "venda" | "sem_interesse" | "reagendar";

const PAYMENT_METHODS = ["Pix", "Cartão de Crédito", "Boleto", "Dinheiro"] as const;

const LOSS_REASONS = [
  { value: "preco", label: "Preço muito alto" },
  { value: "concorrencia", label: "Fechou com concorrente" },
  { value: "timing", label: "Momento inadequado" },
  { value: "necessidade", label: "Não viu necessidade" },
  { value: "decisor", label: "Não é o decisor" },
  { value: "orcamento", label: "Sem orçamento" },
  { value: "outro", label: "Outro motivo" },
];

export const CallForm = ({ onSuccess }: CallFormProps) => {
  const { user } = useAuth();
  const { activeCompanyId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [showLossReasonModal, setShowLossReasonModal] = useState(false);
  const [valorFormatado, setValorFormatado] = useState("");

  const [formData, setFormData] = useState({
    agendamento_id: "",
    cliente_nome: "",
    attendance_status: "" as AttendanceStatus,
    resultado: "" as Resultado,
    reagendar_data: "",
    loss_reason: "",
    produto_id: "",
    produto_nome: "",
    valor: "",
    plataforma: "",
    forma_pagamento: "",
    observacoes: "",
  });

  const formatarMoeda = (value: string) => {
    const numero = value.replace(/\D/g, "");
    if (!numero) {
      setFormData((prev) => ({ ...prev, valor: "" }));
      setValorFormatado("");
      return;
    }
    const valorNumerico = parseFloat(numero) / 100;
    setFormData((prev) => ({ ...prev, valor: valorNumerico.toString() }));
    setValorFormatado(
      valorNumerico.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      const [agRes, prRes] = await Promise.all([
        supabase
          .from("agendamentos")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "agendado")
          .order("data_agendamento", { ascending: true }),
        supabase.from("produtos").select("*").eq("ativo", true),
      ]);
      if (agRes.data) setAgendamentos(agRes.data);
      if (prRes.data) setProdutos(prRes.data);
    };
    loadData();
  }, [user]);

  const handleAgendamentoChange = (agendamentoId: string) => {
    const agendamento = agendamentos.find((a) => a.id === agendamentoId);
    setFormData({
      ...formData,
      agendamento_id: agendamentoId,
      cliente_nome: agendamento?.cliente_nome || "",
    });
  };

  const handleResultadoChange = (value: Resultado) => {
    setFormData({ ...formData, resultado: value, loss_reason: "" });
    if (value === "venda") setShowSalesModal(true);
    if (value === "sem_interesse") setShowLossReasonModal(true);
  };

  const salesReady = useMemo(
    () =>
      !!formData.produto_id &&
      !!formData.valor &&
      !!formData.plataforma &&
      !!formData.forma_pagamento,
    [formData.produto_id, formData.valor, formData.plataforma, formData.forma_pagamento]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.cliente_nome.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    if (!formData.attendance_status) {
      toast.error("Selecione o status de comparecimento");
      return;
    }
    if (!formData.resultado) {
      toast.error("Selecione o resultado da call");
      return;
    }
    if (formData.resultado === "reagendar" && !formData.reagendar_data) {
      toast.error("Selecione a data do reagendamento");
      return;
    }
    if (formData.resultado === "sem_interesse" && !formData.loss_reason) {
      toast.error("Informe o motivo da perda");
      return;
    }
    if (formData.resultado === "venda" && !salesReady) {
      toast.error("Complete os dados da venda");
      setShowSalesModal(true);
      return;
    }

    setLoading(true);
    try {
      // Prefixa cliente_nome no observacoes (coluna calls.cliente_nome não existe)
      const obsBase = formData.observacoes?.trim() || "";
      const obsPrefix = `Cliente: ${formData.cliente_nome.trim()}`;
      const lossInfo =
        formData.resultado === "sem_interesse"
          ? ` · Motivo: ${formData.loss_reason}`
          : "";
      const observacoes = [obsPrefix + lossInfo, obsBase].filter(Boolean).join("\n");

      const { data: callData, error: callError } = await supabase
        .from("calls")
        .insert({
          user_id: user.id,
          company_id: activeCompanyId,
          agendamento_id: formData.agendamento_id || null,
          resultado: formData.resultado as any,
          attendance_status: formData.attendance_status,
          observacoes,
        })
        .select("id")
        .single();

      if (callError) throw callError;
      if (!callData) throw new Error("Falha ao registrar call (sem retorno)");

      if (formData.agendamento_id) {
        const newStatus = formData.attendance_status === "show" ? "realizado" : "nao_compareceu";
        await supabase
          .from("agendamentos")
          .update({
            status: newStatus,
            attendance_status: formData.attendance_status,
          })
          .eq("id", formData.agendamento_id);
      }

      if (formData.resultado === "reagendar" && formData.reagendar_data) {
        const { error: agendamentoError } = await supabase.from("agendamentos").insert({
          user_id: user.id,
          company_id: activeCompanyId,
          cliente_nome: formData.cliente_nome.trim(),
          data_agendamento: formData.reagendar_data,
          status: "agendado",
          observacoes: `Reagendado da call anterior${obsBase ? `. ${obsBase}` : ""}`,
        });
        if (agendamentoError) throw agendamentoError;
        toast.success("Novo agendamento criado");
      }

      if (formData.resultado === "venda") {
        const hoje = new Date();
        const dataVendaFormatada = `${hoje.getFullYear()}-${String(
          hoje.getMonth() + 1
        ).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

        const { error: vendaError } = await supabase.from("vendas").insert({
          user_id: user.id,
          company_id: activeCompanyId,
          cliente_nome: formData.cliente_nome.trim(),
          produto_id: formData.produto_id || null,
          produto_nome: formData.produto_nome,
          valor: parseFloat(formData.valor),
          plataforma: formData.plataforma,
          forma_pagamento: formData.forma_pagamento as any,
          status: "Aprovado" as any,
          observacoes: obsBase || null,
          data_venda: dataVendaFormatada,
        });

        if (vendaError) throw vendaError;
        playSaleChime();
        toast.success("Venda registrada com sucesso");
      }

      if (formData.resultado === "sem_interesse") {
        await supabase
          .from("deals")
          .update({
            status: "lost",
            loss_reason: formData.loss_reason,
            updated_at: new Date().toISOString(),
          })
          .eq("cliente_nome", formData.cliente_nome.trim())
          .eq("user_id", user.id);
      }

      toast.success("Resultado registrado");
      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error("Erro ao registrar resultado:", error);
      toast.error(error?.message || "Erro ao registrar resultado");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      agendamento_id: "",
      cliente_nome: "",
      attendance_status: "",
      resultado: "",
      reagendar_data: "",
      loss_reason: "",
      produto_id: "",
      produto_nome: "",
      valor: "",
      plataforma: "",
      forma_pagamento: "",
      observacoes: "",
    });
    setValorFormatado("");
    setShowSalesModal(false);
    setShowLossReasonModal(false);
  };

  const resultadoOptions: Array<{
    value: Resultado;
    label: string;
    icon: React.ElementType;
    dot: string;
    activeRing: string;
    activeText: string;
  }> = [
    {
      value: "venda",
      label: "Venda fechada",
      icon: DollarSign,
      dot: "bg-emerald-500",
      activeRing: "ring-emerald-500/40 border-emerald-500/40",
      activeText: "text-emerald-400",
    },
    {
      value: "sem_interesse",
      label: "Sem interesse",
      icon: XCircle,
      dot: "bg-rose-500",
      activeRing: "ring-rose-500/40 border-rose-500/40",
      activeText: "text-rose-400",
    },
    {
      value: "reagendar",
      label: "Reagendar (follow-up)",
      icon: CalendarClock,
      dot: "bg-blue-500",
      activeRing: "ring-blue-500/40 border-blue-500/40",
      activeText: "text-blue-400",
    },
  ];

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Agendamento */}
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
            Agendamento existente
          </Label>
          <Select value={formData.agendamento_id} onValueChange={handleAgendamentoChange}>
            <SelectTrigger className="h-10 bg-background/40 border-border text-foreground">
              <SelectValue placeholder="Vincular a um agendamento (opcional)" />
            </SelectTrigger>
            <SelectContent>
              {agendamentos.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  Nenhum agendamento pendente
                </div>
              ) : (
                agendamentos.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.cliente_nome} · {new Date(a.data_agendamento).toLocaleString("pt-BR")}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Cliente */}
        <div className="space-y-1.5">
          <Label htmlFor="cliente_nome" className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
            Nome do cliente
          </Label>
          <Input
            id="cliente_nome"
            required
            value={formData.cliente_nome}
            onChange={(e) => setFormData({ ...formData, cliente_nome: e.target.value })}
            placeholder="Nome completo"
            className="h-10 bg-background/40 border-border text-foreground placeholder:text-muted-foreground/60"
          />
        </div>

        {/* Comparecimento */}
        <div className="space-y-2">
          <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
            Comparecimento
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: "show" as const, Icon: UserCheck, label: "Compareceu", ring: "ring-emerald-500/40 border-emerald-500/40", accent: "text-emerald-400" },
              { v: "no_show" as const, Icon: UserX, label: "Não compareceu", ring: "ring-rose-500/40 border-rose-500/40", accent: "text-rose-400" },
            ].map(({ v, Icon, label, ring, accent }) => {
              const active = formData.attendance_status === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFormData({ ...formData, attendance_status: v })}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 transition-all text-sm font-medium
                    ${active
                      ? `ring-1 ${ring} bg-card text-foreground`
                      : "border-border bg-card/40 text-muted-foreground hover:text-foreground hover:border-border/80"
                    }`}
                >
                  <Icon className={`h-4 w-4 ${active ? accent : ""}`} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Resultado */}
        <div className="space-y-2">
          <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
            Resultado
          </Label>
          <div className="space-y-1.5">
            {resultadoOptions.map(({ value, label, icon: Icon, dot, activeRing, activeText }) => {
              const active = formData.resultado === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleResultadoChange(value)}
                  className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all text-left
                    ${active
                      ? `ring-1 ${activeRing} bg-card`
                      : "border-border bg-card/40 hover:border-border/80 hover:bg-card/60"
                    }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                  <Icon className={`h-4 w-4 ${active ? activeText : "text-muted-foreground"}`} />
                  <span className={`text-sm flex-1 ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                  {active && (
                    <CheckCircle2 className={`h-4 w-4 ${activeText}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Resumo venda (quando já preenchido) */}
        {formData.resultado === "venda" && salesReady && (
          <button
            type="button"
            onClick={() => setShowSalesModal(true)}
            className="w-full flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 hover:bg-emerald-500/10 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <div className="text-left min-w-0">
                <p className="text-[11px] text-emerald-400 font-semibold uppercase tracking-widest">Venda pronta</p>
                <p className="text-sm text-foreground truncate">
                  {formData.produto_nome} · {valorFormatado}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          </button>
        )}

        {/* Motivo da perda (quando já preenchido) */}
        {formData.resultado === "sem_interesse" && formData.loss_reason && (
          <button
            type="button"
            onClick={() => setShowLossReasonModal(true)}
            className="w-full flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 px-3 py-2.5 hover:bg-rose-500/10 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
              <div className="text-left min-w-0">
                <p className="text-[11px] text-rose-400 font-semibold uppercase tracking-widest">Motivo da perda</p>
                <p className="text-sm text-foreground truncate">
                  {LOSS_REASONS.find((l) => l.value === formData.loss_reason)?.label || formData.loss_reason}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-rose-400 flex-shrink-0" />
          </button>
        )}

        {/* Data do reagendamento */}
        {formData.resultado === "reagendar" && (
          <div className="space-y-1.5 p-3 rounded-xl border border-blue-500/30 bg-blue-500/5">
            <Label
              htmlFor="reagendar_data"
              className="flex items-center gap-1.5 text-[11px] font-medium text-blue-400 uppercase tracking-widest"
            >
              <CalendarClock className="h-3 w-3" />
              Nova data/hora
            </Label>
            <Input
              id="reagendar_data"
              type="datetime-local"
              required
              value={formData.reagendar_data}
              onChange={(e) => setFormData({ ...formData, reagendar_data: e.target.value })}
              className="h-10 bg-background/40 border-blue-500/20 text-foreground focus-visible:ring-blue-500/40"
            />
          </div>
        )}

        {/* Observações */}
        <div className="space-y-1.5">
          <Label htmlFor="obs" className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
            Observações
          </Label>
          <Textarea
            id="obs"
            value={formData.observacoes}
            onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
            placeholder="Contexto relevante da call, próximos passos..."
            rows={3}
            className="bg-background/40 border-border text-foreground placeholder:text-muted-foreground/60 resize-none"
          />
        </div>

        <Button
          type="submit"
          className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold gap-2"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Registrando...
            </>
          ) : (
            <>
              Registrar resultado
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      {/* Sales Modal */}
      <Dialog open={showSalesModal} onOpenChange={setShowSalesModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-[480px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground text-base">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/25 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-emerald-400" />
              </div>
              Registrar venda
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {formData.cliente_nome ? (
                <>
                  Venda para <span className="text-foreground font-medium">{formData.cliente_nome}</span>
                </>
              ) : (
                "Complete os dados da venda"
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
                <Package className="h-3 w-3" />
                Produto
              </Label>
              <Select
                value={formData.produto_id}
                onValueChange={(value) => {
                  const produto = produtos.find((p) => p.id === value);
                  setFormData({
                    ...formData,
                    produto_id: value,
                    produto_nome: produto?.nome || "",
                  });
                }}
              >
                <SelectTrigger className="h-10 bg-background/40 border-border text-foreground">
                  <SelectValue placeholder="Selecionar produto..." />
                </SelectTrigger>
                <SelectContent>
                  {produtos.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      Cadastre produtos em /configuracoes
                    </div>
                  ) : (
                    produtos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="valor_modal" className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
                  <DollarSign className="h-3 w-3" />
                  Valor
                </Label>
                <Input
                  id="valor_modal"
                  type="text"
                  inputMode="numeric"
                  value={valorFormatado}
                  onChange={(e) => formatarMoeda(e.target.value)}
                  placeholder="R$ 0,00"
                  className="h-10 bg-background/40 border-border text-foreground tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
                  <CreditCard className="h-3 w-3" />
                  Pagamento
                </Label>
                <Select
                  value={formData.forma_pagamento}
                  onValueChange={(value) => setFormData({ ...formData, forma_pagamento: value })}
                >
                  <SelectTrigger className="h-10 bg-background/40 border-border text-foreground">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plataforma_modal" className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
                <Globe className="h-3 w-3" />
                Plataforma / canal
              </Label>
              <Input
                id="plataforma_modal"
                value={formData.plataforma}
                onChange={(e) => setFormData({ ...formData, plataforma: e.target.value })}
                placeholder="Ex: WhatsApp, Instagram, Indicação..."
                className="h-10 bg-background/40 border-border text-foreground placeholder:text-muted-foreground/60"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setShowSalesModal(false);
                setFormData({ ...formData, resultado: "" });
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <Button
              onClick={() => setShowSalesModal(false)}
              disabled={!salesReady}
              className="h-9 bg-emerald-500 hover:bg-emerald-400 text-white font-medium gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirmar venda
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loss Reason Modal */}
      <Dialog open={showLossReasonModal} onOpenChange={setShowLossReasonModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-[420px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground text-base">
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 ring-1 ring-rose-500/25 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
              </div>
              Motivo da perda
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {formData.cliente_nome ? (
                <>
                  Por que <span className="text-foreground font-medium">{formData.cliente_nome}</span> não fechou?
                </>
              ) : (
                "Classifique o motivo para alimentar suas análises"
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              {LOSS_REASONS.map((reason) => {
                const active = formData.loss_reason === reason.value;
                return (
                  <button
                    key={reason.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, loss_reason: reason.value })}
                    className={`px-3 py-2.5 rounded-lg border text-sm text-left transition-all
                      ${active
                        ? "ring-1 ring-rose-500/40 border-rose-500/40 bg-rose-500/5 text-foreground"
                        : "border-border bg-card/40 text-muted-foreground hover:text-foreground hover:border-border/80"
                      }`}
                  >
                    {reason.label}
                  </button>
                );
              })}
            </div>

            {formData.loss_reason === "outro" && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
                  Descreva o motivo
                </Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Contexto específico..."
                  rows={2}
                  className="bg-background/40 border-border text-foreground resize-none"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setShowLossReasonModal(false);
                setFormData({ ...formData, resultado: "", loss_reason: "" });
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <Button
              onClick={() => setShowLossReasonModal(false)}
              disabled={!formData.loss_reason}
              className="h-9 bg-rose-500 hover:bg-rose-400 text-white font-medium"
            >
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
