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
import { Button } from "@/components/ui/button";

const Admin = () => {
  const { isAdmin, loading } = useAuth();
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
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Administração</h1>
          <p className="text-muted-foreground">Painel de controle administrativo</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="vendedores" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
              <TabsTrigger value="vendas">Vendas</TabsTrigger>
              <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
              <TabsTrigger value="metas">Metas</TabsTrigger>
              <TabsTrigger value="empresas">Empresas</TabsTrigger>
              <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            </TabsList>

            <TabsContent value="vendedores" className="mt-6">
              <AdminVendedores />
            </TabsContent>

            <TabsContent value="vendas" className="mt-6">
              <AdminVendas />
            </TabsContent>

            <TabsContent value="relatorios" className="mt-6">
              <AdminRelatorios />
            </TabsContent>

            <TabsContent value="metas" className="mt-6">
              <AdminMetas />
            </TabsContent>

            <TabsContent value="empresas" className="mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Empresas</h3>
                  <p className="text-sm text-muted-foreground">Use o gerenciador dedicado para listar e editar empresas.</p>
                </div>
                <Button onClick={() => navigate("/admin/companies")} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                  Abrir Gerenciador de Empresas
                </Button>
              </div>
            </TabsContent>

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
