// Carrega .env.local e .env da raiz sem sobrescrever o que já está no ambiente.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

export function loadEnv(root) {
    for (const name of ['.env.local', '.env']) {
        const file = path.join(root, name);
        if (!existsSync(file)) continue;
        for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
            const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
            if (!m || process.env[m[1]] !== undefined) continue;
            process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
        }
    }
}

export const missing = (names, env = process.env) => names.filter((n) => !env[n]);
