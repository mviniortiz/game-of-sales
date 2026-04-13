import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Home,
  Trophy,
  Target,
  PlusCircle,
  Kanban,
  PhoneCall,
  MessageCircle,
  Calendar,
  Settings,
  Upload,
  Shield,
  Sparkles,
  BarChart3,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  HelpCircle,
  BookOpen,
  Zap,
  Users,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────

interface DocArticle {
  id: string;
  title: string;
  icon: LucideIcon;
  category: string;
  tags: string[];
  content: Section[];
}

interface Section {
  heading?: string;
  body: string;
}

// ─── Articles ─────────────────────────────────────────────────────

const ARTICLES: DocArticle[] = [
  {
    id: "primeiros-passos",
    title: "Primeiros Passos",
    icon: Zap,
    category: "Início",
    tags: ["início", "onboarding", "começar", "primeiro", "conta", "registro"],
    content: [
      {
        body: "Bem-vindo ao Vyzon! Aqui está tudo que você precisa pra começar a usar a plataforma.",
      },
      {
        heading: "1. Crie sua conta",
        body: "Acesse vyzon.com.br e clique em **Começar grátis**. Preencha seus dados, escolha um plano e complete o cadastro. Você terá **14 dias de trial gratuito** pra testar todas as funcionalidades do seu plano.",
      },
      {
        heading: "2. Configure sua empresa",
        body: "Após o cadastro, adicione o nome da sua empresa e convide seus vendedores. Cada vendedor receberá um convite por email para criar sua própria conta.",
      },
      {
        heading: "3. Registre sua primeira venda",
        body: "Clique no botão **Registrar Venda** no sidebar (o botão verde). Preencha o nome do cliente, valor, produto e status. Pronto — sua primeira venda já aparece no dashboard!",
      },
      {
        heading: "4. Defina metas",
        body: "Vá em **Metas** e configure os objetivos mensais do time e individuais. O ranking e o dashboard vão usar essas metas pra calcular o progresso.",
      },
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard",
    icon: Home,
    category: "Funcionalidades",
    tags: ["dashboard", "painel", "visão geral", "métricas", "faturamento", "gráfico"],
    content: [
      {
        body: "O Dashboard é sua central de comando. Ele mostra uma visão geral em tempo real de tudo que está acontecendo nas suas vendas.",
      },
      {
        heading: "O que você encontra",
        body: "- **Faturamento do mês** — total aprovado do mês atual\n- **Quantidade de vendas** — número de vendas registradas\n- **Ticket médio** — valor médio por venda\n- **Gráficos de tendência** — evolução do faturamento ao longo do tempo\n- **Comparativo mensal** — como este mês se compara ao anterior",
      },
      {
        heading: "Dicas",
        body: "Os dados são atualizados em tempo real. Se um vendedor registrar uma venda, ela aparece instantaneamente no dashboard. Administradores veem dados de toda a empresa; vendedores veem apenas seus próprios números.",
      },
    ],
  },
  {
    id: "vendas",
    title: "Registrar Vendas",
    icon: PlusCircle,
    category: "Funcionalidades",
    tags: ["venda", "registrar", "nova venda", "receita", "faturamento", "produto"],
    content: [
      {
        body: "Registrar vendas é o coração do Vyzon. Cada venda alimenta o dashboard, ranking, metas e relatórios.",
      },
      {
        heading: "Como registrar",
        body: "1. Clique em **Registrar Venda** no sidebar\n2. Preencha os campos:\n   - **Cliente** — nome do cliente\n   - **Valor** — valor da venda em R$\n   - **Produto** — selecione da lista de produtos cadastrados\n   - **Status** — Aprovado, Pendente ou Reembolsado\n   - **Data** — data da venda\n   - **Plataforma** — onde a venda foi feita (opcional)\n3. Clique em **Salvar**",
      },
      {
        heading: "Status das vendas",
        body: "- **Aprovado** — a venda foi confirmada e conta no faturamento\n- **Pendente** — aguardando confirmação (não conta no faturamento ainda)\n- **Reembolsado** — venda devolvida (subtraída do faturamento)",
      },
    ],
  },
  {
    id: "ranking",
    title: "Ranking Gamificado",
    icon: Trophy,
    category: "Funcionalidades",
    tags: ["ranking", "gamificação", "troféu", "posição", "leaderboard", "tier", "medalha"],
    content: [
      {
        body: "O Ranking transforma suas vendas em competição saudável. Os vendedores são classificados por faturamento e recebem tiers baseados na performance.",
      },
      {
        heading: "Tiers",
        body: "- **Bronze** — início da jornada\n- **Prata** — performance consistente\n- **Ouro** — acima da média\n- **Platina** — top performers\n- **Diamante** — elite do time",
      },
      {
        heading: "Como funciona",
        body: "O ranking é atualizado automaticamente com base nas vendas aprovadas do mês. O líder recebe destaque especial com coroa. Você pode alternar entre visão mensal e semanal.",
      },
    ],
  },
  {
    id: "metas",
    title: "Metas",
    icon: Target,
    category: "Funcionalidades",
    tags: ["meta", "objetivo", "alvo", "progresso", "mensal", "individual", "consolidada"],
    content: [
      {
        body: "Defina metas individuais e consolidadas para acompanhar o progresso do time.",
      },
      {
        heading: "Metas individuais",
        body: "Configure um valor-alvo mensal para cada vendedor. O progresso é calculado automaticamente com base nas vendas aprovadas.",
      },
      {
        heading: "Meta consolidada",
        body: "Defina uma meta para toda a empresa. O dashboard mostra o progresso coletivo em relação a esse objetivo.",
      },
      {
        heading: "Como criar",
        body: "1. Vá em **Metas** no sidebar\n2. Selecione o mês de referência\n3. Defina o valor para cada vendedor ou para a empresa\n4. Acompanhe o progresso em tempo real",
      },
    ],
  },
  {
    id: "crm",
    title: "CRM Pipeline",
    icon: Kanban,
    category: "Funcionalidades",
    tags: ["crm", "pipeline", "kanban", "deal", "negociação", "funil", "arrastar"],
    content: [
      {
        body: "O CRM Pipeline é um quadro Kanban visual para gerenciar suas negociações do início ao fechamento.",
      },
      {
        heading: "Funcionalidades",
        body: "- **Arrastar e soltar** — mova deals entre estágios\n- **Cards detalhados** — cada deal mostra cliente, valor, produto e tags\n- **Campos personalizados** — adicione informações extras aos deals\n- **Lembretes** — nunca esqueça um follow-up\n- **Deals parados** — o sistema alerta quando um deal fica 3+ dias sem atualização",
      },
      {
        heading: "Estágios",
        body: "O pipeline tem estágios pré-definidos que representam a jornada do cliente. Mova os cards da esquerda pra direita conforme a negociação avança.",
      },
    ],
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    icon: MessageCircle,
    category: "Funcionalidades",
    tags: ["whatsapp", "mensagem", "chat", "conversa", "lead", "contato"],
    content: [
      {
        body: "Gerencie suas conversas do WhatsApp diretamente no Vyzon sem precisar trocar de tela.",
      },
      {
        heading: "Como conectar",
        body: "1. Vá em **WhatsApp** no sidebar\n2. Escaneie o QR code com seu celular\n3. Suas conversas serão sincronizadas automaticamente",
      },
      {
        heading: "Funcionalidades",
        body: "- **Conversas em tempo real** — envie e receba mensagens\n- **Áudios** — grave e envie mensagens de voz\n- **Busca** — encontre conversas por nome ou conteúdo\n- **Templates** — use mensagens pré-definidas pra agilizar\n- **Notas** — adicione anotações internas sobre cada contato\n- **Arquivos** — compartilhe imagens, vídeos e documentos",
      },
    ],
  },
  {
    id: "calls",
    title: "Calls / Ligações",
    icon: PhoneCall,
    category: "Funcionalidades",
    tags: ["call", "ligação", "telefone", "agendamento", "funil", "performance"],
    content: [
      {
        body: "Acompanhe a performance de ligações do time e agende follow-ups.",
      },
      {
        heading: "Métricas",
        body: "- **Total de ligações** — quantas calls foram feitas\n- **Evolução** — gráfico de ligações ao longo do tempo\n- **Funil** — taxa de conversão de ligação em venda\n- **Vendas por call** — eficiência do time",
      },
      {
        heading: "Agendamentos",
        body: "Agende ligações futuras e acompanhe quais compromissos estão pendentes. Os agendamentos aparecem tanto aqui quanto no Calendário.",
      },
    ],
  },
  {
    id: "calendario",
    title: "Calendário",
    icon: Calendar,
    category: "Funcionalidades",
    tags: ["calendário", "agenda", "agendamento", "compromisso", "google calendar"],
    content: [
      {
        body: "Visualize todos os compromissos do time em formato de calendário.",
      },
      {
        heading: "Visualizações",
        body: "- **Dia** — detalhamento hora a hora\n- **Semana** — visão da semana completa\n- **Mês** — visão geral mensal\n- **Timeline** — formato de linha do tempo",
      },
      {
        heading: "Integração com Google Calendar",
        body: "Conecte seu Google Calendar em **Integrações** para sincronizar compromissos automaticamente nos dois sentidos.",
      },
    ],
  },
  {
    id: "eva",
    title: "Eva — Analista com IA",
    icon: Sparkles,
    category: "Funcionalidades",
    tags: ["eva", "ia", "inteligência artificial", "relatório", "gráfico", "insight", "análise"],
    content: [
      {
        body: "A Eva é sua analista de vendas com inteligência artificial. Pergunte qualquer coisa sobre seus dados e ela responde em segundos — com texto e gráficos.",
      },
      {
        heading: "O que você pode perguntar",
        body: "- \"Quem mais vendeu este mês?\"\n- \"Qual o faturamento atual?\"\n- \"Compare este mês com o anterior\"\n- \"Qual produto vende mais?\"\n- \"Quais vendedores estão abaixo da meta?\"",
      },
      {
        heading: "Gráficos automáticos",
        body: "A Eva gera gráficos automaticamente quando faz sentido — barras para rankings, linhas para evolução e pizza para distribuição. Tudo inline no chat.",
      },
      {
        heading: "Limites por plano",
        body: "- **Plus** — 30 consultas por dia\n- **Pro** — ilimitado\n- **Starter** — não disponível (faça upgrade para usar)",
      },
    ],
  },
  {
    id: "integracoes",
    title: "Integrações",
    icon: Settings,
    category: "Configurações",
    tags: ["integração", "hotmart", "kiwify", "greenn", "google", "rd station", "api"],
    content: [
      {
        body: "Conecte o Vyzon com as ferramentas que você já usa para automatizar o fluxo de vendas.",
      },
      {
        heading: "Integrações disponíveis",
        body: "- **Google Calendar** — sincronize agendamentos\n- **Hotmart** — importe vendas automaticamente\n- **Kiwify** — integração com produtos digitais\n- **Greenn** — sincronize vendas da plataforma\n- **WhatsApp** — gerencie conversas no Vyzon\n- **RD Station** — conecte seu CRM de marketing",
      },
      {
        heading: "Como configurar",
        body: "1. Vá em **Integrações** no sidebar\n2. Clique em **Conectar** na integração desejada\n3. Siga as instruções de autenticação\n4. Pronto — os dados serão sincronizados automaticamente",
      },
    ],
  },
  {
    id: "importar",
    title: "Importar Dados",
    icon: Upload,
    category: "Configurações",
    tags: ["importar", "csv", "excel", "dados", "migração", "planilha"],
    content: [
      {
        body: "Importe seus dados existentes para o Vyzon via CSV ou Excel.",
      },
      {
        heading: "O que pode importar",
        body: "- **Deals/Negociações** — título, cliente, email, telefone, valor, estágio, tags\n- **Vendas** — cliente, produto, valor, data, vendedor",
      },
      {
        heading: "Passo a passo",
        body: "1. Vá em **Importar Dados** no sidebar\n2. Escolha o tipo de importação (Deals ou Vendas)\n3. Faça upload do arquivo CSV ou Excel\n4. Mapeie as colunas do arquivo para os campos do Vyzon\n5. Visualize os dados antes de confirmar\n6. Execute a importação\n7. Confira o resultado",
      },
    ],
  },
  {
    id: "admin",
    title: "Administração",
    icon: Shield,
    category: "Configurações",
    tags: ["admin", "administração", "vendedor", "usuário", "produto", "empresa", "gerenciar"],
    content: [
      {
        body: "O painel de Administração permite gerenciar todos os aspectos da sua empresa no Vyzon.",
      },
      {
        heading: "Seções disponíveis",
        body: "- **Vendedores** — adicione, remova e gerencie membros do time\n- **Usuários** — controle contas e permissões\n- **Vendas** — visão administrativa de todas as vendas\n- **Produtos** — cadastre e edite seu catálogo\n- **Pagamentos** — configure métodos de pagamento\n- **Relatórios** — analytics avançados\n- **Metas** — configure objetivos do time",
      },
      {
        heading: "Permissões",
        body: "- **Vendedor** — acessa dashboard, ranking, registra vendas\n- **Administrador** — tudo acima + configurações, integrações, Eva, gestão de equipe\n- **Super Admin** — tudo acima + multi-empresa, monitor do sistema",
      },
    ],
  },
  {
    id: "planos",
    title: "Planos e Preços",
    icon: CreditCard,
    category: "Conta",
    tags: ["plano", "preço", "starter", "plus", "pro", "upgrade", "assinatura", "pagamento", "trial"],
    content: [
      {
        body: "O Vyzon oferece 3 planos para atender empresas de todos os tamanhos.",
      },
      {
        heading: "Starter — R$ 147/mês",
        body: "Para validar sua operação.\n- Dashboard em tempo real\n- 1 Vendedor + 1 Admin\n- Metas individuais\n- Registro de vendas\n- Painel de performance básico",
      },
      {
        heading: "Plus — R$ 397/mês (mais popular)",
        body: "O equilíbrio perfeito.\n- Tudo do Starter\n- 3 Vendedores + 1 Admin\n- Pipeline de vendas (CRM)\n- Ranking gamificado\n- **Eva — analista com IA** (30 consultas/dia)\n- Relatórios completos\n- Metas consolidadas\n- +R$ 49,97/vendedor adicional",
      },
      {
        heading: "Pro — R$ 797/mês",
        body: "Escala total.\n- Tudo do Plus\n- 8 Vendedores + 3 Admins\n- CRM completo\n- **Eva ilimitada** + prioridade\n- Integrações (Hotmart, Stripe)\n- Multi-empresa\n- Suporte prioritário\n- +R$ 48,99/vendedor adicional",
      },
      {
        heading: "Trial gratuito",
        body: "Todos os planos incluem **14 dias de trial gratuito**. Você pode testar todas as funcionalidades sem compromisso. Após o trial, escolha o plano que melhor se encaixa.",
      },
      {
        heading: "Como fazer upgrade",
        body: "Vá em **Perfil** e clique no botão de upgrade, ou acesse diretamente a página de upgrade no menu.",
      },
    ],
  },
  {
    id: "perfil",
    title: "Perfil e Conta",
    icon: Users,
    category: "Conta",
    tags: ["perfil", "conta", "senha", "email", "avatar", "configuração", "time"],
    content: [
      {
        body: "Gerencie suas informações pessoais, segurança e equipe na página de Perfil.",
      },
      {
        heading: "Informações pessoais",
        body: "- Altere seu nome, email e foto de perfil\n- Atualize informações de contato",
      },
      {
        heading: "Segurança",
        body: "- Altere sua senha\n- Gerencie sessões ativas",
      },
      {
        heading: "Equipe",
        body: "- Veja os membros do seu time\n- Promova ou remova administradores (requer confirmação)\n- Gerencie permissões",
      },
    ],
  },
];

// ─── Categories ───────────────────────────────────────────────────

const CATEGORIES = [
  { id: "Início", icon: Zap },
  { id: "Funcionalidades", icon: BookOpen },
  { id: "Configurações", icon: Settings },
  { id: "Conta", icon: Users },
];

// ─── Markdown-lite renderer ───────────────────────────────────────

function renderBody(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="h-1.5" />;

    if (trimmed.startsWith("- ")) {
      return (
        <div key={i} className="flex gap-2.5 pl-1 py-0.5">
          <span className="text-emerald-500/50 mt-[3px] shrink-0 text-[8px]">●</span>
          <span className="text-sm leading-relaxed text-muted-foreground">{parseBold(trimmed.slice(2))}</span>
        </div>
      );
    }

    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      return (
        <div key={i} className="flex gap-2.5 pl-1 py-0.5">
          <span className="text-muted-foreground/50 mt-0.5 shrink-0 text-xs tabular-nums font-medium w-4 text-right">
            {numMatch[1]}.
          </span>
          <span className="text-sm leading-relaxed text-muted-foreground">{parseBold(numMatch[2])}</span>
        </div>
      );
    }

    return (
      <p key={i} className="text-sm leading-relaxed text-muted-foreground">{parseBold(trimmed)}</p>
    );
  });
}

function parseBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// ─── Article View ─────────────────────────────────────────────────

function ArticleView({ article, onBack }: { article: DocArticle; onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <article.icon className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            {article.title}
          </h1>
          <span className="text-xs text-muted-foreground/60">{article.category}</span>
        </div>
      </div>

      <div className="space-y-5">
        {article.content.map((section, i) => (
          <div key={i}>
            {section.heading && (
              <h3 className="text-sm font-semibold text-foreground mb-2">{section.heading}</h3>
            )}
            <div className="space-y-1">{renderBody(section.body)}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main Docs Page ───────────────────────────────────────────────

const Docs = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeArticle, setActiveArticle] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>("Início");

  const filtered = useMemo(() => {
    if (!search.trim()) return ARTICLES;
    const q = search.toLowerCase();
    return ARTICLES.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.tags.some((t) => t.includes(q)) ||
        a.content.some((s) => s.body.toLowerCase().includes(q))
    );
  }, [search]);

  const article = activeArticle ? ARTICLES.find((a) => a.id === activeArticle) : null;

  const groupedArticles = useMemo(() => {
    const map = new Map<string, DocArticle[]>();
    filtered.forEach((a) => {
      const existing = map.get(a.category) || [];
      existing.push(a);
      map.set(a.category, existing);
    });
    return map;
  }, [filtered]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              Central de Ajuda
            </h1>
            <p className="text-sm text-muted-foreground">Tudo que você precisa saber sobre o Vyzon</p>
          </div>
        </div>
      </div>

      {article ? (
        <ArticleView article={article} onBack={() => setActiveArticle(null)} />
      ) : (
        <>
          {/* Search */}
          <div className="relative mb-8">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar na documentação..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted/30 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-emerald-500/30 focus:bg-muted/40 transition-colors"
              autoComplete="off"
            />
          </div>

          {/* Quick stats */}
          {!search && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {CATEGORIES.map((cat) => {
                const count = ARTICLES.filter((a) => a.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left ${
                      expandedCategory === cat.id
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-border/40 bg-muted/20 hover:bg-muted/30"
                    }`}
                  >
                    <cat.icon className={`h-4 w-4 shrink-0 ${expandedCategory === cat.id ? "text-emerald-400" : "text-muted-foreground/50"}`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{cat.id}</p>
                      <p className="text-[11px] text-muted-foreground/60">{count} artigos</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Articles */}
          <div className="space-y-6">
            {CATEGORIES.map((cat) => {
              const articles = groupedArticles.get(cat.id);
              if (!articles?.length) return null;

              const isExpanded = search.trim() || expandedCategory === cat.id;

              return (
                <div key={cat.id}>
                  <button
                    onClick={() => !search && setExpandedCategory(isExpanded ? null : cat.id)}
                    className="flex items-center gap-2 mb-3 group"
                  >
                    <ChevronRight
                      className={`h-3.5 w-3.5 text-muted-foreground/40 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    />
                    <span className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-widest">
                      {cat.id}
                    </span>
                    <span className="text-[10px] text-muted-foreground/30">({articles.length})</span>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="grid gap-2">
                          {articles.map((a) => (
                            <button
                              key={a.id}
                              onClick={() => setActiveArticle(a.id)}
                              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/30 bg-card/50 hover:bg-muted/30 hover:border-border/50 transition-colors text-left group"
                            >
                              <div className="h-9 w-9 rounded-lg bg-muted/40 group-hover:bg-emerald-500/10 flex items-center justify-center shrink-0 transition-colors">
                                <a.icon className="h-4 w-4 text-muted-foreground/60 group-hover:text-emerald-400 transition-colors" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                                <p className="text-[11px] text-muted-foreground/50 truncate">
                                  {a.content[0]?.body.slice(0, 80)}...
                                </p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-muted-foreground/50 shrink-0 transition-colors" />
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* No results */}
          {search && filtered.length === 0 && (
            <div className="text-center py-12">
              <HelpCircle className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground/60">Nenhum resultado para "{search}"</p>
              <p className="text-xs text-muted-foreground/40 mt-1">Tente buscar com outras palavras</p>
            </div>
          )}

          {/* Support footer */}
          <div className="mt-12 rounded-xl border border-border/30 bg-muted/10 px-6 py-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Não encontrou o que procura?</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Fale com a gente pelo WhatsApp</p>
            </div>
            <a
              href="https://wa.me/5548991696887?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20o%20Vyzon."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Suporte
            </a>
          </div>
        </>
      )}
    </div>
  );
};

export default Docs;
