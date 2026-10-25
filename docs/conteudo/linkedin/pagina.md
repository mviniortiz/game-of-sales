# Company Page do Vyzon no LinkedIn (25/10/2026)

Página: https://www.linkedin.com/company/vyzon-crm/ (id 113134999). Fonte de
verdade da copy: `src/pages/SolarLanding.tsx` (home), `src/config/plans.ts`
(preço e o que o plano tem) e `src/config/contact.ts`. Sem travessão, sem emoji,
nada de "CRM gamificado" nem automação total (CLAUDE.md, regra 4).

## O que estava errado na versão anterior

- "CRM de vendas gamificado", ranking com níveis, integrações Hotmart, Kiwify e
  Greenn: posicionamento abandonado (o público agora é integrador solar).
- "Funil de calls com gravação e transcrição": a telefonia saiu em 22/10/2026.
- "Mais de 230 empresas já usam o Vyzon": número sem fonte (Claims Policy).
- "Experimente 14 dias grátis": não existe teste grátis desde 08/10/2026; o
  grátis é o Raio-X.

## Campos

**Nome:** Vyzon | Propostas de energia solar no WhatsApp

**URL pública:** linkedin.com/company/vyzon-crm (não mudar: quebra links antigos)

**Slogan** (até 120 caracteres):
No 2º dia sem resposta, a mensagem pra chamar o cliente de volta chega pronta no seu WhatsApp.

**Botão:** Visitar site → https://vyzon.com.br/?utm_source=linkedin&utm_medium=organic&utm_campaign=company_page

**Visão geral:**

```
Mandou o orçamento de energia solar e o cliente sumiu?

O Vyzon é para integradoras de energia solar que vendem pelo WhatsApp. Ele acompanha cada proposta que sai do seu número e, no 2º dia sem resposta, a EVA manda no seu WhatsApp a mensagem pronta pra chamar o cliente de volta. Você responde 1 e ela sai do seu número, com o seu nome. Nada vai pro cliente sem você aprovar.

Como funciona
1. Você conecta o WhatsApp da empresa pelo código no celular, como no WhatsApp Web. O número continua o mesmo.
2. Manda orçamento como sempre. Cada proposta entra na lista sozinha, com o valor lido do PDF.
3. No 2º dia sem resposta, chega o aviso com a mensagem pronta, no seu tom.
4. Você responde 1 e ela sai do seu número.

O que vem junto
• Lista de todos os orçamentos: quem respondeu, quem sumiu e quanto vale
• Conversas em ordem: primeiro o cliente que está esperando você
• Funil de vendas com quanto vale cada etapa
• Até 10 pessoas da sua equipe

Comece pelo Raio-X grátis: o Vyzon mostra quais propostas dos últimos 90 dias estão paradas no seu WhatsApp e quanto elas somam.

Preço de fundador: R$ 97 por mês nos 3 primeiros meses para as 10 primeiras integradoras. Depois, R$ 197 por mês, sem contrato.

Quer ver funcionando? Fale com o Markus no WhatsApp pelo vyzon.com.br.
```

**Site:** https://vyzon.com.br/

**Setor:** Desenvolvimento de software (manter)

**Telefone:** 48991696887 (manter; é o de `contact.ts`)

**Especialidades** (substituem CRM, Gamificação, Automação de vendas, Hotmart):
Energia solar · Integradores de energia solar · Vendas pelo WhatsApp ·
Follow-up de propostas · Gestão de orçamentos · Retomada de clientes

**Logo:** `logo.png` (800x800, marca oficial `public/brand/vyzon-mark.svg` no branco)

**Capa:** `capa.png` (2256x382, 2x de 1128x191). Os primeiros 300 px à esquerda
ficam livres: no desktop o quadro do logo cobre essa área (na 1ª versão o logo
tapava o começo do título). Renderizar de novo: `./render.sh`.

## Publicado em 25/10/2026

Nome, slogan, botão (com UTM), visão geral, especialidades, logo e capa
aplicados pelo editor da página e conferidos na visão de visitante. Recusados
os convites do LinkedIn para publicar post sobre a mudança e para assinar o
Premium. Tamanho da empresa segue "0 a 1 funcionários".

## Conferência das afirmações

| Afirmação | Onde existe |
|---|---|
| Aviso no 2º dia, responde 1, sai do seu número, nada sem aprovar | `eva-quote-followup`, `_shared/whatsappApproval.ts`; home `ANGLES.sumiu` |
| Conectar pelo código no celular, número continua o mesmo | home, passo "Uma vez" |
| Valor lido do PDF | `plans.ts` features |
| Lista de orçamentos, conversas em ordem, funil, até 10 pessoas | home, lista do que vem no plano; `plans.ts` |
| Raio-X dos últimos 90 dias, grátis | home ("Raio-X dos últimos 90 dias, grátis antes de assinar") |
| R$ 97 / 3 meses / 10 primeiras, depois R$ 197, sem contrato | `plans.ts`; home `PriceLine` |
