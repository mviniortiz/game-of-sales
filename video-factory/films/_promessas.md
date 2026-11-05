| Promessa na tela ou na voz | Onde existe |
|---|---|
| Nome "Lume", aviso começa com "Lume [código] rascunho pronto" | `supabase/functions/_shared/whatsappApproval.ts` (`EVA_PREFIX = "Lume"`, `buildDraftMessage`) |
| "Responda 1 para enviar, 2 para descartar, ou escreva o texto corrigido." | `buildDraftMessage` (texto fora do grupo) |
| Código curto letra+dígito (K7, M4, A2) | `nextApprovalCode` (sem I/O/0/1) |
| "Sai em 20 segundos para X. Mande "desfazer" para cancelar." | `handleOwnerCommand`, `DESFAZER_MS = 20_000` |
| Aviso no 2º dia sem resposta, com a mensagem pronta | `eva-quote-followup` + home `PASSOS` (`src/pages/SolarLanding.tsx`) |
| Retomada parte do que o cliente disse ("ia pensar"), 1 pergunta no fim, sem repetir valor | `_shared/followupDraft.ts` `buildQuietQuotePrompt` |
| "Você responde 1 e ela sai do seu número" / "Nada vai pro cliente sem você aprovar" / 48 h | home `ANGLES.sumiu.sub`, `PASSOS`, objeções |
| Proposta em PDF ou texto entra sozinha na lista, com valor e dia | home `PASSOS[0]`; `_shared/quoteTracking.ts` (PDF lido por `quote-pdf-amount`) |
| Raio-X: conecta, lê 90 dias, uns 3 minutos, mensagem pronta para as maiores, grátis, nada enviado | FAQ da home (`SolarLanding.tsx`, linha do Raio-X) e `CTA_DEPOIS` |
| "12 propostas de R$ 25 mil = R$ 300 mil" | exemplo do ângulo `parado` da home (`ANGLES.parado.sub`) |
| CTA "Ver minhas propostas paradas", grátis e sem cartão | `CTA` e `CTA_DEPOIS` da home |
| Nomes, valores, horários e respostas de cliente | **ilustrativos** |
