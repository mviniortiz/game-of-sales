import { A, Destaque, LegalLayout, Lista, P, Sub, type LegalSection } from "@/components/legal/LegalLayout";

// Data fixa: muda só quando o texto muda.
const ATUALIZADA = "Atualizada em 16 de outubro de 2026";

const RESUMO = [
    "Para funcionar, o Vyzon guarda as conversas do WhatsApp que a sua empresa conecta, além dos dados da sua conta e do seu funil.",
    "A EVA lê essas conversas com a ajuda de provedores de inteligência artificial para sugerir o próximo passo. Nenhuma mensagem sai para o seu cliente sem alguém do seu time aprovar.",
    "Não vendemos dados. Só compartilhamos com os fornecedores que fazem o serviço funcionar, listados aqui.",
    "Você pode pedir acesso, correção ou exclusão dos seus dados quando quiser, por contato@vyzon.com.br.",
];

const SECOES: LegalSection[] = [
    {
        id: "quem-somos",
        title: "Quem somos e o que esta política cobre",
        body: (
            <>
                <P>
                    O Vyzon é uma ferramenta para integradores de energia solar que vendem pelo WhatsApp. Ele acompanha cada
                    proposta enviada, mostra o que está parado e, com a EVA, sugere a retomada certa na hora certa.
                </P>
                <P>Esta política explica como tratamos dados pessoais de três grupos de pessoas:</P>
                <Lista itens={[
                    "quem usa o Vyzon, como donos, vendedores e administradores das empresas clientes;",
                    "as pessoas com quem essas empresas conversam pelo WhatsApp conectado, que são os clientes delas;",
                    "quem visita o nosso site ou recebe um contato comercial nosso.",
                ]} />
                <P>Ao usar o Vyzon, você declara que leu esta política.</P>
            </>
        ),
    },
    {
        id: "dados",
        title: "Que dados tratamos",
        body: (
            <>
                <Sub>Dados da sua conta</Sub>
                <Lista itens={["Nome, e-mail e número de WhatsApp.", "Nome e segmento da empresa.", "Foto de perfil, se você enviar."]} />

                <Sub>Conversas do WhatsApp conectado</Sub>
                <P>
                    Quando a sua empresa conecta um número de WhatsApp, recebemos as mensagens das conversas desse número:
                    textos, áudios, imagens e documentos, como o PDF de uma proposta. Também recebemos o nome e o número de
                    cada contato. Áudios podem ser transcritos e o valor de uma proposta em PDF pode ser lido automaticamente,
                    para o orçamento entrar no placar.
                </P>

                <Sub>Dados do seu funil</Sub>
                <Lista itens={["Oportunidades, etapas, valores, notas e tarefas.", "Propostas e produtos que você cadastra.", "O histórico de ações do seu time no Vyzon."]} />

                <Sub>Site da sua empresa</Sub>
                <P>
                    Se você digitar o endereço do site da sua empresa ao configurar a EVA, nós lemos esse site para resumir o que
                    a empresa faz. O resumo só é gravado depois que você confirma.
                </P>

                <Sub>Google Calendar</Sub>
                <P>Se você conectar a sua agenda, acessamos os eventos dos agendamentos feitos pelo Vyzon. Os detalhes estão na seção sobre o Google, mais abaixo.</P>

                <Sub>Navegação e medição</Sub>
                <P>
                    No site e no app usamos ferramentas de medição e de anúncios: Google Analytics, Google Ads, Meta Pixel e
                    Microsoft Clarity. Elas registram páginas visitadas, cliques e dados do aparelho, e são carregadas depois da
                    primeira interação com a página.
                </P>

                <Sub>Pagamento</Sub>
                <P>A cobrança é feita por link do Mercado Pago. Os dados do cartão ficam com o Mercado Pago, e o Vyzon não os recebe.</P>
            </>
        ),
    },
    {
        id: "uso",
        title: "Para que usamos os dados",
        body: (
            <Lista itens={[
                "Mostrar as suas conversas, o placar de orçamentos e o pipeline.",
                "Fazer a EVA ler as conversas, entender em que pé cada proposta está e preparar rascunhos de mensagem. O rascunho só é enviado depois que alguém do seu time aprova.",
                "Gerar o Raio-X das propostas paradas.",
                "Dar suporte, cobrar a assinatura e avisar sobre a sua conta.",
                "Melhorar o produto e medir o resultado das nossas campanhas.",
                "Cumprir obrigações legais.",
            ]} />
        ),
    },
    {
        id: "eva",
        title: "A EVA e os provedores de inteligência artificial",
        body: (
            <>
                <P>
                    Para ler uma conversa, transcrever um áudio ou ler uma proposta, enviamos o trecho necessário a um provedor de
                    inteligência artificial e recebemos de volta a leitura. Hoje usamos estes provedores, nesta ordem de
                    preferência, trocando para o seguinte quando um deles falha:
                </P>
                <Lista itens={[
                    "Anthropic (modelos Claude);",
                    "DeepSeek;",
                    "Google (modelos Gemini);",
                    "OpenAI.",
                ]} />
                <P>Para transcrever áudio também podemos usar o Groq.</P>
                <P>Nós não usamos as suas conversas para treinar modelos próprios de inteligência artificial.</P>
                <Destaque>
                    A EVA é assistida: ela lê, organiza e sugere. Toda mensagem para o seu cliente passa pela aprovação de uma
                    pessoa do seu time antes de sair.
                </Destaque>
            </>
        ),
    },
    {
        id: "compartilhamento",
        title: "Com quem compartilhamos",
        body: (
            <>
                <P>Não vendemos nem alugamos dados pessoais. Compartilhamos dados apenas com:</P>
                <Lista itens={[
                    "Supabase, onde ficam o banco de dados e o login;",
                    "Vercel, que hospeda o site e o app;",
                    "Railway, que hospeda o servidor de conexão do WhatsApp por QR code;",
                    "Kapso, quando a conexão usa a API oficial do WhatsApp;",
                    "os provedores de inteligência artificial da seção anterior;",
                    "Mercado Pago, para a cobrança;",
                    "Google, Meta e Microsoft, nas ferramentas de medição e anúncios;",
                    "autoridades, quando a lei exigir.",
                ]} />
            </>
        ),
    },
    {
        id: "transferencia",
        title: "Transferência para fora do Brasil",
        body: (
            <P>
                Vários desses fornecedores processam dados fora do Brasil, incluindo nos Estados Unidos e, no caso da DeepSeek, na
                China. Enviamos a cada um apenas o necessário para a tarefa que ele faz.
            </P>
        ),
    },
    {
        id: "papeis",
        title: "Quem responde por cada dado",
        body: (
            <>
                <P>
                    Para as conversas do WhatsApp conectado e os dados dos clientes da sua empresa, a sua empresa decide o que fazer
                    com eles e o Vyzon trata esses dados em nome dela, seguindo as instruções dadas pelo uso do produto.
                </P>
                <P>Para os dados da sua conta, da cobrança e da navegação no site, quem decide é o Vyzon.</P>
                <P>
                    Também procuramos empresas do setor solar a partir de dados públicos de CNPJ para um primeiro contato comercial.
                    Quem não quiser receber novos contatos pode pedir a qualquer momento, e paramos.
                </P>
            </>
        ),
    },
    {
        id: "seguranca",
        title: "Segurança",
        body: (
            <>
                <P>Protegemos os dados com medidas técnicas e de organização, entre elas:</P>
                <Lista itens={[
                    "conexão criptografada entre o seu aparelho e o Vyzon;",
                    "criptografia dos dados armazenados, feita pelo provedor do banco;",
                    "separação dos dados por empresa no banco, para uma empresa nunca ver os dados de outra;",
                    "acesso por login, com permissões diferentes para vendedor e administrador.",
                ]} />
            </>
        ),
    },
    {
        id: "retencao",
        title: "Por quanto tempo guardamos",
        body: (
            <P>
                Mantemos os dados apenas pelo tempo necessário para as finalidades desta política ou pelo prazo que a lei exigir.
                Você pode pedir a exclusão da sua conta e dos dados ligados a ela a qualquer momento.
            </P>
        ),
    },
    {
        id: "direitos",
        title: "Seus direitos",
        body: (
            <>
                <P>Pela Lei Geral de Proteção de Dados (Lei 13.709/2018), você pode:</P>
                <Lista itens={[
                    "confirmar se tratamos dados seus e ter acesso a eles;",
                    "corrigir dados incompletos ou errados;",
                    "pedir a exclusão, o bloqueio ou a anonimização de dados;",
                    "pedir a portabilidade dos seus dados;",
                    "saber com quem compartilhamos os seus dados;",
                    "revogar consentimentos, como a ligação com o Google Calendar;",
                    "desconectar o WhatsApp do Vyzon quando quiser.",
                ]} />
                <P>Se a pessoa for cliente de uma empresa que usa o Vyzon, o pedido pode ser feito para essa empresa ou para nós, e nós encaminhamos.</P>
            </>
        ),
    },
    {
        id: "google",
        title: "Google Calendar e uso limitado",
        body: (
            <>
                <P>
                    O uso que fazemos das informações recebidas das APIs do Google segue a{" "}
                    <A href="https://developers.google.com/terms/api-services-user-data-policy">Política de Dados do Usuário dos Serviços de API do Google</A>,
                    incluindo os requisitos de Uso Limitado.
                </P>
                <Lista itens={[
                    "Acessamos só o mínimo necessário para sincronizar os agendamentos.",
                    "Não lemos, alteramos nem compartilhamos os outros eventos da sua agenda.",
                    "Não guardamos dados da agenda além do necessário.",
                    "Você pode revogar o acesso a qualquer momento.",
                ]} />
            </>
        ),
    },
    {
        id: "mudancas",
        title: "Mudanças nesta política",
        body: (
            <P>
                Podemos atualizar esta política. Quando a mudança for importante, avisamos por e-mail ou por um aviso no app. A data
                no topo da página mostra a última atualização.
            </P>
        ),
    },
    {
        id: "contato",
        title: "Contato",
        body: (
            <>
                <P>
                    Dúvidas sobre esta política ou pedidos sobre os seus dados: <A href="mailto:contato@vyzon.com.br">contato@vyzon.com.br</A>.
                </P>
                <P>Veja também os <A href="/termos-de-servico">Termos de serviço</A>.</P>
            </>
        ),
    },
];

const PoliticaPrivacidade = () => (
    <LegalLayout path="/politica-privacidade" title="Política de Privacidade" updated={ATUALIZADA} summary={RESUMO} sections={SECOES} />
);

export default PoliticaPrivacidade;
