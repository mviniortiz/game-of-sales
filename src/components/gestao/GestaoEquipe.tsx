import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Plus, Trash } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { usePlan } from "@/hooks/usePlan";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Member = { id: string; nome: string | null; email: string | null; last_sign_in_at: string | null; isAdmin: boolean };

const lastSeen = (iso: string | null) => {
  if (!iso) return "nunca entrou";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 30) return "online agora";
  if (min < 60 * 24) return `há ${Math.max(1, Math.round(min / 60))} h`;
  return `há ${Math.round(min / (60 * 24))} dias`;
};

/** Quem está na empresa, o papel de cada um e o convite de novos membros. */
export function GestaoEquipe() {
  const { companyId, user, isSuperAdmin } = useAuth();
  const { activeCompanyId } = useTenant();
  const company = activeCompanyId || companyId;
  const { getUserLimit, planInfo } = usePlan();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const key = ["gestao-equipe", company];

  const q = useQuery({
    queryKey: key,
    enabled: !!company,
    queryFn: async (): Promise<Member[]> => {
      const { data: people, error } = await supabase
        .from("profiles")
        .select("id, nome, email, last_sign_in_at")
        .eq("company_id", company!)
        .order("nome");
      if (error) throw error;
      const ids = (people ?? []).map((p) => p.id);
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
      const adminSet = new Set((admins ?? []).map((r) => r.user_id));
      return (people ?? []).map((p) => ({ ...p, isAdmin: adminSet.has(p.id) }));
    },
  });

  const members = q.data ?? [];
  const limit = getUserLimit();
  const atLimit = !isSuperAdmin && Number.isFinite(limit) && members.length >= limit;

  const [inviteOpen, setInviteOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [toRemove, setToRemove] = useState<Member | null>(null);
  const [removing, setRemoving] = useState(false);

  const openInvite = () => {
    if (atLimit) {
      toast.error(`Seu plano ${planInfo.label} permite até ${limit} pessoas.`, {
        action: { label: "Ver planos", onClick: () => navigate("/upgrade") },
      });
      return;
    }
    setPassword(null);
    setInviteOpen(true);
  };

  const invite = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke("admin-create-seller", {
      body: { nome: nome.trim(), email: email.trim(), sendPassword: true, companyId: company },
    });
    setSending(false);
    if (error) {
      let msg = "Não deu para convidar.";
      try {
        const body = await (error as { context?: Response }).context?.json();
        if (body?.error) msg = body.error;
      } catch {
        /* resposta sem JSON */
      }
      toast.error(msg);
      return;
    }
    qc.invalidateQueries({ queryKey: key });
    if (data?.emailSent) {
      toast.success(`Convite enviado para ${email.trim()}.`);
      setInviteOpen(false);
      setNome("");
      setEmail("");
    } else if (data?.password) {
      setPassword(data.password);
      toast.warning("Pessoa criada, mas o e-mail não saiu. Copie a senha e mande para ela.");
    } else {
      setInviteOpen(false);
    }
  };

  const toggleAdmin = async (m: Member) => {
    const { error } = m.isAdmin
      ? await supabase.from("user_roles").delete().eq("user_id", m.id).eq("role", "admin")
      : await supabase.from("user_roles").insert({ user_id: m.id, role: "admin" });
    if (error) {
      toast.error("Não deu para mudar o papel.");
      return;
    }
    toast.success(m.isAdmin ? `${m.nome ?? "Pessoa"} agora é vendedor.` : `${m.nome ?? "Pessoa"} agora é admin.`);
    qc.invalidateQueries({ queryKey: key });
  };

  const remove = async () => {
    if (!toRemove) return;
    setRemoving(true);
    const { data, error } = await supabase.functions.invoke("admin-delete-seller", { body: { sellerId: toRemove.id } });
    setRemoving(false);
    if (error || data?.error) {
      toast.error(data?.error || "Não deu para remover.");
      return;
    }
    toast.success(`${toRemove.nome ?? "Pessoa"} saiu da equipe.`);
    setToRemove(null);
    qc.invalidateQueries({ queryKey: key });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-[var(--vyz-text-muted)]">
          {members.length} {members.length === 1 ? "pessoa" : "pessoas"}
          {Number.isFinite(limit) ? ` de ${limit} no plano ${planInfo.label}` : ""}
        </p>
        <button
          type="button"
          onClick={openInvite}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--vyz-btn-solid)] px-4 text-[13px] font-semibold text-[var(--vyz-btn-on)] transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.3)]"
        >
          <Plus size={14} weight="bold" aria-hidden /> Convidar
        </button>
      </div>

      <ul className="divide-y divide-[var(--vyz-border-subtle)] overflow-hidden rounded-[14px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)]">
        {q.isLoading &&
          [0, 1, 2].map((i) => (
            <li key={i} className="px-4 py-4">
              <div className="h-4 w-1/2 rounded bg-[var(--vyz-surface-2)] animate-pulse motion-reduce:animate-none" />
            </li>
          ))}
        {members.map((m) => {
          const isMe = m.id === user?.id;
          const initials = (m.nome || m.email || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
          return (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3">
              <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--vyz-surface-2)] text-[12px] font-semibold text-[var(--vyz-text-muted)]">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-[var(--vyz-text-primary)]">
                  {m.nome || "Sem nome"} {isMe && <span className="font-normal text-[var(--vyz-text-muted)]">(você)</span>}
                </p>
                <p className="truncate text-[12px] text-[var(--vyz-text-muted)]">
                  {m.email} · {lastSeen(m.last_sign_in_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleAdmin(m)}
                disabled={isMe}
                title={isMe ? "Você não pode mudar o próprio papel" : m.isAdmin ? "Tornar vendedor" : "Tornar admin"}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.28)] disabled:cursor-default ${
                  m.isAdmin
                    ? "bg-[var(--vyz-accent-soft-10)] text-[var(--vyz-accent)] enabled:hover:bg-[var(--vyz-accent-soft-12)]"
                    : "bg-[var(--vyz-surface-2)] text-[var(--vyz-text-muted)] enabled:hover:text-[var(--vyz-text-primary)]"
                }`}
              >
                {m.isAdmin ? "Admin" : "Vendedor"}
              </button>
              {!isMe && !m.isAdmin && (
                <button
                  type="button"
                  onClick={() => setToRemove(m)}
                  aria-label={`Remover ${m.nome ?? m.email}`}
                  className="grid h-8 w-8 place-items-center rounded-full text-[var(--vyz-text-soft)] transition-colors hover:bg-[rgba(220,38,38,0.08)] hover:text-[#DC2626] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.28)]"
                >
                  <Trash size={16} aria-hidden />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Convidar para a equipe</DialogTitle>
            <DialogDescription>A pessoa recebe o acesso por e-mail e entra como vendedor.</DialogDescription>
          </DialogHeader>
          {password ? (
            <div className="space-y-3">
              <p className="text-[13px] text-[var(--vyz-text-muted)]">Senha provisória para mandar à pessoa:</p>
              <div className="flex items-center gap-2 rounded-[10px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-2)] px-3 py-2">
                <code className="flex-1 text-[14px]">{password}</code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(password).then(() => toast.success("Senha copiada."))}
                  aria-label="Copiar senha"
                  className="grid h-8 w-8 place-items-center rounded-full hover:bg-[var(--vyz-surface-1)]"
                >
                  <Copy size={16} aria-hidden />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={invite} className="space-y-3">
              <div>
                <label htmlFor="eq-nome" className="text-[13px] font-medium">Nome</label>
                <input id="eq-nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" className="mt-1 h-10 w-full rounded-[10px] border border-[var(--vyz-border-strong)] bg-transparent px-3 text-[16px] outline-none focus:border-[var(--vyz-accent)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.18)]" />
              </div>
              <div>
                <label htmlFor="eq-email" className="text-[13px] font-medium">E-mail</label>
                <input id="eq-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="mt-1 h-10 w-full rounded-[10px] border border-[var(--vyz-border-strong)] bg-transparent px-3 text-[16px] outline-none focus:border-[var(--vyz-accent)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.18)]" />
              </div>
              <button
                type="submit"
                disabled={sending || !nome.trim() || !email.trim()}
                className="inline-flex h-10 w-full items-center justify-center rounded-full bg-[var(--vyz-btn-solid)] text-[13.5px] font-semibold text-[var(--vyz-btn-on)] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {sending ? "Enviando…" : "Enviar convite"}
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toRemove} onOpenChange={(o) => !o && setToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {toRemove?.nome ?? "esta pessoa"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Ela perde o acesso ao Vyzon. As oportunidades dela passam para você e continuam no funil.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); remove(); }} disabled={removing} className="bg-[#DC2626] hover:bg-[#B91C1C]">
              {removing ? "Removendo…" : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
