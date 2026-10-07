import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { brl, monthRef, monthStartIso } from "./format";

const BLOCKS = 20;

/** Meta de faturamento do mês. O Início lê o mesmo registro (useCockpitData). */
export function GestaoMeta() {
  const { companyId } = useAuth();
  const { activeCompanyId } = useTenant();
  const company = activeCompanyId || companyId;
  const qc = useQueryClient();
  const ref = monthRef();

  const q = useQuery({
    queryKey: ["gestao-meta", company, ref],
    enabled: !!company,
    queryFn: async () => {
      const [meta, won] = await Promise.all([
        supabase.from("metas_consolidadas").select("valor_meta").eq("company_id", company!).eq("mes_referencia", ref).maybeSingle(),
        supabase.from("deals").select("value").eq("company_id", company!).eq("stage", "closed_won").gte("updated_at", monthStartIso()),
      ]);
      if (meta.error) throw meta.error;
      if (won.error) throw won.error;
      return {
        goal: meta.data ? Number(meta.data.valor_meta) : null,
        won: (won.data ?? []).reduce((s, d) => s + (Number(d.value) || 0), 0),
      };
    },
  });

  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (q.data?.goal != null) setDraft(String(Math.round(q.data.goal)));
  }, [q.data?.goal]);

  const goal = q.data?.goal ?? null;
  const won = q.data?.won ?? 0;
  const pct = goal ? Math.min(1, won / goal) : 0;
  const filled = Math.round(pct * BLOCKS);
  const monthName = new Date().toLocaleDateString("pt-BR", { month: "long" });

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const value = Number(draft.replace(/\D/g, ""));
    if (!company || !value) {
      toast.error("Digite o valor da meta.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("metas_consolidadas")
      .upsert({ company_id: company, mes_referencia: ref, valor_meta: value, descricao: "Meta do mês" }, { onConflict: "mes_referencia,company_id" });
    setSaving(false);
    if (error) {
      toast.error("Não deu para salvar a meta.", { description: error.message });
      return;
    }
    toast.success("Meta salva.");
    qc.invalidateQueries({ queryKey: ["gestao-meta", company] });
    qc.invalidateQueries({ queryKey: ["cockpit"] });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-labelledby="meta-andamento" className="rounded-[14px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-5">
        <h2 id="meta-andamento" className="text-[13px] font-medium text-[var(--vyz-text-muted)]">
          Fechado em {monthName}
        </h2>
        {q.isLoading ? (
          <div className="mt-3 h-9 w-40 rounded-md bg-[var(--vyz-surface-2)] animate-pulse motion-reduce:animate-none" />
        ) : (
          <p className="mt-2 text-[32px] font-semibold tabular-nums tracking-[-0.03em] text-[var(--vyz-text-primary)]">
            {brl(won)}
            {goal ? <span className="ml-2 text-[16px] font-medium text-[var(--vyz-text-muted)]">de {brl(goal)}</span> : null}
          </p>
        )}

        <div className="mt-5 flex gap-1" role="img" aria-label={goal ? `${Math.round(pct * 100)}% da meta` : "Sem meta definida"}>
          {Array.from({ length: BLOCKS }, (_, i) => (
            <span
              key={i}
              className="h-8 flex-1 rounded-[4px] transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ background: i < filled ? "var(--vyz-accent)" : "var(--vyz-surface-2)" }}
            />
          ))}
        </div>
        <p className="mt-3 text-[13px] text-[var(--vyz-text-muted)]">
          {goal
            ? pct >= 1
              ? "Meta batida."
              : `Faltam ${brl(Math.max(0, goal - won))} para a meta.`
            : "Defina a meta ao lado para acompanhar aqui e no Início."}
        </p>
      </section>

      <form onSubmit={save} className="rounded-[14px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-5">
        <label htmlFor="meta-valor" className="text-[13px] font-medium text-[var(--vyz-text-primary)]">
          Meta de {monthName}
        </label>
        <p className="mt-1 text-[12px] text-[var(--vyz-text-muted)]">Quanto a empresa quer fechar no mês, em reais.</p>
        <div className="mt-3 flex items-center rounded-[10px] border border-[var(--vyz-border-strong)] bg-[var(--vyz-surface-1)] focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.18)] focus-within:border-[var(--vyz-accent)]">
          <span className="pl-3 text-[14px] text-[var(--vyz-text-muted)]">R$</span>
          <input
            id="meta-valor"
            inputMode="numeric"
            value={draft ? Number(draft).toLocaleString("pt-BR") : ""}
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
            placeholder="150.000"
            className="h-11 w-full bg-transparent px-2 text-[16px] tabular-nums text-[var(--vyz-text-primary)] outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={saving || !draft}
          className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-full bg-[var(--vyz-btn-solid)] text-[13.5px] font-semibold text-[var(--vyz-btn-on)] transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.3)]"
        >
          {saving ? "Salvando…" : goal ? "Atualizar meta" : "Salvar meta"}
        </button>
      </form>
    </div>
  );
}
