import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { AdminVendedores } from "@/components/admin/AdminVendedores";
import { AdminVendas } from "@/components/admin/AdminVendas";
import { AdminRelatorios } from "@/components/admin/AdminRelatorios";
import { AdminMetas } from "@/components/admin/AdminMetas";
import { AdminManagement } from "@/components/profile/AdminManagement";
import { AdminCompanies } from "@/components/admin/AdminCompanies";
import { EvolutionMonitor } from "@/components/admin/EvolutionMonitor";
import { AdminProdutos } from "@/components/admin/AdminProdutos";
import { AdminFormasPagamento } from "@/components/admin/AdminFormasPagamento";
import { Button } from "@/components/ui/button";

const Admin = () => {
  const { isAdmin, isSuperAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Acesso negado. Apenas administradores podem acessar esta página.");
      navigate("/");
    }
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
        <div>
          <h1 className="text-xl sm:text-3xl font-bold">Administração</h1>
          <p className="text-muted-foreground">Painel de controle administrativo</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="vendedores" className="w-full">
            <div className="overflow-x-auto -mx-1 px-1 pb-1">
              <TabsList className={`inline-flex w-auto min-w-full sm:grid sm:w-full ${isSuperAdmin ? 'sm:grid-cols-9' : 'sm:grid-cols-7'}`}>
                <TabsTrigger value="vendedores" className="whitespace-nowrap">Vendedores</TabsTrigger>
                <TabsTrigger value="vendas" className="whitespace-nowrap">Vendas</TabsTrigger>
                <TabsTrigger value="produtos" className="whitespace-nowrap">Produtos</TabsTrigger>
                <TabsTrigger value="pagamentos" className="whitespace-nowrap">Pagamentos</TabsTrigger>
                <TabsTrigger value="relatorios" className="whitespace-nowrap">Relatórios</TabsTrigger>
                <TabsTrigger value="metas" className="whitespace-nowrap">Metas</TabsTrigger>
                {isSuperAdmin && <TabsTrigger value="empresas" className="whitespace-nowrap">Empresas</TabsTrigger>}
                {isSuperAdmin && <TabsTrigger value="monitor" className="whitespace-nowrap">Monitor</TabsTrigger>}
                <TabsTrigger value="usuarios" className="whitespace-nowrap">Usuários</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="vendedores" className="mt-6">
              <AdminVendedores />
            </TabsContent>

            <TabsContent value="vendas" className="mt-6">
              <AdminVendas />
            </TabsContent>

            <TabsContent value="produtos" className="mt-6">
              <AdminProdutos />
            </TabsContent>

            <TabsContent value="pagamentos" className="mt-6">
              <AdminFormasPagamento />
            </TabsContent>

            <TabsContent value="relatorios" className="mt-6">
              <AdminRelatorios />
            </TabsContent>

            <TabsContent value="metas" className="mt-6">
              <AdminMetas />
            </TabsContent>

            {isSuperAdmin && (
              <TabsContent value="empresas" className="mt-6">
                <AdminCompanies />
              </TabsContent>
            )}

            {isSuperAdmin && (
              <TabsContent value="monitor" className="mt-6">
                <EvolutionMonitor />
              </TabsContent>
            )}

            <TabsContent value="usuarios" className="mt-6">
              <AdminManagement />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;
