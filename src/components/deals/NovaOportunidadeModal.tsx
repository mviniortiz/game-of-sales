// ─────────────────────────────────────────────────────────────────────────────
// F4G (2026-05-19) — NovaOportunidadeModal
//
// Modal "Criar nova oportunidade". Grava em public.deals (stage default 'lead'
// ou 'qualification'). Se um produto for selecionado, também grava vínculo em
// public.deal_products. NÃO toca em vendas/metas/performance — esse fluxo é o
// "Registrar venda" que continua no NovaVendaModal legado.
//
// Decisão F4G:
//   - stage default 'lead' (= "Novo lead" do funil), com opção 'qualification'
//   - produto opcional; se preenchido, salva product_id em deals + 1 linha em
//     deal_products (quantidade=1, preco_unitario=valor_estimado ou preço do
//     produto cadastrado)
//   - lead_source opcional (Meta/Google/Instagram/Indicação/Outro)
//   - email/phone do contato vão em additional_contacts (jsonb) pra não exigir
//     migration nova
//
// Disparado por:
//   - Sidebar "Novo lead" → event 'vyzon:open-nova-oportunidade'
//   - EvaPanel "Criar oportunidade" → mesmo event
//   - Command Palette "Criar oportunidade no pipeline" → mesmo event
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveAgentSuggestionForConversation } from "@/hooks/useCreateOpportunityFromConversation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  User,
  Briefcase,
  Mail,
  Phone,
  DollarSign,
  CalendarIcon,
  Tag,
  Workflow,
  Loader2,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, formatError } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";

// Entrada das seções: fade + rise em stagger curto. Transform-only.
const EASE = [0.22, 1, 0.36, 1] as const;
const sectionsContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.04 } },
};
const sectionItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } },
};

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

const STAGE_OPTIONS = [
  { value: "lead", label: "Novo lead", description: "Triagem inicial" },
  { value: "qualification", label: "Qualificação", description: "Já há interesse confirmado" },
] as const;

const LEAD_SOURCE_OPTIONS = [
  { value: "meta_ads", label: "Meta Ads" },
  { value: "google_ads", label: "Google Ads" },
  { value: "instagram", label: "Instagram" },
  { value: "indicacao", label: "Indicação" },
  { value: "evento", label: "Evento" },
  { value: "outro", label: "Outro" },
] as const;

const oportunidadeSchema = z.object({
  clienteNome: z.string().trim().min(1, "Nome do cliente é obrigatório").max(200),
  clienteEmail: z.string().trim().email("E-mail inválido").max(200).optional().or(z.literal("")),
  clienteTelefone: z.string().trim().max(40).optional().or(z.literal("")),
  titulo: z.string().trim().min(1, "Título da oportunidade é obrigatório").max(200),
  valor: z.number().min(0).max(999999999).nullable(),
  dataEsperada: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  leadSource: z.string().max(80).optional().or(z.literal("")),
  stage: z.enum(["lead", "qualification"]),
  vendedorId: z.string().uuid().nullable(),
  produtoId: z.string().uuid().nullable(),
  observacoes: z.string().max(2000).optional().or(z.literal("")),
});

type OportunidadeData = z.infer<typeof oportunidadeSchema>;

interface NovaOportunidadeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (dealId: string) => void;
  /** V1.1 — quando vem da Inbox: vincula a conversa ao deal criado
   *  (channel_conversations.deal_id = novoDealId). */
  conversationId?: string;
  prefillData?: {
    clienteNome?: string;
    clienteTelefone?: string;
    leadSource?: string;
    titulo?: string;
    observacoes?: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const NovaOportunidadeModal = ({
  open,
  onClose,
  onSuccess,
  conversationId,
  prefillData,
}: NovaOportunidadeModalProps) => {
  const { user, isAdmin, companyId } = useAuth();
  const { activeCompanyId } = useTenant();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const effectiveCompanyId = activeCompanyId || companyId;

  // ── Form state ──
  const [clienteNome, setClienteNome] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");
  const [clienteTelefone, setClienteTelefone] = useState("");
  const [titulo, setTitulo] = useState("");
  const [tituloEditadoManualmente, setTituloEditadoManualmente] = useState(false);
  const [produtoId, setProdutoId] = useState<string>("");
  const [valor, setValor] = useState("");
  const [valorFormatado, setValorFormatado] = useState("");
  const [dataEsperada, setDataEsperada] = useState<Date | undefined>(undefined);
  const [leadSource, setLeadSource] = useState<string>("");
  const [stage, setStage] = useState<"lead" | "qualification">("lead");
  const [vendedorId, setVendedorId] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");

  // Prefill quando o modal abre
  useEffect(() => {
    if (open) {
      setClienteNome(prefillData?.clienteNome || "");
      setClienteTelefone(prefillData?.clienteTelefone || "");
      setLeadSource(prefillData?.leadSource || "");
      // V1.1 — título/observações sugeridos (ex.: vindos da conversa/EVA)
      if (prefillData?.titulo) {
        setTitulo(prefillData.titulo);
        setTituloEditadoManualmente(true); // não sobrescrever ao escolher produto
      }
      if (prefillData?.observacoes) setObservacoes(prefillData.observacoes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Lookups ──
  const { data: produtos } = useQuery({
    queryKey: ["produtos", effectiveCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, preco")
        .eq("ativo", true)
        .eq("company_id", effectiveCompanyId);
      if (error) throw error;
      return data as { id: string; nome: string; preco: number | null }[];
    },
    enabled: !!effectiveCompanyId && open,
  });

  const { data: vendedores } = useQuery({
    queryKey: ["vendedores", effectiveCompanyId],
    queryFn: async () => {
      if (!isAdmin) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, email, company_id")
        .eq("company_id", effectiveCompanyId)
        .order("nome");
      if (error) throw error;
      return data as { id: string; nome: string; email: string }[];
    },
    enabled: isAdmin && !!effectiveCompanyId && open,
  });

  // Auto-preenche título quando produto é selecionado (a não ser que o user já tenha digitado algo)
  const produtoSelecionado = useMemo(
    () => produtos?.find((p) => p.id === produtoId),
    [produtos, produtoId],
  );
  useEffect(() => {
    if (produtoSelecionado && !tituloEditadoManualmente) {
      const base = clienteNome.trim() || "Oportunidade";
      setTitulo(`${produtoSelecionado.nome} — ${base}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produtoId]);

  // ── Mutation ──
  const createOportunidade = useMutation({
    mutationFn: async (parsed: OportunidadeData) => {
      const sellerId = isAdmin ? parsed.vendedorId || user?.id : user?.id;
      if (!sellerId) throw new Error("Vendedor não identificado");
      if (!effectiveCompanyId) throw new Error("Empresa não identificada");

      // additional_contacts (jsonb) — só inclui se algum dado de contato foi preenchido
      const contatoExtra: Record<string, string> = {};
      if (parsed.clienteEmail) contatoExtra.email = parsed.clienteEmail;
      if (parsed.clienteTelefone) contatoExtra.phone = parsed.clienteTelefone;
      const additionalContacts =
        Object.keys(contatoExtra).length > 0 ? [contatoExtra] : [];

      // Fase 2 (Analytics da EVA) — atribuição ao funil da EVA: se este deal
      // nasce de uma conversa com sugestão da EVA (pending/accepted), vincula a
      // mais recente e resolve a pendente. Sem sugestão = null (honesto).
      // Best-effort: não bloqueia a criação do deal.
      const agentSuggestionId = conversationId
        ? await resolveAgentSuggestionForConversation(conversationId, sellerId)
        : null;

      const dealInsert: Record<string, unknown> = {
        title: parsed.titulo,
        customer_name: parsed.clienteNome,
        stage: parsed.stage,
        user_id: sellerId,
        company_id: effectiveCompanyId,
        additional_contacts: additionalContacts,
      };
      if (agentSuggestionId) dealInsert.agent_suggestion_id = agentSuggestionId;
      if (parsed.valor !== null) dealInsert.value = parsed.valor;
      if (parsed.produtoId) dealInsert.product_id = parsed.produtoId;
      if (parsed.dataEsperada) dealInsert.expected_close_date = parsed.dataEsperada;
      if (parsed.leadSource) dealInsert.lead_source = parsed.leadSource;
      if (parsed.observacoes) dealInsert.notes = parsed.observacoes;

      const { data: deal, error } = await supabase
        .from("deals")
        .insert([dealInsert])
        .select("id")
        .single();
      if (error) throw error;

      // V1.1 — vincula a conversa da Inbox ao deal recém-criado. Não-fatal:
      // o deal já existe; se o link falhar, avisamos sem perder a oportunidade.
      if (conversationId && deal?.id) {
        const { error: linkConvErr } = await supabase
          .from("channel_conversations")
          .update({ deal_id: deal.id })
          .eq("id", conversationId)
          .is("deal_id", null); // não sobrescreve vínculo existente (anti-duplicidade)
        if (linkConvErr) {
          console.error("[V1.1] vínculo conversa→deal falhou (não fatal):", linkConvErr);
          toast.warning("Oportunidade criada, mas não consegui vincular a conversa. Tente atualizar a Inbox.");
        }
      }

      // Vínculo opcional em deal_products
      if (parsed.produtoId && deal?.id) {
        const produto = produtos?.find((p) => p.id === parsed.produtoId);
        const precoUnitario = parsed.valor ?? produto?.preco ?? 0;
        const { error: linkErr } = await (supabase as any)
          .from("deal_products")
          .insert([
            {
              deal_id: deal.id,
              produto_id: parsed.produtoId,
              company_id: effectiveCompanyId,
              quantidade: 1,
              preco_unitario: precoUnitario,
            },
          ]);
        if (linkErr) {
          // não fatal — log e segue. O deal foi criado.
          console.error("[F4G] deal_products insert falhou (não fatal):", linkErr);
        }
      }

      return deal.id as string;
    },
    onSuccess: (dealId) => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Oportunidade criada no pipeline", {
        description: titulo,
        action: {
          label: "Ver no pipeline",
          onClick: () => navigate("/pipeline"),
        },
      });
      resetForm();
      onSuccess?.(dealId);
      onClose();
    },
    onError: (err) => {
      toast.error(`Erro ao criar oportunidade: ${formatError(err)}`);
    },
  });

  const resetForm = () => {
    setClienteNome("");
    setClienteEmail("");
    setClienteTelefone("");
    setTitulo("");
    setTituloEditadoManualmente(false);
    setProdutoId("");
    setValor("");
    setValorFormatado("");
    setDataEsperada(undefined);
    setLeadSource("");
    setStage("lead");
    setVendedorId("");
    setObservacoes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin && !vendedorId) {
      toast.error("Selecione o vendedor responsável");
      return;
    }

    const parsed = oportunidadeSchema.safeParse({
      clienteNome,
      clienteEmail: clienteEmail || "",
      clienteTelefone: clienteTelefone || "",
      titulo: titulo || clienteNome,
      valor: valor ? parseFloat(valor) : null,
      dataEsperada: dataEsperada ? format(dataEsperada, "yyyy-MM-dd") : null,
      leadSource: leadSource || "",
      stage,
      vendedorId: isAdmin ? vendedorId || null : null,
      produtoId: produtoId || null,
      observacoes: observacoes || "",
    });

    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast.error(
        `${first?.message || "Validação"}${
          first?.path?.length ? ` (${first.path.join(".")})` : ""
        }`,
      );
      return;
    }

    createOportunidade.mutate(parsed.data);
  };

  const formatarMoeda = (v: string) => {
    const numero = v.replace(/\D/g, "");
    if (!numero) {
      setValor("");
      setValorFormatado("");
      return;
    }
    const valorNumerico = parseFloat(numero) / 100;
    setValor(valorNumerico.toString());
    setValorFormatado(
      valorNumerico.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[640px] max-h-[92vh] overflow-y-auto bg-card border border-[#D9E2EC] p-0">
        {/* Header premium azul (não verde — é "criar", não "ganhar") */}
        <DialogHeader
          className="px-6 sm:px-7 pt-6 pb-5 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(74,140,232,0.04) 100%), #FFFFFF",
            borderBottom: "1px solid #EAF0F6",
          }}
        >
          <div
            className="absolute top-0 inset-x-0 h-px pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(37,99,235,0.40) 50%, transparent)",
            }}
            aria-hidden
          />
          <DialogTitle className="flex items-center gap-3.5 text-foreground">
            <div
              className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "rgba(37,99,235,0.10)",
                border: "1px solid rgba(37,99,235,0.20)",
              }}
            >
              <Plus className="h-5 w-5" strokeWidth={2.3} style={{ color: "#2563EB" }} />
            </div>
            <div className="min-w-0">
              <span
                className="text-[18px] font-bold tracking-tight"
                style={{ color: "#0B1220", letterSpacing: "-0.018em" }}
              >
                Criar nova oportunidade
              </span>
              <p className="text-[12.5px] text-muted-foreground font-normal mt-0.5 leading-snug">
                Adicione um lead ao pipeline para acompanhar até o fechamento.
              </p>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Formulário para criar uma nova oportunidade no pipeline.
          </DialogDescription>
        </DialogHeader>

        <motion.form
          onSubmit={handleSubmit}
          className="px-6 sm:px-7 pt-5 pb-6 space-y-6"
          variants={sectionsContainer}
          initial={reduceMotion ? false : "hidden"}
          animate="show"
        >
          {/* Seção 1: Cliente */}
          <Section title="Cliente" icon={<User className="h-3.5 w-3.5" />}>
            <div className="space-y-3">
              <Field label="Nome do cliente" required>
                <Input
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  placeholder="Ex: Carla Ribeiro"
                  className="h-10 text-sm"
                  required
                  maxLength={200}
                  autoFocus
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="E-mail" icon={<Mail className="h-3 w-3" />}>
                  <Input
                    type="email"
                    value={clienteEmail}
                    onChange={(e) => setClienteEmail(e.target.value)}
                    placeholder="cliente@empresa.com"
                    className="h-10 text-sm"
                    maxLength={200}
                  />
                </Field>
                <Field label="Telefone" icon={<Phone className="h-3 w-3" />}>
                  <Input
                    type="tel"
                    value={clienteTelefone}
                    onChange={(e) => setClienteTelefone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="h-10 text-sm"
                    maxLength={40}
                  />
                </Field>
              </div>
            </div>
          </Section>

          {/* Seção 2: Oportunidade */}
          <Section title="Oportunidade" icon={<Briefcase className="h-3.5 w-3.5" />}>
            <div className="space-y-3">
              <Field label="Título da oportunidade" required>
                <Input
                  value={titulo}
                  onChange={(e) => {
                    setTitulo(e.target.value);
                    setTituloEditadoManualmente(true);
                  }}
                  placeholder="Ex: Tráfego Meta — Loja da Carla"
                  className="h-10 text-sm"
                  required
                  maxLength={200}
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Produto/serviço (opcional)">
                  <Select
                    value={produtoId || "__none__"}
                    onValueChange={(v) => setProdutoId(v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        <span className="text-muted-foreground">Sem produto</span>
                      </SelectItem>
                      {produtos?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Valor estimado" icon={<DollarSign className="h-3 w-3" />}>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={valorFormatado}
                    onChange={(e) => formatarMoeda(e.target.value)}
                    placeholder="R$ 0,00"
                    className="h-10 text-sm font-medium"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Data esperada de fechamento" icon={<CalendarIcon className="h-3 w-3" />}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-10 text-sm",
                          !dataEsperada && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {dataEsperada
                          ? format(dataEsperada, "dd 'de' MMM yyyy", { locale: ptBR })
                          : "Sem previsão"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dataEsperada}
                        onSelect={setDataEsperada}
                        initialFocus
                      />
                      {dataEsperada && (
                        <div className="p-2 border-t flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setDataEsperada(undefined)}
                          >
                            Limpar
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </Field>
                <Field label="Origem do lead" icon={<Tag className="h-3 w-3" />}>
                  <Select
                    value={leadSource || "__none__"}
                    onValueChange={(v) => setLeadSource(v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        <span className="text-muted-foreground">Não informada</span>
                      </SelectItem>
                      {LEAD_SOURCE_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>
          </Section>

          {/* Seção 3: Pipeline */}
          <Section title="Pipeline" icon={<Workflow className="h-3.5 w-3.5" />}>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Etapa inicial" required>
                  <Select
                    value={stage}
                    onValueChange={(v) => setStage(v as "lead" | "qualification")}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          <div className="flex flex-col">
                            <span>{s.label}</span>
                            <span className="text-[10.5px] text-muted-foreground">
                              {s.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {isAdmin && (
                  <Field label="Vendedor responsável" required>
                    <Select
                      value={vendedorId}
                      onValueChange={setVendedorId}
                      required
                    >
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendedores?.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </div>
              <Field label="Observações (opcional)">
                <Textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Contexto da conversa, próximos passos, dores levantadas..."
                  rows={3}
                  className="resize-none text-sm"
                  maxLength={2000}
                />
              </Field>
            </div>
          </Section>

          {/* Microaviso EVA assistida */}
          <motion.div
            variants={sectionItem}
            className="flex items-start gap-2 rounded-lg px-3 py-2.5"
            style={{
              background: "rgba(124,58,237,0.04)",
              border: "1px solid rgba(124,58,237,0.14)",
            }}
          >
            <ShieldCheck
              className="h-3.5 w-3.5 shrink-0 mt-0.5"
              style={{ color: "#7C3AED" }}
            />
            <p className="text-[11.5px] leading-relaxed" style={{ color: "#475569" }}>
              EVA continua assistida: ela sugere próximos passos depois que a oportunidade
              entra no pipeline. Você aprova antes de qualquer ação automática.
            </p>
          </motion.div>

          {/* Actions */}
          <motion.div
            variants={sectionItem}
            className="flex justify-end gap-3 pt-4"
            style={{ borderTop: "1px solid #EAF0F6" }}
          >
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createOportunidade.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createOportunidade.isPending}
            >
              {createOportunidade.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Criar oportunidade
                </>
              )}
            </Button>
          </motion.div>
        </motion.form>
      </DialogContent>
    </Dialog>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponentes inline
// ─────────────────────────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.section variants={sectionItem} className="space-y-2.5">
      <header className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span
          className="inline-flex items-center justify-center h-5 w-5 rounded-md"
          style={{ background: "#F6F4EF", border: "1px solid #E6EDF5" }}
        >
          {icon}
        </span>
        {title}
      </header>
      {children}
    </motion.section>
  );
}

function Field({
  label,
  required,
  icon,
  children,
}: {
  label: string;
  required?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11.5px] font-medium text-foreground flex items-center gap-1.5">
        {icon}
        {label}
        {required && <span className="text-rose-500">*</span>}
      </Label>
      {children}
    </div>
  );
}
