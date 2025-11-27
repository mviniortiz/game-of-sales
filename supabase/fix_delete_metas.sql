-- Fix: Permitir exclusão de metas consolidadas
-- Execute este SQL no Supabase SQL Editor

-- Verificar políticas existentes
SELECT * FROM pg_policies WHERE tablename = 'metas_consolidadas';

-- Criar política de DELETE se não existir
DO $$
BEGIN
    -- Drop existing delete policy if exists
    DROP POLICY IF EXISTS "Allow delete metas_consolidadas" ON metas_consolidadas;
    
    -- Create new delete policy - allows authenticated users to delete
    CREATE POLICY "Allow delete metas_consolidadas" ON metas_consolidadas
        FOR DELETE
        TO authenticated
        USING (true);
        
    RAISE NOTICE 'Política de DELETE criada com sucesso!';
END $$;

-- Verificar se RLS está habilitado
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'metas_consolidadas';

-- Se precisar desabilitar RLS temporariamente para testar:
-- ALTER TABLE metas_consolidadas DISABLE ROW LEVEL SECURITY;

-- Listar todas as políticas após a alteração
SELECT * FROM pg_policies WHERE tablename = 'metas_consolidadas';

