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
import monetizzeLogo from "@/assets/integrations/monetizze.webp";
import eduzzLogo from "@/assets/integrations/eduzz.webp";
import asaasLogo from "@/assets/integrations/asaas.svg";
import zapierLogo from "@/assets/integrations/zapier.svg";
import notazzLogo from "@/assets/integrations/notazz.png";

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

  monetizze: {
    id: "monetizze",
    platform: "monetizze",
    name: "Monetizze",
    logo: monetizzeLogo,
    accentClass: "sky",
    tagline: "Marketplace de infoprodutos e afiliação",
    description:
      "Receba vendas, reembolsos e boletos aprovados da Monetizze em tempo real. Suporta todos os status de pagamento.",
    category: "sales",
    webhook: {
      url: `${SUPABASE_FUNCTIONS_URL}/monetizze-webhook`,
      method: "POST",
      authType: "token",
      authHeader: "x-monetizze-token",
      authFieldLabel: "Chave de integração",
      authFieldPlaceholder: "Cole a chave gerada",
      authFieldHelp: "Gerada em Monetizze → Integrações → Notificação Online (Postback)",
    },
    dashboardUrl: "https://app.monetizze.com.br/",
    dashboardLabel: "Entrar na Monetizze → Ferramentas → Postback",
    events: [
      { label: "venda_realizada", description: "Venda realizada — cria deal + venda" },
      { label: "venda_reembolsada", description: "Reembolso — closed_lost" },
      { label: "venda_cancelada", description: "Cancelamento — closed_lost" },
      { label: "venda_chargeback", description: "Chargeback — closed_lost" },
      { label: "boleto_gerado", description: "Boleto gerado — cria deal em stage 'em_negociacao'" },
    ],
    setupSteps: [
      { title: "Copie a URL do webhook", description: "A URL é específica da empresa." },
      {
        title: "Acesse Postback na Monetizze",
        description: "Entre em app.monetizze.com.br → menu Ferramentas → Postback.",
      },
      {
        title: "Cole a URL e configure",
        description:
          "Cole a URL, selecione os eventos e marque 'Enviar em JSON'. Copie a chave de integração gerada.",
        note: "É essencial marcar JSON — a Monetizze por padrão envia form-encoded.",
      },
      {
        title: "Cole a chave aqui",
        description: "Cole a chave de integração da Monetizze no campo ao lado.",
      },
      { title: "Salve e teste", description: "Use o botão de teste da Monetizze." },
    ],
    make: {
      enabled: true,
      description:
        "Se sua conta Monetizze não permitir 'Enviar em JSON', use Make para transformar form → JSON antes de enviar para o Vyzon.",
      trigger_module: "Webhooks > Custom webhook (Make)",
      action_module: "HTTP > Make a request (transforma form-data em JSON e POST)",
      template_url: "https://www.make.com/en/templates",
    },
    features: ["Vendas realizadas", "Reembolsos", "Boletos", "Postbacks nativos"],
    securityNotes: [
      "Chave de integração validada em header x-monetizze-token",
      "Requests form-encoded são rejeitados — obrigue 'Enviar em JSON'",
    ],
  },

  eduzz: {
    id: "eduzz",
    platform: "eduzz",
    name: "Eduzz",
    logo: eduzzLogo,
    accentClass: "yellow",
    tagline: "Plataforma completa para criadores digitais",
    description:
      "Sincronize vendas, recusas e reembolsos da Eduzz. Suporta produtos digitais, cursos e assinaturas.",
    category: "sales",
    webhook: {
      url: `${SUPABASE_FUNCTIONS_URL}/eduzz-webhook`,
      method: "POST",
      authType: "token",
      authHeader: "x-eduzz-token",
      authFieldLabel: "Chave pública (API Key)",
      authFieldPlaceholder: "Cole a API key da Eduzz",
      authFieldHelp: "Em Configurações → Credenciais → API, copie a chave pública",
    },
    dashboardUrl: "https://sun.eduzz.com/",
    dashboardLabel: "Entrar no Sun Eduzz → MyEduzz → Integrações → Webhook",
    events: [
      { label: "invoice_paid", description: "Fatura paga — cria deal + venda" },
      { label: "invoice_refunded", description: "Reembolso — closed_lost" },
      { label: "invoice_canceled", description: "Cancelamento — closed_lost" },
      { label: "invoice_chargeback", description: "Chargeback — closed_lost" },
      { label: "contract_canceled", description: "Cancelamento de assinatura — closed_lost" },
    ],
    setupSteps: [
      { title: "Copie a URL do webhook", description: "URL exclusiva da sua empresa." },
      {
        title: "Acesse Webhook na Eduzz",
        description: "Entre em sun.eduzz.com → MyEduzz → Integrações → Webhook → + Cadastrar Webhook.",
      },
      {
        title: "Cadastre o webhook",
        description: "Preencha: Tipo (Fatura), Nome (Vyzon CRM), Produto (o que deseja sincronizar) e cole a URL. Clique em Verificar — a Eduzz envia um evento de teste antes de salvar.",
        note: "Se a verificação falhar (status != 200), não será possível salvar o webhook. Cheque se está ativo.",
      },
      {
        title: "Copie a API Key",
        description: "A Eduzz gera uma chave pública. Cole no campo ao lado deste modal.",
      },
      { title: "Ative e teste", description: "Use o botão de teste da Eduzz." },
    ],
    make: {
      enabled: true,
      description:
        "Eduzz também disponibiliza via Make — use o módulo Eduzz → Watch New Sales para capturar eventos e repassar.",
      trigger_module: "Eduzz > Watch new sales",
      action_module: "HTTP > POST para URL do webhook",
    },
    features: ["Vendas aprovadas", "Reembolsos", "Assinaturas", "Cursos & produtos digitais"],
    securityNotes: [
      "API Key validada em cada evento",
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
};

export const getIntegrationSpec = (platform: string): IntegrationSpec | undefined =>
  INTEGRATIONS_CONFIG[platform];
