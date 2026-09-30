// O Instagram baixa a mídia de uma URL pública (não aceita upload direto com
// Instagram Login). Arquivo local sobe pro bucket PÚBLICO do Supabase Storage
// e o post usa a URL pública de lá.
import { readFileSync } from 'node:fs';
import path from 'node:path';

export const HOST_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

export function hostConfigFromEnv(env = process.env) {
    return {
        url: (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/$/, ''),
        key: env.SUPABASE_SERVICE_ROLE_KEY,
        bucket: env.SOCIAL_BUCKET || 'social-media',
    };
}

export async function hostPublicly(cfg, postId, media) {
    if (media.isUrl) return media.ref;
    const objectPath = `${postId}/${path.basename(media.abs)}`;
    const res = await fetch(`${cfg.url}/storage/v1/object/${cfg.bucket}/${objectPath}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${cfg.key}`,
            apikey: cfg.key,
            'Content-Type': media.mime,
            'x-upsert': 'true',
        },
        body: readFileSync(media.abs),
    });
    if (!res.ok) throw new Error(`Storage upload ${objectPath} → ${res.status}: ${(await res.text()).slice(0, 300)}`);

    const publicUrl = `${cfg.url}/storage/v1/object/public/${cfg.bucket}/${objectPath}`;
    const head = await fetch(publicUrl, { method: 'HEAD' });
    if (!head.ok) {
        throw new Error(`URL pública não abre (${head.status}). O bucket "${cfg.bucket}" existe e está marcado como público? Ver scripts/social/README.md`);
    }
    return publicUrl;
}
