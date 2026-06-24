# scripts/

Scripts utilitários do projeto (Node ESM `.mjs`, exceto onde indicado). As
**saídas** desses scripts (vídeos, frames, áudio, renders) ficam soltas aqui mas
são **ignoradas pelo git** (`scripts/*.mp4|webm|png|jpg|wav|mp3|bin` e `_*` em
`.gitignore`) por serem pesadas e regeneráveis. Só o **código** é versionado.

## Build & SEO
| Script | O que faz |
|---|---|
| `prerender-seo.mjs` | Pós `vite build`: gera `dist/<rota>/index.html` por rota SEO (changelog, legais, blog) com head + `<noscript>` + JSON-LD próprios. Roda no `npm run build`. |
| `gen-blog-covers.mjs` | Gera as capas do blog (`public/blog-covers/<slug>.webp` + OG `.jpg`) a partir de PNGs numeradas. Uso: `--src "<pasta>"`. |
| `optimize-logos.mjs` | Otimiza/comprime logos. |
| `build-brand-assets.mjs` | Gera assets de marca. |

## Google Ads (automação da conta)
| Script | O que faz |
|---|---|
| `ads/client.mjs` | Cliente base da API do Google Ads (auth/REST). |
| `ads/keywords.mjs` · `ads/negatives.mjs` · `ads/sitelinks.mjs` · `ads/persona-sitelink.mjs` | Gestão de keywords, negativas e sitelinks. |
| `ads-add-extensions.mjs` · `ads-bid-raise.mjs` · `ads-search-guerrilla.mjs` · `ads-search-refinements.mjs` | Ajustes de extensões, lances e refinamentos de Search. |
| `swap-pmax-images.mjs` · `swap-pmax-images-fix.mjs` · `swap-pmax-videos.mjs` | Troca de criativos (imagem/vídeo) em campanhas PMax. |

## Vídeo & áudio (marketing — Remotion + ffmpeg)
| Script | O que faz |
|---|---|
| `build-film.mjs` · `studio.js` | Monta os filmes da marca (composição/concat de cenas). |
| `render-google-ads-hero.mjs` · `render-ig-carousel.mjs` | Renderiza criativos (hero do Ads, carrossel do IG). |
| `press-shot.mjs` · `press-clip.mjs` | Captura screenshots/clipes da UI (Playwright/Chromium). |
| `generate-voiceover.mjs` · `gen-vo-cine.mjs` · `gen-vo-film.mjs` · `gen-vo-gemini.mjs` · `gen-voice-menu.mjs` · `regen-voice-render.mjs` | Geração de locução (ElevenLabs/Gemini) e re-render com VO. |
| `generate-avatar.mjs` · `generate-avatar-host.mjs` · `poll-avatar-host.mjs` · `generate-founder-photo.mjs` | Geração de avatares/fotos (HeyGen e afins). |

Os templates HTML das cenas/clipes (`beat.html`, `clip-*.html`) também vivem aqui
e são a fonte renderizada pela pipeline.

## Auditoria & testes
| Script | O que faz |
|---|---|
| `mobile-audit.mjs` · `mobile-audit-v2.mjs` | Auditoria mobile via Playwright (screenshots + overflow). Saída em `scripts/mobile-audit-out/` (ignorada). |
| `test-live-validate.mjs` | Validação de ambiente ao vivo. |

## SQL
Os `*.sql` são queries/migrations avulsas de apoio (aplicar via
`npx supabase db query --linked -f <arquivo>`, nunca `db push`).
