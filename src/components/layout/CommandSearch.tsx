import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Home, Trophy, PlusCircle, Target, PhoneCall, Shield, Calendar, Kanban, Settings,
    Inbox, UserCog, HelpCircle, Briefcase, Phone, User, Search, CornerDownLeft, Command as CmdIcon,
} from "lucide-react";
import { EvaIcon } from "@/components/icons/EvaAvatar";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { usePlan } from "@/hooks/usePlan";

interface DealResult {
    id: string;
    title: string | null;
    customer_name: string | null;
    customer_phone: string | null;
    stage: string | null;
    value: number | null;
}

type RowKind = "deal" | "action" | "nav";
interface Row {
    kind: RowKind;
    id: string;
    label: string;
    sub?: string;
    icon: React.ComponentType<{ className?: string }>;
    trailing?: string;
    onSelect: () => void;
}

const NAV_ITEMS = [
    { label: "Dashboard", path: "/dashboard", icon: Home, sub: "Visão geral dos números do time", keywords: "home inicio" },
    { label: "Pulse", path: "/pulse", icon: WhatsAppIcon, sub: "Conversas WhatsApp com seus leads", keywords: "whatsapp conversas mensagens" },
    { label: "CRM Pipeline", path: "/crm", icon: Kanban, sub: "Kanban de deals por estágio", keywords: "pipeline kanban deals" },
    { label: "Calls", path: "/calls", icon: PhoneCall, sub: "Histórico e performance de ligações", keywords: "ligacoes chamadas" },
    { label: "Calendário", path: "/calendario", icon: Calendar, sub: "Compromissos e follow-ups agendados", keywords: "agenda eventos" },
    { label: "Metas", path: "/metas", icon: Target, sub: "Objetivos mensais por vendedor", keywords: "objetivos goals" },
    { label: "Ranking", path: "/ranking", icon: Trophy, sub: "Placar da equipe em tempo real", keywords: "gamificacao competicao" },
    { label: "Eva", path: "/agente", icon: EvaIcon, sub: "IA que analisa seu pipeline e sugere ações", keywords: "ia agente assistente copilot", feature: "eva" },
    { label: "Gestão", path: "/admin", icon: Shield, sub: "Usuários, permissões e configurações do time", keywords: "admin time equipe", adminOnly: true },
    { label: "Configurações", path: "/configuracoes", icon: Settings, sub: "Integrações, faturamento, preferências", keywords: "settings perfil integracoes" },
    { label: "Minha conta", path: "/configuracoes/perfil", icon: UserCog, sub: "Seu perfil, avatar e dados pessoais", keywords: "profile" },
    { label: "Ajuda & docs", path: "/docs", icon: HelpCircle, sub: "Guias e documentação da plataforma", keywords: "help docs suporte" },
    { label: "Suporte", path: "/admin/suporte", icon: Inbox, sub: "Tickets e atendimento aos clientes", keywords: "tickets", superAdminOnly: true },
];

interface CommandSearchProps {
    open: boolean;
    onOpenChange: (v: boolean) => void;
}

const formatBRL = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function CommandSearch({ open, onOpenChange }: CommandSearchProps) {
    const navigate = useNavigate();
    const { companyId, isSuperAdmin, isAdmin } = useAuth();
    const { activeCompanyId } = useTenant();
    const { hasFeature } = usePlan();
    const effectiveCompanyId = isSuperAdmin ? activeCompanyId : companyId;

    const [query, setQuery] = useState("");
    const [deals, setDeals] = useState<DealResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [highlight, setHighlight] = useState(0);

    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Focus + reset state when opens
    useEffect(() => {
        if (open) {
            requestAnimationFrame(() => inputRef.current?.focus());
        } else {
            setQuery("");
            setDeals([]);
            setHighlight(0);
        }
    }, [open]);

    // Debounced deal search (scoped por company_id)
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const trimmed = query.trim();
        if (!trimmed || trimmed.length < 2 || !effectiveCompanyId) {
            setDeals([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        debounceRef.current = setTimeout(async () => {
            const digits = trimmed.replace(/\D/g, "");
            const hasDigits = digits.length >= 4;
            const filters = hasDigits
                ? `title.ilike.%${trimmed}%,customer_name.ilike.%${trimmed}%,customer_phone.ilike.%${digits}%`
                : `title.ilike.%${trimmed}%,customer_name.ilike.%${trimmed}%`;

            const { data, error } = await supabase
                .from("deals")
                .select("id, title, customer_name, customer_phone, stage, value")
                .eq("company_id", effectiveCompanyId)
                .or(filters)
                .order("updated_at", { ascending: false })
                .limit(8);

            if (!error && data) setDeals(data as DealResult[]);
            setLoading(false);
        }, 200);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, effectiveCompanyId]);

    // Click-outside to close
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                onOpenChange(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open, onOpenChange]);

    const filteredNav = useMemo(() => {
        const items = NAV_ITEMS.filter((item) => {
            if (item.path === "/calls") return hasFeature("calls");
            if (item.path === "/metas") return hasFeature("metas");
            if (item.path === "/ranking") return hasFeature("gamification");
            if ("adminOnly" in item && item.adminOnly) return isAdmin;
            if ("superAdminOnly" in item && item.superAdminOnly) return isSuperAdmin;
            return true;
        });
        const q = normalize(query.trim());
        if (!q) return items;
        return items.filter((i) => normalize(`${i.label} ${i.keywords ?? ""}`).includes(q));
    }, [query, hasFeature, isAdmin, isSuperAdmin]);

    const rows = useMemo<Row[]>(() => {
        const result: Row[] = [];

        deals.forEach((d) => {
            const sub = [d.customer_name, d.customer_phone].filter(Boolean).join(" · ");
            result.push({
                kind: "deal",
                id: `deal-${d.id}`,
                label: d.title || d.customer_name || "Deal sem título",
                sub: sub || undefined,
                icon: Briefcase,
                trailing: d.value != null ? formatBRL(d.value) : undefined,
                onSelect: () => {
                    onOpenChange(false);
                    navigate(`/deals/${d.id}`);
                },
            });
        });

        const q = normalize(query.trim());
        const actionsRaw = [
            {
                id: "nova-venda",
                label: "Registrar nova venda",
                sub: "Cria um novo deal no pipeline",
                icon: PlusCircle,
                keywords: "criar deal venda novo",
                onSelect: () => {
                    onOpenChange(false);
                    window.dispatchEvent(new CustomEvent("vyzon:open-nova-venda"));
                },
            },
            {
                id: "eva",
                label: "Falar com a Eva",
                sub: "Abre o copilot de IA do CRM",
                icon: EvaIcon as React.ComponentType<{ className?: string }>,
                keywords: "ia agente assistente copilot",
                onSelect: () => {
                    onOpenChange(false);
                    window.dispatchEvent(new CustomEvent("vyzon:open-eva"));
                },
            },
        ];
        actionsRaw
            .filter((a) => !q || normalize(`${a.label} ${a.keywords}`).includes(q))
            .forEach((a) => result.push({ kind: "action", ...a }));

        filteredNav.forEach((n) => {
            result.push({
                kind: "nav",
                id: `nav-${n.path}`,
                label: n.label,
                sub: n.sub,
                icon: n.icon as React.ComponentType<{ className?: string }>,
                onSelect: () => {
                    onOpenChange(false);
                    navigate(n.path);
                },
            });
        });

        return result;
    }, [deals, filteredNav, query, onOpenChange, navigate]);

    // Keyboard nav
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onOpenChange(false);
                return;
            }
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlight((h) => Math.min(h + 1, rows.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
                e.preventDefault();
                rows[highlight]?.onSelect();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, rows, highlight, onOpenChange]);

    useEffect(() => {
        setHighlight(0);
    }, [query]);

    // Scroll active row into view
    useEffect(() => {
        if (!listRef.current) return;
        const el = listRef.current.querySelector<HTMLButtonElement>(`[data-idx="${highlight}"]`);
        if (el) el.scrollIntoView({ block: "nearest" });
    }, [highlight]);

    const groupedRows = useMemo(() => {
        const groups: { heading: string; items: Array<Row & { idx: number }> }[] = [];
        let currentKind: RowKind | null = null;
        rows.forEach((r, idx) => {
            const heading = r.kind === "deal" ? "Deals" : r.kind === "action" ? "Ações rápidas" : "Navegação";
            if (r.kind !== currentKind) {
                groups.push({ heading, items: [] });
                currentKind = r.kind;
            }
            groups[groups.length - 1].items.push({ ...r, idx });
        });
        return groups;
    }, [rows]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    ref={containerRef}
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.6 }}
                    className="absolute top-full right-0 mt-2 w-[min(560px,calc(100vw-24px))] z-50"
                    style={{ willChange: "transform, opacity", transformOrigin: "top right" }}
                >
                    <div
                        className="overflow-hidden rounded-xl"
                        style={{
                            background: "rgba(11,14,18,0.92)",
                            backdropFilter: "blur(24px) saturate(160%)",
                            WebkitBackdropFilter: "blur(24px) saturate(160%)",
                            border: "1px solid var(--vyz-border-strong, rgba(255,255,255,0.08))",
                            boxShadow: "0 24px 60px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.02) inset",
                        }}
                    >
                        {/* Input */}
                        <div
                            className="flex items-center gap-2.5 px-3.5 h-12 border-b"
                            style={{ borderColor: "var(--vyz-border, rgba(255,255,255,0.06))" }}
                        >
                            <Search className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Buscar deals, páginas, ações…"
                                className="flex-1 bg-transparent outline-none text-[13.5px] text-white placeholder:text-muted-foreground/45"
                                autoComplete="off"
                                spellCheck={false}
                            />
                            {loading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="h-3.5 w-3.5 rounded-full border-[1.5px] border-emerald-400/30 border-t-emerald-400 animate-spin"
                                />
                            )}
                            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground/60 bg-white/[0.04] border border-white/[0.06]">
                                esc
                            </kbd>
                        </div>

                        {/* Results */}
                        <div
                            ref={listRef}
                            className="max-h-[min(420px,60vh)] overflow-y-auto overflow-x-hidden py-1.5"
                            style={{ scrollbarWidth: "thin" }}
                        >
                            {rows.length === 0 ? (
                                <div className="py-8 text-center text-[12.5px] text-muted-foreground/60">
                                    {query.trim().length > 0 && !loading
                                        ? "Nenhum resultado encontrado."
                                        : "Digite para buscar."}
                                </div>
                            ) : (
                                groupedRows.map((group) => (
                                    <div key={group.heading} className="mb-1 last:mb-0">
                                        <div
                                            className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground/40"
                                        >
                                            {group.heading}
                                        </div>
                                        {group.items.map((r) => {
                                            const Icon = r.icon;
                                            const active = r.idx === highlight;
                                            return (
                                                <button
                                                    key={r.id}
                                                    data-idx={r.idx}
                                                    onMouseEnter={() => setHighlight(r.idx)}
                                                    onClick={r.onSelect}
                                                    className="relative w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
                                                    style={{
                                                        background: active ? "rgba(0,227,122,0.08)" : "transparent",
                                                    }}
                                                >
                                                    {active && (
                                                        <motion.span
                                                            layoutId="cmd-highlight"
                                                            className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-r-full bg-emerald-400"
                                                            transition={{ type: "spring", stiffness: 500, damping: 34 }}
                                                        />
                                                    )}
                                                    <div
                                                        className="flex items-center justify-center h-7 w-7 rounded-md shrink-0"
                                                        style={{
                                                            background: active
                                                                ? "rgba(0,227,122,0.12)"
                                                                : "rgba(255,255,255,0.03)",
                                                            border: "1px solid rgba(255,255,255,0.05)",
                                                        }}
                                                    >
                                                        <Icon
                                                            className="h-3.5 w-3.5"
                                                            {...(active ? { style: { color: "#33FF9E" } } : { style: { color: "rgba(255,255,255,0.55)" } })}
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div
                                                            className="text-[13px] truncate"
                                                            style={{ color: active ? "#fff" : "rgba(255,255,255,0.85)" }}
                                                        >
                                                            {r.label}
                                                        </div>
                                                        {r.sub && (
                                                            <div className="text-[11px] text-muted-foreground/55 truncate flex items-center gap-1.5 mt-0.5">
                                                                {r.sub.includes("·") ? (
                                                                    r.sub.split(" · ").map((part, i) => (
                                                                        <span key={i} className="inline-flex items-center gap-1">
                                                                            {i === 0 ? <User className="h-2.5 w-2.5" /> : <Phone className="h-2.5 w-2.5" />}
                                                                            {part}
                                                                        </span>
                                                                    ))
                                                                ) : (
                                                                    r.sub
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {r.trailing && (
                                                        <span className="text-[11px] font-medium text-emerald-400/90 tabular-nums shrink-0">
                                                            {r.trailing}
                                                        </span>
                                                    )}
                                                    {active && (
                                                        <CornerDownLeft className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer hints */}
                        <div
                            className="flex items-center justify-between px-3 py-2 text-[10.5px] text-muted-foreground/50 border-t"
                            style={{ borderColor: "var(--vyz-border, rgba(255,255,255,0.06))", background: "rgba(255,255,255,0.015)" }}
                        >
                            <div className="flex items-center gap-3">
                                <span className="inline-flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] font-mono text-[9.5px]">↑↓</kbd>
                                    navegar
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] font-mono text-[9.5px]">↵</kbd>
                                    abrir
                                </span>
                            </div>
                            <span className="inline-flex items-center gap-1">
                                <CmdIcon className="h-2.5 w-2.5" />
                                <span>K pra abrir em qualquer lugar</span>
                            </span>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
