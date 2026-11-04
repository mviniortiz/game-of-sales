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
| Convite | convidado pelo painel do Supabase | Supabase Auth | `invite.html` |
| Link de acesso | ninguém hoje | Supabase Auth | `magic-link.html` |
| Código de confirmação | ninguém hoje | Supabase Auth | `reauthentication.html` |
| Boas-vindas de vendedor | vendedor criado em Equipe | edge `admin-create-seller` | `boasVindasVendedor` |
| Conversa marcada | lead que marcou no site | edge `sdr-auto-outreach` | `demoMarcada` |
| Resposta do suporte | quem escreveu ao suporte | edge `admin-support-inbox` | `respostaSuporte` |
| Novo cadastro | Markus | edge `notify-signup` | `avisoNovoCadastro` |
| Pedido de Raio-X | Markus | edge `admin-lead-digest` | `avisoInterno` |
| WhatsApp fora do ar | Markus | edge `whatsapp-health` | `avisoInterno` |
| Demo personalizada | Markus | edge `create-personalized-demo` | `avisoDemoPersonalizada` |

Fica de fora: `outreach-dispatch` (cold email em texto puro, de propósito).

## Aplicar à mão (nada disso foi feito)

### Painel do Supabase: Authentication, Emails, Templates

Cole o HTML do arquivo e troque o assunto em cada um:

| Template | Assunto | Arquivo |
|---|---|---|
| Confirm signup | Confirme seu e-mail no Vyzon | `confirm-signup.html` |
| Reset password | Redefinir sua senha do Vyzon | `reset-password.html` |
| Change email address | Confirme seu e-mail novo no Vyzon | `change-email.html` |
| Invite user | Seu acesso ao Vyzon | `invite.html` |
| Magic link | Seu link para entrar no Vyzon | `magic-link.html` |
| Reauthentication | Seu código do Vyzon | `reauthentication.html` |

Os textos dizem que o link vale 1 hora porque `mailer_otp_exp = 3600` no painel
(conferido em 04/11/2026). Se mudar lá, mude em `mensagens.ts` e rode o gerador.

### Edges a subir

```bash
npx supabase functions deploy admin-create-seller sdr-auto-outreach notify-signup whatsapp-health admin-lead-digest create-personalized-demo admin-support-inbox
```

A tela de Suporte passa a mandar só o texto e a edge monta o HTML. A ordem do deploy
não quebra nada: edge velha com front novo manda texto puro, edge nova com front
velho usa o HTML que o front mandou.

## Achados que ficaram de fora

- `mailer_autoconfirm = true` no painel: o e-mail de confirmação de cadastro não sai
  em produção, e o `config.toml` diz `enable_confirmations = true`.
- `admin-create-seller` manda a senha do vendedor por e-mail, em texto. O ideal é um
  convite com link para a pessoa criar a própria senha.
- Remetente padrão agora é `Vyzon <suporte@vyzon.com.br>` em todas as edges quando
  `RESEND_FROM_EMAIL` não existe. Antes uma caía em `onboarding@resend.dev`.
- Gmail no modo escuro inverte as cores sozinho; só Apple Mail e Outlook.com usam as
  cores escuras definidas no layout.
