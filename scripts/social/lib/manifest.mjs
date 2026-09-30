// Manifesto de um post: um JSON em distribution/posts/<id>.json com o texto de
// cada rede, a mídia e o que já foi publicado. O arquivo é a trilha de
// auditoria: o CLI grava de volta o id/URL de cada rede assim que publica.
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { lintCopy, xLength, X_MAX, IG_CAPTION_MAX, IG_HASHTAG_MAX, countHashtags } from './copy.mjs';

export const NETWORKS = ['x', 'instagram'];

const KIND_BY_EXT = {
    '.mp4': { kind: 'video', mime: 'video/mp4' },
    '.mov': { kind: 'video', mime: 'video/quicktime' },
    '.jpg': { kind: 'image', mime: 'image/jpeg' },
    '.jpeg': { kind: 'image', mime: 'image/jpeg' },
    '.png': { kind: 'image', mime: 'image/png' },
    '.webp': { kind: 'image', mime: 'image/webp' },
    '.gif': { kind: 'gif', mime: 'image/gif' },
};

export function describeMedia(ref, root) {
    const isUrl = /^https?:\/\//.test(ref);
    const ext = path.extname(isUrl ? new URL(ref).pathname : ref).toLowerCase();
    const info = KIND_BY_EXT[ext];
    return {
        ref,
        isUrl,
        abs: isUrl ? null : path.resolve(root, ref),
        ext,
        kind: info?.kind ?? 'unknown',
        mime: info?.mime ?? 'application/octet-stream',
    };
}

export function loadManifest(file) {
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    raw.published ??= {};
    return raw;
}

export function saveManifest(file, manifest) {
    writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');
}

export function targetNetworks(manifest, only) {
    return NETWORKS.filter((n) => manifest[n] && (!only || only === n));
}

export function mediaFor(manifest, network, root) {
    const refs = manifest[network]?.media ?? manifest.media ?? [];
    return refs.map((r) => describeMedia(r, root));
}

// Valida sem rede nem credencial: o dry-run roda isto e nada mais.
export function validateManifest(manifest, { root, only } = {}) {
    const errors = [];
    const warnings = [];
    const err = (scope, msg) => errors.push(`[${scope}] ${msg}`);
    const warn = (scope, msg) => warnings.push(`[${scope}] ${msg}`);

    if (!manifest.id || !/^[a-z0-9][a-z0-9-]*$/.test(manifest.id)) {
        err('manifesto', 'campo "id" obrigatório, só minúsculas, dígitos e hífen');
    }
    const networks = targetNetworks(manifest, only);
    if (networks.length === 0) err('manifesto', 'nenhuma rede alvo (inclua o bloco "x" e/ou "instagram")');

    for (const network of networks) {
        const media = mediaFor(manifest, network, root);
        for (const m of media) {
            if (m.kind === 'unknown') err(network, `formato não suportado: ${m.ref}`);
            if (!m.isUrl && !existsSync(m.abs)) err(network, `arquivo não encontrado: ${m.ref}`);
        }

        if (network === 'x') {
            const text = manifest.x.text ?? '';
            const lint = lintCopy(text);
            lint.errors.forEach((e) => err('x', e));
            lint.warnings.forEach((w) => warn('x', w));
            const len = xLength(text);
            if (len > X_MAX) err('x', `texto com ${len} de ${X_MAX} caracteres (contagem do X)`);

            const videos = media.filter((m) => m.kind === 'video' || m.kind === 'gif');
            if (videos.length > 1) err('x', 'no máximo 1 vídeo ou GIF por post');
            if (videos.length === 1 && media.length > 1) err('x', 'vídeo/GIF não mistura com imagem no mesmo post');
            if (media.length > 4) err('x', `${media.length} imagens; o X aceita até 4 (use "x.media" pra escolher)`);
            for (const m of media) {
                if (!m.isUrl && m.kind === 'image' && existsSync(m.abs) && statSync(m.abs).size > 5 * 1024 * 1024) {
                    err('x', `imagem acima de 5 MB: ${m.ref}`);
                }
                if (m.isUrl) err('x', `o X precisa do arquivo local pra subir a mídia, não URL: ${m.ref}`);
            }
        }

        if (network === 'instagram') {
            const caption = manifest.instagram.caption ?? '';
            const lint = lintCopy(caption);
            lint.errors.forEach((e) => err('instagram', e));
            lint.warnings.forEach((w) => warn('instagram', w));
            if (caption.length > IG_CAPTION_MAX) err('instagram', `legenda com ${caption.length} de ${IG_CAPTION_MAX} caracteres`);
            const tags = countHashtags(caption);
            if (tags > IG_HASHTAG_MAX) err('instagram', `${tags} hashtags; limite é ${IG_HASHTAG_MAX}`);

            if (media.length === 0) err('instagram', 'Instagram não publica post sem mídia');
            if (media.length > 10) err('instagram', `${media.length} itens; carrossel aceita até 10`);
            for (const m of media) {
                // A API de publicação do Instagram só aceita JPEG como imagem.
                if (m.kind === 'image' && m.mime !== 'image/jpeg') err('instagram', `imagem precisa ser JPEG: ${m.ref}`);
                if (m.kind === 'gif') err('instagram', `GIF não é aceito: ${m.ref}`);
            }
        }
    }

    for (const network of networks) {
        if (manifest.published?.[network]) warn(network, `já publicado em ${manifest.published[network].at}; será pulado`);
    }
    return { errors, warnings, networks };
}
