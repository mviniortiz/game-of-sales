import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { useCustomFieldDefinitions, useCustomFieldMutations } from "@/hooks/useCustomFields";
import type { CustomFieldType } from "@/types/customFields";

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Texto",
  number: "Número",
  select: "Lista de opções",
  date: "Data",
  boolean: "Sim/Não",
};

interface Props {
  companyId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomFieldsManager({ companyId, open, onOpenChange }: Props) {
  const { data: definitions = [] } = useCustomFieldDefinitions(companyId);
  const { createDefinition, deleteDefinition } = useCustomFieldMutations(companyId);

  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState<CustomFieldType>("text");
  const [options, setOptions] = useState("");
  const [isRequired, setIsRequired] = useState(false);

  const handleAdd = () => {
    if (!fieldName.trim()) {
      toast.error("Nome do campo é obrigatório");
      return;
    }

    if (fieldType === "select" && !options.trim()) {
      toast.error("Adicione pelo menos uma opção");
      return;
    }

    const duplicate = definitions.find(
      (d) => d.field_name.toLowerCase() === fieldName.trim().toLowerCase()
    );
    if (duplicate) {
      toast.error("Já existe um campo com esse nome");
      return;
    }

    createDefinition.mutate(
      {
        field_name: fieldName.trim(),
        field_type: fieldType,
        options:
          fieldType === "select"
            ? options.split(",").map((o) => o.trim()).filter(Boolean)
            : null,
        is_required: isRequired,
        position: definitions.length,
      },
      {
        onSuccess: () => {
          toast.success("Campo criado!");
          setFieldName("");
          setFieldType("text");
          setOptions("");
          setIsRequired(false);
        },
        onError: () => toast.error("Erro ao criar campo"),
      }
    );
  };

  const handleDelete = (id: string, name: string) => {
    deleteDefinition.mutate(id, {
      onSuccess: () => toast.success(`Campo "${name}" removido`),
      onError: () => toast.error("Erro ao remover campo"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Campos Personalizados</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Existing fields */}
          {definitions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Campos ativos
              </Label>
              <div className="space-y-1.5">
                {definitions.map((def) => (
                  <div
                    key={def.id}
                    className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      <span className="text-sm font-medium truncate">
                        {def.field_name}
                      </span>
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                        {FIELD_TYPE_LABELS[def.field_type as CustomFieldType]}
                      </span>
                      {def.is_required && (
                        <span className="text-[10px] text-amber-500 shrink-0">*</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleDelete(def.id, def.field_name)}
                      aria-label={`Remover campo ${def.field_name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new field */}
          <div className="space-y-3 rounded-lg border border-dashed p-4">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Novo campo
            </Label>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome</Label>
                <Input
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  placeholder="Ex: CNPJ, Origem..."
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select
                  value={fieldType}
                  onValueChange={(v) => setFieldType(v as CustomFieldType)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {fieldType === "select" && (
              <div className="space-y-1">
                <Label className="text-xs">Opções (separadas por vírgula)</Label>
                <Input
                  value={options}
                  onChange={(e) => setOptions(e.target.value)}
                  placeholder="Opção 1, Opção 2, Opção 3"
                  className="h-9"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={isRequired}
                  onCheckedChange={setIsRequired}
                  id="required"
                />
                <Label htmlFor="required" className="text-xs cursor-pointer">
                  Obrigatório
                </Label>
              </div>

              <Button
                size="sm"
                onClick={handleAdd}
                disabled={createDefinition.isPending}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
