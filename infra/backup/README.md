# Evolution API Backup → Cloudflare R2

Backup diário automatizado do Postgres da Evolution API para o Cloudflare R2.

- **Frequência:** diário às 03:00 (horário do servidor)
- **Retenção:** 7 backups diários + 4 semanais (Sunday)
- **Custo:** R$ 0 (dentro do free tier do Cloudflare R2: 10 GB storage + zero egress)

---

## 1. Criar bucket no Cloudflare R2

1. Login em https://dash.cloudflare.com
2. Menu lateral → **R2** → **Create bucket**
3. Nome sugerido: `vyzon-backups` (regiao: automatic)
4. Depois de criar, vai em **Manage R2 API Tokens** → **Create API Token**
   - Permission: **Object Read & Write**
   - Bucket: `vyzon-backups`
   - Salvar: `Access Key ID`, `Secret Access Key`, e o **Endpoint** (`https://<account-id>.r2.cloudflarestorage.com`)

---

## 2. Instalar dependências na VPS

```bash
# Postgres client (para pg_dump)
sudo apt update
sudo apt install -y postgresql-client curl

# rclone (para upload ao R2)
curl https://rclone.org/install.sh | sudo bash
```

---

## 3. Configurar rclone para R2

```bash
rclone config
```

- `n` (new remote)
- Name: `r2`
- Storage: `s3`
- provider: `Cloudflare`
- env_auth: `false`
- access_key_id: (cole o Access Key ID)
- secret_access_key: (cole o Secret Access Key)
- region: `auto`
- endpoint: (cole o endpoint do R2)
- location_constraint: (enter / deixe vazio)
- acl: (enter / deixe vazio)
- `y` (confirm)
- `q` (quit)

Testa:
```bash
rclone ls r2:vyzon-backups
```
Se não der erro, está pronto.

---

## 4. Configurar variáveis de ambiente

Cria `/etc/vyzon-backup.env` com permissão restrita:

```bash
sudo nano /etc/vyzon-backup.env
```

Cola isto, preenchendo os valores:

```bash
# Postgres Evolution
PG_HOST=localhost
PG_PORT=5432
PG_DB=evolution
PG_USER=evolution
PG_PASSWORD=<sua-senha-do-postgres>

# Cloudflare R2
R2_REMOTE=r2
R2_BUCKET=vyzon-backups

# Webhook opcional para alertas (Discord/Slack/WhatsApp)
# Deixa vazio se não quiser notificações de falha
WEBHOOK_URL=
```

Protege o arquivo:
```bash
sudo chmod 600 /etc/vyzon-backup.env
sudo chown root:root /etc/vyzon-backup.env
```

---

## 5. Instalar o script

```bash
# Copia o script
sudo cp evolution-backup.sh /usr/local/bin/vyzon-backup
sudo chmod +x /usr/local/bin/vyzon-backup
```

---

## 6. Teste manual

```bash
sudo /usr/local/bin/vyzon-backup
```

Saída esperada:
```
[2026-04-14T03:00:00] Dumping evolution from localhost...
[2026-04-14T03:00:05] Dump complete: evolution-2026-04-14_030000.dump (45M)
[2026-04-14T03:00:10] Uploading to R2 daily/...
[2026-04-14T03:00:12] Rotating old backups...
[2026-04-14T03:00:13] Backup completed successfully: evolution-2026-04-14_030000.dump (45M)
```

Confere no dash do R2 que o arquivo apareceu em `vyzon-backups/daily/`.

---

## 7. Agendar via cron

```bash
sudo crontab -e
```

Adiciona a linha:
```cron
0 3 * * * /usr/local/bin/vyzon-backup >> /var/log/vyzon-backup.log 2>&1
```

Cria o arquivo de log:
```bash
sudo touch /var/log/vyzon-backup.log
sudo chmod 644 /var/log/vyzon-backup.log
```

Pronto. Todo dia às 3h da manhã o backup roda.

---

## 8. (Opcional) Notificação de falha

Se quiser ser avisado quando o backup falhar, cria um webhook:

- **Discord:** Server Settings → Integrations → Webhooks → New → copia a URL
- **Slack:** [Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- **WhatsApp (Evolution):** pode apontar pra uma rota no próprio Vyzon que dispara mensagem

Cola essa URL em `WEBHOOK_URL` no `/etc/vyzon-backup.env`.

---

## Restaurar um backup

Em caso de desastre, para restaurar um dump:

```bash
# 1. Baixa o backup do R2
rclone copyto r2:vyzon-backups/daily/evolution-2026-04-14_030000.dump /tmp/restore.dump

# 2. (Opcional) Dropa e recria o DB
# sudo -u postgres dropdb evolution
# sudo -u postgres createdb evolution -O evolution

# 3. Restaura
PGPASSWORD=<senha> pg_restore \
  --host=localhost --port=5432 \
  --username=evolution --dbname=evolution \
  --clean --if-exists --no-owner \
  /tmp/restore.dump
```

---

## Monitoramento

Vê o log das últimas execuções:
```bash
tail -50 /var/log/vyzon-backup.log
```

Lista backups no R2:
```bash
rclone ls r2:vyzon-backups/daily/
rclone ls r2:vyzon-backups/weekly/
```
