import { useState, useMemo } from "react";
import { Reorder } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, FileText, Loader2, FileDown, GripVertical, ChevronDown, Palette } from "lucide-react";
import { toast } from "sonner";
import { useProposals } from "@/hooks/useProposals";
import {
  generateProposalPDF, computeProposalTotal,
  DEFAULT_SECTIONS, SECTION_LABELS,
  type ProposalItem, type ProposalSection,
} from "./ProposalPDFGenerator";

interface NovaPropostaModalProps {
  open: boolean;
  onClose: () => void;
  deal: { id: string; title: string; customer_name?: string | null; customer_email?: string | null; customer_phone?: string | null };
  companyName?: string;
  logoUrl?: string | null;
}

const emptyItem = (): ProposalItem => ({ nome: "", descricao: "", quantidade: 1, preco_unitario: 0, desconto_percentual: 0 });
const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export function NovaPropostaModal({ open, onClose, deal, companyName, logoUrl }: NovaPropostaModalProps) {
  const { createProposal } = useProposals(deal.id);
  const [title, setTitle] = useState(`Proposta - ${deal.title}`);
  const [items, setItems] = useState<ProposalItem[]>([emptyItem()]);
  const [discount, setDiscount] = useState(0);
  const [validity, setValidity] = useState(30);
  const [conditions, setConditions] = useState("");
  const [busy, setBusy] = useState(false);
  // Personalização
  const [showCustom, setShowCustom] = useState(false);
  const [brandColor, setBrandColor] = useState("#1556C0");
  const [intro, setIntro] = useState("");
  const [about, setAbout] = useState("");
  const [sections, setSections] = useState<ProposalSection[]>(DEFAULT_SECTIONS.map((s) => ({ ...s })));

  const total = useMemo(() => computeProposalTotal(items, discount), [items, discount]);
  const validItems = items.filter((i) => i.nome.trim());

  const setItem = (idx: number, patch: Partial<ProposalItem>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx: number) => setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  const toggleSection = (key: string) =>
    setSections((prev) => prev.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s)));

  const reset = () => {
    setTitle(`Proposta - ${deal.title}`); setItems([emptyItem()]); setDiscount(0);
    setValidity(30); setConditions(""); setIntro(""); setAbout("");
    setSections(DEFAULT_SECTIONS.map((s) => ({ ...s }))); setBrandColor("#1556C0");
  };

  const persist = async (): Promise<boolean> => {
    if (validItems.length === 0) { toast.error("Adicione ao menos um item com nome"); return false; }
    setBusy(true);
    try {
      await createProposal.mutateAsync({
        deal_id: deal.id, title: title.trim() || `Proposta - ${deal.title}`,
        customer_name: deal.customer_name, customer_email: deal.customer_email, customer_phone: deal.customer_phone,
        items: validItems, discount_percent: discount, validity_days: validity,
        conditions: conditions.trim() || null, intro: intro.trim() || null, about: about.trim() || null,
        brand_color: brandColor, sections, total,
      });
      return true;
    } catch { toast.error("Erro ao salvar a proposta"); return false; }
    finally { setBusy(false); }
  };

  const handleSave = async () => {
    if (await persist()) { toast.success("Proposta salva!"); reset(); onClose(); }
  };

  const handleSaveAndPdf = async () => {
    if (await persist()) {
      await generateProposalPDF({
        companyName, logoUrl, brandColor, dealTitle: deal.title,
        customerName: deal.customer_name || "Cliente", customerEmail: deal.customer_email || undefined, customerPhone: deal.customer_phone || undefined,
        items: validItems, discountPercent: discount, conditions: conditions.trim() || undefined, validityDays: validity,
        intro: intro.trim() || undefined, about: about.trim() || undefined, sections,
      });
      toast.success("Proposta salva e PDF gerado!");
      reset(); onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-[660px] p-0 gap-0 max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader className="p-5 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <span className="text-lg font-semibold">Nova proposta</span>
              <p className="text-[12px] text-muted-foreground font-normal mt-0.5">Monte os itens, personalize e gere o PDF</p>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">Editor de proposta comercial</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-[12px] font-medium text-muted-foreground">Título</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 h-9" />
          </div>

          {/* Itens */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Itens</label>
              <button onClick={addItem} className="inline-flex items-center gap-1 text-[12px] font-medium text-blue-600 hover:text-blue-700">
                <Plus className="h-3.5 w-3.5" /> Adicionar item
              </button>
            </div>
            <div className="space-y-2">
              <div className="hidden sm:grid grid-cols-[1fr_64px_104px_72px_36px] gap-2 px-1 text-[10.5px] font-semibold text-muted-foreground uppercase">
                <span>Item</span><span className="text-center">Qtd</span><span className="text-right">Preço</span><span className="text-center">Desc.%</span><span></span>
              </div>
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_64px_104px_72px_36px] gap-2 items-start">
                  <div className="space-y-1">
                    <Input value={it.nome} onChange={(e) => setItem(idx, { nome: e.target.value })} placeholder="Nome do item" className="h-9" />
                    <Input value={it.descricao || ""} onChange={(e) => setItem(idx, { descricao: e.target.value })} placeholder="Descrição (opcional)" className="h-7 text-[11px] text-muted-foreground" />
                  </div>
                  <Input type="number" min={1} value={it.quantidade} onChange={(e) => setItem(idx, { quantidade: Math.max(1, Number(e.target.value) || 1) })} className="h-9 text-center tabular-nums" />
                  <Input type="number" min={0} step="0.01" value={it.preco_unitario} onChange={(e) => setItem(idx, { preco_unitario: Math.max(0, Number(e.target.value) || 0) })} className="h-9 text-right tabular-nums" />
                  <Input type="number" min={0} max={100} value={it.desconto_percentual} onChange={(e) => setItem(idx, { desconto_percentual: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} className="h-9 text-center tabular-nums" />
                  <button onClick={() => removeItem(idx)} disabled={items.length <= 1} className="h-9 inline-flex items-center justify-center text-muted-foreground hover:text-rose-500 disabled:opacity-30" aria-label="Remover item">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-muted-foreground">Desconto global (%)</label>
              <Input type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} className="mt-1 h-9 tabular-nums" />
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground">Validade (dias)</label>
              <Input type="number" min={1} value={validity} onChange={(e) => setValidity(Math.max(1, Number(e.target.value) || 30))} className="mt-1 h-9 tabular-nums" />
            </div>
          </div>

          <div>
            <label className="text-[12px] font-medium text-muted-foreground">Condições comerciais (uma por linha)</label>
            <Textarea value={conditions} onChange={(e) => setConditions(e.target.value)} rows={3}
              placeholder={"Pagamento em 30/60/90\nEntrega em até 3 dias úteis"} className="mt-1 text-[13px]" />
          </div>

          {/* ── Personalização (colapsável) ───────────────────────────────────── */}
          <div className="rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setShowCustom((v) => !v)}
              className="w-full flex items-center gap-2 px-3.5 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
            >
              <Palette className="h-4 w-4 text-blue-600" />
              <span className="text-[13px] font-semibold flex-1">Personalização (logo, cor, seções)</span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showCustom ? "rotate-180" : ""}`} />
            </button>

            {showCustom && (
              <div className="p-3.5 space-y-4 border-t border-border">
                {/* Logo + cor */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-12 w-12 rounded-lg border border-border bg-muted/40 flex items-center justify-center overflow-hidden">
                      {logoUrl ? <img src={logoUrl} alt="logo" className="max-h-full max-w-full object-contain" /> : <FileText className="h-5 w-5 text-muted-foreground/40" />}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Logo da empresa<br />
                      <span className="text-muted-foreground/60">{logoUrl ? "usada na capa" : "configure em Config → Organização"}</span>
                    </div>
                  </div>
                  <div className="ml-auto">
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">Cor da marca</label>
                    <div className="flex items-center gap-1.5">
                      <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="h-8 w-10 rounded cursor-pointer border border-border" />
                      <Input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="h-8 w-24 text-[12px] tabular-nums" />
                    </div>
                  </div>
                </div>

                {/* Apresentação + Sobre */}
                <div>
                  <label className="text-[12px] font-medium text-muted-foreground">Apresentação (texto de abertura)</label>
                  <Textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={2} placeholder="Ex: É um prazer apresentar nossa proposta..." className="mt-1 text-[13px]" />
                </div>
                <div>
                  <label className="text-[12px] font-medium text-muted-foreground">Sobre a empresa</label>
                  <Textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={2} placeholder="Ex: A MSI Comércio é uma distribuidora..." className="mt-1 text-[13px]" />
                </div>

                {/* Seções (arrastar p/ reordenar + ligar/desligar) */}
                <div>
                  <label className="text-[12px] font-medium text-muted-foreground block mb-1.5">Seções do documento (arraste para reordenar)</label>
                  <Reorder.Group axis="y" values={sections} onReorder={setSections} className="space-y-1.5">
                    {sections.map((s) => (
                      <Reorder.Item key={s.key} value={s} className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border bg-card cursor-grab active:cursor-grabbing">
                        <GripVertical className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                        <span className="text-[13px] flex-1">{SECTION_LABELS[s.key]}</span>
                        <button
                          onClick={() => toggleSection(s.key)}
                          className={`relative h-5 w-9 rounded-full transition-colors flex-shrink-0 ${s.enabled ? "bg-blue-600" : "bg-muted-foreground/30"}`}
                          aria-label={s.enabled ? "Desativar seção" : "Ativar seção"}
                        >
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${s.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 pt-4 border-t border-border bg-card flex items-center gap-3">
          <div className="mr-auto">
            <span className="text-[11px] text-muted-foreground block">Total</span>
            <span className="text-xl font-bold text-blue-600 tabular-nums">{brl(total)}</span>
          </div>
          <Button variant="outline" onClick={handleSave} disabled={busy} className="gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Salvar
          </Button>
          <Button onClick={handleSaveAndPdf} disabled={busy} className="gap-1.5 bg-blue-600 hover:bg-blue-500 text-white">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Salvar e gerar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
