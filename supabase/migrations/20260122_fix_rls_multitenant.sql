-- ============================================================================
-- CORREÇÃO DE POLÍTICAS RLS MULTI-TENANT
-- Data: 2026-01-22
-- 
-- Esta migração corrige vulnerabilidades de segurança onde políticas RLS
-- usavam USING (true) permitindo acesso entre empresas diferentes.
-- ============================================================================

-- ============================================================================
-- 0. GARANTIR QUE COLUNAS company_id EXISTEM
-- ============================================================================

-- Adicionar company_id em deal_activities se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'deal_activities' 
        AND column_name = 'company_id'
    ) THEN
        ALTER TABLE public.deal_activities ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_deal_activities_company_id ON public.deal_activities(company_id);
        RAISE NOTICE 'Coluna company_id adicionada à tabela deal_activities';
    ELSE
        RAISE NOTICE 'Coluna company_id já existe na tabela deal_activities';
    END IF;
END $$;

-- Adicionar company_id em deal_notes se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'deal_notes' 
        AND column_name = 'company_id'
    ) THEN
        ALTER TABLE public.deal_notes ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_deal_notes_company_id ON public.deal_notes(company_id);
        RAISE NOTICE 'Coluna company_id adicionada à tabela deal_notes';
    ELSE
        RAISE NOTICE 'Coluna company_id já existe na tabela deal_notes';
    END IF;
END $$;

-- Atualizar registros existentes com company_id do perfil do usuário
UPDATE public.deal_activities da
SET company_id = p.company_id
FROM public.profiles p
WHERE da.user_id = p.id AND da.company_id IS NULL;

UPDATE public.deal_notes dn
SET company_id = p.company_id
FROM public.profiles p
WHERE dn.user_id = p.id AND dn.company_id IS NULL;

-- ============================================================================
-- 1. DEAL_ACTIVITIES - Corrigir SELECT policy
-- (Tabela tem company_id)
-- ============================================================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "deal_activities_select" ON public.deal_activities;
DROP POLICY IF EXISTS "deal_activities_insert" ON public.deal_activities;
DROP POLICY IF EXISTS "deal_activities_delete" ON public.deal_activities;
DROP POLICY IF EXISTS "allow_all_activities" ON public.deal_activities;
DROP POLICY IF EXISTS "deal_activities_select_policy" ON public.deal_activities;
DROP POLICY IF EXISTS "deal_activities_insert_policy" ON public.deal_activities;
DROP POLICY IF EXISTS "deal_activities_delete_policy" ON public.deal_activities;

-- Recriar com isolamento correto por company_id
CREATE POLICY "deal_activities_select_policy" ON public.deal_activities
  FOR SELECT USING (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
    OR user_id = auth.uid()
  );

CREATE POLICY "deal_activities_insert_policy" ON public.deal_activities
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR company_id = public.get_my_company_id()
  );

CREATE POLICY "deal_activities_delete_policy" ON public.deal_activities
  FOR DELETE USING (
    public.is_super_admin()
  );

-- ============================================================================
-- 2. DEAL_NOTES - Corrigir SELECT policy
-- (Tabela tem company_id)
-- ============================================================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "deal_notes_select" ON public.deal_notes;
DROP POLICY IF EXISTS "deal_notes_insert" ON public.deal_notes;
DROP POLICY IF EXISTS "deal_notes_update" ON public.deal_notes;
DROP POLICY IF EXISTS "deal_notes_delete" ON public.deal_notes;
DROP POLICY IF EXISTS "allow_all_notes" ON public.deal_notes;
DROP POLICY IF EXISTS "deal_notes_select_policy" ON public.deal_notes;
DROP POLICY IF EXISTS "deal_notes_insert_policy" ON public.deal_notes;
DROP POLICY IF EXISTS "deal_notes_update_policy" ON public.deal_notes;
DROP POLICY IF EXISTS "deal_notes_delete_policy" ON public.deal_notes;

-- Recriar com isolamento correto por company_id
CREATE POLICY "deal_notes_select_policy" ON public.deal_notes
  FOR SELECT USING (
    public.is_super_admin()
    OR company_id = public.get_my_company_id()
    OR user_id = auth.uid()
  );

CREATE POLICY "deal_notes_insert_policy" ON public.deal_notes
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR company_id = public.get_my_company_id()
  );

CREATE POLICY "deal_notes_update_policy" ON public.deal_notes
  FOR UPDATE USING (
    public.is_super_admin()
    OR user_id = auth.uid()
  );

CREATE POLICY "deal_notes_delete_policy" ON public.deal_notes
  FOR DELETE USING (
    public.is_super_admin()
    OR user_id = auth.uid()
  );

-- ============================================================================
-- 3. USER_CONQUISTAS - Corrigir INSERT policy
-- (Tabela NÃO tem company_id, usar join com profiles)
-- ============================================================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "System can insert user achievements" ON public.user_conquistas;
DROP POLICY IF EXISTS "Users can view own achievements or admins view all" ON public.user_conquistas;
DROP POLICY IF EXISTS "user_conquistas_select_policy" ON public.user_conquistas;
DROP POLICY IF EXISTS "user_conquistas_insert_policy" ON public.user_conquistas;
DROP POLICY IF EXISTS "user_conquistas_delete_policy" ON public.user_conquistas;

-- Recriar com isolamento via join com profiles
-- SELECT: Usuário vê próprias conquistas ou admins/super-admins veem da mesma empresa
CREATE POLICY "user_conquistas_select_policy" ON public.user_conquistas
  FOR SELECT USING (
    public.is_super_admin()
    OR user_id = auth.uid()
    OR user_id IN (
      SELECT id FROM public.profiles 
      WHERE company_id = public.get_my_company_id()
    )
  );

-- INSERT: Permite inserir conquistas para usuários da mesma empresa
CREATE POLICY "user_conquistas_insert_policy" ON public.user_conquistas
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR user_id IN (
      SELECT id FROM public.profiles 
      WHERE company_id = public.get_my_company_id()
    )
  );

-- DELETE: Apenas super-admin pode deletar conquistas
CREATE POLICY "user_conquistas_delete_policy" ON public.user_conquistas
  FOR DELETE USING (
    public.is_super_admin()
  );

-- ============================================================================
-- 4. SYNC_LOGS - Verificar e manter isolamento por user_id
-- (Tabela NÃO tem company_id, sync é individual por usuário - OK)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sync_logs' AND table_schema = 'public') THEN
    -- Remover políticas existentes
    DROP POLICY IF EXISTS "Users can view own sync logs" ON public.sync_logs;
    DROP POLICY IF EXISTS "System can insert sync logs" ON public.sync_logs;
    DROP POLICY IF EXISTS "Users can insert own sync logs" ON public.sync_logs;
    DROP POLICY IF EXISTS "sync_logs_select_policy" ON public.sync_logs;
    DROP POLICY IF EXISTS "sync_logs_insert_policy" ON public.sync_logs;
    
    -- Recriar políticas (por user_id - adequado para sync individual)
    EXECUTE 'CREATE POLICY "sync_logs_select_policy" ON public.sync_logs
      FOR SELECT USING (
        public.is_super_admin()
        OR user_id = auth.uid()
      )';
    
    EXECUTE 'CREATE POLICY "sync_logs_insert_policy" ON public.sync_logs
      FOR INSERT WITH CHECK (
        user_id = auth.uid()
      )';
    
    RAISE NOTICE 'Políticas de sync_logs atualizadas';
  ELSE
    RAISE NOTICE 'Tabela sync_logs não existe, pulando...';
  END IF;
END $$;

-- ============================================================================
-- 5. CONQUISTAS - Manter como tabela global (definições do sistema)
-- Não precisa de alteração - conquistas são badges globais compartilhados
-- ============================================================================

-- Verificação final
SELECT 'Migração de correção RLS multi-tenant aplicada com sucesso!' AS resultado;
