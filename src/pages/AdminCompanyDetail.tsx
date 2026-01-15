import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Upload, Users, ShoppingCart, Settings, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Company {
  id: string;
  name: string;
  plan: string;
  logo_url: string | null;
}

export const AdminCompanyDetail = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("free");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productModal, setProductModal] = useState(false);
  const logoBucket = (import.meta as any).env?.VITE_SUPABASE_LOGO_BUCKET || "logos";

  const { data: company, isLoading } = useQuery({
    queryKey: ["company-detail", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").eq("id", companyId).maybeSingle();
      if (error) throw error;
      return data as Company | null;
    },
    enabled: !!companyId && isAdmin,
    onSuccess: (data) => {
      if (data) {
        setName(data.name || "");
        setPlan(data.plan || "free");
      }
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["company-products", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("produtos").select("id, nome, valor, ativo").eq("company_id", companyId).order("nome");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!companyId && isAdmin,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["company-users", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, nome, email, avatar_url").eq("company_id", companyId).order("nome");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!companyId && isAdmin,
  });

  const updateCompany = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não encontrada");
      const { error } = await supabase.from("companies").update({ name, plan }).eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empresa atualizada");
      queryClient.invalidateQueries({ queryKey: ["company-detail", companyId] });
      queryClient.invalidateQueries({ queryKey: ["admin-companies-master"] });
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao atualizar empresa"),
  });

  const uploadLogo = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não encontrada");
      if (!logoFile) throw new Error("Selecione um arquivo");
      const ext = logoFile.name.split(".").pop();
      const path = `company-logos/${companyId}-${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(logoBucket).upload(path, logoFile, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from(logoBucket).getPublicUrl(path);
      const { error } = await supabase.from("companies").update({ logo_url: data.publicUrl }).eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Logo atualizada");
      setLogoFile(null);
      queryClient.invalidateQueries({ queryKey: ["company-detail", companyId] });
      queryClient.invalidateQueries({ queryKey: ["admin-companies-master"] });
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao enviar logo"),
  });

  const addProduct = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não encontrada");
      const clean = (productPrice || "").replace(/\./g, "").replace(",", ".");
      const valorNumber = parseFloat(clean);
      if (!Number.isFinite(valorNumber)) throw new Error("Preço inválido");
      const { error } = await supabase
        .from("produtos")
        .insert({ nome: productName, valor: valorNumber, ativo: true, company_id: companyId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto adicionado");
      setProductName("");
      setProductPrice("");
      setProductModal(false);
      queryClient.invalidateQueries({ queryKey: ["company-products", companyId] });
      queryClient.invalidateQueries({ queryKey: ["admin-companies-products-count"] });
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao adicionar produto"),
  });

  const totalProducts = products.length;
  const totalUsers = users.length;

  if (!isAdmin) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Apenas administradores podem acessar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/companies")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar para Empresas
        </Button>
        {company && <Badge variant="secondary">{company.name}</Badge>}
      </div>

      <Card className="border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Gerenciar Empresa</CardTitle>
          <p className="text-sm text-muted-foreground">{company?.name}</p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="overview">Configurações</TabsTrigger>
              <TabsTrigger value="products">Produtos</TabsTrigger>
              <TabsTrigger value="team">Time</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
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
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14">
                    {company?.logo_url ? <AvatarImage src={company.logo_url} alt={company.name} /> : null}
                    <AvatarFallback className="bg-muted text-foreground">
                      {company?.name?.slice(0, 2)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <Label>Logo</Label>
                    <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                  </div>
                </div>
                <Button onClick={() => uploadLogo.mutate()} disabled={!logoFile || uploadLogo.isPending}>
                  {uploadLogo.isPending ? "Enviando..." : "Atualizar Logo"}
                </Button>
              </div>
              <Button onClick={() => updateCompany.mutate()} disabled={updateCompany.isPending}>
                {updateCompany.isPending ? "Salvando..." : "Salvar alterações"}
              </Button>
            </TabsContent>

            <TabsContent value="products" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Produtos desta empresa</p>
                  <p className="text-2xl font-bold text-foreground">{totalProducts} produtos</p>
                </div>
                <Dialog open={productModal} onOpenChange={setProductModal}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Adicionar Produto
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader>
                      <DialogTitle>Novo produto</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label>Nome</Label>
                        <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Nome do produto" />
                      </div>
                      <div className="space-y-1">
                        <Label>Preço (R$)</Label>
                        <Input value={productPrice} onChange={(e) => setProductPrice(e.target.value)} placeholder="R$ 0,00" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setProductModal(false)}>Cancelar</Button>
                      <Button onClick={() => addProduct.mutate()} disabled={!productName || addProduct.isPending}>
                        {addProduct.isPending ? "Salvando..." : "Adicionar"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <Card className="border border-border bg-card shadow-sm">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Preço</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground">
                            Nenhum produto cadastrado.
                          </TableCell>
                        </TableRow>
                      )}
                      {products.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.nome}</TableCell>
                          <TableCell>
                            {Number(p.valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="team" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Usuários vinculados</p>
                  <p className="text-2xl font-bold text-foreground">{totalUsers} usuários</p>
                </div>
              </div>
              <Card className="border border-border bg-card shadow-sm">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground">
                            Nenhum usuário vinculado.
                          </TableCell>
                        </TableRow>
                      )}
                      {users.map((u: any) => (
                        <TableRow key={u.id}>
                          <TableCell className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              {u.avatar_url ? <AvatarImage src={u.avatar_url} alt={u.nome} /> : null}
                              <AvatarFallback className="bg-muted text-foreground">
                                {u.nome?.slice(0, 2)?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{u.nome}</span>
                          </TableCell>
                          <TableCell>{u.email}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCompanyDetail;

