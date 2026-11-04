// Gera os templates de auth do Supabase e as prévias dos e-mails a partir do
// layout único em supabase/functions/_shared/email/.
//
//   node scripts/emails/gerar.mjs
//
// Escreve:
//   supabase/email-templates/*.html   (o que vai no painel do Supabase)
//   docs/emails/previa/*.html          (cada e-mail com dados de exemplo)
//   docs/emails/previa/index.html      (galeria: desktop, 375px e texto puro)
//
// Node 24 lê .ts direto (remove os tipos), por isso o import do módulo das edges.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as m from "../../supabase/functions/_shared/email/mensagens.ts";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const pastaAuth = join(raiz, "supabase", "email-templates");
const pastaPrevia = join(raiz, "docs", "emails", "previa");
mkdirSync(pastaPrevia, { recursive: true });

// Templates de auth: o arquivo é o que vai no painel, com os placeholders do Go.
const auth = Object.entries(m.TEMPLATES_AUTH ?? {});
for (const [arquivo, gerar] of auth) {
    writeFileSync(join(pastaAuth, arquivo), gerar().html);
}

// Prévias: o mesmo e-mail com dados de exemplo no lugar dos placeholders.
const exemplo = (s) => s
    .replaceAll("{{ .ConfirmationURL }}", "https://vyzon.com.br/auth/v1/verify?token=exemplo&amp;type=recovery")
    .replaceAll("{{ .Email }}", "carla@solarsul.com.br")
    .replaceAll("{{ .NewEmail }}", "carla.souza@solarsul.com.br")
    .replaceAll("{{ .Token }}", "482913")
    .replaceAll("{{ .SiteURL }}", "https://vyzon.com.br");

const previas = [
    { id: "auth-recuperar-senha", nome: "Recuperar senha", gatilho: "Supabase Auth, quando a pessoa pede em /recuperar-senha", altura: 760, email: m.authRecuperarSenha() },
    { id: "boas-vindas-vendedor", nome: "Boas-vindas de vendedor", gatilho: "Edge admin-create-seller, quando o dono cria um vendedor em Equipe", altura: 820, email: m.boasVindasVendedor({ nome: "Rafael Lima", email: "rafael@solarsul.com.br", senha: "Vz-7fK2q9", empresa: "Solar Sul Energia", appUrl: "https://vyzon.com.br" }) },
    { id: "aviso-novo-cadastro", nome: "Aviso interno: novo cadastro", gatilho: "Edge notify-signup, quando uma empresa cria a conta (só o Markus recebe)", altura: 720, email: m.avisoNovoCadastro({ empresa: "Solar Sul Energia", nome: "Carla Souza", email: "carla@solarsul.com.br", whatsapp: "5548999990000", origem: "google / raio-x", linkWhatsapp: "https://wa.me/5548999990000?text=Oi" }) },
];
const itens = [];
for (const p of previas) {
    const html = exemplo(p.email.html);
    const text = exemplo(p.email.text).replaceAll("&amp;", "&");
    writeFileSync(join(pastaPrevia, `${p.id}.html`), html);
    itens.push({ ...p, text, assunto: exemplo(p.email.assunto) });
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const galeria = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>E-mails do Vyzon: prévia</title>
<style>
  body { margin:0; padding:40px 32px 80px; background:#E9E4D6; color:#0F1730; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
  h1 { margin:0 0 4px; font-size:26px; font-weight:600; letter-spacing:-0.02em; }
  .sub { margin:0 0 40px; color:#566079; font-size:15px; }
  section { margin:0 0 56px; }
  h2 { margin:0; font-size:18px; font-weight:600; }
  .meta { margin:4px 0 16px; color:#566079; font-size:14px; }
  .linha { display:flex; gap:24px; align-items:flex-start; flex-wrap:wrap; }
  .col p { margin:0 0 8px; font-size:13px; color:#566079; }
  iframe { border:0; border-radius:12px; background:#F3EFE4; box-shadow:0 0 0 1px rgba(15,23,48,0.08); }
  pre { margin:0; width:340px; max-height:640px; overflow:auto; padding:16px; border-radius:12px; background:#fff; font-size:12.5px; line-height:1.5; white-space:pre-wrap; word-break:break-word; box-shadow:0 0 0 1px rgba(15,23,48,0.08); }
</style>
</head>
<body>
<h1>E-mails do Vyzon</h1>
<p class="sub">Layout único. Cada e-mail em 640px, em 375px e na versão de texto puro.</p>
${itens.map((i) => `<section>
<h2>${esc(i.nome)}</h2>
<p class="meta">Assunto: ${esc(i.assunto)}<br>${esc(i.gatilho)}</p>
<div class="linha">
<div class="col"><p>Desktop</p><iframe src="${i.id}.html" width="640" height="${i.altura}" title="${esc(i.nome)} desktop"></iframe></div>
<div class="col"><p>375px</p><iframe src="${i.id}.html" width="375" height="${i.altura + 120}" title="${esc(i.nome)} celular"></iframe></div>
<div class="col"><p>Texto puro</p><pre>${esc(i.text)}</pre></div>
</div>
</section>`).join("\n")}
</body>
</html>`;
writeFileSync(join(pastaPrevia, "index.html"), galeria);
console.log(`${auth.length} templates de auth, ${itens.length} prévias em docs/emails/previa/`);
