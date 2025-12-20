import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2,
  Plus,
  Users,
  Package,
  MoreHorizontal,
  Pencil,
  LogIn,
  Trash2,
  Crown,
  Sparkles,
  CheckCircle,
  XCircle,
  Search,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

interface CompanyWithCounts {
  id: string;
  name: string;
  plan: string;
  logo_url: string | null;
  status?: string;
  created_at: string;
  user_count: number;
  product_count: number;
}

// Plan badge styles
const getPlanBadge = (plan: string) => {
  switch (plan?.toLowerCase()) {
    case "pro":
    case "enterprise":
      return (
        <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 shadow-sm">
          <Crown className="h-3 w-3 mr-1" />
          Pro
        </Badge>
      );
    case "plus":
      return (
        <Badge className="bg-blue-500 text-white border-0">
          <Sparkles className="h-3 w-3 mr-1" />
          Plus
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
          Starter
        </Badge>
      );
  }
};

// Status badge
const getStatusBadge = (status: string = "active") => {
  if (status === "active" || !status) {
    return (
      <Badge className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-0">
        <CheckCircle className="h-3 w-3 mr-1" />
        Ativo
      </Badge>
    );
  }
  return (
    <Badge className="bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-0">
      <XCircle className="h-3 w-3 mr-1" />
      Inadimplente
    </Badge>
  );
};

export function AdminCompanies() {
  const { isSuperAdmin, switchCompany } = useTenant();
  const { isAdmin, profile } = useAuth();
  const queryClient = useQueryClient();
  const logoBucket = (import.meta as any).env?.VITE_SUPABASE_LOGO_BUCKET || "logos";

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyWithCounts | null>(null);

  // Form states
  const [companyName, setCompanyName] = useState("");
  const [plan, setPlan] = useState("free");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch companies with counts
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["admin-companies-with-counts"],
    queryFn: async () => {
      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .from("companies")
        .select("*")
        .order("name");

      if (companiesError) throw companiesError;

      // Fetch user counts per company
      const { data: userCounts, error: userError } = await supabase
        .from("profiles")
        .select("company_id");

      if (userError) throw userError;

      // Fetch product counts per company
      const { data: productCounts, error: productError } = await supabase
        .from("produtos")
        .select("company_id");

      if (productError) throw productError;

      // Aggregate counts
      const userCountMap = new Map<string, number>();
      const productCountMap = new Map<string, number>();

      userCounts?.forEach((u: any) => {
        if (u.company_id) {
          userCountMap.set(u.company_id, (userCountMap.get(u.company_id) || 0) + 1);
        }
      });

      productCounts?.forEach((p: any) => {
        if (p.company_id) {
          productCountMap.set(p.company_id, (productCountMap.get(p.company_id) || 0) + 1);
        }
      });

      return (companiesData || []).map((c: any) => ({
        ...c,
        user_count: userCountMap.get(c.id) || 0,
        product_count: productCountMap.get(c.id) || 0,
      })) as CompanyWithCounts[];
    },
    enabled: isSuperAdmin,
  });

  // Create company mutation
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
      toast.success("Empresa criada com sucesso!");
      setCompanyName("");
      setPlan("free");
      setLogoFile(null);
      setShowCreateModal(false);
      queryClient.invalidateQueries({ queryKey: ["admin-companies-with-counts"] });
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao criar empresa"),
  });

  // Update company mutation
  const updateCompany = useMutation({
    mutationFn: async ({ companyId, updates }: { companyId: string; updates: any }) => {
      const { error } = await supabase
        .from("companies")
        .update(updates)
        .eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empresa atualizada!");
      setShowEditModal(false);
      setEditingCompany(null);
      queryClient.invalidateQueries({ queryKey: ["admin-companies-with-counts"] });
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao atualizar empresa"),
  });

  // Delete company mutation
  const deleteCompany = useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase.from("companies").delete().eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empresa excluída");
      queryClient.invalidateQueries({ queryKey: ["admin-companies-with-counts"] });
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao excluir empresa"),
  });

  // Filter companies by search
  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle "Gerenciar" (switch to that company)
  const handleManage = (company: CompanyWithCounts) => {
    switchCompany(company.id);
    toast.success(`Alternado para: ${company.name}`);
  };

  // Handle edit
  const handleEdit = (company: CompanyWithCounts) => {
    setEditingCompany(company);
    setShowEditModal(true);
  };

  // Handle delete
  const handleDelete = (company: CompanyWithCounts) => {
    const sure = window.confirm(
      `Tem certeza que deseja excluir a empresa "${company.name}"? Esta ação não pode ser desfeita.`
    );
    if (sure) deleteCompany.mutate(company.id);
  };

  if (!isSuperAdmin && !isAdmin) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Acesso restrito. Contate o administrador para gerenciar empresas.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-6 w-6 text-indigo-600" />
            Empresas Clientes
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gerencie todas as empresas (tenants) do sistema
          </p>
        </div>

        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25">
              <Plus className="h-4 w-4 mr-2" />
              Nova Empresa Manual
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white">Criar Nova Empresa</DialogTitle>
              <DialogDescription className="text-gray-500">
                Adicione uma nova empresa manualmente ao sistema.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-300">Nome da Empresa *</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex: Rota de Negócios"
                  className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-300">Plano</Label>
                <Select value={plan} onValueChange={setPlan}>
                  <SelectTrigger className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700">
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Starter (Gratuito)</SelectItem>
                    <SelectItem value="plus">Plus</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-300">Logo (opcional)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => createCompany.mutate()}
                disabled={!companyName || createCompany.isPending}
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {createCompany.isPending ? "Criando..." : "Criar Empresa"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar empresa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700"
          />
        </div>
        <Badge variant="outline" className="text-gray-500 dark:text-gray-400 border-gray-300 dark:border-slate-700">
          {filteredCompanies.length} empresas
        </Badge>
      </div>

      {/* Data Table */}
      <Card className="border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800">
              <TableHead className="text-gray-600 dark:text-gray-300 font-semibold">Empresa</TableHead>
              <TableHead className="text-gray-600 dark:text-gray-300 font-semibold">Plano</TableHead>
              <TableHead className="text-gray-600 dark:text-gray-300 font-semibold text-center">Usuários</TableHead>
              <TableHead className="text-gray-600 dark:text-gray-300 font-semibold text-center">Produtos</TableHead>
              <TableHead className="text-gray-600 dark:text-gray-300 font-semibold">Status</TableHead>
              <TableHead className="text-gray-600 dark:text-gray-300 font-semibold text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                  Carregando empresas...
                </TableCell>
              </TableRow>
            ) : filteredCompanies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <Building2 className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">Nenhuma empresa encontrada</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredCompanies.map((company) => (
                <TableRow
                  key={company.id}
                  className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group"
                >
                  {/* Empresa */}
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-gray-200 dark:border-slate-700">
                        {company.logo_url ? (
                          <AvatarImage src={company.logo_url} alt={company.name || "Empresa"} />
                        ) : null}
                        <AvatarFallback className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold">
                          {(company.name || "??").substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {company.name || <span className="text-gray-400 italic">Sem nome</span>}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          @{(company.name || "empresa").toLowerCase().replace(/\s+/g, "")}.com
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Plano */}
                  <TableCell>
                    {getPlanBadge(company.plan)}
                  </TableCell>

                  {/* Usuários */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5 text-gray-600 dark:text-gray-300">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{company.user_count}</span>
                      <span className="text-xs text-gray-400">users</span>
                    </div>
                  </TableCell>

                  {/* Produtos */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5 text-gray-600 dark:text-gray-300">
                      <Package className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{company.product_count}</span>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    {getStatusBadge(company.status)}
                  </TableCell>

                  {/* Ações */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleManage(company)}
                        className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-500/30 dark:hover:bg-indigo-500/10"
                      >
                        <LogIn className="h-4 w-4 mr-1" />
                        Gerenciar
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800">
                          <DropdownMenuItem onClick={() => handleEdit(company)} className="cursor-pointer">
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(company)}
                            className="text-rose-600 cursor-pointer focus:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Editar Empresa</DialogTitle>
            <DialogDescription className="text-gray-500">
              Atualize as informações da empresa.
            </DialogDescription>
          </DialogHeader>
          {editingCompany && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-300">Nome da Empresa</Label>
                <Input
                  defaultValue={editingCompany.name}
                  onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                  className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-300">Plano</Label>
                <Select
                  defaultValue={editingCompany.plan || "free"}
                  onValueChange={(value) => setEditingCompany({ ...editingCompany, plan: value })}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Starter</SelectItem>
                    <SelectItem value="plus">Plus</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (editingCompany) {
                  updateCompany.mutate({
                    companyId: editingCompany.id,
                    updates: { name: editingCompany.name, plan: editingCompany.plan },
                  });
                }
              }}
              disabled={updateCompany.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {updateCompany.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
