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
            <h1 className="text-4xl font-bold">Termos de Servico</h1>
            <p className="text-muted-foreground">
              Ultima atualizacao: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                1. Aceitacao dos Termos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Ao acessar ou utilizar o Game Sales ("Plataforma"), voce concorda em cumprir e estar vinculado a estes Termos de Servico. Se voce nao concordar com algum destes termos, nao utilize a Plataforma.
              </p>
              <p>
                Estes termos constituem um acordo legal entre voce ("Usuario") e o Game Sales ("Nos", "Nosso"). O uso continuado da Plataforma apos quaisquer alteracoes nestes termos constitui aceitacao dessas alteracoes.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                2. Descricao do Servico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                O Game Sales e uma plataforma de gestao de vendas que oferece:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>CRM (Customer Relationship Management) com pipeline de negociacoes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Registro e acompanhamento de vendas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Gestao de metas e desempenho de equipe</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Agendamentos e integracao com Google Calendar</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Integracoes com plataformas de vendas (Hotmart, Kiwify, Greenn, RD Station)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Comunicacao via WhatsApp integrado</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Dashboards, relatorios e gamificacao de vendas</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                3. Contas de Usuario
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">3.1 Criacao de Conta</h3>
                <p className="text-muted-foreground">
                  Para utilizar a Plataforma, voce deve criar uma conta fornecendo informacoes verdadeiras, completas e atualizadas. Contas podem ser criadas individualmente ou por um administrador da sua empresa.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">3.2 Seguranca da Conta</h3>
                <p className="text-muted-foreground">
                  Voce e responsavel por manter a confidencialidade de suas credenciais de acesso (e-mail e senha). Qualquer atividade realizada em sua conta e de sua responsabilidade. Recomendamos trocar sua senha apos o primeiro acesso e utilizar senhas fortes.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">3.3 Tipos de Conta</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Vendedor:</strong> acesso as funcionalidades de vendas, CRM, calendario e metas</li>
                  <li><strong>Administrador:</strong> acesso completo incluindo gestao de equipe, integracoes e configuracoes da empresa</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                4. Uso Aceitavel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Ao utilizar a Plataforma, voce concorda em:</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Utilizar a Plataforma apenas para fins legais e de acordo com estes Termos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Nao tentar acessar contas de outros usuarios ou dados de outras empresas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Nao utilizar a Plataforma para envio de spam ou comunicacoes nao solicitadas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Nao tentar comprometer a seguranca ou estabilidade da Plataforma</span>
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
                <h3 className="font-semibold mb-2">5.1 Planos Disponiveis</h3>
                <p className="text-muted-foreground">
                  A Plataforma oferece diferentes planos (Basic, Pro, Enterprise) com funcionalidades especificas para cada nivel. Os detalhes e precos de cada plano estao disponiveis na pagina de planos.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">5.2 Alteracoes de Preco</h3>
                <p className="text-muted-foreground">
                  Reservamo-nos o direito de alterar os precos dos planos mediante aviso previo de 30 dias. Alteracoes de preco nao afetarao o periodo de assinatura ja pago.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">5.3 Cancelamento</h3>
                <p className="text-muted-foreground">
                  Voce pode cancelar sua assinatura a qualquer momento. O acesso sera mantido ate o final do periodo ja pago. Nao realizamos reembolsos proporcionais, exceto quando exigido por lei.
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
                Todo o conteudo da Plataforma, incluindo mas nao limitado a textos, graficos, logotipos, icones, imagens, software e codigo-fonte, e de propriedade do Game Sales ou de seus licenciadores e e protegido por leis de direitos autorais.
              </p>
              <p>
                Os dados que voce insere na Plataforma (vendas, contatos, negociacoes) permanecem de sua propriedade. Nos concedemos a voce uma licenca limitada, nao exclusiva e revogavel para usar a Plataforma de acordo com estes Termos.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Integracoes com Terceiros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                A Plataforma oferece integracoes com servicos de terceiros, incluindo:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Google Calendar:</strong> sincronizacao de agendamentos. Sujeito aos Termos de Servico do Google.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Hotmart, Kiwify, Greenn:</strong> sincronizacao automatica de vendas via webhooks.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>RD Station CRM:</strong> sincronizacao de leads e negociacoes.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>WhatsApp (Evolution API):</strong> comunicacao com clientes integrada ao CRM.</span>
                </li>
              </ul>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm">
                  Nao nos responsabilizamos por falhas, indisponibilidades ou alteracoes nos servicos de terceiros. O uso dessas integracoes esta sujeito aos termos e politicas de cada provedor.
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
                Nos esforcaremos para manter a Plataforma disponivel 24 horas por dia, 7 dias por semana. No entanto, nao garantimos disponibilidade ininterrupta, pois podem ocorrer manutencoes programadas ou problemas tecnicos.
              </p>
              <p>
                O suporte tecnico esta disponivel por e-mail e pelos canais indicados na Plataforma, em horario comercial.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                9. Limitacao de Responsabilidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Na extensao maxima permitida por lei, o Game Sales nao sera responsavel por:
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
                  <span>Interrupcoes causadas por provedores de servicos terceiros</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Decisoes comerciais tomadas com base nos dados da Plataforma</span>
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
                Podemos suspender ou encerrar sua conta caso voce viole estes Termos de Servico. Em caso de encerramento, voce podera solicitar a exportacao dos seus dados dentro de 30 dias.
              </p>
              <p>
                Voce pode encerrar sua conta a qualquer momento entrando em contato com nosso suporte ou atraves das configuracoes da Plataforma.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>11. Lei Aplicavel</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Estes Termos de Servico sao regidos pelas leis da Republica Federativa do Brasil. Qualquer disputa decorrente destes termos sera submetida ao foro da comarca da sede da empresa, com exclusao de qualquer outro, por mais privilegiado que seja.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>12. Contato</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Para duvidas sobre estes Termos de Servico, entre em contato:
              </p>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p><strong>E-mail:</strong> contato@gameofsales.com.br</p>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Consulte tambem nossa{" "}
                <Link to="/politica-privacidade" className="text-primary hover:underline">
                  Politica de Privacidade
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
