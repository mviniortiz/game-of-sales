import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Building2, Upload, X } from "lucide-react";
import { formatError } from "@/lib/utils";

const TEAM_SIZES = [
  { value: "1", label: "Só eu" },
  { value: "2-5", label: "2 a 5 pessoas" },
  { value: "6-10", label: "6 a 10 pessoas" },
  { value: "11-25", label: "11 a 25 pessoas" },
  { value: "26-50", label: "26 a 50 pessoas" },
  { value: "50+", label: "Mais de 50" },
];

const maskCNPJ = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
};

export default function Organizacao() {
  const { isAdmin, companyId } = useAuth();
  const { activeCompanyId } = useTenant();
  const effectiveCompanyId = activeCompanyId || companyId;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companySegment, setCompanySegment] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (effectiveCompanyId) load();
  }, [effectiveCompanyId]);

  const load = async () => {
    if (!effectiveCompanyId) return;
    const { data, error } = await supabase
      .from("companies")
      .select("name, logo_url, segment, cnpj, team_size, website, phone")
      .eq("id", effectiveCompanyId)
      .maybeSingle();
    if (error) return;
    if (data) {
      const d = data as any;
      setCompanyName(d.name || "");
      setCompanyLogo(d.logo_url || null);
      setCompanySegment(d.segment || "");
      setCnpj(d.cnpj ? maskCNPJ(d.cnpj) : "");
      setTeamSize(d.team_size || "");
      setWebsite(d.website || "");
      setPhone(d.phone ? maskPhone(d.phone) : "");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !effectiveCompanyId) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo deve ter menos de 2MB");
      return;
    }
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${effectiveCompanyId}/logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("company-logos")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage
        .from("company-logos")
        .getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;
      await supabase
        .from("companies")
        .update({ logo_url: publicUrl })
        .eq("id", effectiveCompanyId);
      setCompanyLogo(publicUrl);
      toast.success("Logo atualizado");
    } catch (err) {
      toast.error(`Erro ao enviar logo: ${formatError(err)}`);
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    if (!effectiveCompanyId) return;
    await supabase
      .from("companies")
      .update({ logo_url: null })
      .eq("id", effectiveCompanyId);
    setCompanyLogo(null);
    toast.success("Logo removido");
  };

  const handleSave = async () => {
    if (!effectiveCompanyId) return;
    setSaving(true);
    const payload: Record<string, any> = {
      name: companyName,
      segment: companySegment || null,
      cnpj: cnpj.replace(/\D/g, "") || null,
      team_size: teamSize || null,
      website: website.trim() || null,
      phone: phone.replace(/\D/g, "") || null,
    };
    const { error } = await supabase
      .from("companies")
      .update(payload)
      .eq("id", effectiveCompanyId);
    if (error) toast.error(`Erro ao salvar: ${formatError(error)}`);
    else toast.success("Empresa atualizada");
    setSaving(false);
  };

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Apenas admins podem editar a organização.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/50 flex items-center gap-2.5">
          <Building2 className="h-4 w-4 text-muted-foreground/70" />
          <h2 className="text-[13px] font-semibold text-foreground">
            Dados da empresa
          </h2>
        </div>
        <div className="px-5 py-5 space-y-5">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt="Logo"
                  className="w-16 h-16 rounded-xl object-contain bg-muted/50 shrink-0 border border-border/50"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 border border-border/50">
                  <Building2 className="h-6 w-6 text-muted-foreground/50" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground">Logo</Label>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5 mb-2">
                PNG ou JPG, até 2MB
              </p>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {companyLogo ? "Trocar" : "Enviar"}
                </Button>
                {companyLogo && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleRemoveLogo}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Remover
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="h-px bg-border/50" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">
                Nome da empresa
              </Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">CNPJ</Label>
              <Input
                value={cnpj}
                onChange={(e) => setCnpj(maskCNPJ(e.target.value))}
                placeholder="00.000.000/0000-00"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Tamanho do time
              </Label>
              <Select value={teamSize} onValueChange={setTeamSize}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_SIZES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Website</Label>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://suaempresa.com.br"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">
                Telefone comercial
              </Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar alterações
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
