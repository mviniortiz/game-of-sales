#!/usr/bin/env bash
# Liga a assinatura do Vyzon no Stripe, sem mostrar nenhum segredo:
#   1. lê STRIPE_SECRET_KEY do .env.local (fora do git);
#   2. cadastra no Stripe o webhook da edge assinatura-webhook com os 4 eventos;
#   3. grava STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET nos secrets das edges.
# Pode rodar de novo: o segredo do webhook só aparece na criação, então um
# webhook já cadastrado para a mesma URL é apagado e criado outra vez.
set -euo pipefail
cd "$(dirname "$0")/.."

REF=omsdkjzkphflpwnbaeye
URL="https://$REF.supabase.co/functions/v1/assinatura-webhook"

KEY=$(grep -E '^STRIPE_SECRET_KEY=' .env.local | head -1 | cut -d= -f2- | tr -d "\"' \r")
[ -n "$KEY" ] || { echo "STRIPE_SECRET_KEY vazia no .env.local"; exit 1; }
case "$KEY" in sk_live_*|rk_live_*) MODO=produção ;; *) MODO=teste ;; esac

EXISTE=$(curl -s "https://api.stripe.com/v1/webhook_endpoints?limit=100" -u "$KEY:" |
  python3 -c "import json,sys; d=json.load(sys.stdin); print(d['error']['message'] if 'error' in d else next((w['id'] for w in d['data'] if w['url']==sys.argv[1]), ''))" "$URL")
case "$EXISTE" in
  we_*) curl -s -X DELETE "https://api.stripe.com/v1/webhook_endpoints/$EXISTE" -u "$KEY:" >/dev/null ;;
  "") ;;
  *) echo "Stripe recusou a chave: $EXISTE"; exit 1 ;;
esac

WHSEC=$(curl -s https://api.stripe.com/v1/webhook_endpoints -u "$KEY:" \
  -d url="$URL" \
  -d description="Assinatura do Vyzon" \
  -d "enabled_events[]=checkout.session.completed" \
  -d "enabled_events[]=customer.subscription.created" \
  -d "enabled_events[]=customer.subscription.updated" \
  -d "enabled_events[]=customer.subscription.deleted" |
  python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('secret',''))")
[ -n "$WHSEC" ] || { echo "Não deu para criar o webhook no Stripe"; exit 1; }

npx supabase secrets set STRIPE_SECRET_KEY="$KEY" STRIPE_WEBHOOK_SECRET="$WHSEC" --project-ref "$REF" --yes >/dev/null 2>&1
echo "Pronto: Stripe em modo $MODO, webhook cadastrado e secrets gravados."
