// O texto de cada e-mail que o Vyzon manda, montado sobre o layout único.
// Voz: português do Brasil, "você", frases curtas, o que a pessoa precisa fazer
// e nada além. Sem travessão, sem emoji, sem promessa de resultado. O produto é o
// Vyzon; a Lume só aparece quando o e-mail fala dela.

import { renderEmail, type Bloco, type EmailPronto } from "./layout.ts";

// ── Auth do Supabase ────────────────────────────────────────────────────────
// Os placeholders do Go ({{ .ConfirmationURL }}, {{ .Email }}) ficam como texto e o
// Supabase troca na hora do envio. O link vale 1 hora (mailer_otp_exp = 3600 no
// painel em 04/11/2026; mudou lá, muda aqui).

export function authConfirmarCadastro(): EmailPronto {
    return renderEmail({
        assunto: "Confirme seu e-mail no Vyzon",
        previa: "Confirme para entrar. O link vale por 1 hora.",
        titulo: "Confirme seu e-mail",
        blocos: [
            { tipo: "texto", texto: "Falta um passo para entrar no Vyzon: confirmar que {{ .Email }} é seu. O link vale por 1 hora." },
        ],
        botao: { texto: "Confirmar e-mail", url: "{{ .ConfirmationURL }}" },
        linkReserva: true,
        nota: "Não criou conta no Vyzon? Ignore este e-mail.",
        rodape: "Você recebeu este e-mail porque alguém criou uma conta no Vyzon com este endereço.",
    });
}

export function authRecuperarSenha(): EmailPronto {
    return renderEmail({
        assunto: "Redefinir sua senha do Vyzon",
        previa: "O link para criar a senha nova vale por 1 hora.",
        titulo: "Crie uma senha nova",
        blocos: [
            { tipo: "texto", texto: "Recebemos um pedido para trocar a senha da conta {{ .Email }} no Vyzon. Se foi você, use o botão abaixo. O link vale por 1 hora." },
        ],
        botao: { texto: "Criar senha nova", url: "{{ .ConfirmationURL }}" },
        linkReserva: true,
        nota: "Não pediu? Ignore este e-mail. Sua senha atual continua valendo.",
        rodape: "Você recebeu este e-mail porque alguém pediu para redefinir a senha desta conta.",
    });
}

export function authTrocarEmail(): EmailPronto {
    return renderEmail({
        assunto: "Confirme seu e-mail novo no Vyzon",
        previa: "Confirme a troca do e-mail da sua conta.",
        titulo: "Confirme o e-mail novo",
        blocos: [
            { tipo: "texto", texto: "Recebemos um pedido para trocar o e-mail da conta {{ .Email }} no Vyzon. Depois da confirmação, você entra com este endereço:" },
            { tipo: "destaque", valor: "{{ .NewEmail }}" },
        ],
        botao: { texto: "Confirmar e-mail novo", url: "{{ .ConfirmationURL }}" },
        linkReserva: true,
        nota: "Não pediu essa troca? Ignore este e-mail e troque sua senha em Configurações, Segurança.",
        rodape: "Você recebeu este e-mail porque alguém pediu para trocar o e-mail desta conta.",
    });
}

export function authConvite(): EmailPronto {
    return renderEmail({
        assunto: "Seu acesso ao Vyzon",
        previa: "Defina sua senha para entrar.",
        titulo: "Seu acesso ao Vyzon",
        blocos: [
            { tipo: "texto", texto: "Criaram um acesso ao Vyzon para {{ .Email }}. Defina sua senha pelo botão abaixo e você já entra. O link vale por 1 hora." },
        ],
        botao: { texto: "Definir senha", url: "{{ .ConfirmationURL }}" },
        linkReserva: true,
        nota: "Não esperava este convite? Ignore este e-mail.",
        rodape: "Você recebeu este e-mail porque alguém convidou este endereço para o Vyzon.",
    });
}

export function authLinkMagico(): EmailPronto {
    return renderEmail({
        assunto: "Seu link para entrar no Vyzon",
        previa: "Entre sem senha. O link vale por 1 hora.",
        titulo: "Entre no Vyzon",
        blocos: [
            { tipo: "texto", texto: "Use o botão abaixo para entrar na conta {{ .Email }} sem digitar senha. O link vale por 1 hora e só funciona uma vez." },
        ],
        botao: { texto: "Entrar no Vyzon", url: "{{ .ConfirmationURL }}" },
        linkReserva: true,
        nota: "Não pediu? Ignore este e-mail.",
        rodape: "Você recebeu este e-mail porque alguém pediu um link de acesso para esta conta.",
    });
}

export function authReautenticar(): EmailPronto {
    return renderEmail({
        assunto: "Seu código do Vyzon",
        previa: "Use o código para confirmar que é você.",
        titulo: "Confirme que é você",
        blocos: [
            { tipo: "texto", texto: "Digite este código no Vyzon para continuar:" },
            { tipo: "destaque", valor: "{{ .Token }}" },
        ],
        nota: "Não pediu? Ignore este e-mail e troque sua senha em Configurações, Segurança.",
        rodape: "Você recebeu este e-mail porque alguém pediu um código de confirmação para esta conta.",
    });
}

/** Arquivo em supabase/email-templates/ → gerador. Lido por scripts/emails/gerar.mjs. */
export const TEMPLATES_AUTH: Record<string, () => EmailPronto> = {
    "confirm-signup.html": authConfirmarCadastro,
    "reset-password.html": authRecuperarSenha,
    "change-email.html": authTrocarEmail,
    "invite.html": authConvite,
    "magic-link.html": authLinkMagico,
    "reauthentication.html": authReautenticar,
};

// ── Equipe ──────────────────────────────────────────────────────────────────

export function boasVindasVendedor(o: {
    nome: string;
    email: string;
    senha: string;
    empresa: string;
    appUrl: string;
}): EmailPronto {
    const primeiro = o.nome.trim().split(/\s+/)[0] || o.nome;
    // A edge cai em "Vyzon" quando não acha o nome da empresa.
    const empresa = o.empresa && o.empresa !== "Vyzon" ? o.empresa : null;
    return renderEmail({
        assunto: empresa ? `${empresa} adicionou você no Vyzon` : "Seu acesso ao Vyzon está pronto",
        previa: "Seu e-mail de acesso e a senha provisória estão aqui.",
        titulo: `${primeiro}, seu acesso está pronto`,
        blocos: [
            { tipo: "texto", texto: `${empresa ? `${empresa} criou` : "Criaram"} sua conta no Vyzon. Entre com os dados abaixo e troque a senha no primeiro acesso, em Configurações, Segurança.` },
            { tipo: "dados", linhas: [["E-mail", o.email], ["Senha provisória", o.senha]], mono: ["Senha provisória"] },
        ],
        botao: { texto: "Entrar no Vyzon", url: `${o.appUrl}/auth` },
        nota: "A senha é só sua. Não encaminhe este e-mail.",
        rodape: empresa
            ? `Você recebeu este e-mail porque alguém da ${empresa} criou uma conta com este endereço. Se não conhece a empresa, pode ignorar.`
            : "Você recebeu este e-mail porque alguém criou uma conta no Vyzon com este endereço.",
    });
}

// ── Pessoa escrevendo (demo marcada, resposta do suporte) ───────────────────

function paragrafos(texto: string): Bloco[] {
    return texto
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => ({ tipo: "texto" as const, texto: p }));
}

/** Confirmação para quem marcou conversa no site. O corpo vem do LLM (ou do texto
 *  reserva) da sdr-auto-outreach; o layout põe data, link e assinatura. */
export function demoMarcada(o: {
    assunto: string;
    corpo: string;
    quando?: string | null;
    linkMeet?: string | null;
    quemAssina: string;
}): EmailPronto {
    const dados: Bloco[] = o.quando
        ? [{ tipo: "dados", linhas: [["Quando", `${o.quando}, horário de Brasília`], ["Duração", "30 minutos"]] }]
        : [];
    return renderEmail({
        assunto: o.assunto,
        previa: o.quando ? `${o.quando}, horário de Brasília.` : "Sua conversa com o Vyzon está marcada.",
        titulo: "Sua conversa está marcada",
        blocos: [...paragrafos(o.corpo), ...dados],
        botao: o.linkMeet ? { texto: "Entrar no Google Meet", url: o.linkMeet } : undefined,
        linkReserva: !!o.linkMeet,
        assinatura: { nome: o.quemAssina, papel: "Vyzon" },
        rodape: "Você recebeu este e-mail porque marcou uma conversa no site do Vyzon. Se não foi você, pode ignorar.",
    });
}

/** Resposta do suporte (admin/Suporte). Sem título: é uma conversa. */
export function respostaSuporte(o: { assunto: string; texto: string }): EmailPronto {
    return renderEmail({
        assunto: o.assunto,
        previa: o.texto.replace(/\s+/g, " ").trim().slice(0, 90),
        blocos: paragrafos(o.texto),
        assinatura: { nome: "Vyzon Suporte" },
        rodape: "Esta é a resposta ao e-mail que você mandou para o suporte do Vyzon. Para continuar a conversa, é só responder.",
    });
}

// ── Avisos internos (só o Markus recebe) ────────────────────────────────────

const RODAPE_INTERNO = "Aviso interno do Vyzon. Só você recebe.";

export function avisoNovoCadastro(o: {
    empresa: string;
    nome?: string | null;
    email?: string | null;
    whatsapp?: string | null;
    origem: string;
    linkWhatsapp?: string | null;
}): EmailPronto {
    const extra: Bloco[] = o.linkWhatsapp
        ? [{ tipo: "texto", texto: "O botão abre o WhatsApp com uma mensagem pronta perguntando se a pessoa conseguiu conectar o número e ver o Raio-X." }]
        : [];
    return renderEmail({
        assunto: `Novo cadastro: ${o.empresa}`,
        previa: o.nome ? `${o.nome} acabou de criar a conta.` : "Uma conta nova acabou de ser criada.",
        titulo: `${o.empresa} criou a conta`,
        blocos: [
            { tipo: "dados", linhas: [["Nome", o.nome], ["E-mail", o.email], ["WhatsApp", o.whatsapp], ["Origem", o.origem]] },
            ...extra,
        ],
        botao: o.linkWhatsapp ? { texto: "Chamar no WhatsApp", url: o.linkWhatsapp } : undefined,
        rodape: RODAPE_INTERNO,
    });
}

/**
 * Aviso interno a partir das linhas de texto que a edge já monta (o mesmo texto
 * vai pro WhatsApp ou para o campo text). Linhas "Rótulo: valor" seguidas viram
 * uma tabela; a primeira linha que é só um endereço vira o botão, e a linha
 * "Algo:" logo antes dele sai. Linha igual ao título também sai.
 */
export function avisoInterno(o: { assunto: string; titulo: string; linhas: string[] }): EmailPronto {
    const blocos: Bloco[] = [];
    let botao: { texto: string; url: string } | undefined;
    let dados: Array<[string, string]> = [];
    const fechaDados = () => {
        if (dados.length) blocos.push({ tipo: "dados", linhas: dados });
        dados = [];
    };
    const linhas = o.linhas.map((l) => l.trim());
    linhas.forEach((linha, i) => {
        if (!linha) return fechaDados();
        if (linha === o.titulo) return;
        if (/^https?:\/\/\S+$/.test(linha)) {
            if (!botao) {
                botao = { texto: rotuloDoLink(linha), url: linha };
                return;
            }
            fechaDados();
            blocos.push({ tipo: "texto", texto: linha });
            return;
        }
        const proxima = linhas[i + 1] ?? "";
        if (/:$/.test(linha) && /^https?:\/\/\S+$/.test(proxima)) return;
        const par = linha.match(/^([A-ZÀ-Ú][\p{L} -]{0,24}):\s+(.+)$/u);
        if (par) {
            dados.push([par[1], par[2]]);
            return;
        }
        fechaDados();
        blocos.push({ tipo: "texto", texto: linha });
    });
    fechaDados();
    const previa = linhas.find((l) => l && l !== o.titulo && !/^https?:/.test(l)) ?? o.titulo;
    return renderEmail({ assunto: o.assunto, previa, titulo: o.titulo, blocos, botao, rodape: RODAPE_INTERNO });
}

function rotuloDoLink(url: string): string {
    if (/wa\.me\//.test(url)) return "Chamar no WhatsApp";
    if (/railway\.(com|app)/.test(url)) return "Abrir o Railway";
    return "Abrir";
}

/** Demo personalizada criada (create-personalized-demo, fluxo antigo de agências). */
export function avisoDemoPersonalizada(o: {
    empresa: string;
    quando: string;
    segmento?: string | null;
    oferta?: string | null;
    dor?: string | null;
    notas?: string | null;
    contato?: string | null;
    login: string;
    senha: string;
    appUrl: string;
}): EmailPronto {
    return renderEmail({
        assunto: `Demo personalizada: ${o.empresa}`,
        previa: `Marcada para ${o.quando}. O ambiente já está pronto.`,
        titulo: `Demo de ${o.empresa} pronta`,
        blocos: [
            { tipo: "texto", texto: `Marcada para ${o.quando}. O ambiente leva o nome do lead e dá para mostrar na conversa.` },
            { tipo: "dados", linhas: [["Segmento", o.segmento], ["O que vende", o.oferta], ["Principal dor", o.dor], ["Notas", o.notas], ["Contato", o.contato]] },
            { tipo: "dados", linhas: [["Login", o.login], ["Senha", o.senha]], mono: ["Login", "Senha"] },
        ],
        botao: { texto: "Abrir o ambiente", url: `${o.appUrl}/auth` },
        rodape: RODAPE_INTERNO,
    });
}
