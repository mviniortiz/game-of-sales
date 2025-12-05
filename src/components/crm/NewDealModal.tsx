import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Target, User, DollarSign, Phone, Mail, Calendar, Percent } from "lucide-react";
import type { Stage } from "@/pages/CRM";

const dealSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  value: z.string().min(1, "Valor é obrigatório"),
  customer_name: z.string().min(1, "Nome do cliente é obrigatório"),
  customer_email: z.string().email("Email inválido").optional().or(z.literal("")),
  customer_phone: z.string().optional(),
  stage: z.string().min(1, "Estágio é obrigatório"),
  product_id: z.string().optional(),
  notes: z.string().optional(),
  expected_close_date: z.string().optional(),
  probability: z.number().min(0).max(100),
});

type DealFormData = z.infer<typeof dealSchema>;

interface NewDealModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  stages: Stage[];
}

export const NewDealModal = ({ open, onClose, onSuccess, stages }: NewDealModalProps) => {
  const { user } = useAuth();
  const [valorFormatado, setValorFormatado] = useState("");

  const form = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      title: "",
      value: "",
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      stage: "lead",
      product_id: "",
      notes: "",
      expected_close_date: "",
      probability: 50,
    },
  });

  // Fetch products
  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos-ativos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("produtos")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      return data || [];
    },
  });

  // Create deal mutation
  const createDealMutation = useMutation({
    mutationFn: async (data: DealFormData) => {
      if (!user) throw new Error("Usuário não autenticado");

      // Parse value from formatted string
      const numericValue = parseFloat(
        data.value.replace(/[^\d,]/g, "").replace(",", ".")
      );

      // Get max position for the stage
      const { data: existingDeals } = await supabase
        .from("deals")
        .select("position")
        .eq("stage", data.stage as any)
        .order("position", { ascending: false })
        .limit(1);

      const nextPosition = existingDeals?.[0]?.position 
        ? existingDeals[0].position + 1 
        : 0;

      // Insert new deal
      const { error } = await supabase.from("deals").insert({
        title: data.title,
        value: numericValue,
        customer_name: data.customer_name,
        customer_email: data.customer_email || null,
        customer_phone: data.customer_phone || null,
        stage: data.stage as any,
        product_id: data.product_id || null,
        notes: data.notes || null,
        expected_close_date: data.expected_close_date || null,
        probability: data.probability,
        position: nextPosition,
        user_id: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deal criado com sucesso!");
      form.reset();
      setValorFormatado("");
      onSuccess();
    },
    onError: (error) => {
      console.error("Error creating deal:", error);
      toast.error("Erro ao criar deal");
    },
  });

  // Format currency input
  const formatarMoeda = (valor: string) => {
    const apenasNumeros = valor.replace(/\D/g, "");
    const numero = parseInt(apenasNumeros || "0", 10) / 100;
    return numero.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatarMoeda(e.target.value);
    setValorFormatado(formatted);
    form.setValue("value", formatted);
  };

  const onSubmit = (data: DealFormData) => {
    createDealMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] bg-card border border-border shadow-lg">
        <DialogHeader className="pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-indigo-100 dark:ring-indigo-500/20">
              <Target className="h-5 w-5 text-indigo-600 dark:text-indigo-200" />
            </div>
            <div>
              <span className="text-lg font-semibold">Novo Deal</span>
              <p className="text-[12px] text-muted-foreground font-normal mt-0.5">Adicione uma nova oportunidade ao pipeline</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground text-[13px] font-medium">Título do Deal</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ex: Implementação CRM"
                      className="h-10 bg-white dark:bg-secondary border-gray-300 dark:border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 placeholder:text-muted-foreground"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Value + Stage Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground text-[13px] font-medium flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
                      Valor
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={valorFormatado}
                        onChange={handleValorChange}
                        placeholder="R$ 0,00"
                        className="h-10 bg-white dark:bg-secondary border-gray-300 dark:border-border focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold placeholder:text-muted-foreground"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground text-[13px] font-medium">Estágio</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || stages[0]?.id}>
                      <FormControl>
                        <SelectTrigger className="h-10 bg-white dark:bg-secondary border-gray-300 dark:border-border">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card border border-border shadow-sm">
                        {stages.map((stage) => {
                          const Icon = stage.icon;
                          return (
                            <SelectItem key={stage.id} value={stage.id}>
                              <div className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${stage.color}`} />
                                {stage.title}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Customer Name */}
            <FormField
              control={form.control}
              name="customer_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground text-[13px] font-medium flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    Nome do Cliente
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Nome completo"
                      className="h-10 bg-white dark:bg-secondary border-gray-300 dark:border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 placeholder:text-muted-foreground"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email + Phone Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customer_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground text-[13px] font-medium flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="email@exemplo.com"
                        className="h-10 bg-white dark:bg-secondary border-gray-300 dark:border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 placeholder:text-muted-foreground"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground text-[13px] font-medium flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      Telefone
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="(00) 00000-0000"
                        className="h-10 bg-white dark:bg-secondary border-gray-300 dark:border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 placeholder:text-muted-foreground"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Product + Expected Close Date Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="product_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground text-[13px] font-medium">Produto</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10 bg-white dark:bg-secondary border-gray-300 dark:border-border">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card border border-border shadow-sm">
                        {produtos.map((produto: any) => (
                          <SelectItem key={produto.id} value={produto.id}>
                            {produto.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expected_close_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground text-[13px] font-medium flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      Previsão
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        className="h-10 bg-white dark:bg-secondary border-gray-300 dark:border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Probability Slider */}
            <FormField
              control={form.control}
              name="probability"
              render={({ field }) => (
                <FormItem className="bg-muted rounded-xl p-4 border border-border">
                  <FormLabel className="text-foreground text-[13px] font-medium flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                      Probabilidade de Fechamento
                    </span>
                    <span className={`text-lg font-bold tabular-nums ${
                      field.value >= 70 
                        ? "text-emerald-600 dark:text-emerald-300" 
                        : field.value >= 40 
                          ? "text-amber-600 dark:text-amber-300" 
                          : "text-muted-foreground"
                    }`}>
                      {field.value}%
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Slider
                      value={[field.value]}
                      onValueChange={(values) => field.onChange(values[0])}
                      max={100}
                      step={5}
                      className="py-4 [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:bg-indigo-500 [&_[role=slider]]:border-0 [&_[role=slider]]:shadow-lg [&_[role=slider]]:shadow-indigo-500/30"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground text-[13px] font-medium">Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Informações adicionais sobre o deal..."
                      className="min-h-[80px] bg-white dark:bg-secondary border-gray-300 dark:border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 resize-none placeholder:text-muted-foreground"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-border hover:bg-muted text-foreground"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createDealMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
              >
                {createDealMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Deal"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

