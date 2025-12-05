import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building2, Sparkles, Users, Box, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Company {
  id: string;
  name: string;
  plan: string;
  logo_url: string | null;
}

interface Profile {
  id: string;
  nome: string;
  email: string;
  is_super_admin: boolean;
}

export function AdminCompanies() {
  const { isSuperAdmin, activeCompanyId, companies: tenantCompanies } = useTenant();
  const { isAdmin, profile } = useAuth();
  const logoBucket = (import.meta as any).env?.VITE_SUPABASE_LOGO_BUCKET || "logos";
  const queryClient = useQueryClient();
  const [companyName, setCompanyName] = useState("");
  const [plan, setPlan] = useState("free");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploadFile, setLogoUploadFile] = useState<File | null>(null);
  const [assigningCompanyId, setAssigningCompanyId] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");

  const { data: companiesQueryData = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").order("name");
      if (error) throw error;
      return data as Company[];
    },
    enabled: isSuperAdmin,
  });

  const migrateProducts = useMutation({
    mutationFn: async () => {
      const { data: companiesData, error: companiesError } = await supabase.from("companies").select("id, name");
      if (companiesError) throw companiesError;

      const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const vyzon = companiesData?.find((c) => normalize(c.name).includes("vyzon"));
      const rota = companiesData?.find((c) => normalize(c.name).includes("rota de negocios"));

      if (!vyzon) throw new Error("Empresa Vyzon não encontrada");
      if (!rota) throw new Error("Empresa Rota de Negócios não encontrada");

      // Remove produto fora de escopo
      const { error: deleteError } = await supabase
        .from("produtos")
        .delete()
        .eq("company_id", vyzon.id)
        .ilike("nome", "%renovação rota anual%");
      if (deleteError) throw deleteError;

      // Migrar demais produtos Vyzon -> Rota de Negócios
      const { error: moveError } = await supabase
        .from("produtos")
        .update({ company_id: rota.id })
        .eq("company_id", vyzon.id);
      if (moveError) throw moveError;
    },
    onSuccess: () => {
      toast.success("Produtos migrados para Rota de Negócios (Renovação removida)");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao migrar produtos");
    },
  });

  const deleteCompany = useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase.from("companies").delete().eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empresa excluída");
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users-for-company"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao excluir empresa");
    },
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-users-for-company"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, email, is_super_admin, company_id");
      if (error) throw error;
      return data as (Profile & { company_id: string | null })[];
    },
    enabled: isSuperAdmin,
  });

  const targetCompanyForLists = assigningCompanyId || activeCompanyId || profile?.company_id || companiesQueryData[0]?.id;

  const { data: products = [] } = useQuery({
    queryKey: ["admin-products", targetCompanyForLists],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, valor, ativo, company_id")
        .eq("company_id", targetCompanyForLists)
        .order("nome");
      if (error) throw error;
      return data as any[];
    },
    enabled: (isSuperAdmin || isAdmin) && !!targetCompanyForLists,
  });

  const createCompany = useMutation({
    mutationFn: async () => {
      let logo_url: string | null = null;
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `company-logos/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(logoBucket)
          .upload(path, logoFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from(logoBucket).getPublicUrl(path);
        logo_url = data.publicUrl;
      }

      const { error } = await supabase.from("companies").insert({
        name: companyName,
        plan,
        logo_url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empresa criada");
      setCompanyName("");
      setPlan("free");
      setLogoFile(null);
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
    },
    onError: () => toast.error("Erro ao criar empresa"),
  });

  const assignUsers = useMutation({
    mutationFn: async () => {
      if (!assigningCompanyId) return;
      const { error } = await supabase
        .from("profiles")
        .update({ company_id: assigningCompanyId })
        .in("id", selectedUsers);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuários associados");
      setSelectedUsers([]);
      queryClient.invalidateQueries({ queryKey: ["admin-users-for-company"] });
    },
    onError: () => toast.error("Erro ao associar usuários"),
  });

  const createProduct = useMutation({
    mutationFn: async () => {
      const targetCompanyId = targetCompanyForLists;
      if (!targetCompanyId) throw new Error("Selecione uma empresa primeiro");

      // Parse price string (allows "1.234,56" or "1234.56")
      const clean = (productPrice || "").replace(/\./g, "").replace(",", ".");
      const valorNumber = parseFloat(clean);
      if (!Number.isFinite(valorNumber)) throw new Error("Preço inválido");

      const { error } = await supabase
        .from("produtos")
        .insert({
          nome: productName,
          valor: valorNumber,
          ativo: true,
          company_id: targetCompanyId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto criado e vinculado");
      setProductName("");
      setProductPrice("");
      queryClient.invalidateQueries({ queryKey: ["admin-products", targetCompanyForLists] });
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao criar produto"),
  });

  const uploadLogo = useMutation({
    mutationFn: async () => {
      const targetCompanyId = targetCompanyForLists;
      if (!targetCompanyId) throw new Error("Selecione uma empresa");
      if (!logoUploadFile) throw new Error("Selecione um arquivo de logo");

      const ext = logoUploadFile.name.split(".").pop();
      const path = `company-logos/${targetCompanyId}-${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(logoBucket)
        .upload(path, logoUploadFile, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from(logoBucket).getPublicUrl(path);

      const { error } = await supabase
        .from("companies")
        .update({ logo_url: data.publicUrl })
        .eq("id", targetCompanyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Logo atualizada");
      setLogoUploadFile(null);
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao atualizar logo"),
  });

  const updatePlan = useMutation({
    mutationFn: async ({ companyId, nextPlan }: { companyId: string; nextPlan: string }) => {
      const { error } = await supabase.from("companies").update({ plan: nextPlan }).eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plano atualizado");
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
    },
    onError: () => toast.error("Erro ao atualizar plano"),
  });

  const companies = isSuperAdmin ? companiesQueryData : tenantCompanies;
  const canManageProducts = isSuperAdmin || isAdmin;

  useEffect(() => {
    if (isSuperAdmin) {
      const fallback = activeCompanyId || companiesQueryData[0]?.id || null;
      setAssigningCompanyId((prev) => prev ?? fallback);
    } else if (!isSuperAdmin && isAdmin) {
      setAssigningCompanyId(profile?.company_id || null);
    }
  }, [isSuperAdmin, isAdmin, activeCompanyId, profile?.company_id, companiesQueryData]);

  if (!canManageProducts) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Acesso restrito. Contate o administrador para gerenciar empresas/produtos.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Criar Empresa (somente super-admin) */}
      {isSuperAdmin && (
        <Card className="border border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-indigo-600" />
              Nova Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Nome</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Rota de Negócios"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Plano</Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free (Dashboard, Metas, Preview Ranking)</SelectItem>
                  <SelectItem value="pro">Pro (Acesso completo)</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Logo (opcional)</Label>
              <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
            </div>
            <Button
              onClick={() => createCompany.mutate()}
              disabled={!companyName || createCompany.isPending}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md hover:scale-[1.01] transition-transform"
            >
              {createCompany.isPending ? "Criando..." : "Criar Empresa"}
            </Button>

            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                Empresas existentes
              </div>
              <div className="space-y-2 max-h-64 overflow-auto">
                {companies.map((c) => (
                  <div key={c.id} className="flex items-center justify-between border border-border rounded-md px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{c.name}</span>
                        <Badge variant="secondary" className="w-fit bg-muted text-muted-foreground text-[11px]">
                          {c.plan || "free"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updatePlan.mutate({ companyId: c.id, nextPlan: "pro" })}
                        className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      >
                        Setar Pro
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-rose-600 border-rose-200 hover:bg-rose-50"
                        onClick={() => {
                          const sure = window.confirm(`Tem certeza que deseja excluir a empresa "${c.name}"? Esta ação não pode ser desfeita.`);
                          if (sure) deleteCompany.mutate(c.id);
                        }}
                        disabled={deleteCompany.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {!companies.length && <p className="text-xs text-muted-foreground">Nenhuma empresa cadastrada</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selecionar Empresa + Produtos */}
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Box className="h-5 w-5 text-indigo-600" />
            Produtos da Empresa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Empresa alvo</Label>
            <select
              value={assigningCompanyId || ""}
              onChange={(e) => setAssigningCompanyId(e.target.value || null)}
              disabled={!isSuperAdmin}
              className="w-full h-10 rounded-md border border-border bg-white dark:bg-secondary text-foreground px-3 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-60"
            >
              <option value="">Selecione</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Logo da empresa</Label>
            <Input type="file" accept="image/*" onChange={(e) => setLogoUploadFile(e.target.files?.[0] || null)} />
            <Button
              onClick={() => uploadLogo.mutate()}
              disabled={!targetCompanyForLists || !logoUploadFile || uploadLogo.isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {uploadLogo.isPending ? "Enviando..." : "Atualizar Logo"}
            </Button>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Novo produto</Label>
            <Input
              placeholder="Ex: Comunidade Pro"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
            <Input
              placeholder="Preço (R$)"
              value={productPrice}
              onChange={(e) => setProductPrice(e.target.value)}
            />
            <Button
              onClick={() => createProduct.mutate()}
              disabled={!targetCompanyForLists || !productName || createProduct.isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {createProduct.isPending ? "Salvando..." : "Adicionar Produto"}
            </Button>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Produtos existentes</Label>
            <div className="space-y-2 max-h-64 overflow-auto">
              {products
                .filter((p) => {
                  const target = targetCompanyForLists;
                  return target ? p.company_id === target : true;
                })
                .map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm border border-border rounded-md px-3 py-2">
                    <span>{p.nome}</span>
                    <Badge variant="secondary" className="bg-muted text-muted-foreground">
                      R$ {Number(p.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </Badge>
                  </div>
                ))}
              {!products.length && <p className="text-xs text-muted-foreground">Nenhum produto</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Associar Vendedores (somente super-admin) */}
      {isSuperAdmin && (
        <Card className="border border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              Associar Vendedores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Empresa alvo</Label>
              <select
                value={assigningCompanyId || activeCompanyId || ""}
                onChange={(e) => setAssigningCompanyId(e.target.value || null)}
                className="w-full h-10 rounded-md border border-border bg-white dark:bg-secondary text-foreground px-3 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Selecione</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 max-h-64 overflow-auto">
              {loadingUsers ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : (
                users.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center justify-between border border-border rounded-md px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-muted text-foreground">
                          {u.nome ? u.nome[0] : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{u.nome || u.email}</span>
                        <span className="text-xs text-muted-foreground">{u.email}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {u.is_super_admin && (
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100">
                          Super
                        </Badge>
                      )}
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={selectedUsers.includes(u.id)}
                        onChange={(e) => {
                          setSelectedUsers((prev) =>
                            e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)
                          );
                        }}
                      />
                    </div>
                  </label>
                ))
              )}
            </div>
            <Button
              onClick={() => assignUsers.mutate()}
              disabled={!assigningCompanyId || selectedUsers.length === 0 || assignUsers.isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {assignUsers.isPending ? "Associando..." : "Associar selecionados"}
            </Button>
          </CardContent>
        </Card>
      )}

    </div>
  );
}

