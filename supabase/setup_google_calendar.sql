-- =====================================================
-- SETUP: Google Calendar Integration
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. Adicionar colunas para Google Calendar na tabela profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS google_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS google_calendar_id TEXT;

-- 2. Criar tabela de logs de sincronização
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  google_event_id TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Adicionar colunas de sincronização na tabela agendamentos
ALTER TABLE agendamentos
ADD COLUMN IF NOT EXISTS google_event_id TEXT,
ADD COLUMN IF NOT EXISTS synced_with_google BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_agendamentos_google_event_id ON agendamentos(google_event_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_user_id ON sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at DESC);

-- 5. Políticas RLS para sync_logs
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver seus próprios logs
DROP POLICY IF EXISTS "Users can view own sync logs" ON sync_logs;
CREATE POLICY "Users can view own sync logs" ON sync_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Sistema pode inserir logs (via service role)
DROP POLICY IF EXISTS "System can insert sync logs" ON sync_logs;
CREATE POLICY "System can insert sync logs" ON sync_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 6. Verificar se tudo foi criado corretamente
SELECT 
  'profiles' as tabela,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name LIKE 'google%'
UNION ALL
SELECT 
  'agendamentos' as tabela,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'agendamentos' 
  AND (column_name LIKE 'google%' OR column_name LIKE 'sync%' OR column_name = 'last_synced_at');

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Setup do Google Calendar concluído com sucesso!';
END $$;

