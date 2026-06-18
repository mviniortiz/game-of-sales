// ─────────────────────────────────────────────────────────────────────────────
// F4E.3 (2026-05-19) — Helpers compartilhados pelas abas de Configurações > EVA.
//
// TagList: input + lista de chips (Enter pra adicionar, X pra remover).
// FormCard: card padronizado com header (ícone + título + helper) e body.
// FieldRow: label + hint + slot do campo.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TagListProps {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  disabled?: boolean;
  maxTagLength?: number;
}

export function TagList({
  values,
  onChange,
  placeholder,
  disabled,
  maxTagLength = 80,
}: TagListProps) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (trimmed.length > maxTagLength) {
      toast.error(`Use no máximo ${maxTagLength} caracteres por item`);
      return;
    }
    if (values.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...values, trimmed]);
    setDraft("");
  };

  const remove = (idx: number) => {
    onChange(values.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          placeholder={placeholder}
          className="h-9 text-sm"
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={commit}
          disabled={disabled || !draft.trim()}
          className="shrink-0"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Adicionar
        </Button>
      </div>

      {values.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/70">Nenhum item ainda.</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {values.map((v, i) => (
            <li key={`${v}-${i}`}>
              <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 pl-2.5 pr-1 py-1 text-xs text-foreground">
                {v}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted"
                    aria-label={`Remover ${v}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FormCard({
  icon,
  title,
  helper,
  children,
  trailing,
}: {
  icon: React.ReactNode;
  title: string;
  helper?: string;
  children: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  // F4E.2.2: mais peso visual — border #D9E2EC sólida, shadow sutil
  // permanente, header e body com padding maior e título mais forte.
  return (
    <section
      className="rounded-2xl bg-card overflow-hidden"
      style={{
        border: "1px solid #D9E2EC",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 10px 30px rgba(15,23,42,0.045)",
      }}
    >
      <header
        className="px-6 py-4 flex items-center gap-3"
        style={{ borderBottom: "1px solid #EAF0F6" }}
      >
        {icon && (
          <span
            className="inline-flex items-center justify-center h-7 w-7 rounded-lg shrink-0"
            style={{ background: "#F6F4EF", border: "1px solid #E6EDF5" }}
          >
            {icon}
          </span>
        )}
        <h3 className="text-[14.5px] font-semibold text-foreground tracking-tight">
          {title}
        </h3>
        {helper && (
          <span className="ml-auto text-[11.5px] text-muted-foreground/80 hidden sm:inline">
            {helper}
          </span>
        )}
        {trailing && <div className={helper ? "ml-3" : "ml-auto"}>{trailing}</div>}
      </header>
      <div className="px-6 py-6 space-y-5">{children}</div>
    </section>
  );
}

export function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      {hint && (
        <p className="text-[11px] text-muted-foreground leading-relaxed">{hint}</p>
      )}
      <div className="pt-0.5">{children}</div>
    </div>
  );
}

// Aviso amber pra estado "non-admin"
export function ReadOnlyBanner() {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-start gap-2.5">
      <svg
        className="h-4 w-4 text-amber-500 mt-0.5 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p className="text-sm text-foreground">
        Só admins podem editar o contexto da EVA. Você consegue ler, mas as
        alterações ficam desabilitadas.
      </p>
    </div>
  );
}
