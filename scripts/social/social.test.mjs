// node --test scripts/social/   (npm run social:test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { oauth1Header } from './lib/oauth1.mjs';
import { lintCopy, xLength, countHashtags } from './lib/copy.mjs';
import { validateManifest } from './lib/manifest.mjs';
import { publishToX } from './lib/x.mjs';
import { publishToInstagram } from './lib/instagram.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

test('oauth1: bate com o exemplo oficial da documentação do Twitter', () => {
    const header = oauth1Header({
        method: 'POST',
        url: 'https://api.twitter.com/1.1/statuses/update.json?include_entities=true',
        params: { status: 'Hello Ladies + Gentlemen, a signed OAuth request!' },
        creds: {
            apiKey: 'xvz1evFS4wEEPTGEFPHBog',
            apiSecret: 'kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw',
            accessToken: '370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb',
            accessTokenSecret: 'LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE',
        },
        nonce: 'kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg',
        timestamp: 1318622958,
    });
    assert.match(header, /oauth_signature="hCtSmYh%2BiHYCEqBWrE7C7hYmtUk%3D"/);
});

test('copy: bloqueia travessão, emoji e promessa de autonomia', () => {
    assert.ok(lintCopy('A EVA lê — e sugere').errors.length);
    assert.ok(lintCopy('Bora vender 🚀').errors.length);
    assert.ok(lintCopy('A IA que vende sozinha pra você').errors.length);
    assert.ok(lintCopy('Nosso CRM gamificado').errors.length);
    assert.deepEqual(lintCopy('A EVA sugere, seu time aprova. Vyzon™').errors, []);
});

test('copy: contagem do X pondera URL e caracteres largos', () => {
    assert.equal(xLength('ação'), 4);
    assert.equal(xLength('veja https://vyzon.com.br/criar-conta?plan=pro'), 5 + 23);
    assert.equal(xLength('日本'), 4);
    assert.equal(countHashtags('#vendas no #WhatsApp e C#'), 2);
});

test('manifesto: limites por rede', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'social-'));
    for (const f of ['a.png', 'b.jpg', 'v.mp4']) writeFileSync(path.join(dir, f), 'x');
    const base = { id: 'teste-1', media: ['a.png'], x: { text: 'ok' }, instagram: { caption: 'ok' } };

    const png = validateManifest(base, { root: dir });
    assert.ok(png.errors.some((e) => e.startsWith('[instagram]') && e.includes('JPEG')));
    assert.ok(!png.errors.some((e) => e.startsWith('[x]')));

    const mixed = validateManifest({ ...base, media: ['v.mp4', 'b.jpg'] }, { root: dir, only: 'x' });
    assert.ok(mixed.errors.some((e) => e.includes('não mistura')));
    assert.deepEqual(mixed.networks, ['x']);

    const longText = validateManifest({ ...base, media: ['b.jpg'], x: { text: 'a'.repeat(281) } }, { root: dir });
    assert.ok(longText.errors.some((e) => e.includes('281 de 280')));

    const missingFile = validateManifest({ ...base, media: ['nao-existe.jpg'] }, { root: dir });
    assert.ok(missingFile.errors.some((e) => e.includes('não encontrado')));
});

function mockFetch(handler) {
    const calls = [];
    const original = globalThis.fetch;
    globalThis.fetch = async (url, init = {}) => {
        const u = new URL(url);
        calls.push({ method: init.method ?? 'GET', path: u.pathname, url: u, init });
        const body = handler(u, init);
        return new Response(JSON.stringify(body), { status: 200 });
    };
    return { calls, restore: () => (globalThis.fetch = original) };
}

test('X: vídeo passa por initialize, append em partes, finalize, status e tweet', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'social-'));
    const video = path.join(dir, 'v.mp4');
    writeFileSync(video, Buffer.alloc(9 * 1024 * 1024)); // 3 partes de até 4 MB
    let statusCalls = 0;
    const m = mockFetch((u) => {
        if (u.pathname.endsWith('/initialize')) return { data: { id: '42' } };
        if (u.pathname.endsWith('/append')) return {};
        if (u.pathname.endsWith('/finalize')) return { data: { processing_info: { state: 'pending', check_after_secs: 0 } } };
        if (u.pathname === '/2/media/upload') return { data: { processing_info: { state: ++statusCalls < 2 ? 'in_progress' : 'succeeded', check_after_secs: 0 } } };
        if (u.pathname === '/2/tweets') return { data: { id: '999' } };
        throw new Error('rota inesperada ' + u.pathname);
    });
    try {
        const creds = { apiKey: 'k', apiSecret: 's', accessToken: 't', accessTokenSecret: 'ts' };
        const res = await publishToX(creds, { text: 'oi', media: [{ ref: 'v.mp4', abs: video, kind: 'video', mime: 'video/mp4' }] }, () => {});
        assert.deepEqual(res, { id: '999', url: 'https://x.com/i/status/999' });
        const paths = m.calls.map((c) => c.path);
        assert.deepEqual(paths, [
            '/2/media/upload/initialize',
            '/2/media/upload/42/append', '/2/media/upload/42/append', '/2/media/upload/42/append',
            '/2/media/upload/42/finalize',
            '/2/media/upload', '/2/media/upload',
            '/2/tweets',
        ]);
        const init = JSON.parse(m.calls[0].init.body);
        assert.deepEqual(init, { media_type: 'video/mp4', total_bytes: 9 * 1024 * 1024, media_category: 'tweet_video' });
        assert.deepEqual(JSON.parse(m.calls.at(-1).init.body), { text: 'oi', media: { media_ids: ['42'] } });
        assert.ok(m.calls.every((c) => c.init.headers.Authorization.startsWith('OAuth ')));
    } finally {
        m.restore();
    }
});

test('Instagram: carrossel cria filhos, espera FINISHED, publica e busca permalink', async () => {
    let next = 0;
    const m = mockFetch((u, init) => {
        if (u.pathname.endsWith('/media') && init.method === 'POST') return { id: `c${++next}` };
        if (u.pathname.endsWith('/media_publish')) return { id: 'post1' };
        if (u.searchParams.get('fields') === 'status_code,status') return { status_code: 'FINISHED' };
        if (u.searchParams.get('fields') === 'permalink') return { permalink: 'https://www.instagram.com/p/abc/' };
        throw new Error('rota inesperada ' + u.pathname);
    });
    try {
        const cfg = { userId: '123', token: 'tok', version: 'v23.0' };
        const res = await publishToInstagram(cfg, {
            caption: 'legenda',
            items: [{ kind: 'image', url: 'https://x/1.jpg' }, { kind: 'video', url: 'https://x/2.mp4' }],
        }, () => {});
        assert.deepEqual(res, { id: 'post1', url: 'https://www.instagram.com/p/abc/' });

        const posts = m.calls.filter((c) => c.method === 'POST').map((c) => Object.fromEntries(c.init.body));
        assert.equal(posts[0].is_carousel_item, 'true');
        assert.equal(posts[0].image_url, 'https://x/1.jpg');
        assert.equal(posts[1].media_type, 'VIDEO');
        assert.equal(posts[2].media_type, 'CAROUSEL');
        assert.equal(posts[2].children, 'c1,c2');
        assert.equal(posts[2].caption, 'legenda');
        assert.equal(posts[3].creation_id, 'c3');
        assert.ok(m.calls.every((c) => c.url.host === 'graph.instagram.com'));
    } finally {
        m.restore();
    }
});

test('CLI: simulação não publica e erro de copy sai com código 1', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'social-'));
    writeFileSync(path.join(dir, 'img.jpg'), 'x');
    const ok = path.join(dir, 'ok.json');
    writeFileSync(ok, JSON.stringify({ id: 'ok', media: [path.join(dir, 'img.jpg')], x: { text: 'A EVA sugere, seu time aprova.' }, instagram: { caption: 'A EVA sugere, seu time aprova.' } }));
    const out = execFileSync('node', [path.join(HERE, 'post.mjs'), ok], { encoding: 'utf8' });
    assert.match(out, /Simulação OK/);
    assert.deepEqual(JSON.parse(readFileSync(ok, 'utf8')).published, undefined);

    const bad = path.join(dir, 'bad.json');
    writeFileSync(bad, JSON.stringify({ id: 'bad', x: { text: 'Vende sozinho 🚀' } }));
    assert.throws(() => execFileSync('node', [path.join(HERE, 'post.mjs'), bad], { encoding: 'utf8', stdio: 'pipe' }), (e) => e.status === 1);
});
