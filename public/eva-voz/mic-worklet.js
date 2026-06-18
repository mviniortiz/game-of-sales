// AudioWorklet de captura da EVA Voz: recebe o áudio do microfone na taxa NATIVA
// do dispositivo (ex 48kHz) e reamostra pra 16kHz PCM16 mono — o formato que a
// Gemini Live API exige. Downsample por MÉDIA (box filter) pra reduzir aliasing,
// muito melhor que decimação pura. Half-duplex: quando "enabled" é false (a EVA
// está falando), não emite nada — evita eco e auto-interrupção.
class MicWorklet extends AudioWorkletProcessor {
    constructor() {
        super();
        this.inRate = sampleRate; // taxa do AudioContext (global do worklet)
        this.outRate = 16000;
        this.enabled = false;
        this.acc = 0;   // acumulador de fase pro downsample
        this.sum = 0;   // soma do intervalo (média)
        this.count = 0;
        this.buf = [];  // amostras de saída acumuladas antes de enviar
        this.port.onmessage = (e) => {
            if (e.data && e.data.type === "enable") this.enabled = !!e.data.value;
        };
    }

    process(inputs) {
        const input = inputs[0];
        const ch = input && input[0];
        if (!ch || !this.enabled) return true;

        for (let i = 0; i < ch.length; i++) {
            this.sum += ch[i];
            this.count++;
            this.acc += this.outRate;
            if (this.acc >= this.inRate) {
                this.acc -= this.inRate;
                this.buf.push(this.sum / this.count); // média do intervalo (low-pass simples)
                this.sum = 0;
                this.count = 0;
            }
        }

        // envia em blocos de ~20-40ms (320-640 amostras @16kHz) pra baixa latência
        if (this.buf.length >= 320) {
            const pcm = new Int16Array(this.buf.length);
            for (let i = 0; i < this.buf.length; i++) {
                const s = Math.max(-1, Math.min(1, this.buf[i]));
                pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
            this.buf = [];
            this.port.postMessage(pcm, [pcm.buffer]); // transfere o buffer (zero-copy)
        }
        return true;
    }
}

registerProcessor("eva-mic-worklet", MicWorklet);
