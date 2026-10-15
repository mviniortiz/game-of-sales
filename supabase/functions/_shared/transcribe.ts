// Transcrição de áudio, na ordem: Whisper no Groq (rápido e barato), Whisper na OpenAI e
// Gemini; cada um só entra se a chave existir e o anterior falhar. Usada no ditado do
// app (eva-transcribe) e nos áudios que integradora da prospecção ou lead do anúncio
// mandam no WhatsApp. O Gemini entrou quando a conta da OpenAI ficou sem crédito
// (15/10/2026): uma chave só derrubava o ditado inteiro.

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

/** Marca o texto que veio de áudio: o dono vê no aviso e a IA sabe que pode ter erro. */
export const PREFIXO_AUDIO = "(áudio, transcrição automática)";

// Whisper precisa de um nome de arquivo com extensão válida pra detectar o container.
function extFromMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("mp4") || m.includes("m4a") || m.includes("aac")) return "mp4";
  if (m.includes("ogg") || m.includes("opus")) return "ogg";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("wav")) return "wav";
  return "webm";
}

export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export type Transcricao = { ok: true; text: string } | { ok: false; reason: "no_key" | "stt_failed"; detail?: string };

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Groq e OpenAI falam a mesma rota de transcrição; muda só o endereço, a chave e o modelo. */
async function whisper(
  api: { nome: string; url: string; key: string; model: string },
  bytes: Uint8Array<ArrayBuffer>, mime: string, language: string,
): Promise<Transcricao> {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mime }), `audio.${extFromMime(mime)}`);
  form.append("model", api.model);
  form.append("language", language);
  form.append("response_format", "text");
  const res = await fetch(api.url, { method: "POST", headers: { Authorization: `Bearer ${api.key}` }, body: form });
  if (!res.ok) return { ok: false, reason: "stt_failed", detail: `${api.nome} ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}` };
  return { ok: true, text: (await res.text()).trim() };
}

async function gemini(bytes: Uint8Array<ArrayBuffer>, mime: string, language: string): Promise<Transcricao> {
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY! },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: mime.split(";")[0].trim(), data: bytesToBase64(bytes) } },
          { text: `Transcreva este áudio palavra por palavra, no idioma falado (${language}). Responda só com a transcrição, sem comentário. Se não houver fala, responda vazio.` },
        ],
      }],
      generationConfig: { temperature: 0 },
    }),
  });
  if (!res.ok) return { ok: false, reason: "stt_failed", detail: `gemini ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}` };
  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("").trim();
  return { ok: true, text };
}

export async function transcrever(bytes: Uint8Array<ArrayBuffer>, mime: string, language = "pt"): Promise<Transcricao> {
  const tentativas: Array<() => Promise<Transcricao>> = [];
  if (GROQ_API_KEY) {
    tentativas.push(() => whisper({ nome: "groq", url: "https://api.groq.com/openai/v1/audio/transcriptions", key: GROQ_API_KEY, model: "whisper-large-v3-turbo" }, bytes, mime, language));
  }
  if (OPENAI_API_KEY) {
    tentativas.push(() => whisper({ nome: "openai", url: "https://api.openai.com/v1/audio/transcriptions", key: OPENAI_API_KEY, model: "whisper-1" }, bytes, mime, language));
  }
  if (GEMINI_API_KEY) tentativas.push(() => gemini(bytes, mime, language));
  if (!tentativas.length) return { ok: false, reason: "no_key" };
  const erros: string[] = [];
  for (const tentar of tentativas) {
    const r = await tentar();
    if (r.ok) return r;
    erros.push(r.detail || "falhou");
  }
  return { ok: false, reason: "stt_failed", detail: erros.join(" | ") };
}

/** Áudio do WhatsApp (base64 do webhook) em texto marcado, ou null quando não deu. */
export async function textoDoAudio(base64: string, mime: string | undefined): Promise<string | null> {
  try {
    const r = await transcrever(base64ToBytes(base64), mime || "audio/ogg");
    if (!r.ok) {
      console.warn("[transcribe] áudio do WhatsApp:", r.reason, r.detail || "");
      return null;
    }
    return r.text ? `${PREFIXO_AUDIO} ${r.text}` : null;
  } catch (e) {
    console.warn("[transcribe] áudio do WhatsApp:", (e as Error).message);
    return null;
  }
}
