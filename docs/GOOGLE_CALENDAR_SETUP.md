# Configuração do Google Calendar - Game Sales

## Passo 1: Criar Projeto no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Clique em **"Select a project"** → **"New Project"**
3. Nome: `Game Sales` (ou qualquer nome)
4. Clique em **Create**

## Passo 2: Habilitar a API do Google Calendar

1. No menu lateral, vá em **APIs & Services** → **Library**
2. Pesquise por **"Google Calendar API"**
3. Clique nela e depois em **Enable**

## Passo 3: Configurar Tela de Consentimento OAuth

1. Vá em **APIs & Services** → **OAuth consent screen**
2. Selecione **External** (para permitir qualquer conta Google)
3. Preencha:
   - **App name**: `Game Sales`
   - **User support email**: Seu email
   - **Developer contact email**: Seu email
4. Clique em **Save and Continue**
5. Em **Scopes**, clique em **Add or Remove Scopes**
6. Adicione: `https://www.googleapis.com/auth/calendar`
7. Clique em **Save and Continue**
8. Em **Test users**, adicione seu email para testes
9. Clique em **Save and Continue**

## Passo 4: Criar Credenciais OAuth 2.0

1. Vá em **APIs & Services** → **Credentials**
2. Clique em **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `Game Sales Web Client`
5. **Authorized redirect URIs** - Adicione:
   ```
   https://SEU_PROJECT_ID.supabase.co/functions/v1/google-oauth-callback
   ```
   (Substitua `SEU_PROJECT_ID` pelo ID do seu projeto Supabase)

6. Clique em **Create**
7. **IMPORTANTE**: Copie o **Client ID** e **Client Secret**

## Passo 5: Configurar Variáveis de Ambiente no Supabase

1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** → **Edge Functions**
4. Adicione as seguintes variáveis:

| Nome | Valor |
|------|-------|
| `GOOGLE_CLIENT_ID` | Seu Client ID do Google |
| `GOOGLE_CLIENT_SECRET` | Seu Client Secret do Google |
| `FRONTEND_URL` | URL do seu frontend (ex: `https://gamesales.vercel.app`) |

## Passo 6: Garantir Colunas no Banco de Dados

Execute este SQL no Supabase SQL Editor:

```sql
-- Adicionar colunas para Google Calendar na tabela profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS google_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS google_calendar_id TEXT;

-- Criar tabela de logs de sincronização (se não existir)
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

-- Adicionar coluna google_event_id na tabela agendamentos (se não existir)
ALTER TABLE agendamentos
ADD COLUMN IF NOT EXISTS google_event_id TEXT,
ADD COLUMN IF NOT EXISTS synced_with_google BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_agendamentos_google_event_id ON agendamentos(google_event_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_user_id ON sync_logs(user_id);
```

## Passo 7: Deploy das Edge Functions

Se ainda não fez o deploy das Edge Functions, execute:

```bash
cd game-of-sales
npx supabase functions deploy google-oauth-init
npx supabase functions deploy google-oauth-callback
npx supabase functions deploy google-calendar-sync
npx supabase functions deploy google-calendar-webhook
npx supabase functions deploy google-calendar-auto-sync
```

## Passo 8: Testar a Integração

1. Acesse seu app Game Sales
2. Vá em **Integrações**
3. Clique em **Conectar** no Google Calendar
4. Autorize o acesso
5. Você será redirecionado de volta com a mensagem de sucesso

## Troubleshooting

### Erro "redirect_uri_mismatch"
- Verifique se a URI de callback no Google Console está exatamente igual à do Supabase
- A URI deve ser: `https://SEU_PROJECT.supabase.co/functions/v1/google-oauth-callback`

### Erro "access_denied"
- Verifique se seu email está na lista de Test Users no Google Console
- Ou publique o app (requer verificação do Google)

### Tokens não salvando
- Verifique se as colunas existem na tabela `profiles`
- Verifique os logs das Edge Functions no Supabase Dashboard

## Arquitetura da Integração

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│  google-oauth-   │────▶│  Google OAuth   │
│   (Conectar)    │     │     init         │     │     Server      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │◀────│  google-oauth-   │◀────│  Google OAuth   │
│   (Sucesso)     │     │    callback      │     │   (com tokens)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │    Supabase      │
                        │   (profiles)     │
                        └──────────────────┘
```

