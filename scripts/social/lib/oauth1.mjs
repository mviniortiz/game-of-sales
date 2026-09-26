// Assinatura OAuth 1.0a (HMAC-SHA1) pra API do X, contexto de usuário.
// Corpo JSON e multipart NÃO entram na assinatura; só query + params oauth.
import crypto from 'node:crypto';

export const rfc3986 = (s) =>
    encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());

export function oauth1Header({ method, url, params = {}, creds, nonce, timestamp }) {
    const u = new URL(url);
    const oauth = {
        oauth_consumer_key: creds.apiKey,
        oauth_nonce: nonce ?? crypto.randomBytes(16).toString('hex'),
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: String(timestamp ?? Math.floor(Date.now() / 1000)),
        oauth_token: creds.accessToken,
        oauth_version: '1.0',
    };

    const pairs = [...u.searchParams.entries(), ...Object.entries(params), ...Object.entries(oauth)]
        .map(([k, v]) => [rfc3986(k), rfc3986(String(v))])
        .sort((a, b) => (a[0] === b[0] ? cmp(a[1], b[1]) : cmp(a[0], b[0])));
    const paramString = pairs.map(([k, v]) => `${k}=${v}`).join('&');
    const baseString = [method.toUpperCase(), rfc3986(`${u.origin}${u.pathname}`), rfc3986(paramString)].join('&');
    const signingKey = `${rfc3986(creds.apiSecret)}&${rfc3986(creds.accessTokenSecret)}`;
    const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

    const header = { ...oauth, oauth_signature: signature };
    return 'OAuth ' + Object.keys(header).sort().map((k) => `${rfc3986(k)}="${rfc3986(header[k])}"`).join(', ');
}

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
