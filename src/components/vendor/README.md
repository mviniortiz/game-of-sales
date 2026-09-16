# vendor — componentes de terceiros

Código copiado de bibliotecas abertas (MIT) e adaptado ao projeto. Não é nosso,
mas vive aqui porque foi editado: mantê-lo separado deixa claro o que veio de
fora e o que é do Vyzon.

Origem: https://beui.dev (MIT, github.com/starc007/ui-components)

## O que foi mudado na cópia

- `from "motion/react"` virou `from "framer-motion"`. É a mesma biblioteca com
  nome novo; o projeto já tem framer-motion 12 e nenhuma dependência foi
  instalada por causa disto.
- O `lib/utils.ts` que vinha no pacote foi descartado: já temos o nosso `cn`.
- O `lib/ease.ts` virou `src/lib/beuiEase.ts` para não colidir com nada.

## Regra ao usar

Cor, raio, sombra e espessura de fonte destes componentes NÃO valem aqui. Ao
integrar, trocar por tokens (`--vyz-*` no app, `--lp-*` na landing,
`--ibx-*` no Inbox). O que a gente aproveita é a mecânica de animação, não a
identidade visual deles.
