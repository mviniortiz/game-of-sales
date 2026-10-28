#!/usr/bin/env bash
# Ignored Build Step do Vercel (vercel.json → ignoreCommand).
# exit 0 = pula o deploy; exit 1 = builda.
# Cada deploy guarda o site inteiro no Deployment Storage, nos 2 projetos.
# Commit que só mexe em edge, migration, doc, vídeo ou teste não muda o site.

ref="${VERCEL_GIT_COMMIT_REF:-}"
case "$ref" in
  backup/*|backup-pc/*) echo "branch de backup ($ref): pula"; exit 0 ;;
esac

# Último deploy com sucesso desse branch; sem ele (1º deploy, clone raso), builda.
prev="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -z "$prev" ] || ! git cat-file -e "$prev^{commit}" 2>/dev/null; then
  echo "sem deploy anterior conhecido: builda"; exit 1
fi

if git diff --quiet "$prev" HEAD -- . \
  ':!supabase' ':!docs' ':!docs-site' ':!remotion' ':!media' \
  ':!e2e' ':!infra' ':!demo' ':!src/__tests__' \
  ':!.claude' ':!.agent' ':!.github' ':!*.md'; then
  echo "nada do site mudou desde $prev: pula"; exit 0
fi
echo "site mudou: builda"; exit 1
