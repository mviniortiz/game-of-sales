# Medição do site, do cadastro e da assinatura

Versão 1, 15/11/2026. Vale para o que acontece fora do app logado (home, blog,
landings de proposta, cadastro) e para a compra. O app logado segue
`plano-de-tagging-app.md`.

## Como funciona

| Camada | Arquivo | Para quê |
| --- | --- | --- |
| `landing_events` (banco) | `src/lib/landingFunnel.ts` | Funil por sessão, com UTM. Enxerga quem entra e sai sem tocar na página. |
| GA4 + Google Ads | `src/lib/analytics.ts` | Funil agregado, eventos-chave e conversão dos anúncios. |

Regras que o código garante:

- **Só `vyzon.com.br` mede.** Localhost e prévia da Vercel não carregam o gtag.js.
- **Nada se perde por sair cedo.** O gtag.js carrega depois da primeira interação
  (ou de 4s). O que dispara antes espera numa fila guardada na sessão do
  navegador e sai depois do `config`, mesmo que a página troque no meio.
- **Ação de landing sai uma vez só do código.** `logLandingEvent` grava no banco e
  espelha no GA4. Visita e rolagem ficam só no banco (o GA4 tem `page_view` e
  `scroll` próprios).
- **Aparelho do time é marcado.** Super admin logado, ou o site aberto uma vez com
  `?interno=1`, manda `traffic_type=internal` ao GA4 e `interno: 1` nas props do
  banco. `?interno=0` desmarca.
- **Teto do banco.** A RPC aceita 60 eventos por sessão. Visita, rolagem e seção
  vista param em 40 no navegador, para sobrar lugar para o clique e o envio.

## Dicionário

### Landings (GA4, via `logLandingEvent`)

Todos levam `page` (solar, blog, proposta, signup, raio_x_rapido), `variant`
(ângulo, slug do post ou da landing) e as props do evento.

| Evento no GA4 | Evento no banco | Quando |
| --- | --- | --- |
| `landing_cta_click` | `cta_click` | Clique em botão ou link medido (`placement` diz onde) |
| `landing_download` | `cta_click` com `placement` download ou baixar_pdf | Baixou planilha, Word ou o PDF do gerador (`arquivo`) |
| `landing_whatsapp_click` | `whatsapp_click` | Clique no WhatsApp de suporte |
| `landing_form_start` | `form_start` | Começou a preencher (gerador, Raio-X rápido) |
| `landing_form_submit` | `form_submit` | Enviou um formulário (`step` no cadastro) |

`landing_page_view` (home solar aberta, com `angle`) sai direto do `SolarLanding`,
fora do espelho.

### Cadastro e assinatura

| Evento | Quando | Props |
| --- | --- | --- |
| `register_start` | Abriu `/criar-conta` | `plan` |
| `register_email_sent` | Conta criada, esperando confirmar o e-mail. Só existe se a confirmação de e-mail for ligada no Supabase | `plan` |
| `register_complete` | Empresa criada. Uma vez por conta. Junto sai o `Lead` do Meta | `plan`, `via` (email, sessao) |
| `plan_lock_view` | Viu a tela de plano bloqueado | |
| `upgrade_click` | Clicou em assinar (vai ao Stripe) | `plan`, `via` |
| `purchase` | Voltou do Stripe e a assinatura ficou ativa. Uma vez por assinatura | `transaction_id` (id da assinatura no Stripe), `value`, `currency`, `items` |

Junto do `purchase` sai a conversão "Compra" do Google Ads, com o mesmo valor e
`transaction_id`.

## O que conferir no painel do GA4

Feito no código, o resto é no painel. Admin, Exibição de dados, Eventos:

**Marcar como evento-chave**

- `purchase`
- `register_complete`
- `first_proposal_generated`

**Desmarcar como evento-chave**

- `qualify_lead`, `close_convert_lead`, `demo_request_submit`: nenhum código dispara.
- `ads_conversion_Compra_1`: é a mesma compra do `purchase` vista pelo Google Ads;
  marcado, conta em dobro.

**Filtro de tráfego interno**

1. Admin, Coleta e modificação de dados, Filtros de dados.
2. O GA4 costuma trazer o filtro "Internal Traffic" (`traffic_type` = `internal`)
   criado em modo de teste: mudar para **Ativo**. Se não existir, criar um filtro
   de tráfego interno com esse valor. Não conferi o painel.
3. Em cada aparelho e navegador seu, abrir uma vez `https://vyzon.com.br/?interno=1`.
   Logado como super admin já marca sozinho.

**Medição otimizada** (Admin, Fluxos de dados, Web)

- "Alterações na página com base em eventos do histórico de navegação" ligada. O
  site é uma página só que troca de rota; é isso que conta a visita de cada rota.

**Domínio**

- O código já não mede fora de `vyzon.com.br`. No painel não há o que travar.

## Limites conhecidos

- A compra é medida no navegador, na volta do Stripe. Quem paga e fecha a aba
  antes de voltar, ou cujo pagamento demora mais de 40s para confirmar, não entra.
  O jeito de fechar isso é mandar a compra pelo servidor (`assinatura-webhook`,
  Measurement Protocol do GA4), que precisa de uma chave criada no painel.
- "Pago" marcado à mão no admin não dispara `purchase`.
- `first_proposal_generated` pelo botão "Gerar PDF" dos produtos do negócio não
  grava proposta no banco: o "primeiro" é lembrado por navegador.
