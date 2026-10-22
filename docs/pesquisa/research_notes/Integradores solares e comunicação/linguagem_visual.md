# Linguagem visual do setor solar brasileiro (insumo para o design system do Vyzon)

> **Método e data.** Coleta em 22/10/2026. Para cada site, baixei o HTML e as folhas de estilo principais e contei quantas vezes cada hex e cada `font-family` aparecem, além dos tokens CSS nomeados (`--color-brand`, `--font-display` etc.). Também li o conteúdo das páginas (headlines, nomes de arquivo e alt das imagens, CTAs) com WebFetch. **Não vi as páginas renderizadas.** A frequência de um hex no CSS indica cor de marca provável, não a área que ela ocupa na tela. Em sites WordPress aparece sempre a paleta padrão do Gutenberg (#32373c, #0693e3, #00d084, #ff6900, #fcb900, #7bdcb5, #8ed1fc, #abb8c3, #cf2e2e, #f78da7, #9b51e0). Desconsiderei esses valores, porque não são escolha da marca. Ficaram fora: Instagram, Meta Ads Library (exige login ou renderização em JS) e alguns sites bloqueados (WEG, Intelbras, Bluesol, Bluesun, Greener).

## 1. Cor: paletas dominantes, combinações saturadas e quem quebra o padrão

### Takeaway
O setor se divide em três famílias: laranja/âmbar "sol" (portais, integradores e franquias), verde "sustentável/financeiro" (fintechs e distribuidoras) e azul "confiança" (mídia, distribuidoras, software). A combinação mais repetida é **azul-marinho + laranja/âmbar**. O dado mais importante para o Vyzon: **a SolarMarket, concorrente direta em software para integrador, já usa papel creme (#f7f3ea) + tinta quase preta (#02171c) + âmbar "sun" (#ffb84d / #f59a23) + Satoshi**. Isso fica muito perto da direção atual do Vyzon (#faf9f5 + #0d1421 + #f5b400 + Satoshi 900).

### Cited Findings
**Software para integradores**
- SolarMarket (solarmarket.com.br, 22/10/2026). `theme-color` #02171c. Tokens nomeados: `--color-night-950:#02171c`, `--color-ink-900:#0a272e`, `--color-paper-50:#f7f3ea`, `--color-sun-400:#ffb84d`, `--color-brand-700:#006173` (petróleo), além de #f59a23 (laranja), #ffd38a, #faf5e9 e #f4ecdb (creme). Usa a escala "emerald" (#00d294, #009767) e fontes **Satoshi** e **Clash Display** (`--font-display: clash`). — [SolarMarket](https://solarmarket.com.br)
- SolarZ (solarz.com.br, 22/10/2026). Fonte Inter (400–700). O HTML só trouxe a paleta padrão do WordPress, então as cores reais estão em CSS que não consegui extrair. O hero é uma ilustração SVG (`img-hero-home-monitoramento-de-usina-solar.svg`) e cada módulo tem uma ilustração vetorial própria. — [SolarZ](https://solarz.com.br)

**Fintech / financiamento**
- Solfácil (solfacil.com.br, 22/10/2026). Token `--sf-green:#00B569`, lime #bbff00, quase preto #0a0b0d, cinzas frios (#d5d5d5, #79808a). Fonte Inter. O logo do cabeçalho é a versão branca (`logo-solfacil-branca-vetorizada`), o que indica fundo escuro ou colorido. — [Solfácil](https://solfacil.com.br)

**Distribuidoras**
- Aldo Solar (aldo.com.br). Azul #0072a7 é o hex mais frequente, seguido de roxo #aa14dd (provavelmente promocional). Fonte Montserrat 100–900. — [Aldo Solar](https://www.aldo.com.br)
- BelEnergy (belenergy.com.br). Dourado/ocre #8c7101 + amarelo #ffde55 + quase preto #090909. Fontes Sora e Work Sans. — [BelEnergy](https://belenergy.com.br)
- Ecori (ecorienergiasolar.com.br). Verde-oliva/lima #a9c23f (61 ocorrências), #55611f, #8dac12, chumbo #1d201d. Fontes Roboto e Montserrat. Botões com raio de 10px. — [Ecori](https://ecorienergiasolar.com.br)

**Portais e mídia**
- Portal Solar (portalsolar.com.br). Laranja #ff9c00 domina (39 ocorrências na home, 108 no simulador), com âmbar claro #ffc25f, verdes elétricos #7be500 e #63f14b nos detalhes, chumbo #36454f. Fontes Roboto, Myriad Pro, Chivo, Commissioner, Fira Sans e Work Sans: seis famílias, sinal de sistema fragmentado. Botões pílula (`border-radius:9999px`). — [Portal Solar](https://www.portalsolar.com.br); [Simulador](https://www.portalsolar.com.br/simulador-solar-calcular-economia)
- Canal Solar (canalsolar.com.br). Azul #0c4da2 como cor de marca, o resto é padrão do WordPress. — [Canal Solar](https://canalsolar.com.br)

**Franquias e integradores**
- Solar Prime (solarprime.com.br). Laranja #ff8700 (51) + marinho #0e142f (26) + roxo #6e00ff + azul #2ea3f2 (este é a cor padrão do tema Divi, indicado por `ETmodules`). Fontes Manrope e Maven Pro. — [Solar Prime](https://solarprime.com.br)
- Voltz Energias Renováveis (solarvoltz.com.br, integrador pequeno de Goiânia achado pelo Solutudo). Marinhos #2060a8, #123a68, #0f2744, #0c2340 + âmbar #ffb81c. Fontes Manrope e Sora. — [Voltz](https://solarvoltz.com.br); [Solutudo](https://www.solutudo.com.br/solar-voltz-energia-21650958)

**Marcas que fogem do sol amarelo**
- Projetos de branding solar citados em vitrines de design dizem rejeitar o sol amarelo e o verde. A B2K (Behance) usa "azuis do céu limpo". A Trade Solar usa dois azuis e brancos "para se diferenciar de concorrentes que se apropriam do sol". — [B2K no Behance](https://www.behance.net/gallery/188580619/B2K-Visual-identity); [World Brand Design](https://worldbranddesign.com/?p=420634) (a página não abriu no fetch; a informação vem só do snippet da busca)

### Inferences
- "Marinho + laranja/âmbar" aparece em franquia (Solar Prime), integrador pequeno (Voltz), portal (Portal Solar, com chumbo no lugar do marinho) e software (SolarMarket, com petróleo quase preto). É o código mais saturado do setor. O amarelo #f5b400 do Vyzon sobre tinta navy cai exatamente nesse território.
- Verde é o código das fintechs (Solfácil #00b569, Stone, ver seção 5) e das distribuidoras "eco" (Ecori). Usar verde puxa a leitura para "financiamento" ou "sustentável", não para "ferramenta de gestão".
- Azul sozinho (Canal Solar, Aldo, B2K, Trade Solar) é o caminho usado por quem quer fugir do sol. O azul #1556c0 do Vyzon já está nesse território mais neutro, e é o acento menos parecido com o da SolarMarket.
- Como a SolarMarket ocupa "papel creme + noite + sun + Satoshi", o Vyzon precisa diferenciar no acento, no grafismo ou na tipografia de display, ou corre o risco de ser lido como imitação no exato público que compara os dois.

### Gaps
- Cores reais da SolarZ, WEG Solar, Greener, Blue Sol e Bluesun: CSS não extraído ou acesso bloqueado.
- Heliux: a URL retornou um painel de login (template Bootstrap), não um site de marketing, então não há dado útil.
- Não medi a proporção de área de cada cor (precisaria de screenshot).
- Instagram das marcas não foi analisado.

## 2. Imagens e proposta em PDF

### Takeaway
Os softwares (SolarZ, SolarMarket) trocaram foto por ilustração vetorial e por mockups "vivos" com números do produto. Fintechs e franquias ainda usam banco de imagem genérico (aperto de mãos, engenheiro inspecionando painel). O conteúdo da proposta é padronizado (kit, geração, economia, investimento, payback, parcelamento). O canal (PDF no WhatsApp) é criticado no próprio setor como algo que vira "comparação de preço".

### Cited Findings
- Solfácil usa fotos de banco com nomes de arquivo genéricos: `low-angle-business-people-hand-shake`, `Homem-com-Celular-na-Frente-de-Painel-Solar`, `inspector-engineering-concept-engineer-inspect-solar-panel-solar-power-plant (1)`. A maioria dos logos de investidores não tem alt. — [Solfácil](https://solfacil.com.br)
- SolarZ não tem fotos de telhado nem screenshots do app. Usa ilustrações SVG por módulo (`ilustra-crm-energia-solar.svg`, `ilustra-chat-integrado-whatsapp.svg`, `ilustra-gerador-propostas-comerciais.svg`) e fotos reais de clientes integradores nos depoimentos (`joao-gabriel-evosolar.png`, `marcello-almeida-marsol.png`), com o resultado como manchete ("De 0 a R$ 450.000/mês."). — [SolarZ](https://solarz.com.br)
- SolarMarket troca foto por mockups narrativos: uma planilha chamada `propostas_2017_v8_FINAL_agora_vai.xlsx` com payback em "#REF!" e a nota "toda proposta, uma noite inteira", depois o fluxo "arrasta a conta de luz → motor monta o kit → Gerar proposta". — [SolarMarket](https://solarmarket.com.br)
- Nu Empresas mistura celebridade ("Ator Lázaro Ramos em campanha promocional"), produto físico ("Cartões Nubank PJ apoiados em uma superfície"), tela ("Celular exibindo a área de Conta PJ") e render 3D ("Objeto geométrico em 3D simulando um cofre"). — [Nu Empresas](https://www.nubank.com.br/empresas)
- Itens típicos de uma proposta segundo o Canal Solar: marca e modelo de módulos e inversores, descrição dos serviços, garantias, resumo financeiro (economia na conta, tempo de retorno), forma de pagamento com simulação de financiamento, validade e premissas/itens não inclusos. — [Canal Solar, como elaborar propostas](https://canalsolar.com.br/como-elaborar-propostas-comerciais-de-sistemas-fotovoltaicos/)
- Roberto Caurim (CEO da Bluesun), no Canal Conecta em Recife (14–15/05/2024), disse "Nunca mande um orçamento por PDF". Segundo ele, o PDF no WhatsApp fica perdido entre os concorrentes e o cliente olha só o preço final. Ele recomenda mostrar o custo da energia em R$/kWh (LCOE) contra a tarifa da concessionária, em vez do payback. — [Canal Solar, 15/05/2024](https://canalsolar.com.br/proposta-whatsapp-valor-clientes-bluesun/)
- Uma vaga de freelance pede proposta de **uma página**, editável em PowerPoint, Canva ou Figma "porque as condições mudam com frequência". Campos: geração estimada, painéis e inversores, potência, investimento e parcelamento. Isso indica que integradores pequenos montam a proposta em Canva/PPT. — [Workana](https://www.workana.com/job/criacao-de-proposta-comercial-para-projetos-de-energia-solar)
- Templates prontos de "proposta de projeto solar" em 16:9 para Slides/Canva/PPT circulam no Slidesgo, sinal de visual genérico e repetido. — [Slidesgo](https://slidesgo.com/pt/tema/proposta-de-projeto-de-energia-solar)
- Um fornecedor de software (fonte interessada) diz que imagem de satélite borrada, painéis desalinhados e falta de análise de sombreamento derrubam a confiança, mesmo com números certos. — [SurgePV](https://www.surgepv.com/glossary/proposal-builder)
- Guias de criativo para anúncio solar (agências, fontes interessadas) dizem que o criativo mais forte é a própria equipe filmada num telhado real, em cortes rápidos, e o depoimento sobre "a primeira conta depois da ativação". Também dizem que o vídeo que parece infomercial falha. — [Webtonic](https://www.webtonic.io/sub-services/solar-creative); [AdsUploader](https://adsuploader.com/pt/blog/solar-facebook-ads-examples)

### Inferences
- Lê como genérico: foto de banco com nome de arquivo em inglês (aperto de mão, engenheiro de capacete em usina), template de Slidesgo/Canva e telhado de drone sem contexto.
- Lê como crível: o rosto e o nome de um integrador real com número concreto (SolarZ), um mockup que mostra o caos real do integrador (a planilha "FINAL_agora_vai" da SolarMarket) e vídeo de equipe própria no telhado.
- Como a proposta é o artefato diário do integrador e o setor critica o "PDF frio", o Vyzon pode tratar a proposta como peça de marca: uma página legível no celular, com a conta de luz antes e depois e o R$/kWh contra a tarifa. A ilustração de telhado com painéis do Vyzon é um ícone comum. A proposta e a fatura como objeto visual são menos exploradas.

### Gaps
- Não obtive PDFs reais de propostas geradas por SolarZ, SolarMarket ou integradores para descrever layout, cores e páginas. Seria preciso pedir amostras a clientes.
- Meta Ads Library não acessado (exige navegação autenticada). Não há inventário próprio de criativos.

## 3. Tipografia e layout

### Takeaway
Predominam sans geométricas e humanistas genéricas do Google Fonts (Inter, Montserrat, Roboto, Manrope, Sora, Work Sans). Sites de integrador e franquia são feitos em temas WordPress/Divi/Wix, com várias famílias misturadas. Fontes de display autorais (Satoshi, Clash, ABC Gravity, GT Standard, Cera) aparecem só em quem investiu em marca: SolarMarket e as fintechs.

### Cited Findings
- Inter: SolarZ e Solfácil. — [SolarZ](https://solarz.com.br); [Solfácil](https://solfacil.com.br)
- Montserrat: Aldo e Ecori (Ecori com Roboto no corpo). — [Aldo](https://www.aldo.com.br); [Ecori](https://ecorienergiasolar.com.br)
- Manrope + Maven Pro (Solar Prime, tema Divi). Manrope + Sora (Voltz). Sora + Work Sans (BelEnergy). — [Solar Prime](https://solarprime.com.br); [Voltz](https://solarvoltz.com.br); [BelEnergy](https://belenergy.com.br)
- Portal Solar carrega seis famílias (Roboto, Myriad Pro, Chivo, Commissioner, Fira Sans, Work Sans). — [Portal Solar](https://www.portalsolar.com.br)
- SolarMarket: Satoshi (texto) e Clash Display (display). — [SolarMarket](https://solarmarket.com.br)
- Solfácil usa um banner em caixa alta com emoji ("BRILHE COM A GENTE ✨"). A home empilha banners promocionais (sorteio "Dispara Solfácil", "Boleto em Dia Sorte na Mão") antes do hero, num layout denso e de varejo. — [Solfácil](https://solfacil.com.br)
- SolarMarket tem layout longo e narrativo (13 seções), com quiz de diagnóstico e demos interativas. A SolarZ segue o padrão SaaS: hero, logos, dores, módulos, depoimentos, FAQ. — [SolarMarket](https://solarmarket.com.br); [SolarZ](https://solarz.com.br)
- Raios de borda: pílula 9999px (Portal Solar, Stone), 10px (Ecori), 12–16px (InfinitePay, SolarMarket), 3–5px (Aldo, Heliux/Bootstrap). — dados das folhas de estilo dos sites citados.

### Inferences
- Sans geométrica "neutra" em peso médio (Inter, Montserrat, Manrope) é o padrão invisível do setor. Satoshi 900 se destaca desse grupo, mas coincide com a SolarMarket. Para diferenciar, o Vyzon pode apostar no peso extremo, em numerais tabulares fortes ou em uma condensada para números (as fintechs fazem isso, ver seção 5).
- A densidade varia por perfil. Fintech e portal são densos, cheios de banners, com cara de varejo. Software mais novo é arejado e narrativo.

### Gaps
- Não analisei anúncios e posts (Instagram/Meta) para tipografia de criativo, onde condensadas e caixa alta tendem a aparecer mais. Seria preciso inspecionar visualmente.

## 4. Iconografia e visualização de dados (kWh, economia, payback, geração)

### Takeaway
O setor comunica com quatro números: conta atual × nova conta (R$), investimento, payback em anos e kWp/kWh. A forma dominante é o "número grande + rótulo" e o gráfico de barras semanal ou mensal de geração. Contadores de impacto (GW, CO₂, "+7.000 integradores") são onipresentes.

### Cited Findings
- A demo de dimensionamento da SolarMarket mostra 8,14 kWp, 22 módulos de 370 Wp, conta média de R$ 540/mês, nova conta estimada de R$ 96, investimento de R$ 22.400 e retorno em 4,2 anos. O monitoramento mostra "geração hoje" em kWh, "portais conectados 0 de 3" e um gráfico semanal. — [SolarMarket](https://solarmarket.com.br)
- O gerador de propostas da SolarZ promete um "template inteligente com cálculos automáticos de ROI, payback e economia de energia". A home destaca números grandes ("40%", "97%") e números nos depoimentos ("R$ 450.000/mês"). — [SolarZ](https://solarz.com.br)
- Solfácil tem um bloco "Impacto em números" com contadores animados (clientes, GW, CO₂ evitado, dispositivos IoT). No HTML eles aparecem como "0 mil+", "0 GW+", então ficam em zero sem JavaScript. — [Solfácil](https://solfacil.com.br)
- Intelbras promete "economia de até 95% na conta de luz". Percentual de economia é o gancho padrão. — [Intelbras](https://www.intelbras.com/pt-br/energia-solar)
- Ganchos de anúncio que se repetem: redução da conta de luz, qualificação do telhado, "entrada R$ 0" ou "orçamento instantâneo". — [AdsUploader](https://adsuploader.com/pt/blog/solar-facebook-ads-examples)
- A Bluesun defende o custo da energia em R$/kWh (LCOE) contra a tarifa da concessionária como métrica mais persuasiva que o payback. — [Canal Solar](https://canalsolar.com.br/proposta-whatsapp-valor-clientes-bluesun/)

### Inferences
- Saturados: "até 95% de economia", contador de GW/CO₂ e o ícone de sol, folha ou raio.
- Pouco explorados: a fatura da concessionária como objeto gráfico (antes/depois na mesma linguagem visual da conta real), o R$/kWh solar contra a tarifa e a "nova conta" como número-herói. O exemplo da SolarMarket (R$ 540 → R$ 96) mostra que o par antes/depois é o dado mais concreto disponível.
- Contador animado que depende de JS (Solfácil) mostra "0" em conexão lenta ou com JS desligado. É um risco real em Android intermediário.

### Gaps
- Não vi os gráficos de geração dos apps de monitoramento (SolarZ, portais de inversor) por dentro. Seria preciso conta ou screenshots.

## 5. Referências fora do nicho (fintechs para PME no celular)

### Takeaway
As fintechs de PME usam fonte de display autoral, uma condensada para números, cor de marca saturada única e superfícies neutras quentes ou claras. A Nu Empresas usa creme (#f3efe6), o que mostra que "papel quente" virou código de "premium acessível" também fora do solar.

### Cited Findings
- InfinitePay (infinitepay.io). Tokens `---brand--purple:#6e08f2`, `---brand--lime:#baff1a`, `---brand--dark:#13151e`, `---brand--light-grey:#f4f5f8`, além de laranja #fe8800 e verde WhatsApp #25d366 presentes no HTML. Fontes **GT Standard** (primária), **Cerapro** e **Cera Condensed Pro**. Raios de 12–16px. — [InfinitePay](https://www.infinitepay.io)
- Stone (stone.com.br). Design system "Odin" com tokens `stone-green` e `ton-green`. Verdes #00a868, #00da00, #22c55e e verde-escuro #003d1d. Fontes **ABC Gravity** (display e números: `--fontFamily-number-0: ABCGravity`), **Roobert** (texto) e "Ton Condensed". Raios de 1,5–2,5rem e pílula. — [Stone](https://www.stone.com.br)
- Nu Empresas (nubank.com.br/empresas). Creme #f3efe6 e #e5d8bd, roxos #3f026a, #5d0599, #af63fd, #cba5fd, lilás #ecdfff, quase preto violeta #0b0019. Fontes proprietárias **NuSans Display / NuSans Text**. — [Nu Empresas](https://www.nubank.com.br/empresas)
- Conta Azul (contaazul.com). Azuis #042193, #1d2bb9, #2687e9, ciano #00aff0, marinho #01073c, fundos #eef2fa e #f1f4f9. Fontes **Raleway** e uma display chamada **"Ping Pong"**. — [Conta Azul](https://www.contaazul.com)

### Inferences
- O padrão de confiança das fintechs é uma cor de marca dona (roxo Nu/InfinitePay, verde Stone, azul Conta Azul), mais uma fonte própria ou licenciada, mais uma fonte separada para números. Stone e InfinitePay têm fonte dedicada a número ou condensada, o que confirma que no mundo PME o número é o herói visual.
- Todas tratam o celular como produto ("Celular exibindo a área de Conta PJ"). O equivalente no solar seria mostrar a proposta ou a conversa no WhatsApp dentro do celular do integrador.

### Gaps
- Não analisei os brandbooks oficiais (não encontrei páginas públicas de marca da InfinitePay, Stone ou Conta Azul na coleta) nem os apps por dentro.

## 6. Acessibilidade e legibilidade (celular, sol, Android intermediário)

### Takeaway
O público é majoritariamente Android, e o uso ao ar livre pede bem mais contraste que o mínimo do WCAG. **Amarelo e laranja como cor de texto ou de fundo com texto branco reprovam.** O #f5b400 do Vyzon sobre o papel #faf9f5 dá **1,75:1**. Só funciona como marca-texto atrás de tinta navy (10:1) ou como superfície, nunca como texto.

### Cited Findings
- Brasil, mobile: Android com cerca de 75,45% e iOS com cerca de 24,54% (Statcounter, rótulo de agosto/2026). Em mobile+tablet+console, julho/2026: Android 77,29%. Android 16 (~24,9%) e 15 (~21,8%) lideram as versões. — [Statcounter OS mobile Brasil](https://gs.statcounter.com/os-market-share/mobile/brazil/2025); [Statcounter mobile-tablet-console](https://gs.statcounter.com/os-market-share/mobile-tablet-console/brazil); [Statcounter versões Android](https://gs.statcounter.com/android-version-market-share/mobile/brazil)
- Um estudo da NTNU sobre iluminação ambiente conclui que o 7:1 da W3C não garante legibilidade ao ar livre e sugere cerca de 18:1 sob luz forte. É uma medição acadêmica específica; não é norma. — [NTNU Open](https://ntnuopen.ntnu.no/ntnu-xmlui/handle/11250/2588645)
- Orientações práticas (fontes de divulgação): texto de pelo menos 14–16px, texto escuro sobre fundo claro é mais legível ao sol, CTAs com 5:1 ou mais. — [GrowthSuite](https://www.growthsuite.net/questions/is-color-contrast-sufficient-on-ctas-for-mobile-outdoors-use); [4gnews](https://4gnews.pt/nao-consegues-usar-o-telemovel-ao-sol-estes-truques-podem-ajudar/)
- Contrastes WCAG que calculei a partir dos hex coletados:
  - #f5b400 sobre #faf9f5 = 1,75
  - #0d1421 sobre #f5b400 = 10,02
  - #0d1421 sobre #faf9f5 = 17,5
  - #1556c0 sobre #faf9f5 = 6,38
  - branco sobre #1556c0 = 6,72
  - branco sobre #25d366 (verde WhatsApp) = 1,98
  - #0d1421 sobre #25d366 = 9,29
  - branco sobre #00b569 (Solfácil) = 2,69
  - branco sobre #ff9c00 (Portal Solar) = 2,10
  - branco sobre #ff8700 (Solar Prime) = 2,41
  - #f59a23 sobre #f7f3ea (SolarMarket) = 1,99
  - #02171c sobre #f7f3ea = 16,61

  Fórmula de luminância relativa do WCAG 2.x aplicada aos valores coletados nas fontes acima.

### Inferences
- O par navy #0d1421 sobre papel #faf9f5 (17,5:1) está perto da faixa de cerca de 18:1 sugerida para luz forte. É a base certa para o público ao sol.
- Botão com texto branco sobre laranja ou verde, como fazem Portal Solar, Solar Prime e o verde WhatsApp, reprova no AA (abaixo de 4,5:1). Um botão do WhatsApp com texto ou ícone navy sobre o verde (9,3:1), ou o botão preto com ícone verde que o Vyzon já usa, é mais legível ao sol e diferencia.
- Em Android intermediário, pesam também o tamanho das fontes web (o Portal Solar carrega seis famílias) e os contadores que dependem de JS (Solfácil). Isso aponta para poucas famílias, `font-display: swap` e números já presentes no HTML.

### Gaps
- Não encontrei dados públicos sobre o aparelho típico do dono de integradora, nem sobre o tempo de uso ao ar livre desse público específico.

---

## Síntese: códigos saturados (evitar) × códigos com espaço para diferenciação

### Códigos saturados (evitar)
1. **Marinho + laranja/âmbar como dupla de marca.** Solar Prime (#0e142f + #ff8700), Voltz (#0f2744 + #ffb81c), Portal Solar (#ff9c00 + chumbo #36454f), SolarMarket (#02171c + #f59a23/#ffb84d). O acento #f5b400 do Vyzon sobre tinta navy entra nesse grupo.
2. **"Papel creme + noite + sun + Satoshi".** Já é a identidade da SolarMarket (`--color-paper-50:#f7f3ea`, `--color-night-950:#02171c`, `--color-sun-400:#ffb84d`, Satoshi e Clash), concorrente direta no mesmo público.
3. **Verde "eco/financeiro"** (Solfácil #00b569, Ecori #a9c23f, Stone) para quem não é fintech nem distribuidora.
4. **Foto de banco em inglês**: aperto de mão, engenheiro de capacete em usina, homem com celular na frente do painel (todos na Solfácil).
5. **Contadores de impacto** (GW, CO₂, "+X mil integradores") e **"até 95% de economia"** (Solfácil, Intelbras, SolarZ).
6. **Sans genérica de tema WordPress/Divi** (Inter, Montserrat, Manrope, Roboto) e muitas famílias misturadas (Portal Solar com seis).
7. **Proposta em template 16:9 de Slidesgo/Canva enviada como PDF no WhatsApp**, criticada pela Bluesun no Canal Solar.
8. **Botões branco-sobre-laranja ou branco-sobre-verde**, com contraste de 2,0 a 2,7:1.

### Códigos com espaço para diferenciação
1. **A fatura e a "nova conta" como objeto visual e número-herói.** Ninguém além do mockup da SolarMarket (R$ 540 → R$ 96) usa o antes/depois da conta como linguagem gráfica própria.
2. **R$/kWh solar × tarifa da concessionária** como métrica visual, defendida pela Bluesun como mais persuasiva que o payback e ausente das homes analisadas.
3. **Azul de marca dono + tinta navy**, sem o sol como cor principal. Os casos B2K e Trade Solar fogem do sol com azuis; Canal Solar e Conta Azul mostram que azul transmite autoridade. O #1556c0 (6,4:1 sobre o papel) é o ativo menos parecido com a SolarMarket.
4. **Amarelo só como marca-texto ou carimbo atrás de tinta navy** (10:1), nunca como texto ou CTA. Mantém o "sol" sem cair na dupla saturada.
5. **Fonte de números dedicada** (condensada ou tabular forte), como Stone (ABC Gravity para números) e InfinitePay (Cera Condensed). Nenhum player solar analisado tem isso.
6. **Prova real em vez de banco**: o rosto, o nome e o resultado de um integrador (SolarZ), vídeo da equipe no telhado (guias de criativo) e o caos real do dia a dia (planilha "FINAL_agora_vai" da SolarMarket). Reforça o tom "de integrador para integrador".
7. **Proposta como página mobile legível ao sol**: navy sobre papel com cerca de 17,5:1, uma tela, números no HTML. Responde à crítica ao "PDF frio" e atende o uso majoritário em Android (cerca de 75–77%).
8. **Botão WhatsApp com alto contraste** (preto com ícone verde, ou navy sobre #25d366 a 9,3:1), em vez do branco-sobre-verde que reprova.
