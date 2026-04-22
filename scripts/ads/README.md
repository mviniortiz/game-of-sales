# Google Ads CLI — scripts/ads

Coleção versionada dos one-offs contra a API do Google Ads v21.
Compartilha auth + `callAds()` em `client.mjs`; cada script é um comando standalone.

## Autenticação

O `client.mjs` resolve o OAuth token nessa ordem:

1. `GOOGLE_ADS_TOKEN` (literal, via env)
2. `GOOGLE_ADS_TOKEN_FILE` (caminho do arquivo)
3. `%TEMP%/ga_token.txt` (Windows)
4. `C:/Users/vinao/AppData/Local/Temp/ga_token.txt` (legado)
5. `/tmp/ga_token.txt` (Unix legado)

Constantes (`CUSTOMER_ID`, `LOGIN_CUSTOMER_ID`, `DEV_TOKEN`, `SEARCH_CAMPAIGN_ID`)
também aceitam override via env (`GOOGLE_ADS_CUSTOMER_ID`, etc.) mas
default é a conta Vyzon.

## Comandos

| npm script | Arquivo | O que faz |
|---|---|---|
| `ads:sitelinks` | `sitelinks.mjs` | Remove sitelinks quebrados e cria os 8 corretos. |
| `ads:negatives` | `negatives.mjs` | Aplica lista de negatives (EXACT + PHRASE). |
| `ads:keywords:fix-match` | `keywords.mjs` | Re-cria keywords como PHRASE. Requer `/tmp/kws.json` ou `$KWS_FILE`. |
| `ads:persona-sitelink` | `persona-sitelink.mjs` | Troca sitelink "Para Infoprodutores" pra rota dedicada. |

## Drift note (memory: reference_google_ads_api.md)

O MCP google-ads está quebrado. Esses scripts são o caminho direto via REST v21 +
refresh token. Se precisar regenerar token, usa o fluxo documentado nas refs.
