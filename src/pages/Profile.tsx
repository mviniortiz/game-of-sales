import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Loader2, Lock, Eye, EyeOff, Sparkles, Crown, Zap, Check,
  ArrowRight, Users, Package, Bot, CreditCard, User, Shield, ShieldOff,
  Building2, Upload, TrendingUp, Plug, ChevronRight, BarChart3,
  Kanban, UserPlus
} from "lucide-react";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { PLAN_FEATURES, PLANS_INFO, PlanType } from "@/config/planConfig";
import { useNavigate } from "react-router-dom";

// ─── Types ─────────────────────────────────────────────────────────

interface TeamMember {
  id: string;
  nome: string;
  email: string;
  avatar_url: string | null;
  is_admin: boolean;
}

interface UsageStats {
  teamCount: number;
  salesThisMonth: number;
  revenueThisMonth: number;
  activeDeals: number;
  productsCount: number;
}

interface IntegrationStatus {
  platform: string;
  label: string;
  lastEvent: string | null;
  eventCount: number;
}

// ─── Plan Details ──────────────────────────────────────────────────

const PLAN_DETAILS: Record<PlanType, {
  icon: React.ComponentType<any>;
  price: string;
  features: string[];
}> = {
  starter: {
    icon: Zap,
    price: "R$ 147/mês",
    features: ["2 vendedores", "10 produtos", "Dashboard + CRM", "Ranking + Gamificação"],
  },
  plus: {
    icon: Sparkles,
    price: "R$ 297/mês",
    features: ["10 vendedores", "50 produtos", "Eva IA (30/dia)", "Tudo do Starter"],
  },
  pro: {
    icon: Crown,
    price: "R$ 797/mês",
    features: ["Vendedores ilimitados", "Produtos ilimitados", "Eva IA ilimitada", "Tudo do Plus"],
  },
};

// ─── Section wrapper ───────────────────────────────────────────────

function Section({ icon: Icon, title, action, children, className }: {
  icon: React.ComponentType<any>;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border/50 bg-card overflow-hidden ${className || ""}`}>
      <div className="px-5 py-3.5 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-muted-foreground/70" />
          <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>
        </div>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ─── Usage Bar ─────────────────────────────────────────────────────

function UsageBar({ used, limit, label, icon: Icon }: { used: number; limit: number; label: string; icon: React.ComponentType<any> }) {
  const isUnlimited = limit === Infinity;
  const pct = isUnlimited ? 15 : Math.min(100, (used / limit) * 100);
  const isNearLimit = !isUnlimited && pct >= 80;

  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground/70" />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className={`font-medium tabular-nums ${isNearLimit ? "text-amber-400" : "text-foreground"}`}>
            {used}{isUnlimited ? "" : ` / ${limit}`}
            {isUnlimited && <span className="text-muted-foreground/50 ml-1">ilimitado</span>}
          </span>
        </div>
        <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isNearLimit ? "bg-amber-500" : "bg-emerald-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────

export default function Profile() {
  const { user, isAdmin, refreshProfile, profile, companyId } = useAuth();
  const { currentPlan, planInfo } = usePlan();
  const { companies, activeCompanyId } = useTenant();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Company
  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companySegment, setCompanySegment] = useState("");
  const [savingCompany, setSavingCompany] = useState(false);

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Admin toggle confirmation
  const [pendingToggle, setPendingToggle] = useState<{ userId: string; nome: string; isAdmin: boolean } | null>(null);

  // Usage stats
  const [stats, setStats] = useState<UsageStats>({ teamCount: 0, salesThisMonth: 0, revenueThisMonth: 0, activeDeals: 0, productsCount: 0 });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);

  const effectiveCompanyId = activeCompanyId || companyId;

  const company = companies.find(c => c.id === effectiveCompanyId);
  const trialEndsAt = company?.trial_ends_at;
  const subscriptionStatus = company?.subscription_status || "active";
  const isTrialing = subscriptionStatus === "trialing";

  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  useEffect(() => {
    if (effectiveCompanyId) {
      loadCompanyData();
      loadUsageStats();
      loadTeamMembers();
      loadIntegrations();
    }
  }, [effectiveCompanyId]);

  // ─── Data loading ────────────────────────────────────────────────

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("nome, email, avatar_url").eq("id", user.id).single();
    if (data) { setNome(data.nome); setEmail(data.email); setAvatarUrl(data.avatar_url); }
  };

  const loadCompanyData = async () => {
    if (!effectiveCompanyId) return;
    const { data } = await supabase.from("companies").select("name, logo_url, segment").eq("id", effectiveCompanyId).single();
    if (data) {
      setCompanyName(data.name || "");
      setCompanyLogo((data as any).logo_url || null);
      setCompanySegment((data as any).segment || "");
    }
  };

  const loadUsageStats = async () => {
    if (!effectiveCompanyId) return;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const [teamRes, salesRes, dealsRes, productsRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("company_id", effectiveCompanyId),
      supabase.from("vendas").select("valor").eq("company_id", effectiveCompanyId).eq("status", "Aprovado").gte("data_venda", startOfMonth).lte("data_venda", endOfMonth),
      supabase.from("deals").select("id", { count: "exact", head: true }).eq("company_id", effectiveCompanyId).not("stage", "in", "(closed_won,closed_lost)"),
      supabase.from("produtos").select("id", { count: "exact", head: true }).eq("company_id", effectiveCompanyId),
    ]);

    const revenue = (salesRes.data || []).reduce((sum, v) => sum + (Number(v.valor) || 0), 0);

    setStats({
      teamCount: teamRes.count || 0,
      salesThisMonth: salesRes.data?.length || 0,
      revenueThisMonth: revenue,
      activeDeals: dealsRes.count || 0,
      productsCount: productsRes.count || 0,
    });
  };

  const loadTeamMembers = async () => {
    if (!effectiveCompanyId) return;
    const { data: members } = await supabase
      .from("profiles")
      .select("id, nome, email, avatar_url")
      .eq("company_id", effectiveCompanyId)
      .order("nome")
      .limit(5);

    if (!members) return;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", members.map(m => m.id))
      .eq("role", "admin");

    const adminIds = new Set((roles || []).map(r => r.user_id));

    setTeamMembers(members.map(m => ({
      ...m,
      is_admin: adminIds.has(m.id),
    })));
  };

  const loadIntegrations = async () => {
    if (!effectiveCompanyId) return;
    const { data } = await supabase
      .from("webhook_logs")
      .select("platform, created_at")
      .eq("company_id", effectiveCompanyId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (!data || data.length === 0) { setIntegrations([]); return; }

    const platforms: Record<string, { count: number; last: string }> = {};
    for (const log of data) {
      const p = log.platform || "unknown";
      if (!platforms[p]) platforms[p] = { count: 0, last: log.created_at };
      platforms[p].count++;
    }

    const labels: Record<string, string> = { hotmart: "Hotmart", kiwify: "Kiwify", greenn: "Greenn" };
    setIntegrations(Object.entries(platforms).map(([p, info]) => ({
      platform: p,
      label: labels[p] || p,
      lastEvent: info.last,
      eventCount: info.count,
    })));
  };

  // ─── Handlers ────────────────────────────────────────────────────

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    const filePath = `${user.id}/${Date.now()}.${file.name.split(".").pop()}`;
    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file);
      if (uploadError) { toast.error("Erro ao fazer upload"); return; }
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const { error } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      if (error) toast.error("Erro ao atualizar avatar");
      else { setAvatarUrl(publicUrl); await refreshProfile(); toast.success("Avatar atualizado!"); }
    } finally { setUploading(false); }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ nome }).eq("id", user.id);
    if (error) toast.error("Erro ao atualizar perfil");
    else { await refreshProfile(); toast.success("Perfil atualizado!"); }
    setLoading(false);
  };

  const handleSaveCompany = async () => {
    if (!effectiveCompanyId) return;
    setSavingCompany(true);
    const payload: Record<string, any> = { name: companyName };
    if (companySegment) payload.segment = companySegment;
    const { error } = await supabase.from("companies").update(payload).eq("id", effectiveCompanyId);
    if (error) toast.error("Erro ao salvar empresa");
    else toast.success("Empresa atualizada!");
    setSavingCompany(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) { toast.error("Preencha todos os campos"); return; }
    if (newPassword.length < 8) { toast.error("Mínimo 8 caracteres"); return; }
    if (newPassword !== confirmPassword) { toast.error("As senhas não coincidem"); return; }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) toast.error(error.message);
      else { toast.success("Senha alterada!"); setNewPassword(""); setConfirmPassword(""); }
    } catch { toast.error("Erro ao alterar senha"); }
    finally { setChangingPassword(false); }
  };

  const confirmToggleAdmin = async () => {
    if (!pendingToggle) return;
    const { userId, isAdmin: isCurrentlyAdmin } = pendingToggle;
    if (isCurrentlyAdmin) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      if (error) { toast.error("Erro ao remover permissão"); setPendingToggle(null); return; }
      toast.success("Permissão de admin removida");
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      if (error) { toast.error("Erro ao conceder permissão"); setPendingToggle(null); return; }
      toast.success("Permissão de admin concedida");
    }
    setPendingToggle(null);
    loadTeamMembers();
  };

  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const formatRelativeDate = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  };

  const planOrder: PlanType[] = ["starter", "plus", "pro"];
  const currentIndex = planOrder.indexOf(currentPlan);
  const PlanIcon = PLAN_DETAILS[currentPlan].icon;

  const statusLabels: Record<string, string> = {
    active: "Ativo",
    trialing: "Trial",
    expired: "Expirado",
    cancelled: "Cancelado",
  };

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-6xl mx-auto space-y-6">

      {/* ── HERO: Identity + Plan status ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
        {/* Avatar + Identity */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Avatar className="h-14 w-14 shrink-0 ring-2 ring-border/30">
            {avatarUrl && <AvatarImage src={avatarUrl} alt="Avatar" />}
            <AvatarFallback className="bg-emerald-500/15 text-emerald-400 text-lg font-bold">
              {nome ? getInitials(nome) : "U"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate" style={{ fontFamily: "var(--font-heading)" }}>
              {nome || "Minha Conta"}
            </h1>
            <p className="text-sm text-muted-foreground truncate">{email}</p>
          </div>
        </div>

        {/* Plan badge + status (right side) */}
        <div className="flex items-center gap-3 shrink-0">
          {isAdmin && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[11px] font-semibold uppercase tracking-wide">
              <Shield className="h-3 w-3" />Admin
            </span>
          )}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
            currentPlan === "pro" ? "bg-emerald-500/10 text-emerald-400" :
            currentPlan === "plus" ? "bg-blue-500/10 text-blue-400" :
            "bg-zinc-500/10 text-zinc-400"
          }`}>
            <PlanIcon className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold uppercase tracking-wide">{planInfo.label}</span>
            <span className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
              subscriptionStatus === "active" ? "bg-emerald-500/20 text-emerald-400" :
              isTrialing ? "bg-amber-500/20 text-amber-400" :
              "bg-rose-500/20 text-rose-400"
            }`}>
              {statusLabels[subscriptionStatus] || subscriptionStatus}
            </span>
          </div>
        </div>
      </div>

      {/* ── PLAN + USAGE: Full-width overview strip ── */}
      {isAdmin && (
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <div className="grid sm:grid-cols-[1fr_auto_1fr] divide-y sm:divide-y-0 sm:divide-x divide-border/50">
            {/* Left: Current plan info */}
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  currentPlan === "pro" ? "bg-emerald-500/15" :
                  currentPlan === "plus" ? "bg-blue-500/15" :
                  "bg-zinc-500/15"
                }`}>
                  <PlanIcon className={`h-5 w-5 ${
                    currentPlan === "pro" ? "text-emerald-400" :
                    currentPlan === "plus" ? "text-blue-400" :
                    "text-zinc-400"
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Plano {planInfo.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {PLAN_DETAILS[currentPlan].price}
                    {isTrialing && daysLeft !== null && (
                      <span className="text-amber-400 font-medium"> · {daysLeft}d restantes no trial</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {PLAN_DETAILS[currentPlan].features.map((f, i) => (
                  <span key={i} className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Check className="h-3 w-3 text-emerald-500/70" />{f}
                  </span>
                ))}
              </div>
            </div>

            {/* Center: Usage meters */}
            <div className="p-5 space-y-3 sm:min-w-[220px]">
              <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Uso atual</p>
              <UsageBar used={stats.teamCount} limit={PLAN_FEATURES[currentPlan].maxUsers} label="Vendedores" icon={Users} />
              <UsageBar used={stats.productsCount} limit={PLAN_FEATURES[currentPlan].maxProducts} label="Produtos" icon={Package} />
            </div>

            {/* Right: Upgrade CTA or stats */}
            <div className="p-5 flex flex-col justify-center">
              {currentIndex < planOrder.length - 1 ? (
                <div className="space-y-2.5">
                  {planOrder.slice(currentIndex + 1).map(plan => {
                    const details = PLAN_DETAILS[plan];
                    const info = PLANS_INFO[plan];
                    const Icon = details.icon;
                    const isPrimary = plan === planOrder[currentIndex + 1];
                    return (
                      <button
                        key={plan}
                        onClick={() => navigate(`/upgrade?plan=${plan}`)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${
                          isPrimary
                            ? "border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/50"
                            : "border-border/50 bg-muted/20 hover:bg-muted/40"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          plan === "plus" ? "bg-blue-500/15" : "bg-emerald-500/15"
                        }`}>
                          <Icon className={`h-4 w-4 ${plan === "plus" ? "text-blue-400" : "text-emerald-400"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-foreground">{info.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">{details.price}</span>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center space-y-1">
                  <Crown className="h-6 w-6 text-emerald-400 mx-auto" />
                  <p className="text-sm font-semibold text-foreground">Plano máximo</p>
                  <p className="text-xs text-muted-foreground">Você tem acesso a tudo</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── QUICK STATS: Overview numbers ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border/50">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate tabular-nums">{formatCurrency(stats.revenueThisMonth)}</p>
            <p className="text-[11px] text-muted-foreground">Faturamento</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border/50">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
            <BarChart3 className="h-4 w-4 text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground tabular-nums">{stats.salesThisMonth}</p>
            <p className="text-[11px] text-muted-foreground">Vendas no mês</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border/50">
          <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
            <Kanban className="h-4 w-4 text-violet-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground tabular-nums">{stats.activeDeals}</p>
            <p className="text-[11px] text-muted-foreground">Deals ativos</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border/50">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <Users className="h-4 w-4 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground tabular-nums">{stats.teamCount}</p>
            <p className="text-[11px] text-muted-foreground">No time</p>
          </div>
        </div>
      </div>

      {/* ── TWO COLUMNS: Left = Minha Conta | Right = Minha Empresa ── */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* LEFT: Minha Conta (personal) */}
        <div className="space-y-5">
          <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-widest px-1">Minha Conta</p>

          {/* Personal info */}
          <Section icon={User} title="Informações Pessoais">
            <div className="space-y-4">
              <AvatarUpload
                currentAvatarUrl={avatarUrl}
                userInitials={nome ? getInitials(nome) : "U"}
                onUpload={handleAvatarUpload}
                uploading={uploading}
              />
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <Input value={nome} onChange={e => setNome(e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <Input value={email} disabled className="h-9 text-sm bg-muted/50" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleUpdateProfile} disabled={loading} size="sm">
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Salvar
                </Button>
              </div>
            </div>
          </Section>

          {/* Security */}
          <Section icon={Lock} title="Segurança">
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Nova Senha</Label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="pr-10 h-9 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Confirmar</Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repita a senha"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="pr-10 h-9 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleChangePassword} disabled={changingPassword || !newPassword || !confirmPassword} size="sm">
                  {changingPassword && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Alterar Senha
                </Button>
              </div>
            </div>
          </Section>
        </div>

        {/* RIGHT: Minha Empresa (business) */}
        <div className="space-y-5">
          <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-widest px-1">Minha Empresa</p>

          {/* Company info */}
          {isAdmin && (
            <Section icon={Building2} title="Dados da Empresa">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {companyLogo ? (
                    <img src={companyLogo} alt="Logo" className="w-11 h-11 rounded-xl object-contain bg-muted/50 shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Nome</Label>
                    <Input value={companyName} onChange={e => setCompanyName(e.target.value)} className="h-9 text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Segmento</Label>
                  <Input value={companySegment} onChange={e => setCompanySegment(e.target.value)} placeholder="Ex: Infoprodutos" className="h-9 text-sm" />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveCompany} disabled={savingCompany} size="sm">
                    {savingCompany && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Salvar
                  </Button>
                </div>
              </div>
            </Section>
          )}

          {/* Team */}
          {isAdmin && teamMembers.length > 0 && (
            <Section
              icon={Users}
              title="Time"
              action={
                <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-7" onClick={() => navigate("/admin")}>
                  <UserPlus className="h-3 w-3" />Convidar
                </Button>
              }
            >
              <div className="space-y-0.5">
                {teamMembers.map(member => (
                  <div key={member.id} className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-muted/30 transition-colors group">
                    <Avatar className="h-7 w-7 shrink-0">
                      {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                      <AvatarFallback className="text-[10px] bg-muted">{getInitials(member.nome)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate leading-tight">{member.nome}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{member.email}</p>
                    </div>
                    {member.id !== user?.id && (
                      <button
                        onClick={() => setPendingToggle({ userId: member.id, nome: member.nome, isAdmin: member.is_admin })}
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
                    )}
                    {member.id === user?.id && (
                      <span className="px-2 py-1 rounded-md text-[10px] font-semibold uppercase bg-amber-500/10 text-amber-400 shrink-0">Você</span>
                    )}
                  </div>
                ))}
                {stats.teamCount > 5 && (
                  <button
                    onClick={() => navigate("/admin")}
                    className="w-full text-xs text-muted-foreground hover:text-foreground py-2 transition-colors flex items-center justify-center gap-1"
                  >
                    Ver todos ({stats.teamCount}) <ChevronRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </Section>
          )}

          {/* Integrations */}
          {isAdmin && (
            <Section
              icon={Plug}
              title="Integrações"
              action={
                <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-7" onClick={() => navigate("/integracoes")}>
                  Gerenciar
                </Button>
              }
            >
              {integrations.length > 0 ? (
                <div className="space-y-0.5">
                  {integrations.map(integ => (
                    <div key={integ.platform} className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <Plug className="h-3.5 w-3.5 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{integ.label}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {integ.eventCount} evento{integ.eventCount !== 1 ? "s" : ""}
                          {integ.lastEvent && <> · {formatRelativeDate(integ.lastEvent)}</>}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Ativa
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-sm text-muted-foreground mb-3">Conecte suas plataformas de vendas</p>
                  <Button variant="outline" size="sm" onClick={() => navigate("/integracoes")}>
                    <Plug className="h-3.5 w-3.5 mr-2" />Configurar
                  </Button>
                </div>
              )}
            </Section>
          )}
        </div>
      </div>

      {/* Confirm admin toggle dialog */}
      <AlertDialog open={!!pendingToggle} onOpenChange={(open) => { if (!open) setPendingToggle(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingToggle?.isAdmin
                ? `Você está prestes a remover a permissão de administrador de ${pendingToggle?.nome}. Essa pessoa perderá acesso às configurações e gestão do sistema.`
                : `Você está prestes a tornar ${pendingToggle?.nome} administrador(a). Essa pessoa terá acesso total às configurações e gestão do sistema.`
              }
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
