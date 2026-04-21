import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Users, Shield, ShieldOff, UserPlus, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatError } from "@/lib/utils";

interface TeamMember {
  id: string;
  nome: string;
  email: string;
  avatar_url: string | null;
  is_admin: boolean;
}

export default function Time() {
  const { user, isAdmin, companyId } = useAuth();
  const { activeCompanyId } = useTenant();
  const navigate = useNavigate();

  const effectiveCompanyId = activeCompanyId || companyId;

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamCount, setTeamCount] = useState(0);
  const [pendingToggle, setPendingToggle] = useState<{ userId: string; nome: string; isAdmin: boolean } | null>(null);

  useEffect(() => {
    if (effectiveCompanyId) load();
  }, [effectiveCompanyId]);

  const load = async () => {
    if (!effectiveCompanyId) return;
    const [membersRes, countRes] = await Promise.all([
      supabase.from("profiles").select("id, nome, email, avatar_url").eq("company_id", effectiveCompanyId).order("nome"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("company_id", effectiveCompanyId),
    ]);

    const members = membersRes.data || [];
    setTeamCount(countRes.count || members.length);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", members.map((m) => m.id))
      .eq("role", "admin");

    const adminIds = new Set((roles || []).map((r) => r.user_id));

    setTeamMembers(members.map((m) => ({ ...m, is_admin: adminIds.has(m.id) })));
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const confirmToggleAdmin = async () => {
    if (!pendingToggle) return;
    const { userId, isAdmin: isCurrentlyAdmin } = pendingToggle;
    if (isCurrentlyAdmin) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      if (error) {
        toast.error(`Erro: ${formatError(error)}`);
        setPendingToggle(null);
        return;
      }
      toast.success("Permissão de admin removida");
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      if (error) {
        toast.error(`Erro: ${formatError(error)}`);
        setPendingToggle(null);
        return;
      }
      toast.success("Permissão de admin concedida");
    }
    setPendingToggle(null);
    load();
  };

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Apenas admins podem gerenciar o time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Users className="h-4 w-4 text-muted-foreground/70" />
            <h2 className="text-[13px] font-semibold text-foreground">
              Time
              <span className="ml-2 text-[11px] font-normal text-muted-foreground/70 tabular-nums">
                {teamCount} {teamCount === 1 ? "pessoa" : "pessoas"}
              </span>
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1.5 h-7"
            onClick={() => navigate("/admin")}
          >
            <UserPlus className="h-3 w-3" />
            Convidar
          </Button>
        </div>
        <div className="px-2 py-2">
          {teamMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum membro ainda.
            </p>
          ) : (
            <div className="space-y-0.5">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors group"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                    <AvatarFallback className="text-[10px] bg-muted">
                      {getInitials(member.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate leading-tight">
                      {member.nome}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{member.email}</p>
                  </div>
                  {member.id !== user?.id ? (
                    <button
                      onClick={() =>
                        setPendingToggle({ userId: member.id, nome: member.nome, isAdmin: member.is_admin })
                      }
                      className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold uppercase transition-colors ${
                        member.is_admin
                          ? "bg-amber-500/10 text-amber-400 hover:bg-rose-500/10 hover:text-rose-400"
                          : "bg-muted/50 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-400"
                      }`}
                      title={member.is_admin ? "Remover admin" : "Tornar admin"}
                    >
                      {member.is_admin ? <ShieldOff className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                      {member.is_admin ? "Admin" : "Membro"}
                    </button>
                  ) : (
                    <span className="px-2 py-1 rounded-md text-[10px] font-semibold uppercase bg-amber-500/10 text-amber-400 shrink-0">
                      Você
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AlertDialog
        open={!!pendingToggle}
        onOpenChange={(open) => {
          if (!open) setPendingToggle(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingToggle?.isAdmin
                ? `Você está prestes a remover a permissão de administrador de ${pendingToggle?.nome}. Essa pessoa perderá acesso às configurações e gestão do sistema.`
                : `Você está prestes a tornar ${pendingToggle?.nome} administrador(a). Essa pessoa terá acesso total às configurações e gestão do sistema.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggleAdmin}>
              {pendingToggle?.isAdmin ? "Remover admin" : "Tornar admin"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
