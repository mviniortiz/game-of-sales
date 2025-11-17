-- =====================================================
-- FASE 1: ATUALIZAR PRODUTOS E ADICIONAR CAMPOS REAIS
-- Sistema Rota de Negócios
-- =====================================================

-- 1. ADICIONAR COLUNA PLATAFORMA NA TABELA VENDAS
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS plataforma TEXT;

-- 2. ATUALIZAR ENUM DE FORMA DE PAGAMENTO
-- Primeiro, precisamos remover o tipo enum antigo e criar um novo
ALTER TABLE vendas ALTER COLUMN forma_pagamento TYPE TEXT;

DROP TYPE IF EXISTS payment_method CASCADE;

CREATE TYPE payment_method AS ENUM ('Cartão de Crédito', 'PIX', 'Recorrência');

ALTER TABLE vendas ALTER COLUMN forma_pagamento TYPE payment_method USING forma_pagamento::payment_method;

-- 3. LIMPAR PRODUTOS DE EXEMPLO E INSERIR PRODUTOS REAIS
DELETE FROM produtos WHERE TRUE;

INSERT INTO produtos (nome, ativo, preco_base, descricao) VALUES
('Contabilidade', true, 0, 'Serviços de contabilidade'),
('Comunidade Rota de Negócios', true, 0, 'Acesso à comunidade exclusiva'),
('Consultoria', true, 0, 'Consultoria empresarial'),
('Mentoria', true, 0, 'Mentoria individual'),
('Descubra seu Lucro', true, 0, 'Curso sobre gestão de lucros'),
('Curso de Precificação', true, 0, 'Curso de estratégias de precificação');