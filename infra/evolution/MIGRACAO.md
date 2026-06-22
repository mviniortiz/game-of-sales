# Migração da Evolution pra Hetzner (passo a passo)

Objetivo: tirar a Evolution da VM grátis (que trava = "zumbi") e botar numa VPS com
RAM/CPU de verdade. Some a zumbi, o envio fica rápido, a mídia e o "digitando" param
de falhar.

> **Divisão:** os passos **1-6 são você** (na VPS). O **7 sou eu** (atualizo os
> secrets do Supabase). O **8 é você** de novo (escanear o QR). O **9 sou eu**
> (validar). Me avise quando terminar o passo 6.

---

## 1. Criar a VPS (Hetzner Cloud)
- Crie um servidor: **CX32** (4 vCPU / 8 GB) — ou **CX22** (4 GB) se quiser economizar.
- Imagem: **Ubuntu 24.04**.
- Adicione sua **chave SSH** (a `ssh-key-2026-06-10` serve).
- **Firewall (importante):**
  - **22 (SSH)** → só o **seu IP**.
  - **8080 (Evolution)** → aberto (a internet precisa alcançar pra o Supabase chamar).
  - Anote o **IP público** da VPS.

## 2. Instalar Docker
```bash
ssh root@SEU_IP
curl -fsSL https://get.docker.com | sh
```

## 3. Subir os arquivos
Copie `docker-compose.yml` e `.env.example` (desta pasta `infra/evolution/`) pra VPS,
em `/opt/evolution/`. Depois:
```bash
cd /opt/evolution
cp .env.example .env
nano .env   # edite os 3 valores marcados (ver passo 4)
```

## 4. Editar o `.env`
Troque **três** coisas (e só):
- `AUTHENTICATION_API_KEY` → gere com `openssl rand -hex 32`. **Guarde, vou precisar.**
- `SERVER_URL` → `http://SEU_IP_PUBLICO:8080`
- A **senha do Postgres** → a MESMA em `POSTGRES_PASSWORD` **e** dentro de
  `DATABASE_CONNECTION_URI` (os dois lugares com `TROQUE_POR_UMA_SENHA_FORTE`).

## 5. Subir
```bash
docker compose up -d
docker compose logs -f evolution-api   # espere "running on port 8080"
```

## 6. Testar que respondeu
No seu navegador ou terminal:
```bash
curl http://SEU_IP_PUBLICO:8080
```
Deve voltar um JSON da Evolution. **Me manda: o IP público + a AUTHENTICATION_API_KEY.**

---

## 7. (EU) Atualizo o Supabase
Eu rodo, com o CLI:
```bash
supabase secrets set EVOLUTION_API_URL="http://SEU_IP:8080" EVOLUTION_API_KEY="SUA_CHAVE"
```
E redeployo as edges que leem isso. (Você não faz nada aqui.)

## 8. (VOCÊ) Reconectar o WhatsApp
No app Vyzon → Inbox → **Conectar** → escaneie o **QR**. O app cria a instância na
Evolution nova já com o webhook certo (incl. o "digitando"). A sessão recomeça limpa;
o histórico que já estava no nosso banco continua salvo.

## 9. (EU) Validar
Eu confirmo: envio, recebimento, mídia (imagem) e o "digitando" funcionando, e checo
que a zumbi não aparece mais.

---

## Opcional (recomendado depois): HTTPS + domínio
HTTP com IP funciona, mas a API key trafega em texto. Quando quiser endurecer, a gente
põe um **Caddy** na frente (faz HTTPS automático) e aponta um subdomínio (ex:
`wa.seudominio.com`). Aí o `SERVER_URL` e o `EVOLUTION_API_URL` viram `https://...`.
Me avisa que eu te passo o `Caddyfile` pronto.
