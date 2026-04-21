import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Building2 } from "lucide-react";
import { formatError } from "@/lib/utils";

export default function Organizacao() {
  const { isAdmin, companyId } = useAuth();
  const { activeCompanyId } = useTenant();
  const effectiveCompanyId = activeCompanyId || companyId;

  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companySegment, setCompanySegment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (effectiveCompanyId) load();
  }, [effectiveCompanyId]);

  const load = async () => {
    if (!effectiveCompanyId) return;
    const { data, error } = await supabase
      .from("companies")
      .select("name, logo_url, segment")
      .eq("id", effectiveCompanyId)
      .maybeSingle();
    if (error) return;
    if (data) {
      setCompanyName(data.name || "");
      setCompanyLogo((data as any).logo_url || null);
      setCompanySegment((data as any).segment || "");
    }
  };

  const handleSave = async () => {
    if (!effectiveCompanyId) return;
    setSaving(true);
    const payload: Record<string, any> = { name: companyName };
    if (companySegment) payload.segment = companySegment;
    const { error } = await supabase.from("companies").update(payload).eq("id", effectiveCompanyId);
    if (error) toast.error(`Erro ao salvar: ${formatError(error)}`);
    else toast.success("Empresa atualizada");
    setSaving(false);
  };

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Apenas admins podem editar a organização.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/50 flex items-center gap-2.5">
          <Building2 className="h-4 w-4 text-muted-foreground/70" />
          <h2 className="text-[13px] font-semibold text-foreground">Dados da empresa</h2>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div className="flex items-center gap-4">
            {companyLogo ? (
              <img src={companyLogo} alt="Logo" className="w-12 h-12 rounded-xl object-contain bg-muted/50 shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-muted-foreground/50" />
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nome da empresa</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Segmento</Label>
            <Input
              value={companySegment}
              onChange={(e) => setCompanySegment(e.target.value)}
              placeholder="Ex: Infoprodutos, SaaS, Serviços"
              className="h-9 text-sm"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
