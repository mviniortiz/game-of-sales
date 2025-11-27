import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Phone, 
  DollarSign, 
  XCircle, 
  CalendarClock, 
  UserCheck, 
  UserX,
  CheckCircle,
  AlertTriangle,
  ClipboardList
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CallFormProps {
  onSuccess: () => void;
}

export const CallForm = ({ onSuccess }: CallFormProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [showLossReasonModal, setShowLossReasonModal] = useState(false);
  const [valorFormatado, setValorFormatado] = useState(""); // Valor formatado para exibição
  const [formData, setFormData] = useState({
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

  // Função para formatar valor como moeda brasileira
  const formatarMoeda = (value: string) => {
    // Remove tudo que não é número
    const numero = value.replace(/\D/g, "");
    
    if (!numero) {
      setFormData({ ...formData, valor: "" });
      setValorFormatado("");
      return;
    }
    
    // Converte para número com centavos
    const valorNumerico = parseFloat(numero) / 100;
    setFormData({ ...formData, valor: valorNumerico.toString() });
    
    // Formata como moeda brasileira
    const valorFormatadoBR = valorNumerico.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    
    setValorFormatado(valorFormatadoBR);
  };

  useEffect(() => {
    loadAgendamentos();
    loadProdutos();
  }, [user]);

  const loadAgendamentos = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "agendado")
      .order("data_agendamento", { ascending: true });
    if (data) setAgendamentos(data);
  };

  const loadProdutos = async () => {
    const { data } = await supabase
      .from("produtos")
      .select("*")
      .eq("ativo", true);
    if (data) setProdutos(data);
  };

  const handleAgendamentoChange = (agendamentoId: string) => {
    const agendamento = agendamentos.find((a) => a.id === agendamentoId);
    setFormData({
      ...formData,
      agendamento_id: agendamentoId,
      cliente_nome: agendamento?.cliente_nome || "",
    });
  };

  const handleResultadoChange = (value: string) => {
    setFormData({ ...formData, resultado: value, loss_reason: "" });
    
    // If "Venda Fechada" is selected, open the sales modal
    if (value === "venda") {
      setShowSalesModal(true);
    }
    
    // If "Sem Interesse" is selected, open the loss reason modal
    if (value === "sem_interesse") {
      setShowLossReasonModal(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate attendance status
    if (!formData.attendance_status) {
      toast.error("Selecione o status de comparecimento");
      return;
    }

    // Validate resultado
    if (!formData.resultado) {
      toast.error("Selecione o resultado da call");
      return;
    }

    // Validate reagendar_data if resultado is "reagendar"
    if (formData.resultado === "reagendar" && !formData.reagendar_data) {
      toast.error("Selecione a data do reagendamento");
      return;
    }

    // Validate loss_reason if resultado is "sem_interesse"
    if (formData.resultado === "sem_interesse" && !formData.loss_reason) {
      toast.error("Informe o motivo da perda");
      return;
    }

    // Validate sales data if resultado is "venda"
    if (formData.resultado === "venda") {
      if (!formData.produto_id || !formData.valor || !formData.plataforma || !formData.forma_pagamento) {
        toast.error("Complete os dados da venda");
        setShowSalesModal(true);
        return;
      }
    }

    setLoading(true);
    try {
      // Inserir call com attendance_status
      const { error: callError } = await supabase.from("calls").insert({
        user_id: user.id,
        agendamento_id: formData.agendamento_id || null,
        resultado: formData.resultado as any,
        attendance_status: formData.attendance_status,
        observacoes: formData.resultado === "sem_interesse" 
          ? `Motivo da perda: ${formData.loss_reason}. ${formData.observacoes || ""}`
          : formData.observacoes || null,
      });

      if (callError) throw callError;

      // Atualizar agendamento se houver
      if (formData.agendamento_id) {
        const newStatus = formData.attendance_status === "show" ? "realizado" : "nao_compareceu";
        await supabase
          .from("agendamentos")
          .update({ 
            status: newStatus,
            attendance_status: formData.attendance_status 
          })
          .eq("id", formData.agendamento_id);
      }

      // Criar novo agendamento se resultado for "reagendar"
      if (formData.resultado === "reagendar" && formData.reagendar_data) {
        const { error: agendamentoError } = await supabase.from("agendamentos").insert({
          user_id: user.id,
          cliente_nome: formData.cliente_nome,
          data_agendamento: formData.reagendar_data,
          status: "agendado",
          observacoes: `Reagendado da call anterior. ${formData.observacoes || ""}`,
        });

        if (agendamentoError) throw agendamentoError;
        toast.success("Novo agendamento criado!");
      }

      // Inserir venda se resultado for "venda"
      if (formData.resultado === "venda") {
        // IMPORTANTE: Definir data_venda explicitamente para evitar problemas de timezone
        const hoje = new Date();
        const dataVendaFormatada = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
        
        const { error: vendaError } = await supabase.from("vendas").insert({
          user_id: user.id,
          cliente_nome: formData.cliente_nome,
          produto_id: formData.produto_id || null,
          produto_nome: formData.produto_nome,
          valor: parseFloat(formData.valor),
          plataforma: formData.plataforma,
          forma_pagamento: formData.forma_pagamento as any,
          status: "Aprovado" as any,
          observacoes: formData.observacoes || null,
          data_venda: dataVendaFormatada, // Data explícita no fuso horário local
        });

        if (vendaError) throw vendaError;
        toast.success("Venda registrada com sucesso! 🎉");
      }

      // Update deal status if "sem_interesse"
      if (formData.resultado === "sem_interesse") {
        // Try to update any linked deal to 'lost'
        await supabase
          .from("deals")
          .update({ 
            status: "lost",
            loss_reason: formData.loss_reason,
            updated_at: new Date().toISOString()
          })
          .eq("cliente_nome", formData.cliente_nome)
          .eq("user_id", user.id);
      }

      toast.success("Resultado registrado com sucesso!");
      resetForm();
      onSuccess();
    } catch (error) {
      console.error("Erro ao registrar resultado:", error);
      toast.error("Erro ao registrar resultado");
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

  return (
    <>
      <Card className="border-white/5 bg-slate-900/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-indigo-400" />
            Resultado da Call
          </CardTitle>
          <p className="text-xs text-slate-500">Registrar resultado de uma call</p>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Agendamento Select */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Agendamento</Label>
              <Select
                value={formData.agendamento_id}
                onValueChange={handleAgendamentoChange}
              >
                <SelectTrigger className="h-10 bg-slate-800/50 border-white/10 text-white focus:ring-indigo-500">
                  <SelectValue placeholder="Selecionar agendamento..." />
                </SelectTrigger>
                <SelectContent>
                  {agendamentos.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.cliente_nome} - {new Date(a.data_agendamento).toLocaleString("pt-BR")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-center text-xs text-slate-500">ou</div>

            {/* Client Name */}
            <div className="space-y-1.5">
              <Label htmlFor="cliente_nome" className="text-xs text-slate-400">Nome do Cliente *</Label>
              <Input
                id="cliente_nome"
                required
                value={formData.cliente_nome}
                onChange={(e) =>
                  setFormData({ ...formData, cliente_nome: e.target.value })
                }
                placeholder="Nome completo"
                className="h-10 bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500 focus:ring-indigo-500"
              />
            </div>

            {/* Attendance Status - Compact */}
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Status de Comparecimento *</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, attendance_status: "show" })}
                  className={`p-3 rounded-lg border transition-all flex items-center justify-center gap-2 ${
                    formData.attendance_status === "show"
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-white/10 bg-slate-800/30 hover:border-white/20"
                  }`}
                >
                  <UserCheck className={`h-4 w-4 ${
                    formData.attendance_status === "show" 
                      ? "text-emerald-400" 
                      : "text-slate-400"
                  }`} />
                  <span className={`text-sm font-medium ${
                    formData.attendance_status === "show" 
                      ? "text-emerald-400" 
                      : "text-slate-400"
                  }`}>
                    Compareceu
                  </span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, attendance_status: "no_show" })}
                  className={`p-3 rounded-lg border transition-all flex items-center justify-center gap-2 ${
                    formData.attendance_status === "no_show"
                      ? "border-red-500 bg-red-500/10"
                      : "border-white/10 bg-slate-800/30 hover:border-white/20"
                  }`}
                >
                  <UserX className={`h-4 w-4 ${
                    formData.attendance_status === "no_show" 
                      ? "text-red-400" 
                      : "text-slate-400"
                  }`} />
                  <span className={`text-sm font-medium ${
                    formData.attendance_status === "no_show" 
                      ? "text-red-400" 
                      : "text-slate-400"
                  }`}>
                    Não Compareceu
                  </span>
                </button>
              </div>
            </div>

            {/* Resultado - Compact */}
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Resultado *</Label>
              <RadioGroup
                value={formData.resultado}
                onValueChange={handleResultadoChange}
                className="space-y-1.5"
              >
                <div className={`flex items-center space-x-2 p-2.5 rounded-lg border transition-all ${
                  formData.resultado === "venda" 
                    ? "border-emerald-500/50 bg-emerald-500/10" 
                    : "border-white/10 bg-slate-800/30"
                }`}>
                  <RadioGroupItem value="venda" id="venda" className="border-emerald-500" />
                  <Label htmlFor="venda" className="cursor-pointer flex items-center gap-2 flex-1 text-sm">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-white">Venda Fechada</span>
                  </Label>
                </div>
                
                <div className={`flex items-center space-x-2 p-2.5 rounded-lg border transition-all ${
                  formData.resultado === "sem_interesse" 
                    ? "border-red-500/50 bg-red-500/10" 
                    : "border-white/10 bg-slate-800/30"
                }`}>
                  <RadioGroupItem value="sem_interesse" id="sem_interesse" className="border-red-500" />
                  <Label htmlFor="sem_interesse" className="cursor-pointer flex items-center gap-2 flex-1 text-sm">
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-white">Sem Interesse</span>
                  </Label>
                </div>
                
                <div className={`flex items-center space-x-2 p-2.5 rounded-lg border transition-all ${
                  formData.resultado === "reagendar" 
                    ? "border-blue-500/50 bg-blue-500/10" 
                    : "border-white/10 bg-slate-800/30"
                }`}>
                  <RadioGroupItem value="reagendar" id="reagendar" className="border-blue-500" />
                  <Label htmlFor="reagendar" className="cursor-pointer flex items-center gap-2 flex-1 text-sm">
                    <CalendarClock className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-white">Reagendar</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Reschedule date field */}
            {formData.resultado === "reagendar" && (
              <div className="space-y-1.5 p-3 border border-blue-500/30 rounded-lg bg-blue-500/5">
                <Label htmlFor="reagendar_data" className="flex items-center gap-2 text-xs text-blue-400">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Nova Data/Hora *
                </Label>
                <Input
                  id="reagendar_data"
                  type="datetime-local"
                  required
                  value={formData.reagendar_data}
                  onChange={(e) =>
                    setFormData({ ...formData, reagendar_data: e.target.value })
                  }
                  className="h-10 bg-slate-800/50 border-blue-500/30 text-white focus:ring-blue-500"
                />
              </div>
            )}

            {/* Observations */}
            <div className="space-y-1.5">
              <Label htmlFor="obs" className="text-xs text-slate-400">Observações</Label>
              <Textarea
                id="obs"
                value={formData.observacoes}
                onChange={(e) =>
                  setFormData({ ...formData, observacoes: e.target.value })
                }
                placeholder="Informações adicionais..."
                rows={2}
                className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500 resize-none focus:ring-indigo-500"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-10 bg-primary hover:bg-primary/90 text-white font-medium"
              disabled={loading}
            >
              {loading ? "Registrando..." : "Registrar Resultado"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sales Modal */}
      <Dialog open={showSalesModal} onOpenChange={setShowSalesModal}>
        <DialogContent className="sm:max-w-[450px] bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-base">
              <div className="p-1.5 rounded-lg bg-emerald-500/20">
                <DollarSign className="h-4 w-4 text-emerald-400" />
              </div>
              Registrar Venda
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              Complete os dados da venda para <span className="text-white font-medium">{formData.cliente_nome}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Produto *</Label>
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
                <SelectTrigger className="h-10 bg-slate-800/50 border-white/10 text-white focus:ring-indigo-500">
                  <SelectValue placeholder="Selecionar produto..." />
                </SelectTrigger>
                <SelectContent>
                  {produtos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="valor_modal" className="text-xs text-slate-400">Valor (R$) *</Label>
              <Input
                id="valor_modal"
                type="text"
                inputMode="numeric"
                value={valorFormatado}
                onChange={(e) => formatarMoeda(e.target.value)}
                placeholder="R$ 0,00"
                className="h-10 bg-slate-800/50 border-white/10 text-white focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plataforma_modal" className="text-xs text-slate-400">Plataforma *</Label>
              <Input
                id="plataforma_modal"
                value={formData.plataforma}
                onChange={(e) =>
                  setFormData({ ...formData, plataforma: e.target.value })
                }
                placeholder="Ex: WhatsApp, Instagram..."
                className="h-10 bg-slate-800/50 border-white/10 text-white focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Forma de Pagamento *</Label>
              <Select
                value={formData.forma_pagamento}
                onValueChange={(value) =>
                  setFormData({ ...formData, forma_pagamento: value })
                }
              >
                <SelectTrigger className="h-10 bg-slate-800/50 border-white/10 text-white focus:ring-indigo-500">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pix">Pix</SelectItem>
                  <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowSalesModal(false);
                setFormData({ ...formData, resultado: "" });
              }}
              className="h-9 border-white/10 text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => setShowSalesModal(false)}
              disabled={!formData.produto_id || !formData.valor || !formData.plataforma || !formData.forma_pagamento}
              className="h-9 bg-emerald-600 hover:bg-emerald-500"
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loss Reason Modal */}
      <Dialog open={showLossReasonModal} onOpenChange={setShowLossReasonModal}>
        <DialogContent className="sm:max-w-[400px] bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-base">
              <div className="p-1.5 rounded-lg bg-red-500/20">
                <AlertTriangle className="h-4 w-4 text-red-400" />
              </div>
              Motivo da Perda
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              Informe o motivo pelo qual <span className="text-white font-medium">{formData.cliente_nome}</span> não fechou
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Motivo *</Label>
              <Select
                value={formData.loss_reason}
                onValueChange={(value) => setFormData({ ...formData, loss_reason: value })}
              >
                <SelectTrigger className="h-10 bg-slate-800/50 border-white/10 text-white focus:ring-indigo-500">
                  <SelectValue placeholder="Selecionar motivo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preco">Preço muito alto</SelectItem>
                  <SelectItem value="concorrencia">Fechou com concorrente</SelectItem>
                  <SelectItem value="timing">Momento inadequado</SelectItem>
                  <SelectItem value="necessidade">Não viu necessidade</SelectItem>
                  <SelectItem value="decisor">Não é o decisor</SelectItem>
                  <SelectItem value="orcamento">Sem orçamento</SelectItem>
                  <SelectItem value="outro">Outro motivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.loss_reason === "outro" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Descreva o motivo</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Descreva o motivo..."
                  rows={2}
                  className="bg-slate-800/50 border-white/10 text-white resize-none focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowLossReasonModal(false);
                setFormData({ ...formData, resultado: "", loss_reason: "" });
              }}
              className="h-9 border-white/10 text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => setShowLossReasonModal(false)}
              disabled={!formData.loss_reason}
              className="h-9 bg-red-600 hover:bg-red-500"
            >
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
