-- =====================================================
-- PARTE 1: PRODUTOS SIMPLIFICADOS E CAMPOS ATUALIZADOS
-- =====================================================

-- 1. Tornar preco_base opcional (permitir NULL)
ALTER TABLE produtos ALTER COLUMN preco_base DROP NOT NULL;

-- 2. Desativar produtos antigos e inserir novos produtos (sem preço fixo)
UPDATE produtos SET ativo = false WHERE TRUE;

INSERT INTO produtos (nome, ativo, preco_base) VALUES
('Comunidade PRO', true, NULL),
('Comunidade START', true, NULL),
('Contabilidade', true, NULL),
('Acompanhamento', true, NULL),
('Consultoria', true, NULL),
('Renovação Rota Anual', true, NULL);

-- 3. Atualizar enum de forma de pagamento para incluir todas as opções
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'Boleto';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'Parte PIX Parte Cartão';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'Múltiplos Cartões';

-- 4. Adicionar campo status na tabela vendas
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'venda_status') THEN
    CREATE TYPE venda_status AS ENUM ('Aprovado', 'Pendente', 'Reembolsado');
  END IF;
END $$;

ALTER TABLE vendas ADD COLUMN IF NOT EXISTS status venda_status DEFAULT 'Aprovado';

-- =====================================================
-- PARTE 2: RLS POLICIES PARA ADMIN
-- =====================================================

-- Vendedores podem ver apenas suas vendas
DROP POLICY IF EXISTS "Users can view own sales or admins view all" ON vendas;
CREATE POLICY "Users can view own sales or admins view all" ON vendas
  FOR SELECT 
  USING (
    auth.uid() = user_id 
    OR has_role(auth.uid(), 'admin')
  );

-- Vendedores podem inserir suas próprias vendas, admins podem inserir para qualquer um
DROP POLICY IF EXISTS "Users can insert own sales" ON vendas;
CREATE POLICY "Users can insert own sales" ON vendas
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id 
    OR has_role(auth.uid(), 'admin')
  );

-- Vendedores podem atualizar suas vendas, admins podem atualizar qualquer venda
DROP POLICY IF EXISTS "Users can update own sales" ON vendas;
CREATE POLICY "Users can update own sales" ON vendas
  FOR UPDATE 
  USING (
    auth.uid() = user_id 
    OR has_role(auth.uid(), 'admin')
  );

-- Admins podem deletar vendas
DROP POLICY IF EXISTS "Admins can delete sales" ON vendas;
CREATE POLICY "Admins can delete sales" ON vendas
  FOR DELETE 
  USING (has_role(auth.uid(), 'admin'));

-- Admin pode ver todos os perfis (já existe política similar, garantindo)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT 
  USING (has_role(auth.uid(), 'admin'));