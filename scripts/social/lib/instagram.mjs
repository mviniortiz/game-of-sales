// Publicação no Instagram (Instagram API com Instagram Login, graph.instagram.com):
// cria container(s) com URL pública da mídia, espera ficar FINISHED e publica.
// Docs: https://developers.facebook.com/docs/instagram-platform/content-publishing/
// Conta precisa ser Business ou Creator; limite de 100 posts via API por 24h.

const HOST = 'https://graph.instagram.com';

export const IG_ENV = ['IG_USER_ID', 'IG_ACCESS_TOKEN'];

export function igConfigFromEnv(env = process.env) {
    return {
        userId: env.IG_USER_ID,
        token: env.IG_ACCESS_TOKEN,
        version: env.IG_GRAPH_VERSION || 'v23.0',
    };
}

async function call(cfg, method, pathname, params = {}) {
    const url = new URL(`${HOST}/${cfg.version}/${pathname}`);
    const body = new URLSearchParams({ ...params, access_token: cfg.token });
    let res;
    if (method === 'GET') {
        body.forEach((v, k) => url.searchParams.set(k, v));
        res = await fetch(url);
    } else {
        res = await fetch(url, { method, body });
    }
    const text = await res.text();
    // Nunca logar a URL completa: o token vai na query.
    if (!res.ok) throw new Error(`Instagram ${method} /${pathname} → ${res.status}: ${text.slice(0, 500)}`);
    return JSON.parse(text);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFinished(cfg, containerId, log) {
    const deadline = Date.now() + 10 * 60 * 1000;
    for (;;) {
        const { status_code: code, status } = await call(cfg, 'GET', containerId, { fields: 'status_code,status' });
        if (code === 'FINISHED') return;
        if (code === 'ERROR' || code === 'EXPIRED') throw new Error(`Instagram: container ${containerId} ${code}: ${status ?? ''}`);
        if (Date.now() > deadline) throw new Error(`Instagram: container ${containerId} passou de 10 min em ${code}`);
        log(`  Instagram processando (${code})`);
        await sleep(5000);
    }
}

async function createItem(cfg, item, extra) {
    const params = item.kind === 'video'
        ? { video_url: item.url, media_type: extra.carousel ? 'VIDEO' : 'REELS' }
        : { image_url: item.url };
    if (extra.carousel) params.is_carousel_item = 'true';
    if (!extra.carousel) {
        params.caption = extra.caption;
        if (item.kind === 'video') params.share_to_feed = String(extra.shareToFeed);
    }
    return (await call(cfg, 'POST', `${cfg.userId}/media`, params)).id;
}

// items: [{ kind: 'image'|'video', url }] com URL pública (ver host.mjs).
export async function publishToInstagram(cfg, { caption, items, shareToFeed = true }, log = console.log) {
    let creationId;
    if (items.length === 1) {
        creationId = await createItem(cfg, items[0], { caption, shareToFeed });
    } else {
        const children = [];
        for (const item of items) children.push(await createItem(cfg, item, { carousel: true }));
        for (const child of children) await waitFinished(cfg, child, log);
        creationId = (await call(cfg, 'POST', `${cfg.userId}/media`, {
            media_type: 'CAROUSEL',
            children: children.join(','),
            caption,
        })).id;
    }
    await waitFinished(cfg, creationId, log);
    const { id } = await call(cfg, 'POST', `${cfg.userId}/media_publish`, { creation_id: creationId });
    const { permalink } = await call(cfg, 'GET', id, { fields: 'permalink' });
    return { id, url: permalink };
}

// Token longo do Instagram dura 60 dias; renovar antes de vencer.
export async function refreshInstagramToken(cfg) {
    const url = new URL(`${HOST}/refresh_access_token`);
    url.searchParams.set('grant_type', 'ig_refresh_token');
    url.searchParams.set('access_token', cfg.token);
    const res = await fetch(url);
    const text = await res.text();
    if (!res.ok) throw new Error(`Instagram refresh → ${res.status}: ${text.slice(0, 300)}`);
    return JSON.parse(text);
}
