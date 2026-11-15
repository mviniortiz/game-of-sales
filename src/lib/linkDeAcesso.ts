// Link de acesso do Vyzon (convite, recuperar senha, entrada direta).
//
// Formato: https://vyzon.com.br/redefinir-senha?token_hash=<código>&type=<tipo>
// Abrir esse endereço não gasta o link; ele só é conferido quando a pessoa salva
// a senha (RedefinirSenha). Por isso pode ir por WhatsApp e por e-mail com
// antivírus: a prévia de link abre a página e o código continua valendo.
//
// O link direto do Supabase (/auth/v1/verify?token=...) entra no primeiro
// acesso, seja de quem for. Não mandar esse por WhatsApp.

export const TIPOS_DE_LINK = ["invite", "recovery", "magiclink", "signup", "email"] as const;
export type TipoDeLink = (typeof TIPOS_DE_LINK)[number];

export type LinkDeAcesso = { token_hash: string; type: TipoDeLink };

/** Lê o código do endereço. null quando não é um link de acesso novo. */
export function linkNoEndereco(search: string = window.location.search): LinkDeAcesso | null {
    const q = new URLSearchParams(search);
    const token_hash = (q.get("token_hash") ?? "").trim();
    const type = q.get("type") as TipoDeLink | null;
    if (!token_hash || !type || !TIPOS_DE_LINK.includes(type)) return null;
    return { token_hash, type };
}

/**
 * Monta o link a partir do que o Supabase devolve em auth.admin.generateLink
 * (properties.hashed_token) ou do {{ .TokenHash }} dos templates de e-mail.
 */
export function montarLinkDeAcesso(origem: string, link: LinkDeAcesso): string {
    return `${origem.replace(/\/$/, "")}/redefinir-senha?token_hash=${encodeURIComponent(link.token_hash)}&type=${link.type}`;
}
