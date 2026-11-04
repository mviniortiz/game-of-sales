// O texto de cada e-mail que o Vyzon manda, montado sobre o layout único.
// Voz: português do Brasil, "você", frases curtas, o que a pessoa precisa fazer
// e nada além. Sem travessão, sem emoji, sem promessa de resultado.

import { renderEmail, type EmailPronto } from "./layout.ts";

// ── Auth do Supabase ────────────────────────────────────────────────────────
// Os placeholders do Go ({{ .ConfirmationURL }}, {{ .Email }}) ficam como texto e o
// Supabase troca na hora do envio. O link vale 1 hora (mailer_otp_exp = 3600).

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

// ── Equipe ──────────────────────────────────────────────────────────────────

export function boasVindasVendedor(o: {
    nome: string;
    email: string;
    senha: string;
    empresa: string;
    appUrl: string;
}): EmailPronto {
    const primeiro = o.nome.trim().split(/\s+/)[0] || o.nome;
    return renderEmail({
        assunto: `${o.empresa} adicionou você no Vyzon`,
        previa: "Seu e-mail de acesso e a senha provisória estão aqui.",
        titulo: `${primeiro}, seu acesso está pronto`,
        blocos: [
            { tipo: "texto", texto: `${o.empresa} criou sua conta no Vyzon. Entre com os dados abaixo e troque a senha no primeiro acesso, em Configurações, Segurança.` },
            { tipo: "dados", linhas: [["E-mail", o.email], ["Senha provisória", o.senha]], mono: ["Senha provisória"] },
        ],
        botao: { texto: "Entrar no Vyzon", url: `${o.appUrl}/auth` },
        nota: "A senha é só sua. Não encaminhe este e-mail.",
        rodape: `Você recebeu este e-mail porque alguém da ${o.empresa} criou uma conta com este endereço. Se não conhece a empresa, pode ignorar.`,
    });
}

// ── Avisos internos (só o Markus recebe) ────────────────────────────────────

export function avisoNovoCadastro(o: {
    empresa: string;
    nome?: string | null;
    email?: string | null;
    whatsapp?: string | null;
    origem: string;
    linkWhatsapp?: string | null;
}): EmailPronto {
    return renderEmail({
        assunto: `Novo cadastro: ${o.empresa}`,
        previa: o.nome ? `${o.nome} acabou de criar a conta.` : "Uma conta nova acabou de ser criada.",
        titulo: `${o.empresa} criou a conta`,
        blocos: [
            { tipo: "dados", linhas: [["Nome", o.nome], ["E-mail", o.email], ["WhatsApp", o.whatsapp], ["Origem", o.origem]] },
            ...(o.linkWhatsapp
                ? [{ tipo: "texto" as const, texto: "O botão abre o WhatsApp com uma mensagem pronta perguntando se a pessoa conseguiu conectar o número e ver o Raio-X." }]
                : []),
        ],
        botao: o.linkWhatsapp ? { texto: "Chamar no WhatsApp", url: o.linkWhatsapp } : undefined,
        rodape: "Aviso interno do Vyzon. Só você recebe.",
    });
}

/** Arquivo em supabase/email-templates/ → gerador. Lido por scripts/emails/gerar.mjs. */
export const TEMPLATES_AUTH: Record<string, () => EmailPronto> = {
    "reset-password.html": authRecuperarSenha,
};
