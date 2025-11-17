import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Phone, DollarSign, XCircle, CalendarClock } from "lucide-react";
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
  const [formData, setFormData] = useState({
    agendamento_id: "",
    cliente_nome: "",
    duracao_minutos: "",
    resultado: "",
    produto_id: "",
    produto_nome: "",
    valor: "",
    plataforma: "",
    forma_pagamento: "",
    observacoes: "",
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Inserir call
      const { error: callError } = await supabase.from("calls").insert({
        user_id: user.id,
        agendamento_id: formData.agendamento_id || null,
        duracao_minutos: parseInt(formData.duracao_minutos),
        resultado: formData.resultado as any,
        observacoes: formData.observacoes || null,
      });

      if (callError) throw callError;

      // Atualizar agendamento se houver
      if (formData.agendamento_id) {
        await supabase
          .from("agendamentos")
          .update({ status: "realizado" })
          .eq("id", formData.agendamento_id);
      }

      // Inserir venda se resultado for "venda"
      if (formData.resultado === "venda") {
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
        });

        if (vendaError) throw vendaError;
      }

      toast.success("Call registrada com sucesso!");
      setFormData({
        agendamento_id: "",
        cliente_nome: "",
        duracao_minutos: "",
        resultado: "",
        produto_id: "",
        produto_nome: "",
        valor: "",
        plataforma: "",
        forma_pagamento: "",
        observacoes: "",
      });
      onSuccess();
    } catch (error) {
      console.error("Erro ao registrar call:", error);
      toast.error("Erro ao registrar call");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          Registrar Call
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Agendamento</Label>
            <Select
              value={formData.agendamento_id}
              onValueChange={handleAgendamentoChange}
            >
              <SelectTrigger>
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

          <div className="text-center text-sm text-muted-foreground">ou</div>

          <div className="space-y-2">
            <Label htmlFor="cliente_nome">Nome do Cliente *</Label>
            <Input
              id="cliente_nome"
              required
              value={formData.cliente_nome}
              onChange={(e) =>
                setFormData({ ...formData, cliente_nome: e.target.value })
              }
              placeholder="Nome completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duracao">Duração (minutos) *</Label>
            <Input
              id="duracao"
              type="number"
              required
              value={formData.duracao_minutos}
              onChange={(e) =>
                setFormData({ ...formData, duracao_minutos: e.target.value })
              }
              placeholder="30"
            />
          </div>

          <div className="space-y-2">
            <Label>Resultado *</Label>
            <RadioGroup
              value={formData.resultado}
              onValueChange={(value) =>
                setFormData({ ...formData, resultado: value })
              }
              required
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="venda" id="venda" />
                <Label htmlFor="venda" className="cursor-pointer flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  Venda Fechada
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sem_interesse" id="sem_interesse" />
                <Label htmlFor="sem_interesse" className="cursor-pointer flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  Sem Interesse
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="reagendar" id="reagendar" />
                <Label htmlFor="reagendar" className="cursor-pointer flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-blue-500" />
                  Reagendar
                </Label>
              </div>
            </RadioGroup>
          </div>

          {formData.resultado === "venda" && (
            <>
              <div className="space-y-2">
                <Label>Produto *</Label>
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
                  required
                >
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label htmlFor="valor">Valor (R$) *</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  required
                  value={formData.valor}
                  onChange={(e) =>
                    setFormData({ ...formData, valor: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plataforma">Plataforma *</Label>
                <Input
                  id="plataforma"
                  required
                  value={formData.plataforma}
                  onChange={(e) =>
                    setFormData({ ...formData, plataforma: e.target.value })
                  }
                  placeholder="Ex: WhatsApp, Instagram..."
                />
              </div>

              <div className="space-y-2">
                <Label>Forma de Pagamento *</Label>
                <Select
                  value={formData.forma_pagamento}
                  onValueChange={(value) =>
                    setFormData({ ...formData, forma_pagamento: value })
                  }
                  required
                >
                  <SelectTrigger>
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
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="obs">Observações</Label>
            <Textarea
              id="obs"
              value={formData.observacoes}
              onChange={(e) =>
                setFormData({ ...formData, observacoes: e.target.value })
              }
              placeholder="Informações adicionais..."
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Registrando..." : "Registrar Call"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
