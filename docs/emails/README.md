# E-mails do Vyzon

Todo e-mail que o Vyzon manda usa o mesmo layout: papel creme, a marca em texto,
um cartão branco com a mensagem, um botão azul e o rodapé com o motivo do envio.
As cores são os tokens `--vyz-*` do app.

- Layout: `supabase/functions/_shared/email/layout.ts` (HTML em tabelas, CSS inline,
  600px, modo escuro no Apple Mail e Outlook.com, versão em texto puro).
- Textos: `supabase/functions/_shared/email/mensagens.ts`.
- Gerar templates de auth e prévias: `node scripts/emails/gerar.mjs`.
- Prévia: `docs/emails/previa/index.html` (abra por um servidor local, por exemplo
  `python3 -m http.server 4790 --directory docs/emails/previa`).
- Teste: `src/lib/__tests__/emails.test.ts` (sem travessão, sem emoji, templates do
  repo iguais ao gerador, assuntos iguais ao `config.toml`).

## Quem manda o quê

| E-mail | Quem recebe | Gatilho | Onde mora |
|---|---|---|---|
| Confirmar cadastro | quem se cadastra | Supabase Auth | `supabase/email-templates/confirm-signup.html` |
| Recuperar senha | quem pede em /recuperar-senha | Supabase Auth | `reset-password.html` |
| Trocar e-mail | dono da conta | Supabase Auth | `change-email.html` |
| Convite | dona criada em "Nova integradora" (edge `admin-nova-integradora`) ou pelo painel do Supabase | Supabase Auth | `invite.html` |
| Link de acesso | ninguém hoje | Supabase Auth | `magic-link.html` |
| Código de confirmação | ninguém hoje | Supabase Auth | `reauthentication.html` |
| Boas-vindas de vendedor | vendedor criado em Equipe | edge `admin-create-seller` | `boasVindasVendedor` |
| Conversa marcada | lead que marcou no site | edge `sdr-auto-outreach` | `demoMarcada` |
| Resposta do suporte | quem escreveu ao suporte | edge `admin-support-inbox` | `respostaSuporte` |
| Novo cadastro | Markus | edge `notify-signup` | `avisoNovoCadastro` |
| Pedido de Raio-X | Markus | edge `admin-lead-digest` | `avisoInterno` |
| WhatsApp fora do ar | Markus | edge `whatsapp-health` | `avisoInterno` |

Fica de fora: `outreach-dispatch` (cold email em texto puro, de propósito).

## Estado em produção

Aplicado em 04/11/2026, depois do merge do PR #53:

- Painel do Supabase: os 6 templates e os assuntos da tabela acima, aplicados pela
  API de management (`PATCH /v1/projects/<ref>/config/auth`) e conferidos campo a
  campo. Teste de recuperar senha entregue no Gmail com o layout novo e os
  placeholders trocados.
- Edges no ar: admin-create-seller, sdr-auto-outreach, notify-signup,
  whatsapp-health, admin-lead-digest e admin-support-inbox.

Ao mudar um texto: edite `mensagens.ts`, rode `node scripts/emails/gerar.mjs`, e
depois do merge cole o template no painel (Authentication, Emails, Templates) ou
suba a edge:

```bash
npx supabase functions deploy <edge>
```

Os textos dizem que o link vale 1 hora porque `mailer_otp_exp = 3600` no painel.
Se mudar lá, mude em `mensagens.ts` e rode o gerador.

O nome do remetente das edges vem do secret `RESEND_FROM_EMAIL` (hoje
"Markus — Vyzon", com travessão); o dos e-mails de auth vem do SMTP do painel
("Vyzon" <contato@vyzon.com.br>).

## Link que a prévia não gasta (15/11/2026)

O link direto do Supabase (`{{ .ConfirmationURL }}`, `/auth/v1/verify?token=...`)
entra no primeiro acesso, seja de quem for. A prévia de link do WhatsApp e o
antivírus de e-mail abrem o endereço sozinhos e gastam o link antes da pessoa. Em
11/11/2026 as duas sessões da única conta criada à mão eram do robô de prévia do
WhatsApp (`WhatsApp/2.23.20.0` em `auth.sessions`).

Convite e recuperar senha agora levam à nossa página com o código:

```
{{ .SiteURL }}/redefinir-senha?token_hash={{ .TokenHash }}&type=invite
{{ .SiteURL }}/redefinir-senha?token_hash={{ .TokenHash }}&type=recovery
```

Abrir a página não gasta nada. O código só é conferido quando a pessoa salva a
senha (`RedefinirSenha`, `src/lib/linkDeAcesso.ts`). O link antigo segue aceito
para e-mail já enviado.

**Falta aplicar em produção** (o código sozinho não muda o e-mail que sai):

1. Publicar o site com esta página (merge na `main`). Antes disso o link novo cai
   numa página que não sabe ler o código.
2. Depois, colar `supabase/email-templates/invite.html` e `reset-password.html` no
   painel do Supabase (Authentication, Emails, Templates: "Invite user" e "Reset
   password").
3. Conferir em Authentication, URL Configuration que o Site URL é
   `https://vyzon.com.br` (é o `{{ .SiteURL }}`).

Link gerado à mão para mandar por WhatsApp: use `auth.admin.generateLink` e monte
o endereço com `properties.hashed_token` no formato acima (`montarLinkDeAcesso`).
Nunca cole o `action_link` no WhatsApp.

O convite vale 1 hora (`mailer_otp_exp = 3600`). Dona que abre o e-mail no dia
seguinte cai em "Esse link venceu" e precisa pedir outro. O painel aceita até
86400 (24h) em Authentication, Emails, "Email OTP Expiration"; se mudar, troque
"1 hora" em `mensagens.ts` e em `RedefinirSenha.tsx` e rode o gerador.

## Achados que ficaram de fora

- `mailer_autoconfirm = true` no painel (conferido de novo em 15/11/2026 em
  `/auth/v1/settings`): o e-mail de confirmação de cadastro não sai em produção, e
  o `config.toml` diz `enable_confirmations = true`. Confirmar cadastro e trocar
  e-mail seguem com `{{ .ConfirmationURL }}`.
- `admin-create-seller` manda a senha do vendedor por e-mail, em texto. O ideal é um
  convite com link para a pessoa criar a própria senha.
- Remetente padrão agora é `Vyzon <suporte@vyzon.com.br>` em todas as edges quando
  `RESEND_FROM_EMAIL` não existe. Antes uma caía em `onboarding@resend.dev`.
- Gmail no modo escuro inverte as cores sozinho; só Apple Mail e Outlook.com usam as
  cores escuras definidas no layout.
