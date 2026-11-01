---
name: ler-avaliacoes-maps
description: Mede se um nicho sente a dor de orçamento sem resposta lendo as avaliações públicas do Google Maps de 6 empresas da região e contando reclamações de pré-venda e pós-venda a cada 100 avaliações com texto. Use quando a pergunta for "este nicho perde venda por orçamento?" ou para comparar nichos antes de conversar com donos.
example-prompt: Avalie o nicho de marmoraria na Grande Florianópolis pelas avaliações do Google.
---

# Ler avaliações do Google Maps

Resultado: uma linha na tabela `nichos` e um parágrafo para o Markus dizendo se
a dor aparece, com dois relatos resumidos.

## Antes

- O navegador precisa estar com uma conta Google logada. Sem login o Maps
  mostra só 3 avaliações por empresa; se for o caso, pare e peça ao Markus.
- Só leitura. Não avalie, não salve lugar, não responda nada.

## Passo a passo

1. Busque no Maps "<nicho> Grande Florianópolis" (ou a região pedida) e role a
   lista para carregar mais resultados.
2. Escolha as 6 empresas com mais avaliações que vendem por orçamento. Tire
   local de evento que só aluga, restaurante, revenda de outra coisa.
3. Para cada empresa: abra a ficha, abra a aba Avaliações, role até o fim para
   carregar todas, expanda os textos e leia. O arquivo
   `references/extrair-avaliacoes.js` faz isso no console da página e devolve
   contagens e os trechos que batem; as classes do Maps mudam, então se ele
   devolver zero avaliações, leia pela página.
4. Classifique só o que você leu:
   - pré-venda: pediu orçamento e não recebeu, recebeu com muito atraso,
     mediram e não mandaram, visualizaram e não responderam;
   - pós-venda: depois de fechar, não respondem, não dão retorno;
   - o resto não conta (atraso de entrega, defeito, preço).
   Uma mesma pessoa com duas avaliações conta uma vez.
5. Some por nicho e calcule pré-venda a cada 100 avaliações com texto.

## Cuidados

- A busca dentro das avaliações do próprio Maps não filtra bem; leia tudo.
- Avaliação mostra o lado da empresa que não respondeu. Não mostra o cliente
  que sumiu depois de receber a proposta. Diga isso no parágrafo.
- Onde quem avalia é convidado ou consumidor de passagem, o método não serve:
  status 'inconclusivo'.
- Separe o que é dos últimos 2 anos. Reclamação antiga vale menos.
- Não guarde nome de quem avaliou. Resuma o relato com as suas palavras.

## Como saber que deu certo

A linha em `nichos` tem empresas_lidas, avaliacoes_com_texto,
reclamacoes_orcamento, reclamacoes_pos_venda e por_100 preenchidos, e o
parágrafo cita de onde veio cada número.
