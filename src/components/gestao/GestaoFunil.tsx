import { useState } from "react";
import { Plus, Star } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import {
  DEFAULT_STAGE_CONFIGS,
  useCreatePipeline,
  usePipelineStages,
  usePipelines,
  useSetDefaultPipeline,
  useStageDealCounts,
  useUpdatePipeline,
  type Pipeline,
} from "@/hooks/usePipelines";
import { PipelineConfigModal } from "@/components/crm/PipelineConfigModal";
import { AVAILABLE_COLORS } from "@/lib/pipelineStyles";
import "@/components/admin/admin.css";

/** Funis da empresa e suas etapas; a edição usa o mesmo editor do Pipeline. */
export function GestaoFunil() {
  const { companyId } = useAuth();
  const { activeCompanyId } = useTenant();
  const company = activeCompanyId || companyId;
  const { data: pipelines = [], isLoading } = usePipelines(company);
  const [editing, setEditing] = useState<Pipeline | null>(null);
  const [creating, setCreating] = useState(false);
  const createPipeline = useCreatePipeline(company);
  const visible = pipelines.filter((p) => !p.is_archived);

  return (
    <div className="va">
      <div className="va-barra">
        <p className="va-topo__texto">As etapas que a Lume e a equipe usam para mover as oportunidades.</p>
        <button type="button" onClick={() => setCreating(true)} className="va-btn ml-auto">
          <Plus size={14} weight="bold" aria-hidden /> Novo funil
        </button>
      </div>

      {isLoading && [0, 1].map((i) => <div key={i} className="h-36 rounded-[10px] bg-[#f5f5f5] animate-pulse motion-reduce:animate-none" />)}

      {!isLoading && visible.length === 0 && (
        <div className="va-tabela">
          <div className="va-vazio">
            <b>Nenhum funil ainda</b>
            Crie o primeiro com as etapas padrão e ajuste depois.
          </div>
        </div>
      )}

      {visible.map((p, i) => (
        <PipelineCard key={p.id} pipeline={p} indice={i} onEdit={() => setEditing(p)} />
      ))}

      {editing && <EditPipeline pipeline={editing} company={company} onClose={() => setEditing(null)} />}

      <PipelineConfigModal
        open={creating}
        onClose={() => setCreating(false)}
        mode="create"
        name=""
        stages={DEFAULT_STAGE_CONFIGS}
        busy={createPipeline.isPending}
        onSubmit={({ name, stages }) =>
          createPipeline.mutate({ name, stages, makeDefault: visible.length === 0 }, { onSuccess: () => setCreating(false) })
        }
      />
    </div>
  );
}

function PipelineCard({ pipeline, indice, onEdit }: { pipeline: Pipeline; indice: number; onEdit: () => void }) {
  const { data: stages = [] } = usePipelineStages(pipeline.id);
  const { data: counts = {} } = useStageDealCounts(pipeline.id);
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  const maior = Math.max(1, ...stages.map((s) => counts[s.id] ?? 0));

  return (
    <article className="va-funil va-entra-linha" style={{ "--i": indice } as React.CSSProperties}>
      <header className="va-secao__cab">
        <div className="min-w-0">
          <h3 className="va-secao__titulo">
            {pipeline.name}
            {pipeline.is_default && (
              <span className="va-chip" data-tom="azul">
                <Star size={11} weight="fill" aria-hidden /> Padrão
              </span>
            )}
          </h3>
          <p className="va-secao__sub">
            {stages.length} etapas · {total} {total === 1 ? "oportunidade" : "oportunidades"}
          </p>
        </div>
        <button type="button" onClick={onEdit} className="va-btn va-btn--leve">
          Editar etapas
        </button>
      </header>
      {/* Cada etapa com quantos negócios tem e uma barra do tamanho relativo: dá pra ver onde o funil afina. */}
      <ol className="va-funil__etapas" aria-label={`Etapas do funil ${pipeline.name}`}>
        {stages.map((s) => {
          const n = counts[s.id] ?? 0;
          const cor = AVAILABLE_COLORS.find((c) => c.id === s.colorId)?.dotColor ?? "bg-slate-500";
          return (
            <li key={s.id} className="va-funil__etapa" data-tipo={s.kind}>
              <span className="va-funil__titulo">
                <i className={cor} aria-hidden />
                {s.title}
              </span>
              <b>{n}</b>
              <span className="va-medidor" aria-hidden>
                <i className={s.kind === "won" ? "va-medidor--bom" : s.kind === "lost" ? "va-medidor--neutro" : undefined} style={{ width: `${(n / maior) * 100}%` }} />
              </span>
            </li>
          );
        })}
      </ol>
    </article>
  );
}

function EditPipeline({ pipeline, company, onClose }: { pipeline: Pipeline; company: string | null; onClose: () => void }) {
  const { data: stages = [], isSuccess } = usePipelineStages(pipeline.id);
  const { data: counts = {} } = useStageDealCounts(pipeline.id);
  const update = useUpdatePipeline(company);
  const setDefault = useSetDefaultPipeline(company);

  // O editor copia as etapas ao abrir: abrir antes de carregar mostraria o funil vazio.
  if (!isSuccess) return null;

  return (
    <PipelineConfigModal
      open
      onClose={onClose}
      mode="edit"
      name={pipeline.name}
      stages={stages}
      stageDealCounts={counts}
      busy={update.isPending}
      isDefault={pipeline.is_default}
      onSetDefault={pipeline.is_default ? undefined : () => setDefault.mutate(pipeline.id)}
      onSubmit={({ name, stages: next }) => update.mutate({ pipelineId: pipeline.id, name, stages: next }, { onSuccess: onClose })}
    />
  );
}
