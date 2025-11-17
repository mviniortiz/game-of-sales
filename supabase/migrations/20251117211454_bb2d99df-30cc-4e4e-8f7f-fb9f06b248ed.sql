-- Adicionar constraint UNIQUE para evitar metas duplicadas
ALTER TABLE metas 
ADD CONSTRAINT metas_user_mes_unique UNIQUE (user_id, mes_referencia);