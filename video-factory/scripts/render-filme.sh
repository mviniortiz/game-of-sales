#!/bin/bash
# Render completo de um filme: legenda → check → vídeo 4K/60 → Lanczos 1080 →
# mix/master → versão de revisão com tempo queimado → folha de quadros → screening.
# Uso: bash scripts/render-filme.sh <slug> [--rascunho]
set -euo pipefail
VF="$(cd "$(dirname "$0")/.." && pwd)"; source "$VF/env.sh"
SLUG="$1"; MODO="${2:-}"
F="$VF/films/$SLUG"; OUT="$F/renders"; mkdir -p "$OUT"
DUR=$(node -e "console.log(require('$F/roteiro.json').duracao)")
node "$VF/scripts/gera-legendas.mjs" "$F/roteiro.json"
(cd "$F" && hyperframes lint . || true)
if [ "$MODO" = "--rascunho" ]; then
  (cd "$F" && hyperframes render . --quality draft --fps 30 --output "$OUT/$SLUG-video.mp4")
else
  (cd "$F" && hyperframes render . --resolution portrait-4k --fps 60 --quality high --crf 15 --output "$OUT/$SLUG-4k.mp4")
  ffmpeg -v error -y -i "$OUT/$SLUG-4k.mp4" -vf "scale=1080:1920:flags=lanczos" -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -movflags +faststart -an "$OUT/$SLUG-video.mp4"
fi
node "$VF/scripts/mixa-frases.mjs" "$F/roteiro.json" "$OUT/$SLUG-video.mp4" "$F/$SLUG-final.mp4" --wav "$OUT/$SLUG-master.wav"
# revisão: mesma composição com o tempo queimado (<html class="rev">), em rascunho
REV="$(mktemp -d)/$SLUG-rev"; cp -R "$F" "$REV"; rm -rf "$REV/renders" "$REV"/*.mp4
sed -i '' 's|<html lang="pt-BR">|<html lang="pt-BR" class="rev">|' "$REV/index.html"
(cd "$REV" && hyperframes render . --quality draft --fps 30 --output "$OUT/$SLUG-rev-video.mp4")
ffmpeg -v error -y -i "$OUT/$SLUG-rev-video.mp4" -i "$OUT/$SLUG-master.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -t "$DUR" "$F/$SLUG-rev.mp4"
node "$VF/scripts/folha.mjs" "$F/$SLUG-final.mp4" "$OUT/$SLUG-folha.jpg"
node "$VF/scripts/screening.mjs" "$F/$SLUG-final.mp4" "$F/roteiro.json" | tee "$OUT/$SLUG-screening.txt"
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate:format=duration -of compact "$F/$SLUG-final.mp4"
