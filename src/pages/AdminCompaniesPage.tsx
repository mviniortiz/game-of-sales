import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2, Plus, Sparkles } from "lucide-react";

interface Company {
  id: string;
  name: string;
  plan: string;
  logo_url: string | null;
}

export const AdminCompaniesPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [plan, setPlan] = useState("free");
  const logoBucket = (import.meta as any).env?.VITE_SUPABASE_LOGO_BUCKET || "logos";

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["admin-companies-master"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").order("name");
      if (error) throw error;
      return data as Company[];
    },
    enabled: isAdmin,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin-companies-products-count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("produtos").select("id, company_id");
      if (error) throw error;
      return data as { id: string; company_id: string }[];
    },
    enabled: isAdmin,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["admin-companies-users-count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, company_id");
      if (error) throw error;
      return data as { id: string; company_id: string }[];
    },
    enabled: isAdmin,
  });

  const counts = useMemo(() => {
    const productCount: Record<string, number> = {};
    const userCount: Record<string, number> = {};
    products.forEach((p) => {
      productCount[p.company_id] = (productCount[p.company_id] || 0) + 1;
    });
    users.forEach((u) => {
      userCount[u.company_id] = (userCount[u.company_id] || 0) + 1;
    });
    return { productCount, userCount };
  }, [products, users]);

  const createCompany = useMutation({
    mutationFn: async () => {
      if (!companyName) throw new Error("Informe o nome");
      const { error } = await supabase.from("companies").insert({
        name: companyName,
        plan,
        logo_url: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empresa criada");
      setCompanyName("");
      setPlan("free");
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-companies-master"] });
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao criar empresa"),
  });

  if (!isAdmin) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Apenas administradores podem acessar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-200">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Empresas</h1>
            <p className="text-sm text-muted-foreground">Selecione uma empresa para gerenciar detalhes.</p>
          </div>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
              <Plus className="h-4 w-4" />
              Nova Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Criar empresa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Inc." />
              </div>
              <div className="space-y-2">
                <Label>Plano</Label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full h-10 rounded-md border border-border bg-card text-foreground px-3"
                >
                  <option value="free">Starter</option>
                  <option value="plus">Plus</option>
                  <option value="pro">Pro</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => createCompany.mutate()} disabled={createCompany.isPending || !companyName}>
                {createCompany.isPending ? "Salvando..." : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            Lista de Empresas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Logo</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Usuários</TableHead>
                  <TableHead>Produtos</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && companies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhuma empresa cadastrada.
                    </TableCell>
                  </TableRow>
                )}
                {companies.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/60"
                    onClick={() => navigate(`/admin/companies/${c.id}`)}
                  >
                    <TableCell>
                      <Avatar className="h-10 w-10">
                        {c.logo_url ? <AvatarImage src={c.logo_url} alt={c.name} /> : null}
                        <AvatarFallback className="bg-muted text-foreground">
                          {c.name?.slice(0, 2)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {c.plan || "free"}
                      </Badge>
                    </TableCell>
                    <TableCell>{counts.userCount[c.id] || 0}</TableCell>
                    <TableCell>{counts.productCount[c.id] || 0}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/admin/companies/${c.id}`); }}>
                        Gerenciar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCompaniesPage;

