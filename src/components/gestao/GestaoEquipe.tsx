import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CaretDown, Check, Copy, Plus, Trash } from "@phosphor-icons/react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import "@/components/admin/admin.css";

type Member = { id: string; nome: string | null; email: string | null; last_sign_in_at: string | null; isAdmin: boolean };

const lastSeen = (iso: string | null) => {
  if (!iso) return { texto: "nunca entrou", agora: false };
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 30) return { texto: "online agora", agora: true };
  if (min < 60 * 24) return { texto: `entrou há ${Math.max(1, Math.round(min / 60))} h`, agora: false };
  const d = Math.round(min / (60 * 24));
  return { texto: d === 1 ? "entrou ontem" : `entrou há ${d} dias`, agora: false };
};

const PAPEIS = [
  { admin: true, nome: "Admin", ajuda: "Vê os resultados, mexe no funil e convida pessoas" },
  { admin: false, nome: "Vendedor", ajuda: "Usa o dia a dia do app, sem acesso a Resultados" },
];

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

  const setAdmin = async (m: Member, admin: boolean) => {
    if (m.isAdmin === admin) return;
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

  const usado = Number.isFinite(limit) ? Math.min(1, members.length / limit) : 0;

  return (
    <div className="va">
      <div className="va-barra">
        <div className="grid min-w-[200px] gap-1.5">
          <p className="va-topo__texto">
            <b>{members.length} {members.length === 1 ? "pessoa" : "pessoas"}</b>
            {Number.isFinite(limit) ? ` de ${limit} no plano ${planInfo.label}` : ""}
          </p>
          {Number.isFinite(limit) && (
            <div className="va-medidor w-[200px]" aria-hidden>
              <i style={{ width: `${usado * 100}%` }} />
            </div>
          )}
        </div>
        <div className="va-barra__fim">
          <button type="button" onClick={openInvite} className="va-btn">
            <Plus size={14} weight="bold" aria-hidden /> Convidar
          </button>
        </div>
      </div>

      <ul
        className="va-tabela"
        aria-label="Equipe"
        style={{ "--va-cols": "minmax(0,1.6fr) 150px minmax(0,1fr) 32px", "--va-cols-cel": "minmax(0,1fr) auto 32px" } as React.CSSProperties}
      >
        <li className="va-tabela__cab" aria-hidden>
          <span>Pessoa</span>
          <span>Papel</span>
          <span>Último acesso</span>
          <span />
        </li>
        {q.isLoading &&
          [0, 1, 2].map((i) => (
            <li key={i} className="va-linha">
              <span className="h-4 w-1/3 rounded bg-[#ededed] animate-pulse motion-reduce:animate-none" />
            </li>
          ))}
        {members.map((m, i) => {
          const isMe = m.id === user?.id;
          const initials = (m.nome || m.email || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
          const visto = lastSeen(m.last_sign_in_at);
          return (
            <li key={m.id} className="va-linha va-entra-linha" style={{ "--i": i } as React.CSSProperties}>
              <span className="va-celula">
                <span aria-hidden className="va-avatar" data-redondo>{initials}</span>
                <span className="va-meio">
                  <b>
                    {m.nome || "Sem nome"} {isMe && <em>(você)</em>}
                  </b>
                  <span>{m.email}</span>
                </span>
              </span>
              <span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild disabled={isMe}>
                    <button
                      type="button"
                      className="va-escolha"
                      disabled={isMe}
                      aria-label={`Papel de ${m.nome ?? m.email}: ${m.isAdmin ? "Admin" : "Vendedor"}`}
                      title={isMe ? "Você não pode mudar o próprio papel" : undefined}
                    >
                      {m.isAdmin ? "Admin" : "Vendedor"}
                      {!isMe && <CaretDown size={12} weight="bold" aria-hidden />}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[260px]">
                    {PAPEIS.map((p) => (
                      <DropdownMenuItem key={p.nome} onSelect={() => void setAdmin(m, p.admin)} className="items-start gap-2 py-2">
                        <Check size={14} weight="bold" aria-hidden className={`mt-0.5 shrink-0 ${m.isAdmin === p.admin ? "" : "invisible"}`} />
                        <span className="grid gap-0.5">
                          <span className="text-[14px] font-medium">{p.nome}</span>
                          <span className="text-[12px] text-[var(--vyz-text-muted)]">{p.ajuda}</span>
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
              <span className="va-texto va-texto--cinza inline-flex items-center gap-1.5" data-some-no-cel>
                {visto.agora && <span className="va-ponto" data-tom="bom" aria-hidden />}
                {visto.texto.charAt(0).toUpperCase() + visto.texto.slice(1)}
              </span>
              {!isMe && !m.isAdmin ? (
                <button
                  type="button"
                  onClick={() => setToRemove(m)}
                  aria-label={`Remover ${m.nome ?? m.email}`}
                  title="Remover da equipe"
                  className="va-icone va-icone--perigo"
                >
                  <Trash size={16} aria-hidden />
                </button>
              ) : (
                <span aria-hidden />
              )}
            </li>
          );
        })}
      </ul>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="va-vars sm:max-w-[420px]">
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
            <form onSubmit={invite} className="grid gap-3">
              <label className="va-campo">
                <span>Nome</span>
                <input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
              </label>
              <label className="va-campo">
                <span>E-mail</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </label>
              <button type="submit" disabled={sending || !nome.trim() || !email.trim()} className="va-btn va-btn--grande mt-1 w-full">
                {sending ? "Enviando…" : "Enviar convite"}
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toRemove} onOpenChange={(o) => !o && setToRemove(null)}>
        <AlertDialogContent className="va-vars">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {toRemove?.nome ?? "esta pessoa"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Ela perde o acesso ao Vyzon. As oportunidades dela passam para você e continuam no funil.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); remove(); }} disabled={removing} className="va-btn va-btn--perigo">
              {removing ? "Removendo…" : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
