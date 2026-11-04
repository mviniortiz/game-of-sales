// Layout único dos e-mails do Vyzon (04/11/2026).
//
// Um papel creme, a marca em texto, um cartão branco com a mensagem, um botão azul
// e o rodapé. Sem imagem, para a marca não sumir no modo escuro do Gmail (ele
// inverte o fundo e não inverte imagem). Cores dos tokens --vyz-* do app
// (src/index.css e src/components/layout/tela.css); a fonte é a do sistema,
// porque Gmail e Outlook não carregam Geist.
//
// Sem import nenhum: as edges (Deno) usam direto e o script
// scripts/emails/gerar.mjs (Node) gera com ele os templates de auth do Supabase e
// as prévias. Placeholders do Go ({{ .ConfirmationURL }}) passam intactos porque
// não têm caractere que o escape troque.

export type Bloco =
    /** Parágrafo de texto. */
    | { tipo: "texto"; texto: string }
    /** Um valor marcado em amarelo, o único da mensagem (código, e-mail novo). */
    | { tipo: "destaque"; rotulo?: string; valor: string }
    /** Linhas rótulo e valor, uma por linha (acesso, dados de um lead). */
    | { tipo: "dados"; linhas: Array<[string, string | null | undefined]>; mono?: string[] };

export interface Email {
    assunto: string;
    /** Texto que o cliente de e-mail mostra ao lado do assunto. */
    previa: string;
    titulo: string;
    blocos: Bloco[];
    botao?: { texto: string; url: string };
    /** Mostra o endereço do botão por extenso, para quando o botão não abre. */
    linkReserva?: boolean;
    /** Frase menor depois do botão (o "se não foi você"). */
    nota?: string;
    /** Quem assina, quando uma pessoa escreve (Markus, suporte). */
    assinatura?: { nome: string; papel?: string };
    /** Por que a pessoa recebeu. Vai no rodapé, fora do cartão. */
    rodape: string;
}

export interface EmailPronto {
    assunto: string;
    html: string;
    text: string;
}

const COR = {
    papel: "#F3EFE4",
    cartao: "#FFFFFF",
    noite: "#0F1730",
    texto: "#3B4560",
    suave: "#566079",
    linha: "#EAE5D7",
    azul: "#1556C0",
    sol: "#FFC933",
};

const FONTE = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

export function esc(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function paragrafo(texto: string): string {
    return `<p class="vz-texto" style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:${COR.texto};">${esc(texto)}</p>`;
}

function destaque(rotulo: string | undefined, valor: string): string {
    const r = rotulo
        ? `<p class="vz-suave" style="margin:0 0 6px 0;font-size:14px;line-height:1.4;color:${COR.suave};">${esc(rotulo)}</p>`
        : "";
    return `${r}<p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;"><span style="display:inline-block;padding:2px 8px;border-radius:8px;background-color:${COR.sol};color:${COR.noite};font-weight:600;word-break:break-all;">${esc(valor)}</span></p>`;
}

function dados(linhas: Array<[string, string | null | undefined]>, mono: string[] = []): string {
    const validas = linhas.filter(([, v]) => v != null && String(v).trim() !== "");
    if (!validas.length) return "";
    const rows = validas.map(([rotulo, valor], i) => {
        const borda = i === 0 ? "" : `border-top:1px solid ${COR.linha};`;
        const fonte = mono.includes(rotulo) ? `font-family:${MONO};font-size:15px;` : "font-size:15px;";
        return `<tr>
<td class="vz-suave vz-linha" valign="top" style="${borda}padding:10px 16px 10px 0;width:120px;font-size:14px;line-height:1.5;color:${COR.suave};">${esc(rotulo)}</td>
<td class="vz-forte vz-linha" valign="top" style="${borda}padding:10px 0;${fonte}line-height:1.5;color:${COR.noite};font-weight:600;word-break:break-word;">${esc(String(valor))}</td>
</tr>`;
    }).join("\n");
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px 0;">
${rows}
</table>`;
}

function botao(texto: string, url: string): string {
    const u = esc(url);
    const t = esc(texto);
    // VML para o Outlook do Windows desenhar a pílula; os outros leem o <a>.
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0 0;">
<tr><td>
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${u}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="50%" stroke="f" fillcolor="${COR.azul}">
<w:anchorlock/>
<center style="color:#FFFFFF;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${t}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="${u}" class="vz-botao" target="_blank" style="display:inline-block;padding:14px 24px;border-radius:999px;background-color:${COR.azul};color:#FFFFFF;font-family:${FONTE};font-size:15px;font-weight:600;line-height:20px;text-decoration:none;">${t}</a>
<!--<![endif]-->
</td></tr>
</table>`;
}

function linkReserva(url: string): string {
    const u = esc(url);
    return `<p class="vz-suave" style="margin:20px 0 0 0;font-size:13px;line-height:1.5;color:${COR.suave};">Se o botão não abrir, copie este endereço no navegador:<br><a href="${u}" class="vz-link" style="color:${COR.azul};text-decoration:underline;word-break:break-all;">${u}</a></p>`;
}

function blocoHtml(b: Bloco): string {
    if (b.tipo === "texto") return paragrafo(b.texto);
    if (b.tipo === "destaque") return destaque(b.rotulo, b.valor);
    return dados(b.linhas, b.mono);
}

function blocoTexto(b: Bloco): string {
    if (b.tipo === "texto") return b.texto;
    if (b.tipo === "destaque") return b.rotulo ? `${b.rotulo}\n${b.valor}` : b.valor;
    return b.linhas
        .filter(([, v]) => v != null && String(v).trim() !== "")
        .map(([r, v]) => `${r}: ${v}`)
        .join("\n");
}

export function renderEmail(e: Email): EmailPronto {
    const corpo = e.blocos.map(blocoHtml).join("\n");
    const acao = e.botao ? botao(e.botao.texto, e.botao.url) : "";
    const reserva = e.botao && e.linkReserva ? linkReserva(e.botao.url) : "";
    const nota = e.nota
        ? `<p class="vz-suave" style="margin:24px 0 0 0;font-size:14px;line-height:1.5;color:${COR.suave};">${esc(e.nota)}</p>`
        : "";
    const assinatura = e.assinatura
        ? `<p class="vz-forte" style="margin:28px 0 0 0;font-size:15px;line-height:1.4;font-weight:600;color:${COR.noite};">${esc(e.assinatura.nome)}</p>${
            e.assinatura.papel
                ? `<p class="vz-suave" style="margin:2px 0 0 0;font-size:14px;line-height:1.4;color:${COR.suave};">${esc(e.assinatura.papel)}</p>`
                : ""
        }`
        : "";
    // Espaço invisível depois da prévia, para o cliente não puxar o corpo junto.
    const enchimento = "&#847;&zwnj;&nbsp;".repeat(40);

    const html = `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(e.assunto)}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style>
:root { color-scheme: light dark; supported-color-schemes: light dark; }
body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
a.vz-botao:hover { background-color:#124AA6 !important; }
@media (max-width:620px) {
  .vz-moldura { padding-left:12px !important; padding-right:12px !important; }
  .vz-cartao { padding:28px 22px !important; }
  .vz-marca, .vz-rodape { padding-left:10px !important; padding-right:10px !important; }
  .vz-titulo { font-size:22px !important; }
}
@media (prefers-color-scheme: dark) {
  .vz-papel { background-color:#0D1421 !important; }
  .vz-cartao { background-color:#162036 !important; }
  .vz-titulo, .vz-forte, .vz-marca-texto { color:#FFFFFF !important; }
  .vz-texto { color:#D3DAE6 !important; }
  .vz-suave { color:#A0AEC0 !important; }
  .vz-linha { border-color:#24305A !important; }
  .vz-link { color:#7FA9F0 !important; }
  .vz-botao { background-color:#2563EB !important; }
}
[data-ogsc] .vz-titulo, [data-ogsc] .vz-forte, [data-ogsc] .vz-marca-texto { color:#FFFFFF !important; }
[data-ogsc] .vz-texto { color:#D3DAE6 !important; }
[data-ogsc] .vz-suave { color:#A0AEC0 !important; }
[data-ogsb] .vz-papel { background-color:#0D1421 !important; }
[data-ogsb] .vz-cartao { background-color:#162036 !important; }
</style>
</head>
<body class="vz-papel" style="margin:0;padding:0;background-color:${COR.papel};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${COR.papel};opacity:0;">${esc(e.previa)}${enchimento}</div>
<table role="presentation" class="vz-papel" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COR.papel};">
<tr><td align="center" class="vz-moldura" style="padding:32px 16px 40px 16px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;font-family:${FONTE};">
<tr><td class="vz-marca" style="padding:0 8px 20px 8px;">
<span class="vz-marca-texto" style="font-family:${FONTE};font-size:22px;line-height:1;font-weight:700;letter-spacing:-0.04em;color:${COR.noite};">vyzon</span>
</td></tr>
<tr><td class="vz-cartao" style="padding:40px;background-color:${COR.cartao};border-radius:18px;">
<h1 class="vz-titulo" style="margin:0 0 16px 0;font-family:${FONTE};font-size:24px;line-height:1.25;font-weight:600;letter-spacing:-0.02em;color:${COR.noite};">${esc(e.titulo)}</h1>
${corpo}
${acao}
${reserva}
${nota}
${assinatura}
</td></tr>
<tr><td class="vz-rodape" style="padding:20px 8px 0 8px;">
<p class="vz-suave" style="margin:0 0 6px 0;font-family:${FONTE};font-size:13px;line-height:1.5;color:${COR.suave};">${esc(e.rodape)}</p>
<p style="margin:0;font-family:${FONTE};font-size:13px;line-height:1.5;"><a href="https://vyzon.com.br" class="vz-suave" style="color:${COR.suave};text-decoration:underline;">vyzon.com.br</a></p>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;

    const partes: string[] = [e.titulo, ""];
    for (const b of e.blocos) {
        const t = blocoTexto(b);
        if (t) partes.push(t, "");
    }
    if (e.botao) partes.push(`${e.botao.texto}: ${e.botao.url}`, "");
    if (e.nota) partes.push(e.nota, "");
    if (e.assinatura) {
        partes.push(e.assinatura.nome);
        if (e.assinatura.papel) partes.push(e.assinatura.papel);
        partes.push("");
    }
    partes.push("--", e.rodape, "vyzon.com.br");

    return { assunto: e.assunto, html, text: partes.join("\n") };
}
