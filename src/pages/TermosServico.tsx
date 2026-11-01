import { A, Destaque, LegalLayout, Lista, P, Sub, type LegalSection } from "@/components/legal/LegalLayout";

// Data fixa: muda só quando o texto muda.
const ATUALIZADOS = "Atualizados em 16 de outubro de 2026";

const RESUMO = [
    "O Vyzon acompanha as propostas que a sua empresa manda pelo WhatsApp, e a EVA sugere o próximo passo. Quem aprova o que vai para o cliente é o seu time.",
    "O Raio-X das propostas paradas é grátis. O resto do produto é um plano pago mensal, que você cancela quando quiser, sem multa.",
    "Os dados que você coloca no Vyzon continuam sendo seus.",
    "A conexão do WhatsApp por QR code não é a API oficial: o próprio WhatsApp pode restringir o número, e isso foge do nosso controle.",
];

const SECOES: LegalSection[] = [
    {
        id: "aceitacao",
        title: "Aceitação",
        body: (
            <>
                <P>
                    Ao acessar ou usar o Vyzon (a "Plataforma"), você concorda com estes Termos de serviço. Se não concordar com
                    algum ponto, não use a Plataforma.
                </P>
                <P>
                    Estes termos são um acordo entre você (o "Usuário") e o Vyzon ("nós"). Continuar usando a Plataforma depois de
                    uma mudança nestes termos significa aceitar a mudança.
                </P>
            </>
        ),
    },
    {
        id: "servico",
        title: "O que é o Vyzon",
        body: (
            <>
                <P>O Vyzon é uma ferramenta para integradores de energia solar que vendem pelo WhatsApp. Ele oferece:</P>
                <Lista itens={[
                    "conexão do WhatsApp da empresa e caixa de conversas com o time;",
                    "acompanhamento de cada proposta enviada, com o placar do que está parado e do valor envolvido;",
                    "pipeline de oportunidades, notas, tarefas e propostas;",
                    "a EVA, que lê as conversas, sugere o próximo passo e prepara mensagens de retomada para o time aprovar;",
                    "o Raio-X das propostas paradas;",
                    "integração com Google Calendar e com plataformas de pagamento e vendas, listadas na página de Integrações do app.",
                ]} />
            </>
        ),
    },
    {
        id: "conta",
        title: "Sua conta",
        body: (
            <>
                <Sub>Criação</Sub>
                <P>
                    Para usar a Plataforma, você cria uma conta com informações verdadeiras, completas e atualizadas. A conta pode
                    ser criada por você ou por um administrador da sua empresa.
                </P>
                <Sub>Segurança</Sub>
                <P>
                    Você é responsável por manter suas credenciais de acesso em sigilo. O que for feito na sua conta é de sua
                    responsabilidade. Recomendamos usar uma senha forte e trocá-la depois do primeiro acesso.
                </P>
                <Sub>Tipos de conta</Sub>
                <Lista itens={[
                    <><strong style={{ color: "var(--lp-ink)" }}>Vendedor:</strong> usa conversas, pipeline, agenda e metas.</>,
                    <><strong style={{ color: "var(--lp-ink)" }}>Administrador:</strong> tem acesso completo, incluindo equipe, integrações e configurações da empresa.</>,
                ]} />
            </>
        ),
    },
    {
        id: "uso",
        title: "Uso aceitável",
        body: (
            <>
                <P>Ao usar a Plataforma, você concorda em:</P>
                <Lista itens={[
                    "usá-la apenas para fins legais e de acordo com estes termos;",
                    "não tentar acessar contas de outros usuários ou dados de outras empresas;",
                    "não usar a Plataforma para spam, disparo em massa ou mensagens que os destinatários não pediram;",
                    "seguir as regras de uso do WhatsApp no número que você conectar;",
                    "não tentar comprometer a segurança ou a estabilidade da Plataforma;",
                    "respeitar a privacidade dos seus clientes, tendo base legal para tratar os dados deles no Vyzon.",
                ]} />
            </>
        ),
    },
    {
        id: "eva",
        title: "A EVA e as sugestões automáticas",
        body: (
            <>
                <P>
                    A EVA usa inteligência artificial para ler conversas, estimar a chance de fechamento e sugerir mensagens. Essas
                    leituras podem conter erros. Revise cada sugestão antes de aprovar.
                </P>
                <Destaque>
                    Nenhuma mensagem sai para o seu cliente sem a aprovação de alguém do seu time. A decisão de enviar, e o conteúdo
                    enviado, são de responsabilidade da sua empresa.
                </Destaque>
                <P>O Vyzon não garante resultado de vendas.</P>
            </>
        ),
    },
    {
        id: "planos",
        title: "Planos, pagamento e cancelamento",
        body: (
            <>
                <Sub>Raio-X grátis</Sub>
                <P>Criar a conta e receber o Raio-X das propostas paradas é grátis e não gera cobrança.</P>
                <Sub>Plano pago</Sub>
                <P>
                    As demais funções exigem a assinatura do plano pago, com o preço publicado no site. A cobrança é mensal e começa
                    na contratação. Condições promocionais valem pelo prazo e para as empresas informadas
                    na oferta.
                </P>
                <Sub>Mudança de preço</Sub>
                <P>Podemos mudar o preço com aviso de 30 dias. A mudança não afeta o período que já foi pago.</P>
                <Sub>Cancelamento</Sub>
                <P>
                    Você pode cancelar a assinatura quando quiser, pelo painel ou pelo suporte, sem multa. O acesso continua até o
                    fim do período pago. Não devolvemos valores proporcionais, exceto quando a lei exigir.
                </P>
            </>
        ),
    },
    {
        id: "propriedade",
        title: "Propriedade intelectual e seus dados",
        body: (
            <>
                <P>
                    O conteúdo da Plataforma, incluindo textos, gráficos, logotipos, ícones, imagens, software e código-fonte,
                    pertence ao Vyzon ou a seus licenciadores e é protegido por lei.
                </P>
                <P>
                    Os dados que você coloca na Plataforma, como conversas, contatos e negociações, continuam sendo seus. Damos a
                    você uma licença limitada, não exclusiva e revogável para usar a Plataforma conforme estes termos.
                </P>
            </>
        ),
    },
    {
        id: "terceiros",
        title: "Serviços de terceiros",
        body: (
            <>
                <P>A Plataforma depende de serviços de outras empresas, entre eles:</P>
                <Lista itens={[
                    <><strong style={{ color: "var(--lp-ink)" }}>WhatsApp:</strong> a conexão pode ser por QR code, que não é a API oficial do WhatsApp, ou pela API oficial, por meio da Kapso. Na conexão por QR code, o WhatsApp pode limitar ou bloquear o número a qualquer momento.</>,
                    <><strong style={{ color: "var(--lp-ink)" }}>Google Calendar:</strong> sincronização de agendamentos, sujeita aos termos do Google.</>,
                    <><strong style={{ color: "var(--lp-ink)" }}>Plataformas de pagamento e vendas:</strong> envio automático de vendas por webhook.</>,
                    <><strong style={{ color: "var(--lp-ink)" }}>Provedores de inteligência artificial:</strong> usados pela EVA, como descrito na <A href="/politica-privacidade">Política de Privacidade</A>.</>,
                ]} />
                <P>
                    Não respondemos por falhas, indisponibilidades ou mudanças nesses serviços. O uso deles também segue os termos e
                    as políticas de cada empresa.
                </P>
            </>
        ),
    },
    {
        id: "disponibilidade",
        title: "Disponibilidade e suporte",
        body: (
            <>
                <P>
                    Trabalhamos para manter a Plataforma no ar 24 horas por dia, todos os dias, mas não garantimos funcionamento sem
                    interrupção. Podem ocorrer manutenções e problemas técnicos.
                </P>
                <P>O suporte atende por WhatsApp e e-mail, em horário comercial.</P>
            </>
        ),
    },
    {
        id: "responsabilidade",
        title: "Limitação de responsabilidade",
        body: (
            <>
                <P>Até onde a lei permite, o Vyzon não responde por:</P>
                <Lista itens={[
                    "danos indiretos, incidentais ou consequentes;",
                    "perda de dados causada por falhas fora do nosso controle;",
                    "interrupções causadas por serviços de terceiros, incluindo restrição ou bloqueio do número de WhatsApp;",
                    "decisões comerciais tomadas com base nos dados ou nas sugestões da Plataforma.",
                ]} />
            </>
        ),
    },
    {
        id: "encerramento",
        title: "Suspensão e encerramento",
        body: (
            <>
                <P>
                    Podemos suspender ou encerrar a sua conta se você violar estes termos. Nesse caso, você pode pedir a exportação
                    dos seus dados em até 30 dias.
                </P>
                <P>Você pode encerrar a sua conta quando quiser, pelo suporte ou pelas configurações da Plataforma.</P>
            </>
        ),
    },
    {
        id: "lei",
        title: "Lei aplicável e foro",
        body: (
            <P>
                Estes termos seguem as leis da República Federativa do Brasil. Qualquer disputa será resolvida no foro da comarca da
                sede da empresa, com exclusão de qualquer outro, por mais privilegiado que seja.
            </P>
        ),
    },
    {
        id: "contato",
        title: "Contato",
        body: (
            <>
                <P>Dúvidas sobre estes termos: <A href="mailto:contato@vyzon.com.br">contato@vyzon.com.br</A>.</P>
                <P>Veja também a <A href="/politica-privacidade">Política de Privacidade</A>, que explica como tratamos os dados.</P>
            </>
        ),
    },
];

const TermosServico = () => (
    <LegalLayout path="/termos-de-servico" title="Termos de serviço" updated={ATUALIZADOS} summary={RESUMO} sections={SECOES} />
);

export default TermosServico;
