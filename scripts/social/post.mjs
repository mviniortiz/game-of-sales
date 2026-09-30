#!/usr/bin/env node
// Canal de distribuição: publica um post no X e no Instagram a partir de um
// manifesto em distribution/posts/<id>.json.
//
//   node scripts/social/post.mjs distribution/posts/<id>.json            # simula (padrão)
//   node scripts/social/post.mjs distribution/posts/<id>.json --publish  # publica, pede confirmação
//   opções: --only x|instagram  --yes (pula a confirmação; só com aprovação humana já dada)
//   node scripts/social/post.mjs --ig-refresh-token                      # renova o token do Instagram
//
// Nada sai sem aprovação humana: sem --publish é só simulação, e com
// --publish o comando mostra o post e exige digitar "publicar".
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { loadEnv, missing } from './lib/env.mjs';
import { loadManifest, saveManifest, validateManifest, mediaFor } from './lib/manifest.mjs';
import { xLength, X_MAX } from './lib/copy.mjs';
import { X_ENV, xCredsFromEnv, publishToX } from './lib/x.mjs';
import { IG_ENV, igConfigFromEnv, publishToInstagram, refreshInstagramToken } from './lib/instagram.mjs';
import { HOST_ENV, hostConfigFromEnv, hostPublicly } from './lib/host.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
loadEnv(ROOT);

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
};

if (flag('--ig-refresh-token')) {
    const cfg = igConfigFromEnv();
    if (!cfg.token) fail('IG_ACCESS_TOKEN não definido');
    const res = await refreshInstagramToken(cfg);
    console.log(`Novo token (vale ${Math.round(res.expires_in / 86400)} dias). Atualize IG_ACCESS_TOKEN no .env.local:`);
    console.log(res.access_token);
    process.exit(0);
}

const file = args.find((a) => a.endsWith('.json'));
if (!file) fail('uso: node scripts/social/post.mjs distribution/posts/<id>.json [--publish] [--only x|instagram] [--yes]');
const only = opt('--only');
if (only && !['x', 'instagram'].includes(only)) fail('--only aceita x ou instagram');

const manifestPath = path.resolve(file);
const manifest = loadManifest(manifestPath);
const { errors, warnings, networks } = validateManifest(manifest, { root: ROOT, only });

// ffprobe é opcional: sem ele, duração e proporção do vídeo não são checadas.
for (const network of networks) {
    for (const m of mediaFor(manifest, network, ROOT).filter((x) => x.kind === 'video' && !x.isUrl)) {
        const probe = probeVideo(m.abs);
        if (!probe) {
            warnings.push(`[${network}] ffprobe indisponível; duração/proporção de ${m.ref} não checadas`);
            continue;
        }
        const ratio = probe.width / probe.height;
        if (network === 'instagram' && Math.abs(ratio - 9 / 16) > 0.01) warnings.push(`[instagram] ${m.ref} é ${probe.width}x${probe.height}; Reels pede 9:16`);
        if (network === 'instagram' && (probe.duration < 3 || probe.duration > 90)) warnings.push(`[instagram] ${m.ref} tem ${probe.duration.toFixed(1)}s; aba Reels pede 3 a 90s`);
        if (network === 'x' && probe.duration > 140) errors.push(`[x] ${m.ref} tem ${probe.duration.toFixed(1)}s; conta sem Premium aceita até 140s`);
    }
}

printPreview();
if (warnings.length) console.log('\nAvisos:\n' + warnings.map((w) => '  - ' + w).join('\n'));
if (errors.length) {
    console.log('\nErros (nada foi publicado):\n' + errors.map((e) => '  - ' + e).join('\n'));
    process.exit(1);
}

const pending = networks.filter((n) => !manifest.published[n]);
if (!flag('--publish')) {
    console.log(`\nSimulação OK. Nada foi publicado. Para publicar: node scripts/social/post.mjs ${file} --publish`);
    process.exit(0);
}
if (pending.length === 0) {
    console.log('\nTodas as redes alvo já estão publicadas. Nada a fazer.');
    process.exit(0);
}

const needed = new Set();
if (pending.includes('x')) X_ENV.forEach((v) => needed.add(v));
if (pending.includes('instagram')) {
    IG_ENV.forEach((v) => needed.add(v));
    if (mediaFor(manifest, 'instagram', ROOT).some((m) => !m.isUrl)) HOST_ENV.forEach((v) => needed.add(v));
}
const absent = missing([...needed]).filter((v) => !(v === 'SUPABASE_URL' && process.env.VITE_SUPABASE_URL));
if (absent.length) fail(`credenciais faltando no .env.local: ${absent.join(', ')} (ver scripts/social/README.md)`);

await confirm(pending);

for (const network of pending) {
    console.log(`\nPublicando no ${network === 'x' ? 'X' : 'Instagram'}...`);
    try {
        const result = network === 'x' ? await publishX() : await publishInstagram();
        manifest.published[network] = { ...result, at: new Date().toISOString() };
        // Grava a cada rede: se a próxima falhar, rodar de novo não duplica esta.
        saveManifest(manifestPath, manifest);
        console.log(`  OK: ${result.url}`);
    } catch (e) {
        console.error(`  FALHOU: ${e.message}`);
        process.exitCode = 1;
    }
}

async function publishX() {
    return publishToX(xCredsFromEnv(), { text: manifest.x.text, media: mediaFor(manifest, 'x', ROOT) });
}

async function publishInstagram() {
    const host = hostConfigFromEnv();
    const items = [];
    for (const m of mediaFor(manifest, 'instagram', ROOT)) {
        items.push({ kind: m.kind, url: await hostPublicly(host, manifest.id, m) });
    }
    return publishToInstagram(igConfigFromEnv(), {
        caption: manifest.instagram.caption,
        items,
        shareToFeed: manifest.instagram.share_to_feed ?? true,
    });
}

async function confirm(targets) {
    if (flag('--yes')) return;
    if (!process.stdin.isTTY) fail('sem terminal interativo pra confirmar; rode de novo com --yes depois da aprovação humana');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`\nVai publicar em: ${targets.join(', ')}. Digite "publicar" para confirmar: `);
    rl.close();
    if (answer.trim().toLowerCase() !== 'publicar') fail('cancelado; nada foi publicado');
}

function printPreview() {
    console.log(`Post: ${manifest.id}`);
    for (const network of networks) {
        const media = mediaFor(manifest, network, ROOT).map((m) => m.ref);
        const done = manifest.published[network];
        console.log(`\n── ${network === 'x' ? 'X' : 'Instagram'}${done ? ` (já publicado: ${done.url})` : ''}`);
        if (network === 'x') console.log(`${manifest.x.text}\n[${xLength(manifest.x.text ?? '')}/${X_MAX}]`);
        else console.log(`${manifest.instagram.caption}\n[${(manifest.instagram.caption ?? '').length}/2200]`);
        console.log(`mídia: ${media.length ? media.join(', ') : '(nenhuma)'}`);
    }
}

function probeVideo(file) {
    try {
        const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', file], { encoding: 'utf8' });
        const json = JSON.parse(out);
        return { width: json.streams[0].width, height: json.streams[0].height, duration: Number(json.format.duration) };
    } catch {
        return null;
    }
}

function fail(msg) {
    console.error(`Erro: ${msg}`);
    process.exit(1);
}
