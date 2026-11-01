# EDL · eva-campo

Reel vertical 1080×1920, 60 qps, 23 s. Registro **EVA em campo** (conceito A do
canvas, 01/11/2026): cor chapada, Gabarito, a EVA como personagem da história.
Território **C · Virada**, com a mesma narração, trilha e batidas do `dia-2`
(`roteiro.json` igual, nenhuma voz nova). Uma grande ideia visual: **a EVA em
cena**, de olho no hook, sentada no aviso, feliz quando a mensagem sai.

Público: dono de integradora solar que vende pelo WhatsApp. Uso: orgânico. A
variação declarada em relação ao `dia-2` é só o registro visual.

## Promessas (conferidas no código em 01/11/2026)

As do `dia-2` valem, com duas mudanças:

| Promessa na tela | Onde existe |
|---|---|
| Aviso: "Responda 1 para enviar, 2 para descartar, ou escreva o texto corrigido." | `_shared/whatsappApproval.ts` `buildDraftMessage`, commit `ef547f8`. **Ainda não publicado**: só publicar o reel depois do deploy do webhook |
| EVA como bot de cápsula com placa solar | `src/components/eva/EvaBot.tsx`, commit `47d891e`. Vale em produção depois do deploy do site |

Carlos, R$ 24.900, os horários e a resposta do cliente são ilustrativos, como no
`dia-2`.

Nada de envio automático: o filme mostra o "1" do dono e a janela de 20 s para
desfazer antes de qualquer mensagem sair.

## Batidas e cenas

| Batida | Tempo | Fundo | Tela | EVA |
|---|---|---|---|---|
| B0 | 0,02 | sol | Gancho inteiro no quadro 0, marca-texto branco em "sumiu?" (B1), chip "Visualizado às 14:03" (B3), ✓✓ azul (B4) | grande no canto, olha para o chip e pisca |
| B6 | 2,94 | creme | Conversa com o Carlos, contador 0 → 1 → 2 dias (B10, B12) | ao lado do contador, olha para a conversa e pisca a cada dia |
| B14 | 6,85 | noite | Aviso do Vyzon no WhatsApp do dono, nasce inteiro em B15 | sentada no cartão: lê (B14), alerta e células acesas (B15), escreve (B20) |
| B24 | 11,73 | noite | Bolha "1" do dono | volta a olhar |
| B26 | 12,70 | noite | "Sai em 20 segundos para Carlos. Mande "desfazer" para cancelar." | pisca |
| B30 | 14,65 | creme | A mesma mensagem na conversa do Carlos, selo "Saiu do seu número" (B31), ✓✓ azul (B32), cliente responde (B35) | sentada na conversa, feliz, painel aceso (B31) |
| B37 | 18,07 | sol | Payoff "A EVA sugere. **Você aprova.**" | grande, feliz (B38) |
| B41 | 20,02 | noite | CTA: EVA, logo, botão "Fale com o Markus no WhatsApp", vyzon.com.br | de olho |
