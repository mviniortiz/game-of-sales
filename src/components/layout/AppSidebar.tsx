// ─────────────────────────────────────────────────────────────────────────────
// Sidebar (01/11/2026): azul-noite como as faixas da home e organizada pelo dia do
// integrador. Hoje em cima; Orçamentos, Conversas, Funil e Agenda na venda;
// Resultados e Configurações no pé, com a Lume como um cartão vivo.
//
// Os endereços continuam os antigos (/inicio, /inbox, /pipeline, /admin): o nome
// mudou no menu, mas o plano, a demo embutida e o analytics dependem deles.
// ─────────────────────────────────────────────────────────────────────────────
import { lazy, Suspense, useState, useEffect } from "react";
import type { ComponentType } from "react";
import {
  CalendarBlank,
  ChatCircleText,
  CaretUpDown,
  ChartLineUp,
  CreditCard,
  FlowArrow,
  GearSix,
  Kanban as KanbanIcon,
  Lifebuoy as LifeBuoyIcon,
  MagnifyingGlass,
  Question,
  Receipt,
  SidebarSimple,
  SignOut,
  SunHorizon,
  UserCircleGear,
  type IconProps,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReminderBell } from "@/components/crm/ReminderBell";
import { NavLink } from "@/components/NavLink";
import { trackBehavior, claritySet, clarityUpgrade, isDemoSession, DEMO_EVENTS } from "@/lib/analytics";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { usePlan } from "@/hooks/usePlan";
import { useContagensMenu } from "@/hooks/useContagensMenu";
import { CONTACT, whatsappUrl } from "@/config/contact";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { EvaBot } from "@/components/eva/EvaBot";
import { WhatsappStatusPill } from "@/components/whatsapp/WhatsappStatusPill";
import { Count } from "@/vendor/stageshow/motion/Count";
import { BuscaClientes } from "./BuscaClientes";
import "./lateral.css";
const NovaVendaModal = lazy(() => import("@/components/vendas/NovaVendaModal").then((m) => ({ default: m.NovaVendaModal })));
// F4G 2026-05-19: modal "Criar oportunidade" separado, grava em deals
const NovaOportunidadeModal = lazy(() => import("@/components/deals/NovaOportunidadeModal").then((m) => ({ default: m.NovaOportunidadeModal })));
import { Sidebar, SidebarContent, useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, useReducedMotion } from "framer-motion";

// Phosphor icon component type
type PhosphorIcon = ComponentType<IconProps>;
type Contagem = "hoje" | "orcamentos" | "conversas";

type NavItem = {
  title: string;
  url: string;
  icon: PhosphorIcon;
  conta?: Contagem;
  requires?: "admin" | "super_admin";
};

const hojeItem: NavItem = { title: "Hoje", url: "/inicio", icon: SunHorizon, conta: "hoje" };

const vendaItems: NavItem[] = [
  { title: "Orçamentos", url: "/orcamentos", icon: Receipt, conta: "orcamentos" },
  { title: "Conversas", url: "/inbox", icon: ChatCircleText, conta: "conversas" },
  { title: "Funil", url: "/pipeline", icon: KanbanIcon },
  { title: "Agenda", url: "/agenda", icon: CalendarBlank },
];

const contaItems: NavItem[] = [
  { title: "Resultados", url: "/admin", icon: ChartLineUp, requires: "admin" },
  { title: "Configurações", url: "/configuracoes", icon: GearSix },
  // Ferramentas do Vyzon, nunca do cliente.
  { title: "Automações", url: "/automacoes", icon: FlowArrow, requires: "super_admin" },
  { title: "Suporte", url: "/admin/suporte", icon: LifeBuoyIcon, requires: "super_admin" },
];

interface UserMenuProps {
  collapsed: boolean;
  nome: string;
  empresa: string;
  planoRotulo?: string;
  navigate: (path: string) => void;
  signOut: () => void;
}

function UserMenu({ collapsed, nome, empresa, planoRotulo, navigate, signOut }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Abrir menu da conta" className="vz-conta" style={collapsed ? { justifyContent: "center", padding: 6 } : undefined}>
          {collapsed ? (
            <UserCircleGear size={20} aria-hidden />
          ) : (
            <>
              <span className="vz-conta__texto">
                <span className="vz-conta__nome">{nome}</span>
                {empresa && <span className="vz-conta__empresa">{empresa}</span>}
              </span>
              <CaretUpDown size={14} weight="bold" aria-hidden style={{ opacity: 0.6, flex: "none" }} />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={collapsed ? "right" : "top"} align={collapsed ? "start" : "center"} sideOffset={8} className="w-56">
        <DropdownMenuItem onClick={() => navigate("/configuracoes/perfil")} className="text-[13px]">
          <UserCircleGear size={16} className="mr-2 text-muted-foreground" aria-hidden />
          Minha conta
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/configuracoes/faturamento")} className="text-[13px]">
          <CreditCard size={16} className="mr-2 text-muted-foreground" aria-hidden />
          Plano{planoRotulo ? ` ${planoRotulo}` : ""}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => window.open(whatsappUrl(CONTACT.defaultMessage), "_blank", "noopener,noreferrer")}
          className="text-[13px]"
        >
          <Question size={16} className="mr-2 text-muted-foreground" aria-hidden />
          Ajuda e suporte
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="text-[13px] text-destructive focus:text-destructive">
          <SignOut size={16} className="mr-2" aria-hidden />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppSidebar() {
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const { user, isAdmin, isSuperAdmin, signOut, profile } = useAuth();
  const { companies, activeCompanyId } = useTenant();
  const { planInfo } = usePlan();
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = state === "collapsed" && !isMobile;
  const reduceMotion = useReducedMotion();
  const contagens = useContagensMenu();
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [isNovaVendaOpen, setIsNovaVendaOpen] = useState(false);
  // F4G: estado separado pro modal de oportunidade (event diferente)
  const [isNovaOportunidadeOpen, setIsNovaOportunidadeOpen] = useState(false);

  // F4G: dois eventos separados. 'open-nova-venda' (legado) abre o modal que
  // grava em vendas/metas/performance. 'open-nova-oportunidade' abre o modal
  // novo que grava em deals/pipeline.
  useEffect(() => {
    const openVenda = () => setIsNovaVendaOpen(true);
    const openOportunidade = () => setIsNovaOportunidadeOpen(true);
    window.addEventListener("vyzon:open-nova-venda", openVenda);
    window.addEventListener("vyzon:open-nova-oportunidade", openOportunidade);
    return () => {
      window.removeEventListener("vyzon:open-nova-venda", openVenda);
      window.removeEventListener("vyzon:open-nova-oportunidade", openOportunidade);
    };
  }, []);

  const permitido = (item: NavItem) => {
    if (item.requires === "admin") return isAdmin;
    if (item.requires === "super_admin") return isSuperAdmin;
    return true;
  };

  // Analytics: clique manual em aba. Na demo a Lume navega por postMessage, então
  // qualquer clique na sidebar = a pessoa saindo do roteiro guiado (nav_off_flow).
  const handleNavClick = (item: NavItem) => {
    trackBehavior(DEMO_EVENTS.NAV_TAB_CLICK, { tab: item.url, title: item.title, from: location.pathname });
    claritySet("last_tab", item.title);
    if (isDemoSession()) {
      claritySet("demo", "embed");
      trackBehavior(DEMO_EVENTS.NAV_OFF_FLOW, { tab: item.url, title: item.title });
      clarityUpgrade("nav_off_flow");
    }
    if (isMobile) setOpenMobile(false);
  };

  const estaAtivo = (url: string) => {
    if (url === "/admin") return location.pathname === "/admin";
    return location.pathname === url || location.pathname.startsWith(`${url}/`);
  };

  const renderNavItem = (item: NavItem) => {
    const ativo = estaAtivo(item.url);
    const Icon = item.icon;
    const numero = item.conta ? contagens[item.conta] : 0;

    const link = (
      <NavLink
        to={item.url}
        end={item.url === "/inicio" || item.url === "/admin"}
        className="vz-nav"
        activeClassName=""
        aria-label={item.title}
        aria-current={ativo ? "page" : undefined}
        data-ativo={ativo || undefined}
        data-demo-nav={item.url}
        onClick={() => handleNavClick(item)}
      >
        {ativo &&
          (reduceMotion ? (
            <span className="vz-nav__pilula" aria-hidden />
          ) : (
            <motion.span layoutId="sidebar-active-pill" transition={{ type: "spring", stiffness: 460, damping: 38 }} className="vz-nav__pilula" aria-hidden />
          ))}
        <span className="vz-nav__icone">
          <Icon size={19} weight={ativo ? "fill" : "regular"} aria-hidden />
        </span>
        {!collapsed && <span className="vz-nav__nome">{item.title}</span>}
        {numero > 0 && (
          <span className="vz-nav__conta" data-forte={item.conta === "hoje" || undefined}>
            <Count value={numero} format={(n) => (n > 99 ? "99+" : String(Math.round(n)))} duration={420} />
          </span>
        )}
      </NavLink>
    );

    if (!collapsed) return <div key={item.url}>{link}</div>;
    return (
      <Tooltip key={item.url}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {item.title}
        </TooltipContent>
      </Tooltip>
    );
  };

  const nome = profile?.nome || user?.email || "Conta";
  const empresa = companies.find((c) => c.id === activeCompanyId)?.name ?? "";
  const evaAtiva = location.pathname.startsWith("/eva-studio");
  const evaTexto =
    contagens.hoje > 0
      ? `${contagens.hoje} esperando o seu 1`
      : contagens.acompanhando > 0
        ? `De olho em ${contagens.acompanhando} ${contagens.acompanhando === 1 ? "orçamento" : "orçamentos"}`
        : "De olho no seu WhatsApp";

  return (
    <TooltipProvider delayDuration={300}>
      <Sidebar collapsible="icon">
        <SidebarContent className="gap-0 overflow-hidden">
          <div className="vz-lateral" data-recolhida={collapsed || undefined}>
            <div className="vz-lateral__topo">
              {collapsed ? <ThemeLogo iconOnly className="h-7 w-7" /> : <ThemeLogo variant="inverse" className="h-[22px] w-auto" />}
              <div className="vz-lateral__acoes">
                {!collapsed && <ReminderBell />}
                <button type="button" className="vz-lateral__icone" aria-label={collapsed ? "Abrir menu" : "Recolher menu"} onClick={toggleSidebar}>
                  <SidebarSimple size={18} aria-hidden />
                </button>
              </div>
            </div>

            <button type="button" className="vz-busca" aria-label="Buscar cliente" onClick={() => setBuscaAberta(true)}>
              <MagnifyingGlass size={16} aria-hidden />
              {!collapsed && (
                <>
                  <span>Buscar cliente</span>
                  <kbd>⌘K</kbd>
                </>
              )}
            </button>

            <div className="vz-grupo vz-grupo--limpo">{renderNavItem(hojeItem)}</div>

            <div className="vz-grupo">
              {!collapsed && <div className="vz-grupo__rotulo">Venda</div>}
              {vendaItems.filter(permitido).map(renderNavItem)}
            </div>

            <div className="vz-lateral__pe">
              <div className="vz-grupo vz-grupo--limpo">{contaItems.filter(permitido).map(renderNavItem)}</div>

              {!collapsed && (
                <div className="vz-lateral__aviso">
                  <WhatsappStatusPill soProblema />
                </div>
              )}

              <NavLink
                to={isAdmin ? "/eva-studio" : "/inicio"}
                className="vz-eva-card"
                activeClassName=""
                aria-label={`Lume: ${evaTexto}`}
                aria-current={evaAtiva ? "page" : undefined}
                data-ativo={evaAtiva || undefined}
                onClick={() => isMobile && setOpenMobile(false)}
              >
                <span className="vz-eva-card__bot">
                  <EvaBot size={44} state={contagens.hoje > 0 ? "alert" : "idle"} tema="sol" />
                </span>
                {!collapsed && (
                  <span className="vz-eva-card__texto">
                    <b>Lume</b>
                    <span>{evaTexto}</span>
                  </span>
                )}
              </NavLink>

              <UserMenu
                collapsed={collapsed}
                nome={nome}
                empresa={empresa}
                planoRotulo={planInfo?.label}
                navigate={navigate}
                signOut={signOut}
              />
            </div>
          </div>
        </SidebarContent>
      </Sidebar>

      <BuscaClientes aberta={buscaAberta} aoMudar={setBuscaAberta} />

      {isNovaVendaOpen && (
        <Suspense fallback={null}>
          <NovaVendaModal
            open={isNovaVendaOpen}
            onClose={() => setIsNovaVendaOpen(false)}
          />
        </Suspense>
      )}

      {/* F4G: modal nova oportunidade (grava em deals/pipeline) */}
      {isNovaOportunidadeOpen && (
        <Suspense fallback={null}>
          <NovaOportunidadeModal
            open={isNovaOportunidadeOpen}
            onClose={() => setIsNovaOportunidadeOpen(false)}
          />
        </Suspense>
      )}
    </TooltipProvider>
  );
}
