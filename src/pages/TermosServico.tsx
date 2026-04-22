import { ArrowLeft, FileText, Users, AlertTriangle, CreditCard, Scale, Globe, ShieldCheck, Plug, Clock, Power, Gavel, Mail } from "lucide-react";
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
        style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
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

const TermosServico = () => {
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "#06080a" }}>
      {/* Top ambient glow */}
      <div
        className="absolute inset-x-0 top-0 h-[500px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(16,185,129,0.14) 0%, rgba(16,185,129,0.04) 35%, transparent 65%)",
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
            Termos de Serviço
          </h1>
          <p className="mt-3 text-sm text-[rgba(255,255,255,0.45)]">
            Última atualização: {today}
          </p>
        </div>

        <div className="space-y-4">
          <Section number="01" icon={FileText} title="Aceitação dos Termos">
            <p>
              Ao acessar ou utilizar o Vyzon ("Plataforma"), você concorda em cumprir e estar
              vinculado a estes Termos de Serviço. Se você não concordar com algum destes termos,
              não utilize a Plataforma.
            </p>
            <p>
              Estes termos constituem um acordo legal entre você ("Usuário") e o Vyzon ("Nós",
              "Nosso"). O uso continuado da Plataforma após quaisquer alterações nestes termos
              constitui aceitação dessas alterações.
            </p>
          </Section>

          <Section number="02" icon={Globe} title="Descrição do Serviço">
            <p>O Vyzon é uma plataforma de gestão de vendas que oferece:</p>
            <ul className="space-y-2.5">
              <Bullet>CRM (Customer Relationship Management) com pipeline de negociações</Bullet>
              <Bullet>Registro e acompanhamento de vendas</Bullet>
              <Bullet>Gestão de metas e desempenho de equipe</Bullet>
              <Bullet>Agendamentos e integração com Google Calendar</Bullet>
              <Bullet>Integrações com plataformas de vendas (Hotmart, Kiwify, Greenn, RD Station)</Bullet>
              <Bullet>Comunicação via WhatsApp integrado</Bullet>
              <Bullet>Dashboards, relatórios e gamificação de vendas</Bullet>
            </ul>
          </Section>

          <Section number="03" icon={Users} title="Contas de Usuário">
            <SubHeading>3.1 Criação de Conta</SubHeading>
            <p>
              Para utilizar a Plataforma, você deve criar uma conta fornecendo informações
              verdadeiras, completas e atualizadas. Contas podem ser criadas individualmente ou
              por um administrador da sua empresa.
            </p>
            <SubHeading>3.2 Segurança da Conta</SubHeading>
            <p>
              Você é responsável por manter a confidencialidade de suas credenciais de acesso
              (e-mail e senha). Qualquer atividade realizada em sua conta é de sua
              responsabilidade. Recomendamos trocar sua senha após o primeiro acesso e utilizar
              senhas fortes.
            </p>
            <SubHeading>3.3 Tipos de Conta</SubHeading>
            <ul className="space-y-2.5">
              <Bullet>
                <strong className="text-white/90">Vendedor:</strong> acesso às funcionalidades
                de vendas, CRM, calendário e metas
              </Bullet>
              <Bullet>
                <strong className="text-white/90">Administrador:</strong> acesso completo
                incluindo gestão de equipe, integrações e configurações da empresa
              </Bullet>
            </ul>
          </Section>

          <Section number="04" icon={ShieldCheck} title="Uso Aceitável">
            <p>Ao utilizar a Plataforma, você concorda em:</p>
            <ul className="space-y-2.5">
              <Bullet>Utilizar a Plataforma apenas para fins legais e de acordo com estes Termos</Bullet>
              <Bullet>Não tentar acessar contas de outros usuários ou dados de outras empresas</Bullet>
              <Bullet>Não utilizar a Plataforma para envio de spam ou comunicações não solicitadas</Bullet>
              <Bullet>Não tentar comprometer a segurança ou estabilidade da Plataforma</Bullet>
              <Bullet>Respeitar os direitos de privacidade dos seus clientes ao cadastrar dados no CRM</Bullet>
            </ul>
          </Section>

          <Section number="05" icon={CreditCard} title="Planos e Pagamentos">
            <SubHeading>5.1 Planos Disponíveis</SubHeading>
            <p>
              A Plataforma oferece diferentes planos (Starter, Plus, Pro) com funcionalidades
              específicas para cada nível. Os detalhes e preços de cada plano estão disponíveis
              na página de planos.
            </p>
            <SubHeading>5.2 Teste Grátis</SubHeading>
            <p>
              Oferecemos 14 dias de teste grátis em todos os planos pagos. Durante o período de
              teste você não será cobrado. Ao término do período, a cobrança será iniciada
              automaticamente, salvo cancelamento prévio.
            </p>
            <SubHeading>5.3 Alterações de Preço</SubHeading>
            <p>
              Reservamo-nos o direito de alterar os preços dos planos mediante aviso prévio de
              30 dias. Alterações de preço não afetarão o período de assinatura já pago.
            </p>
            <SubHeading>5.4 Cancelamento</SubHeading>
            <p>
              Você pode cancelar sua assinatura a qualquer momento diretamente pelo painel, sem
              multas ou taxas. O acesso será mantido até o final do período já pago. Não
              realizamos reembolsos proporcionais, exceto quando exigido por lei.
            </p>
          </Section>

          <Section number="06" icon={Scale} title="Propriedade Intelectual">
            <p>
              Todo o conteúdo da Plataforma, incluindo mas não limitado a textos, gráficos,
              logotipos, ícones, imagens, software e código-fonte, é de propriedade do Vyzon ou
              de seus licenciadores e é protegido por leis de direitos autorais.
            </p>
            <p>
              Os dados que você insere na Plataforma (vendas, contatos, negociações) permanecem
              de sua propriedade. Nós concedemos a você uma licença limitada, não exclusiva e
              revogável para usar a Plataforma de acordo com estes Termos.
            </p>
          </Section>

          <Section number="07" icon={Plug} title="Integrações com Terceiros">
            <p>A Plataforma oferece integrações com serviços de terceiros, incluindo:</p>
            <ul className="space-y-2.5">
              <Bullet>
                <strong className="text-white/90">Google Calendar:</strong> sincronização de
                agendamentos. Sujeito aos Termos de Serviço do Google.
              </Bullet>
              <Bullet>
                <strong className="text-white/90">Hotmart, Kiwify, Greenn:</strong> sincronização
                automática de vendas via webhooks.
              </Bullet>
              <Bullet>
                <strong className="text-white/90">RD Station CRM:</strong> sincronização de leads
                e negociações.
              </Bullet>
              <Bullet>
                <strong className="text-white/90">WhatsApp (Evolution API):</strong> comunicação
                com clientes integrada ao CRM.
              </Bullet>
            </ul>
            <div
              className="rounded-xl p-4 mt-4"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              <p className="text-sm text-amber-300/90">
                Não nos responsabilizamos por falhas, indisponibilidades ou alterações nos
                serviços de terceiros. O uso dessas integrações está sujeito aos termos e
                políticas de cada provedor.
              </p>
            </div>
          </Section>

          <Section number="08" icon={Clock} title="Disponibilidade e Suporte">
            <p>
              Nos esforçaremos para manter a Plataforma disponível 24 horas por dia, 7 dias por
              semana. No entanto, não garantimos disponibilidade ininterrupta, pois podem
              ocorrer manutenções programadas ou problemas técnicos.
            </p>
            <p>
              O suporte técnico está disponível por e-mail e pelos canais indicados na
              Plataforma, em horário comercial.
            </p>
          </Section>

          <Section number="09" icon={AlertTriangle} title="Limitação de Responsabilidade">
            <p>Na extensão máxima permitida por lei, o Vyzon não será responsável por:</p>
            <ul className="space-y-2.5">
              <Bullet>Danos indiretos, incidentais ou consequenciais</Bullet>
              <Bullet>Perda de dados decorrente de falhas fora do nosso controle</Bullet>
              <Bullet>Interrupções causadas por provedores de serviços terceiros</Bullet>
              <Bullet>Decisões comerciais tomadas com base nos dados da Plataforma</Bullet>
            </ul>
          </Section>

          <Section number="10" icon={Power} title="Encerramento">
            <p>
              Podemos suspender ou encerrar sua conta caso você viole estes Termos de Serviço.
              Em caso de encerramento, você poderá solicitar a exportação dos seus dados dentro
              de 30 dias.
            </p>
            <p>
              Você pode encerrar sua conta a qualquer momento entrando em contato com nosso
              suporte ou através das configurações da Plataforma.
            </p>
          </Section>

          <Section number="11" icon={Gavel} title="Lei Aplicável">
            <p>
              Estes Termos de Serviço são regidos pelas leis da República Federativa do Brasil.
              Qualquer disputa decorrente destes termos será submetida ao foro da comarca da
              sede da empresa, com exclusão de qualquer outro, por mais privilegiado que seja.
            </p>
          </Section>

          <Section number="12" icon={Mail} title="Contato">
            <p>Para dúvidas sobre estes Termos de Serviço, entre em contato:</p>
            <div
              className="rounded-xl p-4 flex items-center gap-3"
              style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}
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
              Consulte também nossa{" "}
              <Link
                to="/politica-privacidade"
                className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
              >
                Política de Privacidade
              </Link>{" "}
              para entender como tratamos seus dados.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
};

export default TermosServico;
