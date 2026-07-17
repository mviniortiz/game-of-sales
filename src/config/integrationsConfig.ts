/**
 * Integration Registry — single source of truth for all integration modals,
 * webhook URLs, setup instructions, and documentation.
 */

export interface IntegrationEventSpec {
  label: string;
  description: string;
  payload_sample?: string;
}

export interface IntegrationStepSpec {
  title: string;
  description: string;
  note?: string;
}

export interface IntegrationMakeSpec {
  enabled: boolean;
  template_url?: string;
  description: string;
  trigger_module: string;
  action_module: string;
}

export interface IntegrationSpec {
  id: string;
  platform: string;
  name: string;
  logo: string;
  accentClass: string;
  tagline: string;
  description: string;
  category: "sales" | "productivity";

  webhook: {
    url: string;
    method: "POST";
    authType: "hmac" | "token" | "none";
    authHeader: string;
    authFieldLabel: string;
    authFieldPlaceholder: string;
    authFieldHelp: string;
  };

  dashboardUrl: string;
  dashboardLabel: string;

  events: IntegrationEventSpec[];
  setupSteps: IntegrationStepSpec[];
  make: IntegrationMakeSpec;

  features: string[];
  securityNotes: string[];
}

const SUPABASE_FUNCTIONS_URL = "https://omsdkjzkphflpwnbaeye.supabase.co/functions/v1";

import hotmartLogo from "@/assets/integrations/hotmart-logo-png_seeklogo-485917.webp";
import kiwifyLogo from "@/assets/integrations/kiwify-logo-png_seeklogo-537186.webp";
import greennLogo from "@/assets/integrations/greenn.webp";
import rdstationLogo from "@/assets/integrations/rdstation.svg";
import caktoLogo from "@/assets/integrations/cakto.webp";
import braipLogo from "@/assets/integrations/braip.webp";
import asaasLogo from "@/assets/integrations/asaas.svg";
import mercadopagoLogo from "@/assets/integrations/mercadopago.webp";
import stripeLogo from "@/assets/integrations/stripe.svg";
import pagarmeLogo from "@/assets/integrations/pagarme.svg";
import zapierLogo from "@/assets/integrations/zapier.svg";
import notazzLogo from "@/assets/integrations/notazz.png";
import grupozapLogo from "@/assets/integrations/grupozap.svg";
import notionLogo from "@/assets/integrations/notion.svg";
import clicksignLogo from "@/assets/integrations/clicksign.svg";

export const INTEGRATIONS_CONFIG: Record<string, IntegrationSpec> = {
  hotmart: {
    id: "hotmart",
    platform: "hotmart",
    name: "Hotmart",
    logo: hotmartLogo,
    accentClass: "orange",
    tagline: "Marketplace líder de infoprodutos no Brasil",
    description:
      "Receba vendas aprovadas, reembolsos e chargebacks da Hotmart em tempo real. Cada transação vira um deal no CRM e uma venda no dashboard automaticamente.",
    category: "sales",
    webhook: {
      url: `${SUPABASE_FUNCTIONS_URL}/hotmart-webhook`,
      method: "POST",
      authType: "token",
      authHeader: "x-hotmart-hottok",
      authFieldLabel: "HOTTOK (token secreto)",
      authFieldPlaceholder: "Cole seu HOTTOK aqui",
      authFieldHelp: "Gerado automaticamente ao criar o webhook na Hotmart",
    },
    dashboardUrl: "https://app-vlc.hotmart.com/login",
    dashboardLabel: "Entrar na Hotmart → Ferramentas → Webhook",
    events: [
      { label: "PURCHASE_APPROVED", description: "Venda aprovada — cria deal closed_won + venda" },
      { label: "PURCHASE_COMPLETE", description: "Compra finalizada — cria deal closed_won + venda" },
      { label: "PURCHASE_REFUNDED", description: "Reembolso — marca deal como closed_lost" },
      { label: "PURCHASE_CANCELED", description: "Cancelamento — marca deal como closed_lost" },
      { label: "PURCHASE_CHARGEBACK", description: "Chargeback — marca deal como closed_lost" },
    ],
    setupSteps: [
      {
        title: "Copie a URL do webhook",
        description: "Use o botão de copiar no campo ao lado para copiar a URL única da sua empresa.",
      },
      {
        title: "Acesse o painel da Hotmart",
        description: "Entre em app-vlc.hotmart.com → no menu lateral, clique em Ferramentas → Ver todas → Webhook (API e notificações).",
      },
      {
        title: "Crie uma nova configuração",
        description: "Cole a URL e marque os eventos: Compra Aprovada, Reembolso, Chargeback, Cancelamento.",
      },
      {
        title: "Copie o HOTTOK gerado",
        description: "A Hotmart gera automaticamente. Cole no campo HOTTOK deste modal.",
        note: "O HOTTOK é usado para validar cada evento — nunca compartilhe.",
      },
      {
        title: "Ative e salve",
        description: "Clique em Salvar e ligue o toggle. Eventos novos chegarão em tempo real.",
      },
    ],
    make: {
      enabled: true,
      description:
        "Se preferir orquestrar via Make (Integromat), use o módulo Hotmart → Webhook com a URL acima como destino.",
      trigger_module: "Hotmart > Watch Events",
      action_module: "HTTP > Make a request (POST para URL do webhook)",
    },
    features: ["Vendas em tempo real", "Reembolsos automáticos", "Chargebacks", "Sincroniza deals + vendas"],
    securityNotes: [
      "Cada requisição é validada por HOTTOK — requests sem header correto são rejeitadas com 401",
      "Idempotência garantida: eventos duplicados não criam deals duplicados",
      "Logs completos em Integrações → Atividade",
    ],
  },

  kiwify: {
    id: "kiwify",
    platform: "kiwify",
    name: "Kiwify",
    logo: kiwifyLogo,
    accentClass: "green",
    tagline: "Plataforma brasileira para criadores digitais",
    description:
      "Webhooks HMAC-SHA256 da Kiwify com validação criptográfica. Recebe pedidos aprovados, reembolsos, chargebacks e ciclo de assinaturas.",
    category: "sales",
    webhook: {
      url: `${SUPABASE_FUNCTIONS_URL}/kiwify-webhook`,
      method: "POST",
      authType: "hmac",
      authHeader: "x-kiwify-signature",
      authFieldLabel: "Signature Secret (HMAC-SHA256)",
      authFieldPlaceholder: "Cole o secret gerado pela Kiwify",
      authFieldHelp: "Kiwify gera um secret único por webhook. Usado para validar HMAC-SHA256.",
    },
    dashboardUrl: "https://dashboard.kiwify.com.br/",
    dashboardLabel: "Entrar na Kiwify → Apps → Webhooks",
    events: [
      { label: "order_approved", description: "Pedido aprovado — cria deal + venda" },
      { label: "subscription_created", description: "Nova assinatura — cria deal + venda" },
      { label: "order_refunded", description: "Reembolso — closed_lost" },
      { label: "order_chargedback", description: "Chargeback — closed_lost" },
      { label: "subscription_canceled", description: "Cancelamento de assinatura — closed_lost" },
    ],
    setupSteps: [
      {
        title: "Copie a URL do webhook",
        description: "URL única da sua empresa, gerada via HMAC-SHA256 para validação.",
      },
      {
        title: "Acesse Apps → Webhooks na Kiwify",
        description: "Na dashboard da Kiwify clique em Apps → Webhooks → Adicionar novo webhook.",
      },
      {
        title: "Cole a URL e gere o secret",
        description: "Cole a URL do webhook, selecione os eventos e a Kiwify mostrará um secret HMAC.",
      },
      {
        title: "Copie o secret para este modal",
        description: "Cole o secret no campo abaixo — é usado para validar a assinatura de cada request.",
        note: "A Kiwify assina cada request com HMAC-SHA256 usando este secret.",
      },
      {
        title: "Ative e teste",
        description: "Use o botão 'Testar' da Kiwify para enviar um evento de exemplo.",
      },
    ],
    make: {
      enabled: true,
      description:
        "Make suporta Kiwify via módulo HTTP. Configure um trigger na Kiwify apontando para a URL — não precisa de Make.",
      trigger_module: "Kiwify > Webhook trigger (nativo)",
      action_module: "Direto para URL — sem intermediário",
    },
    features: ["HMAC-SHA256", "Vendas & assinaturas", "Reembolsos", "Validação criptográfica"],
    securityNotes: [
      "Cada request é validado por HMAC-SHA256 — mesmo com URL conhecida, não é possível forjar eventos",
      "Assinaturas rotativas: cambiar o secret na Kiwify invalida requests antigos automaticamente",
    ],
  },

  greenn: {
    id: "greenn",
    platform: "greenn",
    name: "Greenn",
    logo: greennLogo,
    accentClass: "emerald",
    tagline: "Plataforma de recorrências e assinaturas",
    description:
      "Sincroniza assinaturas e recorrências da Greenn. Ideal para negócios com cobrança mensal/anual, trials e dunning.",
    category: "sales",
    webhook: {
      url: `${SUPABASE_FUNCTIONS_URL}/greenn-webhook`,
      method: "POST",
      authType: "token",
      authHeader: "x-greenn-token",
      authFieldLabel: "Token da API",
      authFieldPlaceholder: "Cole o token da Greenn",
      authFieldHelp: "Gerado em Greenn → Integrações → Webhooks",
    },
    dashboardUrl: "https://greenn.crisp.help/pt-br/article/como-integrar-com-webhook-greenn-3d13m2/",
    dashboardLabel: "Ver documentação oficial Greenn",
    events: [
      { label: "purchase_approved", description: "Compra aprovada — deal + venda" },
      { label: "purchase_refunded", description: "Reembolso — closed_lost" },
      { label: "purchase_canceled", description: "Cancelamento — closed_lost" },
      { label: "purchase_chargeback", description: "Chargeback — closed_lost" },
    ],
    setupSteps: [
      {
        title: "Copie a URL do webhook",
        description: "A URL é específica da sua empresa.",
      },
      {
        title: "Acesse Integrações e Tokens na Greenn",
        description: "Na sua conta Greenn, abra a aba Integrações e Tokens → seção Webhook. Se ainda não tiver, clique em gerar novo Webhook Token.",
      },
      {
        title: "Cole a URL e selecione eventos",
        description: "Cole a URL do webhook e marque os gatilhos: Venda aprovada, Reembolso, Cancelamento, Chargeback.",
      },
      {
        title: "Copie o Webhook Token",
        description: "A Greenn gera um token — cole no campo abaixo deste modal.",
      },
      { title: "Ative e salve", description: "Toggle em Ativa e salve." },
    ],
    make: {
      enabled: true,
      description: "Greenn tem webhooks nativos — não precisa Make para sincronizar vendas.",
      trigger_module: "Greenn > Webhook (nativo)",
      action_module: "POST direto",
    },
    features: ["Recorrências", "Assinaturas", "Trials", "Dunning"],
    securityNotes: [
      "Token validado em cada request — requests inválidos retornam 401 e são logados",
      "Idempotência garantida via claim_webhook_event RPC",
    ],
  },

  rdstation: {
    id: "rdstation",
    platform: "rdstation",
    name: "RD Station",
    logo: rdstationLogo,
    accentClass: "violet",
    tagline: "Marketing automation e CRM B2B",
    description:
      "Sincronize leads convertidos, oportunidades e estágios de funil do RD Station Marketing. Ideal para empresas B2B com ciclo longo.",
    category: "sales",
    webhook: {
      url: `${SUPABASE_FUNCTIONS_URL}/rdstation-webhook`,
      method: "POST",
      authType: "token",
      authHeader: "x-rd-token",
      authFieldLabel: "Token de autenticação",
      authFieldPlaceholder: "Cole o token secreto",
      authFieldHelp: "Criado em Integrações → Webhooks no RD Station",
    },
    dashboardUrl: "https://app.rdstation.com.br/",
    dashboardLabel: "Entrar no RD Station → Integrações → Webhooks",
    events: [
      { label: "WEBHOOK.CONVERTED", description: "Lead convertido — cria deal em stage inicial" },
      { label: "WEBHOOK.MARKED_OPPORTUNITY", description: "Marcado como oportunidade — avança no funil" },
    ],
    setupSteps: [
      { title: "Copie a URL do webhook", description: "URL única por empresa." },
      {
        title: "Acesse RD Station → Integrações",
        description: "Clique no nome da sua conta (canto superior direito) → Integrações. Na seção Webhooks, clique em Configurar → Criar Webhook.",
      },
      {
        title: "Cole a URL, defina nome e token",
        description: "Nome: Vyzon CRM. Header: x-rd-token. Valor: um token forte (qualquer string).",
        note: "Anote esse token — você vai colar no modal.",
      },
      {
        title: "Configure gatilhos",
        description: "Marque: Conversão em lead, Marcação como oportunidade.",
      },
      { title: "Salve e ative", description: "Pronto — novos leads chegam no seu CRM." },
    ],
    make: {
      enabled: true,
      description:
        "Se o RD não cobrir todos os eventos que você precisa (ex: por etapa de funil custom), use Make com módulo RD Station → Watch Changes.",
      trigger_module: "RD Station > Watch Events",
      action_module: "HTTP > POST URL do webhook",
    },
    features: ["Conversões de leads", "Oportunidades", "Marketing funnel", "B2B sync"],
    securityNotes: [
      "Token em header custom x-rd-token — impossível acessar sem ele",
      "Logs completos de cada lead capturado",
    ],
  },

  cakto: {
    id: "cakto",
    platform: "cakto",
    name: "Cakto",
    logo: caktoLogo,
    accentClass: "orange",
    tagline: "Checkout e pagamentos para infoprodutos",
    description:
      "Receba vendas aprovadas, reembolsos e chargebacks da Cakto automaticamente. Funciona com todos os produtos e checkouts da plataforma.",
    category: "sales",
    webhook: {
      url: `${SUPABASE_FUNCTIONS_URL}/cakto-webhook`,
      method: "POST",
      authType: "token",
      authHeader: "x-cakto-token",
      authFieldLabel: "Token secreto",
      authFieldPlaceholder: "Cole o token gerado pela Cakto",
      authFieldHelp: "Em Configurações → Webhooks, copie o token secreto gerado ao criar o webhook",
    },
    dashboardUrl: "https://app.cakto.com.br/",
    dashboardLabel: "Entrar na Cakto → Apps → Webhooks",
    events: [
      { label: "purchase_approved", description: "Compra aprovada — cria deal + venda" },
      { label: "purchase_refunded", description: "Reembolso — closed_lost" },
      { label: "purchase_canceled", description: "Cancelamento — closed_lost" },
      { label: "purchase_chargeback", description: "Chargeback — closed_lost" },
    ],
    setupSteps: [
      { title: "Copie a URL do webhook", description: "URL exclusiva da sua empresa." },
      {
        title: "Acesse o painel da Cakto",
        description: "Entre em app.cakto.com.br → menu Apps → Webhooks → clique em Adicionar.",
      },
      {
        title: "Crie um novo webhook",
        description: "Cole a URL e selecione os eventos: compra aprovada, reembolso, cancelamento, chargeback.",
      },
      {
        title: "Copie o token secreto",
        description: "A Cakto gera um token único. Cole no campo ao lado.",
        note: "Este token autentica cada evento enviado — não compartilhe.",
      },
      { title: "Ative e teste", description: "Use o botão de teste da Cakto para enviar um evento de exemplo." },
    ],
    make: {
      enabled: true,
      description:
        "Cakto envia webhooks direto — Make só é necessário se você quiser transformar o payload antes de chegar ao Vyzon.",
      trigger_module: "Cakto > Webhook (nativo)",
      action_module: "POST direto para a URL",
    },
    features: ["Vendas em tempo real", "Reembolsos", "Chargebacks", "Sincroniza deals + vendas"],
    securityNotes: [
      "Token validado em cada request — 401 se inválido",
      "Idempotência: mesmo evento não cria duplicata",
    ],
  },

  braip: {
    id: "braip",
    platform: "braip",
    name: "Braip",
    logo: braipLogo,
    accentClass: "blue",
    tagline: "Plataforma de afiliação e marketing digital",
    description:
      "Sincronize vendas de produtores e afiliados da Braip. Ideal para infoprodutores que operam com afiliados.",
    category: "sales",
    webhook: {
      url: `${SUPABASE_FUNCTIONS_URL}/braip-webhook`,
      method: "POST",
      authType: "token",
      authHeader: "x-braip-token",
      authFieldLabel: "Token da Braip",
      authFieldPlaceholder: "Cole o token do postback",
      authFieldHelp: "Gerado em Braip → Postbacks ao criar uma nova URL de retorno",
    },
    dashboardUrl: "https://ev.braip.com/login",
    dashboardLabel: "Entrar na Braip → Ferramentas → Postback",
    events: [
      { label: "order.paid", description: "Pedido pago — cria deal + venda" },
      { label: "order.refunded", description: "Reembolso — closed_lost" },
      { label: "order.canceled", description: "Cancelamento — closed_lost" },
      { label: "order.chargeback", description: "Chargeback — closed_lost" },
    ],
    setupSteps: [
      { title: "Copie a URL do webhook", description: "A URL é o destino do postback da Braip." },
      {
        title: "Acesse Postback na Braip",
        description: "Entre em ev.braip.com → no menu lateral clique em Ferramentas → Postback → + Nova configuração (canto superior direito).",
      },
      {
        title: "Crie uma nova configuração",
        description: "Cole a URL no campo 'Link de retorno', selecione o produto, marque os eventos (venda aprovada, reembolso, cancelamento, chargeback) e deixe o Método HTTP em POST.",
      },
      {
        title: "Copie o token",
        description: "A Braip gera um token de autenticação — cole no campo ao lado.",
      },
      { title: "Ative", description: "Ligue o toggle em Ativa e salve." },
    ],
    make: {
      enabled: true,
      description:
        "Braip tem postbacks nativos suficientes — use Make apenas se precisar consolidar múltiplos produtos em um único destino.",
      trigger_module: "Braip > Postback nativo",
      action_module: "POST direto para a URL",
    },
    features: ["Vendas de produtores", "Vendas de afiliados", "Reembolsos", "Postbacks nativos"],
    securityNotes: [
      "Token no header x-braip-token valida cada request",
      "Logs completos de eventos recebidos",
    ],
  },

  notion: {
    id: "notion",
    platform: "notion",
    name: "Notion",
    logo: notionLogo,
    accentClass: "slate",
    tagline: "Seu pipeline espelhado no Notion",
    description:
      "O Vyzon cria uma database \"Pipeline Vyzon\" numa página sua do Notion e mantém cada deal como uma linha, atualizada a cada 15 minutos: nome, etapa, valor, cliente e link de volta pro deal.",
    category: "productivity",
    webhook: {
      url: "",
      method: "POST",
      authType: "token",
      authHeader: "Bearer (token da integração interna)",
      authFieldLabel: "Token da integração (secret_...)",
      authFieldPlaceholder: "secret_xxxxxxxxxxxxxxxx",
      authFieldHelp:
        "Criado em notion.so/my-integrations. O Vyzon usa este token só para escrever na página que você compartilhar com a integração.",
    },
    dashboardUrl: "https://www.notion.so/my-integrations",
    dashboardLabel: "Notion → My integrations",
    events: [
      { label: "Sync a cada 15 minutos", description: "Deals novos viram linhas; deals alterados nas últimas 24h são atualizados" },
      { label: "Primeira sincronização", description: "Cria a database \"Pipeline Vyzon\" na página compartilhada, com o schema pronto" },
    ],
    setupSteps: [
      {
        title: "Crie uma integração interna no Notion",
        description: "Em notion.so/my-integrations → New integration. Dê o nome \"Vyzon\" e escolha o workspace da agência.",
      },
      {
        title: "Copie o token secreto",
        description: "Na integração criada, copie o Internal Integration Secret (começa com secret_).",
        note: "O token dá acesso apenas ao que você compartilhar com a integração — nunca ao workspace inteiro.",
      },
      {
        title: "Compartilhe UMA página com a integração",
        description: "Abra (ou crie) a página do Notion onde o pipeline deve morar → menu ••• → Connections → adicione a integração Vyzon.",
      },
      {
        title: "Cole o token neste modal e ative",
        description: "Na próxima sincronização (até 15 min) a database \"Pipeline Vyzon\" aparece na página com seus deals.",
      },
    ],
    make: {
      enabled: false,
      description: "O sync é nativo do Vyzon — não é necessário orquestrador.",
      trigger_module: "",
      action_module: "",
    },
    features: ["Database criada sozinha", "Sync a cada 15min", "Etapa, valor e cliente", "Link de volta pro deal"],
    securityNotes: [
      "O token fica guardado na configuração da sua empresa e só é usado no servidor",
      "A integração interna do Notion só enxerga a página que você compartilhar",
      "1 deal = 1 página: sem duplicatas entre sincronizações",
    ],
  },

  pagarme: {
    id: "pagarme",
    platform: "pagarme",
    name: "Pagar.me",
    logo: pagarmeLogo,
    accentClass: "emerald",
    tagline: "Gateway de pagamento da Stone (API v5)",
    description:
      "Receba pedidos, cobranças e assinaturas da Pagar.me em tempo real. Pagamento aprovado vira deal ganho + venda; falha, reembolso e chargeback atualizam o deal automaticamente.",
    category: "sales",
    webhook: {
      url: `${SUPABASE_FUNCTIONS_URL}/pagarme-webhook`,
      method: "POST",
      authType: "token",
      authHeader: "Authorization (Basic Auth)",
      authFieldLabel: "Credencial do webhook (usuário:senha)",
      authFieldPlaceholder: "ex.: vyzon:s3nh4-secreta",
      authFieldHelp:
        "Defina usuário e senha ao criar o webhook na Pagar.me e cole aqui no formato usuário:senha. É com esse par que cada evento é validado.",
    },
    dashboardUrl: "https://dash.pagar.me/",
    dashboardLabel: "Entrar na Pagar.me → Configurações → Webhooks",
    events: [
      { label: "order.paid / charge.paid / invoice.paid", description: "Pagamento aprovado — cria deal closed_won + venda" },
      { label: "order.created / charge.pending", description: "Pedido criado — deal pendente em negociação" },
      { label: "charge.refunded / *.canceled / *.payment_failed", description: "Reembolso, cancelamento ou falha — deal closed_lost com motivo" },
      { label: "charge.chargeback / chargeback.*", description: "Chargeback — deal closed_lost" },
    ],
    setupSteps: [
      {
        title: "Copie a URL do webhook",
        description: "Use o botão de copiar no campo ao lado para copiar a URL única da sua empresa.",
      },
      {
        title: "Acesse o painel da Pagar.me",
        description: "Entre em dash.pagar.me → Configurações → Webhooks → Criar webhook.",
      },
      {
        title: "Cole a URL e escolha autenticação Basic",
        description: "Defina um usuário e uma senha fortes para o webhook e selecione os eventos de order, charge e subscription.",
      },
      {
        title: "Cole a credencial neste modal",
        description: "No formato usuário:senha, exatamente como configurado na Pagar.me.",
        note: "A credencial valida cada evento — nunca compartilhe.",
      },
      {
        title: "Ative e salve",
        description: "Clique em Salvar e ligue o toggle. Eventos novos chegarão em tempo real.",
      },
    ],
    make: {
      enabled: false,
      description: "A Pagar.me envia webhooks nativos — não é necessário orquestrador.",
      trigger_module: "",
      action_module: "",
    },
    features: ["Pagamentos aprovados", "PIX, cartão e boleto", "Assinaturas", "Reembolsos e chargebacks"],
    securityNotes: [
      "Basic Auth validada em cada evento — requests sem credencial correta são rejeitadas com 401",
      "Idempotência garantida: eventos duplicados não criam deals duplicados",
      "Logs completos em Integrações → Atividade",
    ],
  },

  asaas: {
    id: "asaas",
    platform: "asaas",
    name: "Asaas",
    logo: asaasLogo,
    accentClass: "sky",
    tagline: "Cobrança recorrente, PIX, boleto e cartão",
    description:
      "Gestão financeira completa da Asaas com webhooks em tempo real. Receba cobranças criadas, confirmadas, vencidas, reembolsadas e chargebacks automaticamente.",
    category: "sales",
    webhook: {
      url: `${SUPABASE_FUNCTIONS_URL}/asaas-webhook`,
      method: "POST",
      authType: "token",
      authHeader: "asaas-access-token",
      authFieldLabel: "API Key (access_token)",
      authFieldPlaceholder: "$aact_prod_... ou $aact_hmlg_...",
      authFieldHelp: "Em Integrações → API → clique em 'Gerar nova chave'. É a mesma chave usada para chamadas da API v3.",
    },
    dashboardUrl: "https://www.asaas.com/login",
    dashboardLabel: "Entrar na Asaas → Integrações → Webhooks",
    events: [
      { label: "PAYMENT_CREATED", description: "Cobrança gerada — cria deal em 'em_negociacao'" },
      { label: "PAYMENT_CONFIRMED", description: "Cobrança confirmada — deal closed_won + venda" },
      { label: "PAYMENT_RECEIVED", description: "Pagamento recebido — deal closed_won + venda" },
      { label: "PAYMENT_OVERDUE", description: "Cobrança vencida — closed_lost" },
      { label: "PAYMENT_REFUNDED", description: "Reembolso — closed_lost" },
      { label: "PAYMENT_DELETED", description: "Cobrança deletada — closed_lost" },
      { label: "PAYMENT_CHARGEBACK_REQUESTED", description: "Chargeback — closed_lost" },
    ],
    setupSteps: [
      { title: "Copie a URL do webhook", description: "URL única por empresa." },
      {
        title: "Acesse Integrações → Webhooks na Asaas",
        description: "Entre em asaas.com → menu Integrações → Webhooks → Adicionar novo.",
      },
      {
        title: "Configure o webhook",
        description:
          "Nome: Vyzon CRM. URL: cole a URL acima. Versão do evento: v3. Habilite 'Cobranças' e selecione os eventos desejados.",
      },
      {
        title: "Copie a API Key (access_token)",
        description:
          "Em Integrações → API, gere/copie a chave. Cole no campo abaixo — o Vyzon usa essa chave tanto para validar o webhook quanto para buscar dados do cliente.",
        note: "A mesma chave é usada para o header 'asaas-access-token' e para chamar a API de clientes.",
      },
      { title: "Salve e ative", description: "Ligue o toggle de ativação e salve. Eventos passam a chegar em segundos." },
    ],
    make: {
      enabled: true,
      description:
        "Asaas tem webhook nativo — Make só faz sentido se você precisa agregar eventos de múltiplas contas ou transformar o payload.",
      trigger_module: "Asaas > Watch Payments",
      action_module: "HTTP > POST para URL do webhook",
    },
    features: ["PIX / Boleto / Cartão", "Assinaturas recorrentes", "Reembolsos automáticos", "Chargeback"],
    securityNotes: [
      "API Key validada em cada request no header asaas-access-token",
      "A mesma chave é usada para buscar dados completos do cliente via API v3",
      "Asaas garante entrega at-least-once — a idempotência do Vyzon previne duplicatas",
    ],
  },

  mercadopago: {
    id: "mercadopago",
    platform: "mercadopago",
    name: "Mercado Pago",
    logo: mercadopagoLogo,
    accentClass: "sky",
    tagline: "Pagamentos, PIX e checkouts do Mercado Pago",
    description:
      "Recebe notificações de pagamentos aprovados, reembolsados e cancelados do Mercado Pago. Cada transação vira deal no CRM e venda no dashboard automaticamente. A integração usa seu Access Token do MP para buscar detalhes completos de cada pagamento.",
    category: "sales",
    webhook: {
      url: `${SUPABASE_FUNCTIONS_URL}/mercadopago-sales-webhook`,
      method: "POST",
      authType: "token",
      authHeader: "x-mp-access-token",
      authFieldLabel: "Access Token (Mercado Pago)",
      authFieldPlaceholder: "APP_USR-... ou TEST-...",
      authFieldHelp:
        "Gere em Mercado Pago → Suas integrações → Credenciais de produção. É o mesmo token usado para chamar a API v1.",
    },
    dashboardUrl: "https://www.mercadopago.com.br/developers/panel/webhooks",
    dashboardLabel: "Abrir painel do Mercado Pago → Webhooks",
    events: [
      { label: "payment.created", description: "Pagamento criado — deal em 'em_negociacao' se pendente" },
      { label: "payment.updated", description: "Pagamento atualizado — promove pra closed_won se aprovado" },
      { label: "approved", description: "Pagamento aprovado — cria deal closed_won + venda" },
      { label: "refunded", description: "Reembolso — marca deal como closed_lost" },
      { label: "cancelled", description: "Cancelamento — marca deal como closed_lost" },
      { label: "rejected", description: "Rejeitado — marca deal como closed_lost" },
    ],
    setupSteps: [
      {
        title: "Copie a URL do webhook",
        description: "A URL abaixo é exclusiva da sua empresa — cada evento é associado automaticamente.",
      },
      {
        title: "Acesse Webhooks no painel do MP",
        description:
          "Entre em mercadopago.com.br/developers → Suas integrações → selecione sua aplicação → Webhooks → Configurar notificações.",
      },
      {
        title: "Cole a URL e marque os eventos",
        description:
          "Em URL de produção, cole a URL do webhook. Marque: Pagamentos (payment). O MP envia payment.created e payment.updated em cada mudança de status.",
        note: "O topic precisa ser 'payment'. Outros tópicos (merchant_order, subscription) são ignorados por este endpoint.",
      },
      {
        title: "Copie o Access Token de produção",
        description:
          "Ainda no painel, em Credenciais de produção copie o Access Token (começa com APP_USR-). Cole no campo ao lado.",
        note: "O mesmo token é usado para autenticar o webhook (header x-mp-access-token) e para buscar detalhes do pagamento na API v1.",
      },
      {
        title: "Salve e teste",
        description:
          "Clique em Salvar no painel MP. Use a opção 'Simular evento' para enviar um payment de teste e confira em Integrações → Atividade.",
      },
    ],
    make: {
      enabled: true,
      description:
        "Se precisar consolidar múltiplas contas MP ou transformar o payload, use Make com módulo Mercado Pago → Watch Payments apontando HTTP POST para a URL acima.",
      trigger_module: "Mercado Pago > Watch Payments",
      action_module: "HTTP > POST para URL do webhook",
    },
    features: ["PIX & cartão", "Reembolsos automáticos", "Webhook nativo MP", "Sincroniza deals + vendas"],
    securityNotes: [
      "Access Token validado a cada request no header x-mp-access-token",
      "O Vyzon faz fetch da API v1 do MP pra buscar dados completos do pagador (nome, email, telefone)",
      "Idempotência por payment_id + action — eventos duplicados não criam deals duplicados",
      "Não confunda este webhook com o MP de assinatura do Vyzon — este é só para suas vendas",
    ],
  },

  zapier: {
    id: "zapier",
    platform: "zapier",
    name: "Zapier",
    logo: zapierLogo,
    accentClass: "orange",
    tagline: "Conecte 7.000+ apps ao Vyzon sem código",
    description:
      "Endpoint genérico que aceita qualquer Zap como origem. Crie leads, deals e vendas a partir de Typeform, Mailchimp, Instagram Leads, Calendly, Google Sheets — qualquer app suportado pelo Zapier.",
    category: "productivity",
    webhook: {
      url: `${SUPABASE_FUNCTIONS_URL}/zapier-webhook`,
      method: "POST",
      authType: "token",
      authHeader: "x-zapier-token",
      authFieldLabel: "Token secreto (gere um)",
      authFieldPlaceholder: "Gere um token longo e cole aqui",
      authFieldHelp: "Crie qualquer string segura (32+ caracteres). Cole no header x-zapier-token no Zapier.",
    },
    dashboardUrl: "https://zapier.com/app/zaps",
    dashboardLabel: "Abrir Zapier → Criar Zap",
    events: [
      { label: "lead_created", description: "Cria deal em 'novo_lead' (probability 25%)" },
      { label: "deal_won", description: "Cria deal em 'closed_won' + venda (se amount > 0)" },
      { label: "sale_approved", description: "Alias de deal_won — cria deal + venda" },
      { label: "deal_lost", description: "Cria deal em 'closed_lost'" },
      { label: "cancellation", description: "Cria deal em 'closed_lost'" },
      { label: "refund", description: "Cria deal em 'closed_lost'" },
    ],
    setupSteps: [
      {
        title: "Gere um token seguro",
        description:
          "Use um gerador de senhas para criar uma string longa (ex: 32+ caracteres alfanuméricos). Esse é o segredo que vai autenticar cada Zap.",
        note: "Sem este token qualquer pessoa poderia criar deals fake no seu CRM. Mantenha-o privado.",
      },
      { title: "Cole o token no campo abaixo", description: "O Vyzon vai validar cada request contra esse token." },
      {
        title: "Crie um Zap no Zapier",
        description:
          "No Zapier, crie um Zap com qualquer trigger (Typeform, Mailchimp, Google Sheets, etc) e adicione a ação 'Webhooks by Zapier' → 'Custom Request' (POST).",
      },
      {
        title: "Configure o Custom Request",
        description:
          "URL: cole a URL acima. Payload Type: JSON. Headers: adicione 'x-zapier-token' com o token que você gerou. No Data preencha event, customer_name, customer_email, amount, product_name, external_id.",
      },
      {
        title: "Teste com 'Test Action'",
        description:
          "O Zapier permite testar. Se der 200, o deal aparece em Integrações → Atividade. Se der 401, verifique o header.",
      },
    ],
    make: {
      enabled: false,
      description:
        "Zapier JÁ é a ferramenta de orquestração. Se você usa Make, use o módulo HTTP diretamente em vez de passar por Zapier.",
      trigger_module: "Zapier > Qualquer trigger (Typeform, Gmail, Sheets...)",
      action_module: "Zapier > Webhooks by Zapier > Custom Request (POST)",
    },
    features: ["Qualquer app como origem", "7.000+ integrações", "Payload customizável", "No-code"],
    securityNotes: [
      "Token validado em cada request — sem ele, 401",
      "Aceita payload customizável: o Vyzon normaliza campos conhecidos (event, customer_name, amount, etc)",
      "Campo 'source_app' opcional: identifica de qual ferramenta Zapier veio o lead",
    ],
  },

  notazz: {
    id: "notazz",
    platform: "notazz",
    name: "Notazz",
    logo: notazzLogo,
    accentClass: "green",
    tagline: "Emissão automática de NF-e e NFS-e",
    description:
      "Receba callbacks quando o status de uma nota fiscal muda na Notazz. Útil para tracking de emissões automatizadas: autorizada, rejeitada, cancelada, processando. O Vyzon anota o status no histórico do deal.",
    category: "productivity",
    webhook: {
      url: `${SUPABASE_FUNCTIONS_URL}/notazz-webhook`,
      method: "POST",
      authType: "token",
      authHeader: "x-notazz-token",
      authFieldLabel: "API Key da Notazz",
      authFieldPlaceholder: "Cole a API key gerada",
      authFieldHelp: "Em Configurações → Empresas → clique em API KEY na empresa desejada.",
    },
    dashboardUrl: "https://app.notazz.com/login",
    dashboardLabel: "Entrar na Notazz → Configurações → Webhooks",
    events: [
      { label: "NF_AUTHORIZED", description: "NF autorizada pela SEFAZ — adiciona nota com PDF/XML ao deal" },
      { label: "NF_REJECTED", description: "NF rejeitada — anota motivo no deal" },
      { label: "NF_CANCELLED", description: "NF cancelada — anota no deal" },
      { label: "NF_PROCESSING", description: "NF em processamento — anota no deal" },
      { label: "NF_ERROR", description: "Erro desconhecido — anota no deal" },
    ],
    setupSteps: [
      {
        title: "Copie a URL do callback",
        description: "URL exclusiva da sua empresa que recebe o status de cada NF.",
      },
      {
        title: "Acesse Configurações na Notazz",
        description: "Menu lateral → Configurações → Empresas → selecione sua empresa.",
      },
      {
        title: "Copie a API KEY",
        description: "Clique no botão API KEY. Copie a chave e cole no campo abaixo.",
      },
      {
        title: "Configure o Callback URL",
        description:
          "Ainda na empresa, procure por Callback/Webhook URL e cole a URL acima. A Notazz notificará cada mudança de status.",
        note: "Se sua UI da Notazz pedir um token custom, use a mesma API KEY no header 'x-notazz-token'.",
      },
      {
        title: "Associe externalId às vendas",
        description:
          "Ao emitir uma NF, envie o external_id do deal como 'externalId' da NF. Assim o Vyzon sabe em qual deal anotar o status.",
      },
    ],
    make: {
      enabled: true,
      description:
        "Integração típica: Vyzon cria deal → Make detecta closed_won → Make chama API Notazz para emitir NF → Notazz callback volta pro Vyzon anotando status.",
      trigger_module: "Vyzon (via DB trigger ou Zapier) > Deal criado em closed_won",
      action_module: "HTTP > POST para API Notazz → callback retorna aqui",
    },
    features: ["Status de NF em tempo real", "PDF/XML anotados no deal", "NF-e e NFS-e", "Histórico por deal"],
    securityNotes: [
      "API KEY validada em cada callback",
      "Callback anota no deal cujo external_id bate com o externalId da NF",
      "Status normalizado: autorizada/rejeitada/cancelada/processando/erro",
    ],
  },

  grupozap: {
    id: "grupozap",
    platform: "grupozap",
    name: "Grupo OLX (ZAP / VivaReal)",
    logo: grupozapLogo,
    accentClass: "violet",
    tagline: "Leads dos portais imobiliários ZAP, VivaReal e OLX",
    description:
      "Captação de leads de portal imobiliário. Cada lead enviado pelo Grupo OLX (ZAP Imóveis, VivaReal) vira um deal no estágio inicial com a origem do portal registrada. Ideal para incorporadoras e imobiliárias.",
    category: "sales",
    webhook: {
      url: `${SUPABASE_FUNCTIONS_URL}/grupozap-lead-webhook`,
      method: "POST",
      authType: "token",
      authHeader: "Authorization: Basic",
      authFieldLabel: "SECRET_KEY (Grupo OLX)",
      authFieldPlaceholder: "Cole a SECRET_KEY fornecida no Canal Pro",
      authFieldHelp:
        "O Grupo OLX envia esta chave dentro do header Authorization: Basic base64(\"vivareal:SECRET_KEY\"). O Vyzon valida o trecho após o ':'. A chave é fornecida por CRM na homologação do Canal Pro.",
    },
    dashboardUrl: "https://canalpro.grupozap.com/",
    dashboardLabel: "Abrir Canal Pro do Grupo OLX → Integrações",
    events: [
      {
        label: "lead",
        description:
          "Novo lead de portal — cria deal em stage 'lead' com lead_source = zap/vivareal/olx",
      },
    ],
    setupSteps: [
      {
        title: "Copie a URL do webhook",
        description: "Use o botão de copiar no campo ao lado para copiar a URL única da sua empresa.",
      },
      {
        title: "Solicite a integração no Canal Pro",
        description:
          "No Canal Pro do Grupo OLX, abra a área de Integrações / CRM e informe a URL acima como destino dos leads. A homologação é feita pela equipe do Grupo OLX.",
        note: "É necessário passar pela homologação do Grupo OLX antes dos leads reais começarem a chegar.",
      },
      {
        title: "Receba a SECRET_KEY",
        description:
          "O Grupo OLX gera uma SECRET_KEY para o seu CRM. Cole no campo abaixo — ela é enviada em cada lead dentro do header Authorization: Basic.",
        note: "A mesma chave vale para todos os portais (ZAP, VivaReal, OLX).",
      },
      {
        title: "Associe o anúncio (opcional)",
        description:
          "O payload traz clientListingId (id do anúncio no seu CRM) e originListingId (id do anúncio no portal). Use-os para vincular o lead ao empreendimento certo.",
      },
      {
        title: "Ative e valide com um lead de teste",
        description:
          "Após homologar, peça um lead de teste. Se chegar com 2xx, o deal aparece em Integrações → Atividade. 3xx/4xx/5xx fazem o Grupo OLX reprocessar (3 tentativas, até 14 dias).",
      },
    ],
    make: {
      enabled: false,
      description:
        "O Grupo OLX entrega leads direto por webhook após homologação no Canal Pro — não é necessário Make. Use Make apenas se precisar transformar o payload antes de chegar ao Vyzon.",
      trigger_module: "Grupo OLX > Webhook de leads (nativo, após homologação)",
      action_module: "POST direto para a URL do webhook",
    },
    features: ["Leads ZAP / VivaReal / OLX", "Origem do portal registrada", "Vínculo por anúncio", "Stage inicial 'lead'"],
    securityNotes: [
      "Autenticação Basic Auth: a SECRET_KEY do Grupo OLX é validada em cada lead (timing-safe). Sem ela, 401.",
      "Idempotência por originLeadId — reenvios/retries do portal não criam leads duplicados",
      "Política de retry do Grupo OLX: 3 tentativas, payload guardado até 14 dias em caso de falha",
    ],
  },

  clicksign: {
    id: "clicksign",
    platform: "clicksign",
    name: "Clicksign",
    logo: clicksignLogo,
    accentClass: "emerald",
    tagline: "Assinatura eletrônica de contratos",
    description:
      "Quando o contrato é assinado por todos na Clicksign, o Vyzon marca o deal como ganho e anexa o link do documento assinado ao histórico. Fecha o ciclo de venda da incorporadora sem trabalho manual.",
    category: "sales",
    webhook: {
      url: `${SUPABASE_FUNCTIONS_URL}/clicksign-webhook`,
      method: "POST",
      authType: "hmac",
      authHeader: "Content-Hmac",
      authFieldLabel: "Secret HMAC (Clicksign)",
      authFieldPlaceholder: "Cole o Secret gerado ao criar o webhook",
      authFieldHelp:
        "A Clicksign gera um Secret HMAC-SHA256 ao criar o webhook. Ela assina cada request no header Content-Hmac: sha256=<hex> sobre o corpo bruto. Cole o Secret aqui.",
    },
    dashboardUrl: "https://app.clicksign.com/",
    dashboardLabel: "Entrar na Clicksign → Configurações → Webhooks",
    events: [
      { label: "auto_close", description: "Documento finalizado automaticamente (todos assinaram) — marca deal closed_won" },
      { label: "close", description: "Documento finalizado manualmente — marca deal closed_won" },
      { label: "document_closed", description: "Documento fechado — marca deal closed_won + anexa link assinado" },
      { label: "sign", description: "Uma assinatura registrada — anotada no histórico (sem fechar o deal)" },
      { label: "cancel", description: "Documento cancelado — anotado no deal" },
    ],
    setupSteps: [
      {
        title: "Copie a URL do webhook",
        description: "URL única da sua empresa que recebe os eventos de assinatura.",
      },
      {
        title: "Crie o webhook na Clicksign",
        description:
          "Na Clicksign, vá em Configurações → Webhooks (ou via API: POST /api/v1/webhooks) e cole a URL acima.",
      },
      {
        title: "Copie o Secret HMAC gerado",
        description:
          "Ao criar o webhook, a Clicksign exibe um Secret. Cole no campo abaixo — ele valida o header Content-Hmac (HMAC-SHA256) de cada request.",
        note: "Sem assinatura válida o request é rejeitado com 401. Nunca compartilhe o Secret.",
      },
      {
        title: "Grave o document key no deal",
        description:
          "Ao enviar o contrato para assinatura, salve a 'key' do documento Clicksign no campo external_id do deal correspondente. É por ela que o Vyzon localiza o deal ao fechar.",
        note: "Sem o vínculo external_id = document key, o evento é registrado mas nenhum deal é fechado.",
      },
      {
        title: "Teste finalizando um documento",
        description:
          "Assine um documento de teste até o fim. No evento auto_close/close o deal vinculado vira closed_won e o link assinado aparece no histórico.",
      },
    ],
    make: {
      enabled: true,
      description:
        "Fluxo típico: Vyzon fecha proposta → Make/API cria o documento na Clicksign com a key salva no deal → assinatura concluída → webhook volta aqui e marca o deal como ganho.",
      trigger_module: "Clicksign > Webhook de eventos (nativo)",
      action_module: "POST direto para a URL do webhook",
    },
    features: ["Contrato assinado fecha o deal", "Link do documento assinado no histórico", "HMAC-SHA256", "Vínculo por document key"],
    securityNotes: [
      "Cada request é validado por HMAC-SHA256 no header Content-Hmac — não é possível forjar eventos mesmo conhecendo a URL",
      "Idempotência por document key + evento — entregas repetidas não fecham o deal duas vezes",
      "Só os eventos de finalização (auto_close/close/document_closed) marcam o deal como ganho",
    ],
  },
};

export const getIntegrationSpec = (platform: string): IntegrationSpec | undefined =>
  INTEGRATIONS_CONFIG[platform];
