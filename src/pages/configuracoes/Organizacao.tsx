import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Buildings, CircleNotch, UploadSimple, X } from "@phosphor-icons/react";
import { formatError } from "@/lib/utils";
import { SOLAR_SEGMENT } from "@/lib/eva/blueprint";
import { usePreviewConfig } from "./preview";

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

// A Lume liga o pacote solar pela chave exata (blueprint.ts). Os demais valores
// são rótulos: continuam gravados como texto, como sempre foram.
const SEGMENT_OPTIONS = [
  { value: SOLAR_SEGMENT, label: "Energia solar" },
  { value: "Imobiliária / incorporadora", label: "Imobiliária / incorporadora" },
  { value: "Tecnologia / SaaS", label: "Tecnologia / SaaS" },
  { value: "Financeiro / Seguros", label: "Financeiro / Seguros" },
  { value: "Outro", label: "Outro" },
];

export default function Organizacao() {
  const { isAdmin, companyId } = useAuth();
  const { activeCompanyId } = useTenant();
  const effectiveCompanyId = activeCompanyId || companyId;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const preview = usePreviewConfig();

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

  if (!isAdmin && !preview) {
    return <div className="vp-vazio">Apenas admins podem editar a organização.</div>;
  }

  return (
    <section className="vp-cartao" aria-labelledby="org-dados">
      <h2 id="org-dados" className="vp-rotulo">Dados da empresa</h2>
      <p className="vp-sub">Nome, logo e contato da sua empresa.</p>

      <div className="mt-5 flex items-center gap-4">
        {companyLogo ? (
          <img
            src={companyLogo}
            alt="Logo da empresa"
            width={64}
            height={64}
            className="h-16 w-16 shrink-0 rounded-xl bg-[var(--vyz-bg)] object-contain"
          />
        ) : (
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-[var(--vyz-bg)] text-[var(--vyz-text-dim)]">
            <Buildings size={24} aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="vp-rotulo">Logo</p>
          <p className="vp-campo__ajuda mt-0.5">PNG ou JPG, até 2MB</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <button
              type="button"
              className="vp-botao vp-botao--quieto"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingLogo}
            >
              {uploadingLogo ? (
                <CircleNotch size={16} className="animate-spin motion-reduce:animate-none" aria-hidden />
              ) : (
                <UploadSimple size={16} aria-hidden />
              )}
              {companyLogo ? "Trocar" : "Enviar"}
            </button>
            {companyLogo && (
              <button type="button" className="vp-botao vp-botao--quieto" onClick={handleRemoveLogo}>
                <X size={16} aria-hidden />
                Remover
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="vp-separa my-5" />

      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <label className="vp-campo sm:col-span-2">
          <span className="vp-rotulo">Nome da empresa</span>
          <input id="org-name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} autoComplete="organization" />
        </label>

        <label className="vp-campo">
          <span className="vp-rotulo">CNPJ</span>
          <input
            id="org-cnpj"
            value={cnpj}
            onChange={(e) => setCnpj(maskCNPJ(e.target.value))}
            placeholder="00.000.000/0000-00"
            inputMode="numeric"
          />
        </label>

        <div className="vp-campo">
          <span className="vp-rotulo" id="org-team-label">Tamanho do time</span>
          <Select value={teamSize} onValueChange={setTeamSize}>
            <SelectTrigger aria-labelledby="org-team-label">
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

        <div className="vp-campo">
          <label htmlFor="org-segment" className="vp-rotulo">Segmento</label>
          <Select value={companySegment} onValueChange={setCompanySegment}>
            <SelectTrigger id="org-segment">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {SEGMENT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
              {/* Valor antigo fora da lista continua selecionável, sem ser apagado ao salvar. */}
              {companySegment && !SEGMENT_OPTIONS.some((o) => o.value === companySegment) && (
                <SelectItem value={companySegment}>{companySegment}</SelectItem>
              )}
            </SelectContent>
          </Select>
          {companySegment === SOLAR_SEGMENT && (
            <p className="vp-campo__ajuda">A Lume usa o pacote de energia solar.</p>
          )}
        </div>

        <label className="vp-campo">
          <span className="vp-rotulo">Website</span>
          <input
            id="org-website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://suaempresa.com.br"
            inputMode="url"
          />
        </label>

        <label className="vp-campo sm:col-span-2">
          <span className="vp-rotulo">Telefone comercial</span>
          <input
            id="org-phone"
            value={phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))}
            placeholder="(11) 99999-9999"
            inputMode="tel"
          />
        </label>
      </div>

      <div className="flex justify-end pt-1">
        <button type="button" className="vp-botao" onClick={handleSave} disabled={saving}>
          {saving && <CircleNotch size={16} className="animate-spin motion-reduce:animate-none" aria-hidden />}
          Salvar alterações
        </button>
      </div>
    </section>
  );
}
