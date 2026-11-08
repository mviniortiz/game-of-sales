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
import type { TablesInsert } from "@/integrations/supabase/types";
import { resolveAgentSuggestionForConversation } from "@/hooks/useCreateOpportunityFromConversation";
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
import { CalendarIcon, ChevronDown, Loader2, Plus } from "lucide-react";
import "@/components/layout/tela.css";
import "./funilDialogo.css";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatError } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

const STAGE_OPTIONS = [
  { value: "lead", label: "Novo lead", description: "Ainda conhecendo o cliente" },
  { value: "qualification", label: "Qualificação", description: "Já mostrou interesse de verdade" },
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
  titulo: z.string().trim().min(1, "Dê um nome ao negócio").max(200),
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
    /** Lume sugere o valor (ancorado no preço do serviço) e o serviço de
     *  interesse, pra pré-preencher o valor e casar o produto cadastrado. */
    valorEstimado?: number | null;
    servicoInteresse?: string | null;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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
  // Campos que quase ninguém preenche na hora ficam em "Mais detalhes".
  const [maisAberto, setMaisAberto] = useState(false);

  // Prefill quando o modal abre
  useEffect(() => {
    if (open) {
      setClienteNome(prefillData?.clienteNome || "");
      setClienteTelefone(prefillData?.clienteTelefone || "");
      setLeadSource(prefillData?.leadSource || "");
      // V1.1 — título/observações sugeridos (ex.: vindos da conversa/Lume)
      if (prefillData?.titulo) {
        setTitulo(prefillData.titulo);
        setTituloEditadoManualmente(true); // não sobrescrever ao escolher produto
      }
      if (prefillData?.observacoes) setObservacoes(prefillData.observacoes);
      // Lume sugeriu valor (ancorado no preço do serviço) → pré-preenche, editável.
      if (prefillData?.valorEstimado != null && prefillData.valorEstimado > 0) {
        setValor(String(prefillData.valorEstimado));
        setValorFormatado(formatBRL(prefillData.valorEstimado));
      }
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
      // Nota: a coluna "preco" não existe em produtos (colunas reais são
      // preco_base/valor); mantido como está para não alterar comportamento
      // de runtime nesta limpeza de tipos — só o cast precisa passar por unknown.
      return data as unknown as { id: string; nome: string; preco: number | null }[];
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

  // EVA.OPP — casa o serviço de interesse (Lume) com um produto cadastrado quando
  // a lista carrega, pré-selecionando o dropdown. O valor vem do valor_estimado
  // da Lume (prefill acima); aqui é só o match. Roda enquanto nada foi escolhido.
  useEffect(() => {
    if (!open || produtoId || !prefillData?.servicoInteresse || !produtos?.length) return;
    const alvo = prefillData.servicoInteresse.trim().toLowerCase();
    if (!alvo) return;
    const match = produtos.find((p) => {
      const n = (p.nome || "").trim().toLowerCase();
      return n.length > 0 && (n === alvo || n.includes(alvo) || alvo.includes(n));
    });
    if (match) setProdutoId(match.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, produtos, prefillData?.servicoInteresse]);

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

      // Fase 2 (Analytics da Lume) — atribuição ao funil da Lume: se este deal
      // nasce de uma conversa com sugestão da Lume (pending/accepted), vincula a
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
        // dealInsert é montado dinamicamente (campos condicionais); cast pro
        // tipo gerado evita tipar cada campo opcional manualmente.
        .insert([dealInsert as unknown as TablesInsert<"deals">])
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
      toast.success("Cliente no funil", {
        description: titulo || clienteNome,
        action: {
          label: "Ver no funil",
          onClick: () => navigate("/pipeline"),
        },
      });
      resetForm();
      onSuccess?.(dealId);
      onClose();
    },
    onError: (err) => {
      toast.error(`Não consegui pôr no funil: ${formatError(err)}`);
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
    setMaisAberto(false);
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

  const vindoDaConversa = !!conversationId;
  const detalhesPreenchidos = [clienteEmail, dataEsperada, leadSource, observacoes].filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="vp-dialogo fd-dialogo sm:max-w-[560px]">
        <DialogHeader className="fd-cab">
          <DialogTitle className="fd-titulo">{vindoDaConversa ? "Pôr no funil" : "Novo cliente no funil"}</DialogTitle>
          <DialogDescription className="fd-sub">
            {vindoDaConversa
              ? "O cliente entra no funil e esta conversa fica ligada ao negócio."
              : "Cadastre o negócio para acompanhar até o fechamento."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="fd-form">
          <div className="fd-form__corpo">
            <div className="fd-duplo">
              <label className="vp-campo">
                <span className="vp-rotulo">Cliente</span>
                <input
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  placeholder="Ex: Carla Ribeiro"
                  required
                  maxLength={200}
                  autoFocus
                />
              </label>
              <label className="vp-campo">
                <span className="vp-rotulo">Telefone</span>
                <input
                  type="tel"
                  value={clienteTelefone}
                  onChange={(e) => setClienteTelefone(e.target.value)}
                  placeholder="(48) 99999-9999"
                  maxLength={40}
                />
              </label>
            </div>

            <label className="vp-campo">
              <span className="vp-rotulo">
                Nome do negócio<em>opcional</em>
              </span>
              <input
                value={titulo}
                onChange={(e) => {
                  setTitulo(e.target.value);
                  setTituloEditadoManualmente(true);
                }}
                placeholder={`Ex: Sistema 5 kWp da ${clienteNome.trim().split(" ")[0] || "Carla"}`}
                maxLength={200}
              />
              <span className="vp-campo__ajuda">Em branco, usa o nome do cliente.</span>
            </label>

            <div className="fd-duplo">
              <div className="vp-campo">
                <span className="vp-rotulo" id="fd-produto">Produto ou serviço</span>
                <Select value={produtoId || "__none__"} onValueChange={(v) => setProdutoId(v === "__none__" ? "" : v)}>
                  <SelectTrigger aria-labelledby="fd-produto">
                    <SelectValue placeholder="Escolha" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground">Nenhum</span>
                    </SelectItem>
                    {produtos?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="vp-campo">
                <span className="vp-rotulo">Valor estimado</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={valorFormatado}
                  onChange={(e) => formatarMoeda(e.target.value)}
                  placeholder="R$ 0,00"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                />
              </label>
            </div>

            <div className="vp-campo">
              <span className="vp-rotulo" id="fd-etapa">Etapa</span>
              <div className="vp-segmento" role="radiogroup" aria-labelledby="fd-etapa" style={{ justifySelf: "start" }}>
                {STAGE_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    role="radio"
                    aria-checked={stage === s.value}
                    onClick={() => setStage(s.value)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <span className="vp-campo__ajuda">{STAGE_OPTIONS.find((s) => s.value === stage)?.description}</span>
            </div>

            {isAdmin && (
              <div className="vp-campo">
                <span className="vp-rotulo" id="fd-vendedor">Vendedor</span>
                <Select value={vendedorId} onValueChange={setVendedorId} required>
                  <SelectTrigger aria-labelledby="fd-vendedor">
                    <SelectValue placeholder="Quem cuida deste cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendedores?.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <button
              type="button"
              className="fd-mais"
              aria-expanded={maisAberto}
              aria-controls="fd-mais-detalhes"
              onClick={() => setMaisAberto((v) => !v)}
            >
              {maisAberto ? "Menos detalhes" : detalhesPreenchidos ? `Mais detalhes (${detalhesPreenchidos})` : "Mais detalhes"}
              <ChevronDown aria-hidden />
            </button>

            {maisAberto && (
              <div id="fd-mais-detalhes">
                <div className="fd-duplo">
                  <label className="vp-campo">
                    <span className="vp-rotulo">E-mail</span>
                    <input
                      type="email"
                      value={clienteEmail}
                      onChange={(e) => setClienteEmail(e.target.value)}
                      placeholder="cliente@email.com"
                      maxLength={200}
                    />
                  </label>
                  <div className="vp-campo">
                    <span className="vp-rotulo" id="fd-origem">De onde veio</span>
                    <Select value={leadSource || "__none__"} onValueChange={(v) => setLeadSource(v === "__none__" ? "" : v)}>
                      <SelectTrigger aria-labelledby="fd-origem">
                        <SelectValue placeholder="Escolha" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          <span className="text-muted-foreground">Não sei</span>
                        </SelectItem>
                        {LEAD_SOURCE_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="vp-campo">
                  <span className="vp-rotulo" id="fd-data">Previsão de fechamento</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="fd-data" data-vazio={!dataEsperada || undefined} aria-labelledby="fd-data">
                        <CalendarIcon aria-hidden />
                        {dataEsperada ? format(dataEsperada, "dd 'de' MMM yyyy", { locale: ptBR }) : "Sem previsão"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dataEsperada} onSelect={setDataEsperada} initialFocus />
                      {dataEsperada && (
                        <div className="p-2 border-t flex justify-end">
                          <button type="button" className="vp-botao vp-botao--chico vp-botao--quieto" onClick={() => setDataEsperada(undefined)}>
                            Limpar
                          </button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
                <label className="vp-campo">
                  <span className="vp-rotulo">Observações</span>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="O que o cliente pediu, próximo passo combinado..."
                    rows={3}
                    style={{ resize: "none" }}
                    maxLength={2000}
                  />
                </label>
              </div>
            )}
          </div>

          <div className="fd-rodape">
            <p className="fd-rodape__nota">A Lume acompanha o negócio e sugere o próximo passo. Você aprova antes de qualquer envio.</p>
            <button type="button" className="vp-botao vp-botao--quieto" onClick={onClose} disabled={createOportunidade.isPending}>
              Cancelar
            </button>
            <button type="submit" className="vp-botao" disabled={createOportunidade.isPending}>
              {createOportunidade.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
              ) : (
                <Plus className="h-4 w-4" aria-hidden />
              )}
              {createOportunidade.isPending ? "Salvando..." : "Pôr no funil"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
