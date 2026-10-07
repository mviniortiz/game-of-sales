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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-[var(--vyz-text-muted)]">
          As etapas que a EVA e a equipe usam para mover as oportunidades.
        </p>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[var(--vyz-border-strong)] bg-[var(--vyz-surface-1)] px-4 text-[13px] font-semibold text-[var(--vyz-text-primary)] transition-colors hover:bg-[var(--vyz-surface-2)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.28)]"
        >
          <Plus size={14} weight="bold" aria-hidden /> Novo funil
        </button>
      </div>

      {isLoading &&
        [0, 1].map((i) => <div key={i} className="h-28 rounded-[14px] bg-[var(--vyz-surface-2)] animate-pulse motion-reduce:animate-none" />)}

      {!isLoading && visible.length === 0 && (
        <div className="rounded-[14px] border border-dashed border-[var(--vyz-border-strong)] px-6 py-10 text-center">
          <p className="text-[14px] font-medium text-[var(--vyz-text-primary)]">Nenhum funil ainda</p>
          <p className="mt-1 text-[13px] text-[var(--vyz-text-muted)]">Crie o primeiro com as etapas padrão e ajuste depois.</p>
        </div>
      )}

      {visible.map((p) => (
        <PipelineCard key={p.id} pipeline={p} onEdit={() => setEditing(p)} />
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

function PipelineCard({ pipeline, onEdit }: { pipeline: Pipeline; onEdit: () => void }) {
  const { data: stages = [] } = usePipelineStages(pipeline.id);
  const { data: counts = {} } = useStageDealCounts(pipeline.id);
  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <article className="rounded-[14px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-[var(--vyz-text-primary)]">
            {pipeline.name}
            {pipeline.is_default && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--vyz-accent-soft-10)] px-2 py-0.5 text-[11px] font-medium text-[var(--vyz-accent)]">
                <Star size={10} weight="fill" aria-hidden /> Padrão
              </span>
            )}
          </h3>
          <p className="mt-0.5 text-[12px] text-[var(--vyz-text-muted)]">
            {stages.length} etapas · {total} oportunidades
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-full px-3 py-1.5 text-[13px] font-medium text-[var(--vyz-accent)] transition-colors hover:bg-[var(--vyz-accent-soft-8)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.28)]"
        >
          Editar etapas
        </button>
      </header>
      <ol className="mt-4 flex flex-wrap items-center gap-1.5" aria-label={`Etapas do funil ${pipeline.name}`}>
        {stages.map((s, i) => (
          <li key={s.id} className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] ${
                s.kind === "won"
                  ? "border-[rgba(22,163,74,0.25)] text-[#15803D]"
                  : s.kind === "lost"
                    ? "border-[var(--vyz-border)] text-[var(--vyz-text-muted)]"
                    : "border-[var(--vyz-border)] text-[var(--vyz-text)]"
              }`}
            >
              {s.title}
              {counts[s.id] ? <span className="tabular-nums text-[var(--vyz-text-muted)]">{counts[s.id]}</span> : null}
            </span>
            {i < stages.length - 1 && <span aria-hidden className="text-[var(--vyz-text-dim)]">›</span>}
          </li>
        ))}
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
