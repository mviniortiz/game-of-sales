import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Users, AlertTriangle, CreditCard, Scale, Globe, ShieldCheck } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

const TermosServico = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="space-y-6">
          <div className="text-center space-y-4 mb-8">
            <FileText className="h-16 w-16 mx-auto text-primary" />
            <h1 className="text-4xl font-bold">Termos de Serviço</h1>
            <p className="text-muted-foreground">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                1. Aceitação dos Termos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Ao acessar ou utilizar o Vyzon ("Plataforma"), você concorda em cumprir e estar vinculado a estes Termos de Serviço. Se você não concordar com algum destes termos, não utilize a Plataforma.
              </p>
              <p>
                Estes termos constituem um acordo legal entre você ("Usuário") e o Vyzon ("Nós", "Nosso"). O uso continuado da Plataforma após quaisquer alterações nestes termos constitui aceitação dessas alterações.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                2. Descrição do Serviço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                O Vyzon é uma plataforma de gestão de vendas que oferece:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>CRM (Customer Relationship Management) com pipeline de negociações</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Registro e acompanhamento de vendas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Gestão de metas e desempenho de equipe</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Agendamentos e integração com Google Calendar</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Integrações com plataformas de vendas (Hotmart, Kiwify, Greenn, RD Station)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Comunicação via WhatsApp integrado</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Dashboards, relatórios e gamificação de vendas</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                3. Contas de Usuário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">3.1 Criação de Conta</h3>
                <p className="text-muted-foreground">
                  Para utilizar a Plataforma, você deve criar uma conta fornecendo informações verdadeiras, completas e atualizadas. Contas podem ser criadas individualmente ou por um administrador da sua empresa.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">3.2 Segurança da Conta</h3>
                <p className="text-muted-foreground">
                  Você é responsável por manter a confidencialidade de suas credenciais de acesso (e-mail e senha). Qualquer atividade realizada em sua conta é de sua responsabilidade. Recomendamos trocar sua senha após o primeiro acesso e utilizar senhas fortes.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">3.3 Tipos de Conta</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Vendedor:</strong> acesso às funcionalidades de vendas, CRM, calendário e metas</li>
                  <li><strong>Administrador:</strong> acesso completo incluindo gestão de equipe, integrações e configurações da empresa</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                4. Uso Aceitável
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Ao utilizar a Plataforma, você concorda em:</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Utilizar a Plataforma apenas para fins legais e de acordo com estes Termos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Não tentar acessar contas de outros usuários ou dados de outras empresas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Não utilizar a Plataforma para envio de spam ou comunicações não solicitadas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Não tentar comprometer a segurança ou estabilidade da Plataforma</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Respeitar os direitos de privacidade dos seus clientes ao cadastrar dados no CRM</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                5. Planos e Pagamentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">5.1 Planos Disponíveis</h3>
                <p className="text-muted-foreground">
                  A Plataforma oferece diferentes planos (Basic, Pro, Enterprise) com funcionalidades específicas para cada nível. Os detalhes e preços de cada plano estão disponíveis na página de planos.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">5.2 Alterações de Preço</h3>
                <p className="text-muted-foreground">
                  Reservamo-nos o direito de alterar os preços dos planos mediante aviso prévio de 30 dias. Alterações de preço não afetarão o período de assinatura já pago.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">5.3 Cancelamento</h3>
                <p className="text-muted-foreground">
                  Você pode cancelar sua assinatura a qualquer momento. O acesso será mantido até o final do período já pago. Não realizamos reembolsos proporcionais, exceto quando exigido por lei.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                6. Propriedade Intelectual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Todo o conteúdo da Plataforma, incluindo mas não limitado a textos, gráficos, logotipos, ícones, imagens, software e código-fonte, é de propriedade do Vyzon ou de seus licenciadores e é protegido por leis de direitos autorais.
              </p>
              <p>
                Os dados que você insere na Plataforma (vendas, contatos, negociações) permanecem de sua propriedade. Nós concedemos a você uma licença limitada, não exclusiva e revogável para usar a Plataforma de acordo com estes Termos.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Integrações com Terceiros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                A Plataforma oferece integrações com serviços de terceiros, incluindo:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Google Calendar:</strong> sincronização de agendamentos. Sujeito aos Termos de Serviço do Google.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Hotmart, Kiwify, Greenn:</strong> sincronização automática de vendas via webhooks.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>RD Station CRM:</strong> sincronização de leads e negociações.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>WhatsApp (Evolution API):</strong> comunicação com clientes integrada ao CRM.</span>
                </li>
              </ul>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm">
                  Não nos responsabilizamos por falhas, indisponibilidades ou alterações nos serviços de terceiros. O uso dessas integrações está sujeito aos termos e políticas de cada provedor.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Disponibilidade e Suporte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Nos esforçaremos para manter a Plataforma disponível 24 horas por dia, 7 dias por semana. No entanto, não garantimos disponibilidade ininterrupta, pois podem ocorrer manutenções programadas ou problemas técnicos.
              </p>
              <p>
                O suporte técnico está disponível por e-mail e pelos canais indicados na Plataforma, em horário comercial.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                9. Limitação de Responsabilidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Na extensão máxima permitida por lei, o Vyzon não será responsável por:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Danos indiretos, incidentais ou consequenciais</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Perda de dados decorrente de falhas fora do nosso controle</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Interrupções causadas por provedores de serviços terceiros</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Decisões comerciais tomadas com base nos dados da Plataforma</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Encerramento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Podemos suspender ou encerrar sua conta caso você viole estes Termos de Serviço. Em caso de encerramento, você poderá solicitar a exportação dos seus dados dentro de 30 dias.
              </p>
              <p>
                Você pode encerrar sua conta a qualquer momento entrando em contato com nosso suporte ou através das configurações da Plataforma.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>11. Lei Aplicável</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Estes Termos de Serviço são regidos pelas leis da República Federativa do Brasil. Qualquer disputa decorrente destes termos será submetida ao foro da comarca da sede da empresa, com exclusão de qualquer outro, por mais privilegiado que seja.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>12. Contato</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Para dúvidas sobre estes Termos de Serviço, entre em contato:
              </p>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p><strong>E-mail:</strong> contato@gameofsales.com.br</p>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Consulte também nossa{" "}
                <Link to="/politica-privacidade" className="text-primary hover:underline">
                  Política de Privacidade
                </Link>{" "}
                para entender como tratamos seus dados.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TermosServico;
