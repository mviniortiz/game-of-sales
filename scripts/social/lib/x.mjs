// Publicação no X (API v2): upload em partes (initialize → append →
// finalize → status) e depois POST /2/tweets com os media_ids.
// Docs: https://docs.x.com/x-api/media/quickstart/media-upload-chunked
import { readFileSync } from 'node:fs';
import { oauth1Header } from './oauth1.mjs';

const API = 'https://api.x.com';
const CHUNK = 4 * 1024 * 1024; // doc pede segmento <= 5 MB
const CATEGORY = { video: 'tweet_video', gif: 'tweet_gif', image: 'tweet_image' };

export const X_ENV = ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_TOKEN_SECRET'];

export function xCredsFromEnv(env = process.env) {
    return {
        apiKey: env.X_API_KEY,
        apiSecret: env.X_API_SECRET,
        accessToken: env.X_ACCESS_TOKEN,
        accessTokenSecret: env.X_ACCESS_TOKEN_SECRET,
    };
}

async function call(creds, method, url, { json, form } = {}) {
    const headers = { Authorization: oauth1Header({ method, url, creds }) };
    let body;
    if (json) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(json);
    } else if (form) {
        body = form;
    }
    const res = await fetch(url, { method, headers, body });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) throw new Error(`X ${method} ${new URL(url).pathname} → ${res.status}: ${text.slice(0, 500)}`);
    return data;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function uploadMedia(creds, media, log = console.log) {
    const buf = readFileSync(media.abs);
    const init = await call(creds, 'POST', `${API}/2/media/upload/initialize`, {
        json: { media_type: media.mime, total_bytes: buf.length, media_category: CATEGORY[media.kind] },
    });
    const id = init.data.id;

    for (let i = 0, seg = 0; i < buf.length; i += CHUNK, seg++) {
        const form = new FormData();
        form.append('segment_index', String(seg));
        form.append('media', new Blob([buf.subarray(i, i + CHUNK)]), 'chunk');
        await call(creds, 'POST', `${API}/2/media/upload/${id}/append`, { form });
    }

    let info = (await call(creds, 'POST', `${API}/2/media/upload/${id}/finalize`)).data?.processing_info;
    const deadline = Date.now() + 10 * 60 * 1000;
    while (info && (info.state === 'pending' || info.state === 'in_progress')) {
        if (Date.now() > deadline) throw new Error(`X: processamento da mídia ${id} passou de 10 min`);
        log(`  X processando mídia (${info.state}, ${info.progress_percent ?? 0}%)`);
        await sleep((info.check_after_secs ?? 3) * 1000);
        info = (await call(creds, 'GET', `${API}/2/media/upload?command=STATUS&media_id=${id}`)).data?.processing_info;
    }
    if (info?.state === 'failed') throw new Error(`X: mídia ${id} falhou no processamento: ${JSON.stringify(info.error ?? info)}`);
    return id;
}

export async function publishToX(creds, { text, media }, log = console.log) {
    const mediaIds = [];
    for (const m of media) {
        log(`  X subindo ${m.ref}`);
        mediaIds.push(await uploadMedia(creds, m, log));
    }
    const payload = { text };
    if (mediaIds.length) payload.media = { media_ids: mediaIds };
    const res = await call(creds, 'POST', `${API}/2/tweets`, { json: payload });
    const id = res.data.id;
    return { id, url: `https://x.com/i/status/${id}` };
}
