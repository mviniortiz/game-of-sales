// Quem pode chamar as edges de bastidor (trigger do banco, pg_cron, outra
// edge): Bearer com a service_role ou x-cron-secret igual ao EVA_CRON_SECRET.
// Usuário logado e anon key NÃO passam: com verify_jwt o gateway só prova que
// o JWT é válido, e a anon key está no bundle do front.
//
// Os triggers mandam os dois (20261022_service_auth_headers.sql), porque o
// gateway nem sempre deixa passar o Bearer da service_role.

const env = (k: string) => (typeof Deno !== "undefined" ? Deno.env.get(k) : undefined) ?? "";

/** Compara sem vazar pelo tempo onde a primeira diferença aparece. */
export function safeEqual(a: string, b: string): boolean {
    const enc = new TextEncoder();
    const x = enc.encode(a);
    const y = enc.encode(b);
    let diff = x.length ^ y.length;
    const n = Math.max(x.length, y.length);
    for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
    return diff === 0;
}

export function bearerToken(req: Request): string {
    return (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

/** true só para service_role ou cron secret; segredo vazio no ambiente nunca casa. */
export function isServiceCall(req: Request): boolean {
    const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
    const token = bearerToken(req);
    if (serviceKey && token && safeEqual(token, serviceKey)) return true;

    const cronSecret = env("EVA_CRON_SECRET");
    const provided = req.headers.get("x-cron-secret") || "";
    return Boolean(cronSecret && provided && safeEqual(provided, cronSecret));
}
