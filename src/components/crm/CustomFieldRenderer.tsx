import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CustomFieldWithValue } from "@/types/customFields";

interface Props {
  field: CustomFieldWithValue;
  onSave: (value: string | null) => void;
}

export function CustomFieldRenderer({ field, onSave }: Props) {
  const [localValue, setLocalValue] = useState(field.fieldValue ?? "");

  const handleBlur = () => {
    const trimmed = localValue.trim();
    if (trimmed !== (field.fieldValue ?? "")) {
      onSave(trimmed || null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      (e.target as HTMLElement).blur();
    }
  };

  switch (field.field_type) {
    case "text":
      return (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{field.field_name}</Label>
          <Input
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={`Insira ${field.field_name.toLowerCase()}...`}
            className="h-8 text-sm bg-background"
          />
        </div>
      );

    case "number":
      return (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{field.field_name}</Label>
          <Input
            type="number"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="0"
            className="h-8 text-sm bg-background"
          />
        </div>
      );

    case "date":
      return (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{field.field_name}</Label>
          <Input
            type="date"
            value={localValue}
            onChange={(e) => {
              setLocalValue(e.target.value);
              onSave(e.target.value || null);
            }}
            className="h-8 text-sm bg-background [color-scheme:dark]"
          />
        </div>
      );

    case "boolean":
      return (
        <div className="flex items-center gap-2 py-1">
          <Checkbox
            checked={localValue === "true"}
            onCheckedChange={(checked) => {
              const val = String(!!checked);
              setLocalValue(val);
              onSave(val);
            }}
          />
          <Label className="text-sm cursor-pointer">{field.field_name}</Label>
        </div>
      );

    case "select":
      return (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{field.field_name}</Label>
          <Select
            value={localValue || undefined}
            onValueChange={(val) => {
              setLocalValue(val);
              onSave(val);
            }}
          >
            <SelectTrigger className="h-8 text-sm bg-background">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    default:
      return null;
  }
}
