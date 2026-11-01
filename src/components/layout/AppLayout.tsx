import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AbasCelular } from "./AbasCelular";
import "./tela.css";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { ConectarSemPlano, FaixaPlanoGratis, TelaDoPlano } from "./PlanoGratis";
import { EvaHelpDock } from "@/components/help/EvaHelpDock";
import { AskEvaPalette } from "@/components/help/AskEvaPalette";
import { WhatsappStatusPill } from "@/components/whatsapp/WhatsappStatusPill";
import { conectandoWhatsapp, rotaGratis, usePlano } from "@/hooks/usePlano";

// Page titles alinhados com nova nomenclatura visual da nav (F3 2026-05-19).
// Rotas novas (/inicio, /inbox, etc) são as principais; antigas redirect silencioso.
const getPageTitle = (pathname: string) => {
  if (pathname === "/") return "Hoje";
  if (pathname.startsWith("/orcamentos")) return "Orçamentos";
  if (pathname.startsWith("/inicio") || pathname.startsWith("/dashboard")) return "Hoje";
  if (pathname.startsWith("/inbox") || pathname.startsWith("/pulse") || pathname.startsWith("/whatsapp")) return "Conversas";
  if (pathname.startsWith("/pipeline") || pathname.startsWith("/crm")) return "Funil";
  if (pathname.startsWith("/agenda") || pathname.startsWith("/calendario")) return "Agenda";
  if (pathname.startsWith("/eva-studio")) return "EVA";
  if (pathname.startsWith("/eva") || pathname.startsWith("/agente")) return "EVA";
  if (pathname.startsWith("/performance")) return "Resultados";
  if (pathname.startsWith("/calls")) return "Resultados · Calls";
  if (pathname.startsWith("/metas")) return "Resultados · Metas";
  if (pathname.startsWith("/ranking")) return "Resultados · Ranking";
  if (pathname.startsWith("/integracoes")) return "Integrações";
  if (pathname.startsWith("/nova-venda")) return "Novo lead";
  if (pathname.startsWith("/deal")) return "Detalhes do Deal";
  if (pathname.startsWith("/automacoes")) return "Automações";
  if (pathname.startsWith("/admin/suporte")) return "Suporte";
  if (pathname.startsWith("/admin")) return "Resultados";
  if (pathname.startsWith("/configuracoes")) return "Configurações";
  if (pathname.startsWith("/profile")) return "Perfil";
  if (pathname.startsWith("/docs")) return "Central de Ajuda";
  return "Vyzon";
};

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const { pago, carregando } = usePlano();
  const semPlano = !carregando && !pago;

  const conectando = semPlano && conectandoWhatsapp(location.pathname, location.search);

  useEffect(() => {
    const title = conectando ? "Conectar WhatsApp" : getPageTitle(location.pathname);
    document.title = `Vyzon | ${title}`;
  }, [location.pathname, conectando]);

  // Sem assinatura, o grátis é o Raio-X e o placar; as telas em que a EVA age
  // mostram o caminho para assinar.

  return (
    <SidebarProvider style={{ "--sidebar-width": "15.5rem" } as React.CSSProperties}>
      <div className="min-h-screen flex w-full" style={{ background: "var(--vyz-bg)", color: "var(--vyz-text-primary)" }}>
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {semPlano && <FaixaPlanoGratis />}
          {/* No computador tudo vive na sidebar. No celular fica o que não cabe nas abas de baixo. */}
          <header className="md:hidden h-14 flex items-center gap-2 px-3" style={{ background: "var(--vyz-noite)", color: "#fff" }}>
            <SidebarTrigger className="text-white hover:bg-white/10 hover:text-white" aria-label="Abrir menu" />
            <ThemeLogo variant="inverse" className="h-[20px] w-auto" />
            <div className="ml-auto flex min-w-0 items-center">
              <WhatsappStatusPill soProblema />
            </div>
          </header>
          <main className="flex-1 p-3 pb-24 sm:p-4 sm:pb-24 md:px-9 md:py-8 overflow-auto" style={{ background: "var(--vyz-bg)" }}>
            {/* Animação de entrada padrão de TODA aba: a key por rota remonta e
                dispara o fade+rise. h-full preserva páginas full-height (Inbox/
                Pipeline). Respeita prefers-reduced-motion. */}
            <motion.div
              key={location.pathname}
              className="h-full"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              {conectando ? <ConectarSemPlano /> : semPlano && !rotaGratis(location.pathname) ? <TelaDoPlano /> : children}
            </motion.div>
          </main>
          <AbasCelular />
        </div>
        {/* Orb flutuante de ajuda (a "Holly" do Vyzon, na voz da EVA) — global. */}
        <EvaHelpDock />
        {/* Pergunte à EVA via ⌘J/Ctrl+J: o ⌘K é a busca de clientes. */}
        <AskEvaPalette />
      </div>
    </SidebarProvider>
  );
};
