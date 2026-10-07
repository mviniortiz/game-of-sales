import { useMemo } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Buildings,
  ChatCircleText,
  CheckCircle,
  CreditCard,
  DownloadSimple,
  ShieldCheck,
  Tag,
  UserCircle,
  UsersThree,
  WebhooksLogo,
  type Icon,
} from "@phosphor-icons/react";
import { useAuth } from "@/contexts/AuthContext";

type NavItem = {
  id: string;
  label: string;
  path: string;
  icon: Icon;
  adminOnly?: boolean;
};

type NavGroup = { label: string; items: NavItem[] };

// Menu do produto de hoje (out/2026): WhatsApp, aprovação da EVA e leads.
// Integrações de infoproduto (Hotmart, Kiwify) e Relatórios públicos saíram do
// menu por falta de uso; Equipe mora na Gestão.
const GROUPS: NavGroup[] = [
  {
    label: "Conta",
    items: [
      { id: "perfil", label: "Perfil", path: "/configuracoes/perfil", icon: UserCircle },
      { id: "seguranca", label: "Segurança", path: "/configuracoes/seguranca", icon: ShieldCheck },
    ],
  },
  {
    label: "Empresa",
    items: [
      { id: "organizacao", label: "Organização", path: "/configuracoes/organizacao", icon: Buildings, adminOnly: true },
      // O WhatsApp se conecta e reconecta no Inbox; o item leva direto para lá.
      { id: "whatsapp", label: "WhatsApp", path: "/inbox?connect=1", icon: ChatCircleText, adminOnly: true },
      { id: "time", label: "Equipe", path: "/admin?aba=equipe", icon: UsersThree, adminOnly: true },
      { id: "faturamento", label: "Plano e faturamento", path: "/configuracoes/faturamento", icon: CreditCard, adminOnly: true },
    ],
  },
  {
    label: "EVA",
    items: [{ id: "aprovacao", label: "Aprovação no WhatsApp", path: "/configuracoes/aprovacao", icon: CheckCircle, adminOnly: true }],
  },
  {
    label: "Leads",
    items: [
      { id: "webhooks-leads", label: "Receber leads", path: "/configuracoes/webhooks-leads", icon: WebhooksLogo, adminOnly: true },
      { id: "importar", label: "Importar", path: "/configuracoes/importar", icon: DownloadSimple, adminOnly: true },
      { id: "tags", label: "Tags", path: "/configuracoes/tags", icon: Tag, adminOnly: true },
    ],
  },
];

const TITLES: Record<string, { title: string; subtitle: string }> = {
  perfil: { title: "Perfil", subtitle: "Seu nome e sua foto no Vyzon" },
  seguranca: { title: "Segurança", subtitle: "Senha e acesso à conta" },
  organizacao: { title: "Organização", subtitle: "Dados da empresa e o segmento que a EVA usa" },
  faturamento: { title: "Plano e faturamento", subtitle: "Seu plano, o uso e as cobranças" },
  aprovacao: { title: "Aprovação no WhatsApp", subtitle: "Como os rascunhos da EVA chegam até você" },
  integracoes: { title: "Integrações", subtitle: "Conecte as ferramentas que você já usa" },
  "webhooks-leads": { title: "Receber leads", subtitle: "Leads do seu site e dos anúncios entram direto no funil" },
  tags: { title: "Tags", subtitle: "Marcadores para oportunidades, conversas e contatos" },
  importar: { title: "Importar", subtitle: "Traga contatos e oportunidades de uma planilha" },
};

export default function ConfiguracoesLayout() {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const currentSection = location.pathname.split("/")[2] || "perfil";
  const header = TITLES[currentSection] || TITLES.perfil;

  const visibleGroups = useMemo(
    () =>
      GROUPS.map((g) => ({ ...g, items: g.items.filter((it) => !it.adminOnly || isAdmin) })).filter((g) => g.items.length > 0),
    [isAdmin],
  );

  const itemClass = (active: boolean) =>
    `group flex items-center gap-2.5 rounded-[10px] px-2.5 text-[13.5px] font-medium outline-none transition-colors duration-150 focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.28)] ${
      active
        ? "bg-[var(--vyz-accent-soft-10)] text-[var(--vyz-text-primary)]"
        : "text-[var(--vyz-text-muted)] hover:bg-[var(--vyz-surface-2)] hover:text-[var(--vyz-text-primary)]"
    }`;

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-6">
      <header>
        <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-[var(--vyz-text-primary)]">{header.title}</h1>
        <p className="mt-1 text-[14px] text-[var(--vyz-text-muted)]">{header.subtitle}</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr] lg:gap-8">
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <nav aria-label="Configurações" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2 no-scrollbar lg:hidden">
            {visibleGroups.flatMap((g) => g.items).map((item) => {
              const active = currentSection === item.id;
              return (
                <NavLink key={item.id} to={item.path} aria-current={active ? "page" : undefined} className={`${itemClass(active)} h-8 whitespace-nowrap`}>
                  <item.icon size={16} weight={active ? "fill" : "regular"} className={active ? "text-[var(--vyz-accent)]" : ""} aria-hidden />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <nav aria-label="Configurações" className="hidden space-y-5 lg:block">
            {visibleGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 px-2.5 text-[12px] font-medium text-[var(--vyz-text-soft)]">{group.label}</p>
                <ul className="space-y-px">
                  {group.items.map((item) => {
                    const active = currentSection === item.id;
                    return (
                      <li key={item.id}>
                        <NavLink to={item.path} aria-current={active ? "page" : undefined} className={`${itemClass(active)} h-9`}>
                          <item.icon
                            size={18}
                            weight={active ? "fill" : "regular"}
                            className={active ? "text-[var(--vyz-accent)]" : "group-hover:text-[var(--vyz-text-primary)]"}
                            aria-hidden
                          />
                          <span className="flex-1">{item.label}</span>
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
