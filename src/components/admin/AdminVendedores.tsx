import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const AdminVendedores = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [sendPassword, setSendPassword] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: vendedores, isLoading } = useQuery({
    queryKey: ["admin-vendedores"],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data: profiles, error } = await supabase
        .from("profiles")
        .select(`
          *,
          vendas:vendas(id, valor, data_venda, created_at)
        `);

      if (error) throw error;

      return profiles?.map((profile) => {
        const vendasMes = profile.vendas?.filter((v: any) => {
          const dataVenda = new Date(v.data_venda || v.created_at);
          return dataVenda >= startOfMonth;
        }) || [];

        const faturamentoMes = vendasMes.reduce((acc: number, v: any) => acc + Number(v.valor), 0);

        return {
          ...profile,
          totalVendasMes: vendasMes.length,
          faturamentoMes,
        };
      }) || [];
    },
  });

  const filteredVendedores = vendedores?.filter((v) =>
    v.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (nome: string) => {
    return nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getNivelBadgeClass = (nivel: string) => {
    switch (nivel) {
      case "Bronze":
        return "bg-orange-900/50 text-orange-200 border-orange-800";
      case "Prata":
        return "bg-gray-500/50 text-gray-200 border-gray-600";
      case "Ouro":
        return "bg-yellow-600/50 text-yellow-200 border-yellow-700";
      case "Platina":
        return "bg-indigo-500/50 text-indigo-200 border-indigo-600";
      case "Diamante":
        return "bg-blue-500/50 text-blue-200 border-blue-600";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleCreateSeller = async () => {
    if (!nome.trim() || !email.trim()) {
      toast.error("Preencha nome e e-mail");
      return;
    }

    setSubmitting(true);
    setGeneratedPassword(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-seller", {
        body: { nome, email, sendPassword },
      });

      if (error) throw error;

      if (data?.password && sendPassword) {
        setGeneratedPassword(data.password);
      }

      toast.success("Vendedor criado com sucesso!");
      setShowAdd(false);
      setNome("");
      setEmail("");
      setSendPassword(true);
      queryClient.invalidateQueries({ queryKey: ["admin-vendedores"] });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Não foi possível criar o vendedor");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Carregando vendedores...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-6">Todos os Vendedores</h3>
        
        {/* Action Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="relative w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background border-border"
            />
          </div>
          <Button className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Vendedor
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Vendedor</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Pontos</TableHead>
              <TableHead>Vendas (Mês)</TableHead>
              <TableHead>Faturamento (Mês)</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVendedores?.map((vendedor) => (
              <TableRow 
                key={vendedor.id}
                className="hover:bg-muted/50 transition-colors"
              >
                <TableCell className="py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={vendedor.avatar_url || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(vendedor.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-foreground">{vendedor.nome}</div>
                      <div className="text-xs text-muted-foreground">{vendedor.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getNivelBadgeClass(vendedor.nivel)}>
                    {vendedor.nivel}
                  </Badge>
                </TableCell>
                <TableCell>{vendedor.pontos.toLocaleString("pt-BR")}</TableCell>
                <TableCell>{vendedor.totalVendasMes}</TableCell>
                <TableCell>
                  R$ {vendedor.faturamentoMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-background border-border z-50">
                      <DropdownMenuItem 
                        onClick={() => toast.info("Funcionalidade em desenvolvimento")}
                        className="cursor-pointer"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => toast.error("Funcionalidade em desenvolvimento")}
                        className="cursor-pointer text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Vendedor</DialogTitle>
            <DialogDescription>Crie um acesso para um novo vendedor.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@empresa.com"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="send-password"
                checked={sendPassword}
                onCheckedChange={(v) => setSendPassword(Boolean(v))}
              />
              <Label htmlFor="send-password">Enviar senha aleatória por e-mail</Label>
            </div>

            {generatedPassword && (
              <div className="bg-muted/40 border border-border rounded-md p-3 text-sm">
                <p className="text-muted-foreground mb-1">Senha gerada:</p>
                <p className="font-mono text-base">{generatedPassword}</p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAdd(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button onClick={handleCreateSeller} disabled={submitting}>
                {submitting ? "Criando..." : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};