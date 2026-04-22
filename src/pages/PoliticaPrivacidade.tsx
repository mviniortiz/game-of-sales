import { ArrowLeft, Shield, Lock, Eye, Database, UserCheck, Share2, CalendarCheck, UserCog, Clock, RefreshCw, Mail } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

type SectionProps = {
  number: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  children: React.ReactNode;
};

const Section = ({ number, icon: Icon, title, children }: SectionProps) => (
  <section
    className="rounded-2xl p-6 sm:p-8"
    style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
    }}
  >
    <header className="flex items-center gap-3 mb-4">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "rgba(0,227,122,0.1)", border: "1px solid rgba(0,227,122,0.2)" }}
      >
        <Icon className="h-4 w-4 text-emerald-400" strokeWidth={2} />
      </div>
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="text-xs font-mono tracking-wider text-[rgba(255,255,255,0.3)]">{number}</span>
        <h2 className="font-heading text-lg sm:text-xl font-bold text-white tracking-tight truncate">
          {title}
        </h2>
      </div>
    </header>
    <div className="space-y-4 text-[15px] leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
      {children}
    </div>
  </section>
);

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-3">
    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
    <span>{children}</span>
  </li>
);

const SubHeading = ({ children }: { children: React.ReactNode }) => (
  <h3 className="font-heading text-white/90 font-semibold text-[15px] mt-2">{children}</h3>
);

const PoliticaPrivacidade = () => {
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "#06080a" }}>
      <div
        className="absolute inset-x-0 top-0 h-[500px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(0,227,122,0.14) 0%, rgba(0,227,122,0.04) 35%, transparent 65%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-[rgba(255,255,255,0.5)] hover:text-white mb-10 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Voltar
        </button>

        <div className="mb-12">
          <p className="text-xs font-mono tracking-[0.2em] uppercase text-emerald-400/80 mb-3">
            Legal / Vyzon
          </p>
          <h1
            className="font-heading font-bold text-white tracking-tight leading-[1.05]"
            style={{ fontSize: "clamp(2rem, 5vw, 3rem)", letterSpacing: "-0.03em" }}
          >
            Política de Privacidade
          </h1>
          <p className="mt-3 text-sm text-[rgba(255,255,255,0.45)]">
            Última atualização: {today}
          </p>
        </div>

        <div className="space-y-4">
          <Section number="01" icon={Eye} title="Introdução">
            <p>
              Esta Política de Privacidade descreve como coletamos, usamos e protegemos suas
              informações pessoais quando você utiliza nossa plataforma de gestão de vendas.
            </p>
            <p>
              Ao usar nossos serviços, você concorda com a coleta e uso de informações de acordo
              com esta política.
            </p>
          </Section>

          <Section number="02" icon={Database} title="Informações que Coletamos">
            <SubHeading>2.1 Informações de Cadastro</SubHeading>
            <ul className="space-y-2.5">
              <Bullet>Nome completo</Bullet>
              <Bullet>Endereço de e-mail</Bullet>
              <Bullet>Foto de perfil (opcional)</Bullet>
            </ul>
            <SubHeading>2.2 Dados de Vendas e Atividades</SubHeading>
            <ul className="space-y-2.5">
              <Bullet>Registros de vendas e transações</Bullet>
              <Bullet>Informações de clientes (nomes e dados de contato)</Bullet>
              <Bullet>Histórico de calls e agendamentos</Bullet>
              <Bullet>Metas e desempenho</Bullet>
            </ul>
            <SubHeading>2.3 Integração com Google Calendar</SubHeading>
            <ul className="space-y-2.5">
              <Bullet>Acesso aos seus eventos de calendário</Bullet>
              <Bullet>Permissão para criar, editar e deletar eventos</Bullet>
              <Bullet>Sincronização bidirecional de agendamentos</Bullet>
            </ul>
            <div
              className="rounded-xl p-4 mt-4"
              style={{ background: "rgba(0,227,122,0.06)", border: "1px solid rgba(0,227,122,0.2)" }}
            >
              <p className="text-sm text-[rgba(255,255,255,0.85)]">
                <strong className="text-emerald-400">Importante:</strong> Só acessamos e
                modificamos eventos relacionados aos agendamentos criados através da nossa
                plataforma. Não lemos, modificamos ou compartilhamos outros eventos do seu
                calendário.
              </p>
            </div>
          </Section>

          <Section number="03" icon={UserCheck} title="Como Usamos suas Informações">
            <ul className="space-y-2.5">
              <Bullet>Fornecer e manter nossos serviços de gestão de vendas</Bullet>
              <Bullet>Sincronizar agendamentos com seu Google Calendar</Bullet>
              <Bullet>Gerar relatórios e análises de desempenho</Bullet>
              <Bullet>Melhorar e personalizar sua experiência</Bullet>
              <Bullet>Enviar notificações importantes sobre sua conta</Bullet>
            </ul>
          </Section>

          <Section number="04" icon={Lock} title="Segurança dos Dados">
            <p>
              A segurança dos seus dados é extremamente importante para nós. Implementamos
              medidas de segurança técnicas e organizacionais para proteger suas informações:
            </p>
            <ul className="space-y-2.5">
              <Bullet>Criptografia de dados em trânsito e em repouso</Bullet>
              <Bullet>Autenticação segura com tokens de acesso</Bullet>
              <Bullet>Controle de acesso baseado em função (RBAC)</Bullet>
              <Bullet>Backups regulares dos dados</Bullet>
              <Bullet>Monitoramento contínuo de segurança</Bullet>
            </ul>
          </Section>

          <Section number="05" icon={Share2} title="Compartilhamento de Dados">
            <p>
              Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros,
              exceto:
            </p>
            <ul className="space-y-2.5">
              <Bullet>Com seu consentimento explícito</Bullet>
              <Bullet>Para cumprir obrigações legais</Bullet>
              <Bullet>Com provedores de serviços essenciais (ex: hospedagem)</Bullet>
            </ul>
          </Section>

          <Section number="06" icon={CalendarCheck} title="Google Calendar — Uso Limitado">
            <p>
              O uso que fazemos das informações recebidas das APIs do Google está em
              conformidade com a{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
              >
                Política de Dados do Usuário dos Serviços de API do Google
              </a>
              , incluindo os requisitos de Uso Limitado.
            </p>
            <div
              className="rounded-xl p-4 mt-2"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p className="font-heading text-white/90 font-semibold text-sm mb-3">
                Compromissos específicos:
              </p>
              <ul className="space-y-2.5 text-sm">
                <Bullet>Só acessamos os dados mínimos necessários para sincronizar agendamentos</Bullet>
                <Bullet>Não armazenamos dados do Google Calendar além do necessário</Bullet>
                <Bullet>Não compartilhamos dados do seu calendário com terceiros</Bullet>
                <Bullet>Você pode revogar o acesso a qualquer momento</Bullet>
              </ul>
            </div>
          </Section>

          <Section number="07" icon={UserCog} title="Seus Direitos">
            <p>Você tem direito a:</p>
            <ul className="space-y-2.5">
              <Bullet>Acessar seus dados pessoais</Bullet>
              <Bullet>Corrigir dados incorretos ou incompletos</Bullet>
              <Bullet>Solicitar a exclusão de seus dados</Bullet>
              <Bullet>Revogar permissões de integração com Google Calendar</Bullet>
              <Bullet>Exportar seus dados em formato legível</Bullet>
            </ul>
          </Section>

          <Section number="08" icon={Clock} title="Retenção de Dados">
            <p>
              Mantemos suas informações pessoais apenas pelo tempo necessário para os fins
              descritos nesta política, ou conforme exigido por lei. Você pode solicitar a
              exclusão de sua conta e dados associados a qualquer momento.
            </p>
          </Section>

          <Section number="09" icon={RefreshCw} title="Alterações nesta Política">
            <p>
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você
              sobre alterações significativas por e-mail ou através de um aviso em destaque na
              plataforma.
            </p>
          </Section>

          <Section number="10" icon={Mail} title="Contato">
            <p>
              Se você tiver dúvidas sobre esta Política de Privacidade ou sobre como tratamos
              seus dados, entre em contato:
            </p>
            <div
              className="rounded-xl p-4 flex items-center gap-3"
              style={{ background: "rgba(0,227,122,0.06)", border: "1px solid rgba(0,227,122,0.2)" }}
            >
              <Mail className="h-4 w-4 text-emerald-400 shrink-0" strokeWidth={2} />
              <a
                href="mailto:contato@vyzon.com.br"
                className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                contato@vyzon.com.br
              </a>
            </div>
            <p className="text-sm text-[rgba(255,255,255,0.45)]">
              Consulte também nossos{" "}
              <Link
                to="/termos-de-servico"
                className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
              >
                Termos de Serviço
              </Link>
              .
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
};

export default PoliticaPrivacidade;
