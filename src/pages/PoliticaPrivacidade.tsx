import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, Lock, Eye, Database, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PoliticaPrivacidade = () => {
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
            <Shield className="h-16 w-16 mx-auto text-primary" />
            <h1 className="text-4xl font-bold">Política de Privacidade</h1>
            <p className="text-muted-foreground">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                1. Introdução
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Esta Política de Privacidade descreve como coletamos, usamos e protegemos suas informações pessoais quando você utiliza nossa plataforma de gestão de vendas.
              </p>
              <p>
                Ao usar nossos serviços, você concorda com a coleta e uso de informações de acordo com esta política.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                2. Informações que Coletamos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">2.1 Informações de Cadastro</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Nome completo</li>
                  <li>Endereço de e-mail</li>
                  <li>Foto de perfil (opcional)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">2.2 Dados de Vendas e Atividades</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Registros de vendas e transações</li>
                  <li>Informações de clientes (nomes e dados de contato)</li>
                  <li>Histórico de calls e agendamentos</li>
                  <li>Metas e desempenho</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">2.3 Integração com Google Calendar</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Acesso aos seus eventos de calendário</li>
                  <li>Permissão para criar, editar e deletar eventos</li>
                  <li>Sincronização bidirecional de agendamentos</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Importante:</strong> Só acessamos e modificamos eventos relacionados aos agendamentos criados através da nossa plataforma. Não lemos, modificamos ou compartilhamos outros eventos do seu calendário.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                3. Como Usamos suas Informações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Fornecer e manter nossos serviços de gestão de vendas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Sincronizar agendamentos com seu Google Calendar</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Gerar relatórios e análises de desempenho</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Melhorar e personalizar sua experiência</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Enviar notificações importantes sobre sua conta</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                4. Segurança dos Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                A segurança dos seus dados é extremamente importante para nós. Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Criptografia de dados em trânsito e em repouso</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Autenticação segura com tokens de acesso</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Controle de acesso baseado em função (RBAC)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Backups regulares dos dados</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Monitoramento contínuo de segurança</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Compartilhamento de Dados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros, exceto:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Com seu consentimento explícito</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Para cumprir obrigações legais</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Com provedores de serviços essenciais (ex: hospedagem)</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Google Calendar - Uso Limitado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                O uso que fazemos das informações recebidas das APIs do Google está em conformidade com a{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Política de Dados do Usuário dos Serviços de API do Google
                </a>
                , incluindo os requisitos de Uso Limitado.
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-semibold mb-2">Compromissos específicos:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Só acessamos os dados mínimos necessários para sincronizar agendamentos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Não armazenamos dados do Google Calendar além do necessário</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Não compartilhamos dados do seu calendário com terceiros</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Você pode revogar o acesso a qualquer momento</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Seus Direitos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Você tem direito a:</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Acessar seus dados pessoais</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Corrigir dados incorretos ou incompletos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Solicitar a exclusão de seus dados</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Revogar permissões de integração com Google Calendar</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Exportar seus dados em formato legível</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Retenção de Dados</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Mantemos suas informações pessoais apenas pelo tempo necessário para os fins descritos nesta política, ou conforme exigido por lei. Você pode solicitar a exclusão de sua conta e dados associados a qualquer momento.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Alterações nesta Política</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre alterações significativas por e-mail ou através de um aviso em destaque na plataforma.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Contato</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Se você tiver dúvidas sobre esta Política de Privacidade ou sobre como tratamos seus dados, entre em contato conosco:
              </p>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p><strong>E-mail:</strong> privacidade@suaempresa.com</p>
                <p><strong>Telefone:</strong> +55 (11) 1234-5678</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PoliticaPrivacidade;
