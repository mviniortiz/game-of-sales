import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Shield, ShieldOff } from "lucide-react";

interface UserWithRole {
  id: string;
  nome: string;
  email: string;
  avatar_url: string | null;
  is_admin: boolean;
}

export function AdminManagement() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, nome, email, avatar_url");

    if (profilesError) {
      toast.error("Erro ao carregar usuários");
      setLoading(false);
      return;
    }

    const { data: adminRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (rolesError) {
      toast.error("Erro ao carregar permissões");
      setLoading(false);
      return;
    }

    const adminIds = new Set(adminRoles?.map((r) => r.user_id) || []);

    const usersWithRoles = profiles?.map((profile) => ({
      ...profile,
      is_admin: adminIds.has(profile.id),
    })) || [];

    setUsers(usersWithRoles);
    setLoading(false);
  };

  const toggleAdmin = async (userId: string, isCurrentlyAdmin: boolean) => {
    if (isCurrentlyAdmin) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");

      if (error) {
        toast.error("Erro ao remover permissão de admin");
        return;
      }

      toast.success("Permissão de admin removida");
    } else {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" });

      if (error) {
        toast.error("Erro ao conceder permissão de admin");
        return;
      }

      toast.success("Permissão de admin concedida");
    }

    loadUsers();
  };

  const getUserInitials = (nome: string, email: string) => {
    if (nome) {
      return nome
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Administradores</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Administradores</CardTitle>
        <CardDescription>
          Conceda ou remova permissões de administrador para outros usuários
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={user.avatar_url || ""} />
                  <AvatarFallback>
                    {getUserInitials(user.nome, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user.nome}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                {user.is_admin && (
                  <Badge variant="secondary">
                    <Shield className="h-3 w-3 mr-1" />
                    Admin
                  </Badge>
                )}
              </div>
              <Button
                variant={user.is_admin ? "destructive" : "default"}
                size="sm"
                onClick={() => toggleAdmin(user.id, user.is_admin)}
              >
                {user.is_admin ? (
                  <>
                    <ShieldOff className="h-4 w-4 mr-2" />
                    Remover Admin
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Tornar Admin
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
