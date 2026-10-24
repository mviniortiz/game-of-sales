-- Banco compartilhado dos bots do Vyzon no OpenBot (SQLite).
-- Colar no chat de um dos bots e pedir: "Crie estas tabelas no banco
-- compartilhado, uma instrução por vez, e depois insira os dados iniciais."
-- Dados iniciais: o que foi levantado até 24/10/2026.

-- ── Tabelas ─────────────────────────────────────────────────────────────────

-- Conteúdo do Assistente de marketing.
CREATE TABLE IF NOT EXISTS conteudos (
  id INTEGER PRIMARY KEY,
  canal TEXT NOT NULL CHECK (canal IN ('instagram','whatsapp_status','linkedin','blog','outro')),
  formato TEXT NOT NULL CHECK (formato IN ('carrossel','reel','post','artigo','outro')),
  assunto TEXT NOT NULL CHECK (assunto IN ('dor','como_fazer','bastidores','produto')),
  nicho TEXT,
  titulo TEXT NOT NULL,
  texto TEXT NOT NULL,
  por_que TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','aprovado','publicado','descartado')),
  criado_em TEXT NOT NULL DEFAULT (date('now')),
  publicado_em TEXT,
  resultado TEXT,
  aprendizado TEXT,
  UNIQUE (canal, titulo)
);

-- Hipóteses do Especialista de produto.
CREATE TABLE IF NOT EXISTS hipoteses (
  id INTEGER PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  texto TEXT NOT NULL,
  nicho TEXT,
  status TEXT NOT NULL CHECK (status IN ('aberta','em_teste','fortalecida','enfraquecida','descartada')),
  a_favor TEXT,
  contra TEXT,
  proximo_teste TEXT,
  atualizada_em TEXT NOT NULL DEFAULT (date('now'))
);

-- Conversas com donos (só empresa e cidade; nada de dado pessoal).
CREATE TABLE IF NOT EXISTS conversas (
  id INTEGER PRIMARY KEY,
  empresa TEXT NOT NULL,
  nicho TEXT NOT NULL,
  cidade TEXT,
  canal TEXT NOT NULL CHECK (canal IN ('whatsapp','visita','ligacao','outro')),
  data TEXT NOT NULL,
  tipo TEXT CHECK (tipo IN ('robo','sumiu','nao','ja_resolve','nao_ve_dor','dor','preco','fora_do_perfil','outro')),
  frase_chave TEXT,
  resumo TEXT,
  mostrou_dor INTEGER CHECK (mostrou_dor IN (0,1)),
  perguntou_preco INTEGER CHECK (perguntou_preco IN (0,1)),
  proximo_passo TEXT,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','encerrada')),
  UNIQUE (empresa, data)
);

-- Nichos avaliados.
CREATE TABLE IF NOT EXISTS nichos (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  regiao TEXT,
  empresas_lidas INTEGER,
  avaliacoes_com_texto INTEGER,
  reclamacoes_orcamento INTEGER,
  reclamacoes_pos_venda INTEGER,
  por_100 REAL,
  ticket_tipico TEXT,
  ferramentas_existentes TEXT,
  notas TEXT,
  avaliado_em TEXT,
  status TEXT NOT NULL CHECK (status IN ('candidato','testando','inconclusivo','descartado','escolhido'))
);

-- Diário de decisões.
CREATE TABLE IF NOT EXISTS decisoes (
  id INTEGER PRIMARY KEY,
  data TEXT NOT NULL,
  recomendacao TEXT NOT NULL,
  criterio TEXT,
  evidencia TEXT,
  decisao_markus TEXT,
  UNIQUE (data, recomendacao)
);

-- ── Dados iniciais ──────────────────────────────────────────────────────────

INSERT OR IGNORE INTO nichos (nome, regiao, empresas_lidas, avaliacoes_com_texto, reclamacoes_orcamento, reclamacoes_pos_venda, por_100, ticket_tipico, ferramentas_existentes, notas, avaliado_em, status) VALUES
  ('energia solar', 'Santa Catarina', NULL, NULL, NULL, NULL, NULL, NULL, 'software de proposta que avisa quando o cliente abre (3 donos citaram)', 'Prospecção por WhatsApp em out/2026: 50 respostas, 23 de robô ou atendente, 9 disseram pode falar e sumiram depois da explicação, nenhuma conversa marcada. 2 interessados em aberto (ver conversas).', '2026-10-22', 'testando'),
  ('vidraçaria', 'Grande Florianópolis', 6, 746, 11, 10, 1.5, NULL, NULL, 'Mais reclamação de orçamento sem resposta entre os três nichos lidos: pediu orçamento e esperou dias, mediram e não mandaram, visualizaram e não retornaram. Avaliação mostra só o lado da empresa que não respondeu. Lista de 10 vidraçarias pequenas montada em 22/10 para a primeira mensagem.', '2026-10-22', 'testando'),
  ('móveis planejados', 'Grande Florianópolis', 6, 476, 4, 10, 0.8, NULL, NULL, 'Reclamam mais do pós-venda (depois de fechar, não respondem) do que do orçamento.', '2026-10-22', 'candidato'),
  ('buffet e eventos', 'Grande Florianópolis', 6, 2230, 2, 1, 0.1, NULL, NULL, 'Quem avalia é convidado, não quem contratou. O método não serve aqui.', '2026-10-22', 'inconclusivo');

INSERT OR IGNORE INTO hipoteses (codigo, texto, nicho, status, a_favor, contra, proximo_teste, atualizada_em) VALUES
  ('H1', 'Dono de integradora solar paga para não perder proposta que o cliente visualizou e não respondeu.', 'energia solar', 'enfraquecida', 'Donos respondem mensagem fria; 2 mostraram interesse (um perguntou o preço).', 'Nenhuma conversa marcada em 50 respostas; 3 já recebem aviso de proposta aberta do software que usam; 1 disse que cliente que some não tem interesse.', 'Fechar as 2 conversas em aberto (JLG Solar e Firma Solar) com o Raio-X e a pergunta de preço.', '2026-10-24'),
  ('H2', 'Dono de vidraçaria pequena perde venda por demorar ou esquecer de mandar o orçamento.', 'vidraçaria', 'em_teste', '11 reclamações em 746 avaliações, o maior índice entre os nichos lidos.', 'Avaliação é minoria irritada e várias têm anos. Ainda nenhuma conversa com dono.', 'Primeira mensagem para 10 vidraçarias pequenas; meta: 3 conversas de verdade.', '2026-10-24'),
  ('H3', 'Fora de solar, a dor que mais aparece é a empresa demorar ou esquecer de mandar o orçamento, e não o cliente sumir depois de receber.', NULL, 'aberta', 'Padrão das avaliações de vidraçaria e planejados.', 'O produto atual foi feito para o cliente que some. Não verificado se ele cobre o pedido que ficou sem resposta.', 'Perguntar nas conversas qual dos dois acontece mais.', '2026-10-24');

INSERT OR IGNORE INTO conversas (empresa, nicho, cidade, canal, data, tipo, frase_chave, resumo, mostrou_dor, perguntou_preco, proximo_passo, status) VALUES
  ('JLG Solar', 'energia solar', 'Campos Novos', 'whatsapp', '2026-10-20', 'preco', 'qual é o custo dessa ferramenta?', 'Disse que ainda não faz retomada; perguntou o preço; recebeu o preço e o convite para o Raio-X; respondeu tudo certo sem marcar dia.', NULL, 1, 'Propor dois horários para o Raio-X.', 'aberta'),
  ('Firma Solar', 'energia solar', 'São José', 'whatsapp', '2026-10-21', 'dor', 'tenho interesse', 'Respondeu ao seguimento dizendo que tem interesse, sem contar como faz hoje.', NULL, 0, 'Responder, oferecer o Raio-X presencial ou online e marcar dia.', 'aberta');

INSERT OR IGNORE INTO decisoes (data, recomendacao, criterio, evidencia, decisao_markus) VALUES
  ('2026-10-22', 'Pausar o time de 6 bots de distribuição e, antes de escalar, descobrir um nicho que pague, com conversas.', 'Nenhum cliente pagante e nenhuma conversa marcada no nicho solar.', '50 respostas da prospecção e leitura de cerca de 3.450 avaliações do Google em 3 nichos.', 'Testar vidraçaria pelo WhatsApp e começar com um bot de marketing e depois um de produto.');

-- ── Bot de vendas (24/10/2026) ─────────────────────────────────────────────

-- Lista fria do bot de vendas. Quem responde de verdade vira card no pipeline
-- do Vyzon (deal_id); o resto fica aqui.
CREATE TABLE IF NOT EXISTS prospects (
  id INTEGER PRIMARY KEY,
  empresa TEXT NOT NULL,
  nicho TEXT NOT NULL,
  cidade TEXT,
  avaliacoes INTEGER,
  telefone TEXT NOT NULL UNIQUE,
  fonte_url TEXT,
  status TEXT NOT NULL DEFAULT 'listada' CHECK (status IN ('listada','enviada','respondeu','card','sem_resposta','nao_contatar')),
  toques INTEGER NOT NULL DEFAULT 0,
  ultimo_toque TEXT,
  proximo_toque TEXT,
  deal_id TEXT,
  notas TEXT,
  criado_em TEXT NOT NULL DEFAULT (date('now'))
);

-- A lista inicial com telefones (as 10 vidraçarias de 22/10) não fica no
-- repositório: vai direto para a pasta do bot de vendas no Mac do Markus.
