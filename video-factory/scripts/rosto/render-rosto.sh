#!/bin/bash
# Reel com rosto, do bruto ao final: proxy e áudio (se faltarem) → corte →
# check → vídeo 4K/60 → Lanczos 1080 → mix/master → revisão → folha → screening.
# Antes: films/<slug>/rosto.json e palavras.json (ver README, "Reel com rosto").
# Uso: bash scripts/rosto/render-rosto.sh <slug> [--rascunho] [--refaz-proxy]
# Render com 1 worker: com <video> na composição, os workers paralelos do
# HyperFrames no Brave deixavam os 80 px de baixo sem o vídeo (24/10/2026).
set -euo pipefail
VF="$(cd "$(dirname "$0")/../.." && pwd)"; source "$VF/env.sh"
SLUG="$1"; shift || true
RASCUNHO=""; REFAZ=""
for a in "$@"; do [ "$a" = "--rascunho" ] && RASCUNHO=1; [ "$a" = "--refaz-proxy" ] && REFAZ=1; done
F="$VF/films/$SLUG"; OUT="$F/renders"; mkdir -p "$OUT"
for m in base.css base.js; do cp "$VF/molde-vyzon-solar/$m" "$F/"; done
for m in rosto.css rosto.js; do cp "$VF/molde-rosto/$m" "$F/"; done
[ -f "$F/index.html" ] || cp "$VF/molde-rosto/index.html" "$F/index.html"
if [ -n "$REFAZ" ] || [ ! -f "$F/midia/bruto.mp4" ] || [ ! -f "$OUT/$SLUG-bruto.wav" ]; then node "$VF/scripts/rosto/prepara.mjs" "$F/rosto.json"; fi
node "$VF/scripts/rosto/corta.mjs" "$F/rosto.json"
(cd "$F" && hyperframes lint . || true)
if [ -n "$RASCUNHO" ]; then
  (cd "$F" && hyperframes render . --workers 1 --quality draft --fps 30 --output "$OUT/$SLUG-video.mp4")
else
  (cd "$F" && hyperframes render . --workers 1 --resolution portrait-4k --fps 60 --quality high --crf 15 --output "$OUT/$SLUG-4k.mp4")
  ffmpeg -v error -y -i "$OUT/$SLUG-4k.mp4" -vf "scale=1080:1920:flags=lanczos" -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -movflags +faststart -an "$OUT/$SLUG-video.mp4"
fi
node "$VF/scripts/rosto/mixa-rosto.mjs" "$F/rosto.json" "$OUT/$SLUG-video.mp4" "$F/$SLUG-final.mp4" --wav "$OUT/$SLUG-master.wav"
DUR=$(node -e "console.log(require('$F/cortes.json').duracao)")
REV="$(mktemp -d)/$SLUG-rev"; cp -R "$F" "$REV"; rm -rf "$REV/renders" "$REV"/*.mp4
sed -i '' 's|<html lang="pt-BR">|<html lang="pt-BR" class="rev">|' "$REV/index.html"
(cd "$REV" && hyperframes render . --workers 1 --quality draft --fps 30 --output "$OUT/$SLUG-rev-video.mp4")
ffmpeg -v error -y -i "$OUT/$SLUG-rev-video.mp4" -i "$OUT/$SLUG-master.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -t "$DUR" "$F/$SLUG-rev.mp4"
node "$VF/scripts/folha.mjs" "$F/$SLUG-final.mp4" "$OUT/$SLUG-folha.jpg"
node "$VF/scripts/screening.mjs" "$F/$SLUG-final.mp4" "$F/rosto.json" | tee "$OUT/$SLUG-screening.txt"
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate:format=duration -of compact "$F/$SLUG-final.mp4"
