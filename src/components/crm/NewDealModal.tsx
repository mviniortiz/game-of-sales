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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Target, User, DollarSign, Phone, Mail,
  Calendar, Flame, CheckCircle2, ChevronDown
} from "lucide-react";
import type { Stage } from "@/pages/CRM";

// Stage → probability
const STAGE_PROB: Record<string, number> = {
  lead: 10,
  qualification: 25,
  qualificacao: 25,
  proposal: 55,
  proposta: 55,
  negotiation: 80,
  negociacao: 80,
  closed_won: 100,
  fechado: 100,
};

const schema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  value: z.string().min(1, "Valor é obrigatório"),
  customer_name: z.string().min(1, "Nome do cliente é obrigatório"),
  customer_email: z.string().email("Email inválido").optional().or(z.literal("")),
  customer_phone: z.string().optional(),
  stage: z.string().min(1, "Estágio é obrigatório"),
  product_id: z.string().optional(),
  notes: z.string().optional(),
  expected_close_date: z.string().optional(),
  is_hot: z.boolean().default(false),
});

type FormData = z.infer<typeof schema>;

interface NewDealModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  stages: Stage[];
}

// Format BRL as user types
const formatBRL = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const parseBRL = (formatted: string) =>
  parseFloat(formatted.replace(/[^\d,]/g, "").replace(",", ".")) || 0;

export const NewDealModal = ({ open, onClose, onSuccess, stages }: NewDealModalProps) => {
  const { user, companyId } = useAuth();
  const [displayValue, setDisplayValue] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      value: "",
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      stage: stages[0]?.id || "lead",
      product_id: "",
      notes: "",
      expected_close_date: "",
      is_hot: false,
    },
  });

  const watchedStage = form.watch("stage");
  const watchedHot = form.watch("is_hot");
  const probability = STAGE_PROB[watchedStage] ?? 10;

  const probColor =
    probability >= 70 ? { bar: "bg-emerald-500", text: "text-emerald-400" } :
      probability >= 30 ? { bar: "bg-amber-500", text: "text-amber-400" } :
        { bar: "bg-slate-500", text: "text-slate-400" };

  const selectedStage = stages.find(s => s.id === watchedStage);

  // Products
  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos-ativos", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("produtos").select("id, nome")
        .eq("ativo", true).eq("company_id", companyId).order("nome");
      return data || [];
    },
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!user) throw new Error("Não autenticado");
      const numValue = parseBRL(data.value);

      const { data: existing } = await supabase
        .from("deals").select("position")
        .eq("stage", data.stage as any)
        .order("position", { ascending: false }).limit(1);

      const nextPos = existing?.[0]?.position != null ? existing[0].position + 1 : 0;

      const { error } = await supabase.from("deals").insert({
        title: data.title,
        value: numValue,
        customer_name: data.customer_name,
        customer_email: data.customer_email || null,
        customer_phone: data.customer_phone || null,
        stage: data.stage as any,
        product_id: data.product_id || null,
        notes: data.notes || null,
        expected_close_date: data.expected_close_date || null,
        probability,
        is_hot: data.is_hot,
        position: nextPos,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        toast.success("Negociação criada!");
        form.reset();
        setDisplayValue("");
        onSuccess();
      }, 700);
    },
    onError: () => toast.error("Erro ao criar negociação"),
  });

  const onSubmit = (data: FormData) => createMutation.mutate(data);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = formatBRL(e.target.value);
    setDisplayValue(f);
    form.setValue("value", f, { shouldValidate: true });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { form.reset(); setDisplayValue(""); onClose(); } }}>
      <DialogContent className="sm:max-w-[520px] max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-700/80 shadow-2xl p-0">

        {/* ── Header ─────────────────────────────────────── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-700/60 sticky top-0 bg-slate-900 z-10">
          <DialogTitle className="flex items-center gap-3 text-white">
            <div className="p-2 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <Target className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[17px] font-bold">Nova Negociação</p>
              <p className="text-[12px] text-slate-500 font-normal mt-0.5">
                Adicione uma nova oportunidade ao pipeline
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-5 space-y-5">

            {/* ── Title ──────────────────────────────────── */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300 text-[13px] font-medium">
                    Título da Negociação
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoFocus
                      placeholder="Ex: Implementação CRM"
                      className="h-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500
                        focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Value + Stage ─────────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
              {/* Value */}
              <FormField
                control={form.control}
                name="value"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-slate-300 text-[13px] font-medium flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                      Valor
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={displayValue}
                        onChange={handleValueChange}
                        placeholder="R$ 0,00"
                        className="h-12 text-lg font-bold bg-emerald-500/10 border-emerald-500/30
                          text-emerald-300 placeholder:text-emerald-500/40
                          focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Stage */}
              <FormField
                control={form.control}
                name="stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300 text-[13px] font-medium">Estágio</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 bg-slate-800 border-slate-600 text-white">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {selectedStage && (
                              <div className={`p-1 rounded-md ${selectedStage.bgColor} flex-shrink-0`}>
                                <selectedStage.icon className={`h-3.5 w-3.5 ${selectedStage.color}`} />
                              </div>
                            )}
                            <SelectValue placeholder="Selecione..." />
                          </div>
                          <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {stages.map((stage) => (
                          <SelectItem
                            key={stage.id}
                            value={stage.id}
                            className="text-white focus:bg-slate-700"
                          >
                            <div className="flex items-center gap-2">
                              <div className={`p-1 rounded-md ${stage.bgColor}`}>
                                <stage.icon className={`h-3.5 w-3.5 ${stage.color}`} />
                              </div>
                              {stage.title}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ── Auto probability bar ──────────────────── */}
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">
                  Probabilidade (automática)
                </span>
                <span className={`text-sm font-bold tabular-nums ${probColor.text}`}>
                  {probability}%
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${probColor.bar} rounded-full`}
                  animate={{ width: `${probability}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* ── Contact group ─────────────────────────── */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-3 w-3" />
                Contato
              </p>

              <FormField
                control={form.control}
                name="customer_name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Nome do cliente"
                        className="h-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500
                          focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="customer_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                          <Input
                            {...field}
                            type="email"
                            placeholder="Email"
                            className="h-10 pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500
                              focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                          />
                        </div>
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
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                          <Input
                            {...field}
                            placeholder="Telefone"
                            className="h-10 pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500
                              focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* ── Product + Date ────────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="product_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300 text-[13px] font-medium">Produto</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10 bg-slate-800 border-slate-600 text-white">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {produtos.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-slate-500">Nenhum produto</div>
                        ) : (
                          produtos.map((p: any) => (
                            <SelectItem key={p.id} value={p.id} className="text-white focus:bg-slate-700">
                              {p.nome}
                            </SelectItem>
                          ))
                        )}
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
                    <FormLabel className="text-slate-300 text-[13px] font-medium flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      Previsão
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        className="h-10 bg-slate-800 border-slate-600 text-white
                          focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20
                          [color-scheme:dark]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ── Hot Deal toggle ───────────────────────── */}
            <FormField
              control={form.control}
              name="is_hot"
              render={({ field }) => (
                <FormItem>
                  <div className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 ${field.value
                      ? "bg-orange-500/10 border-orange-500/30"
                      : "bg-slate-800/50 border-slate-700/50"
                    }`}>
                    <Label htmlFor="hot-deal" className="flex items-center gap-2.5 cursor-pointer">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={field.value ? "on" : "off"}
                          initial={{ scale: 0.8, rotate: -10 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0.8 }}
                          transition={{ duration: 0.15 }}
                        >
                          <Flame className={`h-4.5 w-4.5 ${field.value ? "text-orange-400" : "text-slate-500"}`} />
                        </motion.div>
                      </AnimatePresence>
                      <div>
                        <span className={`text-sm font-semibold ${field.value ? "text-orange-300" : "text-slate-300"}`}>
                          Hot Deal
                        </span>
                        <p className="text-[11px] text-slate-500 font-normal">Prioridade alta — aparecerá em destaque</p>
                      </div>
                    </Label>
                    <FormControl>
                      <Switch
                        id="hot-deal"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-orange-500"
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />

            {/* ── Notes ────────────────────────────────── */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300 text-[13px] font-medium">Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Informações adicionais sobre a negociação..."
                      rows={2}
                      className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500
                        focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 resize-none text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Actions ──────────────────────────────── */}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-700/50">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-slate-700 hover:bg-slate-800 text-slate-300"
              >
                Cancelar
              </Button>

              <motion.div whileTap={{ scale: 0.97 }}>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || submitted}
                  className="min-w-[160px] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold
                    shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {submitted ? (
                      <motion.span
                        key="done"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Criado!
                      </motion.span>
                    ) : createMutation.isPending ? (
                      <motion.span
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2"
                      >
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Criando...
                      </motion.span>
                    ) : (
                      <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        Criar Negociação
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
