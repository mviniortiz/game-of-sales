# EDL · dia-2

Reel vertical 1080×1920, 60 qps, 23 s. Registro **Vyzon Solar** (papel frio
`#f6f7f9`, azul `#1556c0`, marca-texto `#ffd84a` atrás de texto `#0d1421`,
Archivo nos títulos, Barlow Condensed nos números). Território **C · Virada**:
a proposta parada recebe a retomada pronta, o dono responde 1 e ela sai do
número dele. Uma grande ideia visual: **a conversa de WhatsApp como objeto**.

Público: dono de integradora solar que vende pelo WhatsApp. Uso: orgânico e
anúncio de topo/meio de funil (mostra o produto funcionando com a aprovação
humana visível).

## Promessas (todas conferidas no código em 23/10/2026)

| Promessa na tela ou na voz | Onde existe |
|---|---|
| "No 2º dia sem resposta, a mensagem pra chamar de volta chega pronta no seu WhatsApp" | `supabase/functions/eva-quote-followup/index.ts` (no_reply: uma retomada 2 dias depois da última mensagem da empresa) + `_shared/whatsappApproval.ts` `notifyPendingSuggestions` (leva o rascunho ao WhatsApp do dono; cron `eva-approval-notify`, `supabase/migrations/20260824_approval_cron.sql`) |
| Texto do aviso: "EVA [A2] rascunho pronto", "Lead:", "Por que agora:", rascunho, "Responda A2 1 para enviar, A2 2 para descartar, ou escreva o texto corrigido." | `_shared/whatsappApproval.ts` `buildDraftMessage` (código curto letra+dígito sem I/O/0/1: `nextApprovalCode`) |
| O dono responde só "1" | `parseOwnerCommand` (SEND_WORDS tem "1"); sem código vale quando há um rascunho aberto (`handleOwnerCommand`, senão pede "A2 1") |
| "Sai em 20 segundos para Carlos. Mande "desfazer" para cancelar." | `handleOwnerCommand`, `DESFAZER_MS = 20_000` |
| "Você responde 1 e ela sai do seu número" / selo "Saiu do seu número" | `enviarAgendado` → `sendText(p.instance, …)`: a instância é o WhatsApp conectado do dono |
| "Nada vai pro cliente sem você aprovar" / "A EVA sugere. Você aprova." | CLAUDE.md (inegociável: saída pro lead sempre aprovada); `agent_suggestions` status `pending` até o dono responder |
| "visto por último hoje às 14:03", "Visualizado às 14:03 ✓✓", "Proposta_8,4kWp.pdf" | Ilustrativo (UI do WhatsApp do próprio dono, não tela do Vyzon) |
| Cliente "Carlos", "R$ 24.900", rascunho "Oi, Carlos, conseguiu olhar a proposta? …" | Mesmos dados de exemplo do aviso da home (`src/pages/SolarLanding.tsx`, `AvisoNoWhatsApp`) |
| Cabeçalho "Aviso do Vyzon · no seu WhatsApp" | `SolarLanding.tsx` `AvisoNoWhatsApp` |
| Resposta do cliente "Oi! Vi sim, me manda a simulação que eu mostro pra minha esposa." | **Ilustrativa** (diálogo de cliente, não promessa de resultado) |
| EVA como EvaBot (bola azul-noite, dois olhos brancos, ponto roxo que fica âmbar) | `src/components/eva/evaBot.css` |
| CTA "Fale com o Markus no WhatsApp · vyzon.com.br" | `SolarLanding.tsx` `WhatsappCta` + `src/config/contact.ts` |

Nada de envio automático: o filme mostra o "1" do dono e a janela de 20 s
para desfazer antes de qualquer mensagem sair.

## Batidas e cenas

Trilha House 02 (Lily J, Mixkit 744), 122,99 BPM, primeira batida em 0,017 s.
`B(k) = 0,017 + k × 0,4879 s`. Toda entrada de cena e todo efeito ancoram numa
batida. Fonte única dos tempos de voz, efeito e trilha: `roteiro.json`.

| Batida | Tempo | Tela | Movimento que prova | Voz (Nassif) | Som |
|---|---|---|---|---|---|
| B0 | 0,02 | Gancho: "Mandou a proposta e o cliente **sumiu?**" (já no quadro 0) | marca-texto em "sumiu?" (B1), chip "Visualizado às 14:03" (B3), ✓✓ azul (B4) | "Mandou a proposta e o cliente sumiu?" | hook-thud; tick em B4 |
| B6 | 2,94 | Conversa com o Carlos: PDF da proposta, R$ 24.900 | ✓✓ ficam azuis (B8), status "visto por último hoje às 14:03", contador 0 → 1 → 2 dias (B10, B12) | "Ele visualizou e não respondeu." | trilha abafada (passa-baixa 900 Hz); tick B8; zoom-air B10, B12 |
| B14 | 6,85 | Virada: "Aviso do Vyzon" no WhatsApp do dono | câmera empurra 1,03; EvaBot lê (olhos achatados) e acende (B15); aviso nasce inteiro (B15) | "No segundo dia, a mensagem pra chamar de volta chega pronta no seu WhatsApp." | trilha abre; riser até B15; notify B15 |
| B24 | 11,73 | O dono responde "1" | bolha "1" sobe e o rolo da conversa acompanha | "Você responde um, e ela sai do seu número." | approve-click |
| B26 | 12,70 | "Sai em 20 segundos para Carlos. Mande "desfazer" para cancelar." | bolha da EVA | | pop-light |
| B30 | 14,65 | Conversa do Carlos: a mesma mensagem, saída do número do dono | selo "Saiu do seu número" (B31), ✓✓ azul (B32), digitando… (B33), cliente responde (B35) | "Nada vai pro cliente sem você aprovar." | morph; tick B32; pop-light B35 |
| B37 | 18,07 | Payoff: "A EVA sugere. **Você aprova.**" | linhas sobem por máscara, marca-texto em "Você aprova." | | payoff |
| B41 | 20,02 | CTA: logo Vyzon, "Para integrador de energia solar que vende pelo WhatsApp.", botão "Fale com o Markus no WhatsApp", vyzon.com.br | entra em duas batidas | "Fale com o Markus no WhatsApp." | zoom-air; trilha sai em 1,2 s |

Legenda da narração na faixa de baixo (sem som é como a maioria assiste),
gerada de `roteiro.json` com os tempos de palavra da transcrição ElevenLabs.
O gancho e o CTA não levam legenda porque a tela já diz o mesmo.

## Voz

Nassif (`ulzsiMeCbfKyTPCNhCD5`), `eleven_v4`, uma frase inteira por geração,
duas tomadas por frase; escolhida a mais enxuta e conferida pela transcrição.
Tomadas: L1-t1, L2-t2, L3-t1, L4-t2, L5-t2, L6-t1. Números por extenso
("responde um"). "Markus" e "Marcos" soam igual em português ([ˈmaʁkus]): o
scribe escreve "Marcos", a tela mostra "Markus".

## Variação

Nenhuma nesta rodada. Próximo teste declarado: o mesmo filme com o gancho
"Visualizou e sumiu?" (só o hook muda).
