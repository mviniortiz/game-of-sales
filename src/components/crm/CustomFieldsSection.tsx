import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useDealCustomFields, useCustomFieldMutations } from "@/hooks/useCustomFields";
import { CustomFieldRenderer } from "./CustomFieldRenderer";
import { CustomFieldsManager } from "./CustomFieldsManager";

interface Props {
  dealId: string;
  compact?: boolean;
}

export function CustomFieldsSection({ dealId, compact }: Props) {
  const { profile } = useAuth();
  const companyId = (profile as any)?.company_id ?? null;
  const { fields } = useDealCustomFields(dealId, companyId);
  const { upsertFieldValue } = useCustomFieldMutations(companyId);
  const [managerOpen, setManagerOpen] = useState(false);

  if (!companyId) return null;

  const handleSave = (fieldDefinitionId: string, value: string | null) => {
    upsertFieldValue.mutate(
      { dealId, fieldDefinitionId, value },
      { onError: () => toast.error("Erro ao salvar campo") }
    );
  };

  if (fields.length === 0 && compact) {
    return (
      <>
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800/60">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Campos Personalizados
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slate-500 hover:text-white"
              onClick={() => setManagerOpen(true)}
            >
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-xs text-slate-500 italic">Nenhum campo configurado</p>
        </div>
        <CustomFieldsManager companyId={companyId} open={managerOpen} onOpenChange={setManagerOpen} />
      </>
    );
  }

  if (fields.length === 0 && !compact) {
    return (
      <>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Settings2 className="h-3.5 w-3.5" />
              Campos Personalizados
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setManagerOpen(true)}
            >
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="p-4">
            <p className="text-xs text-muted-foreground italic">Nenhum campo configurado</p>
          </div>
        </div>
        <CustomFieldsManager companyId={companyId} open={managerOpen} onOpenChange={setManagerOpen} />
      </>
    );
  }

  // Compact mode (DealCommandCenter left panel)
  if (compact) {
    return (
      <>
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Campos Personalizados
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slate-500 hover:text-white"
              onClick={() => setManagerOpen(true)}
            >
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          {fields.map((field) => (
            <CustomFieldRenderer
              key={field.id}
              field={field}
              onSave={(value) => handleSave(field.id, value)}
            />
          ))}
        </div>
        <CustomFieldsManager companyId={companyId} open={managerOpen} onOpenChange={setManagerOpen} />
      </>
    );
  }

  // Full mode (DealDetails sidebar)
  return (
    <>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Settings2 className="h-3.5 w-3.5" />
            Campos Personalizados
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setManagerOpen(true)}
          >
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="p-4 space-y-3">
          {fields.map((field) => (
            <CustomFieldRenderer
              key={field.id}
              field={field}
              onSave={(value) => handleSave(field.id, value)}
            />
          ))}
        </div>
      </div>
      <CustomFieldsManager companyId={companyId} open={managerOpen} onOpenChange={setManagerOpen} />
    </>
  );
}
