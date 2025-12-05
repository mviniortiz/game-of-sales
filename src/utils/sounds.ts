let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioContext || audioContext.state === "closed") {
    audioContext = new Ctx();
  }
  return audioContext;
};

/**
 * Toca um sino mais encorpado e prolongado para celebrar vendas.
 * Usa Web Audio API para evitar depender de arquivos de áudio externos.
 */
export const playSaleChime = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const playTone = (
    frequency: number,
    startOffset: number,
    duration: number,
    peakGain = 0.16,
    type: OscillatorType = "sine"
  ) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(4200, now + startOffset);

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now + startOffset);

    // Envelope com ataque rápido e decaimento mais longo
    gain.gain.setValueAtTime(0.0001, now + startOffset);
    gain.gain.exponentialRampToValueAtTime(peakGain, now + startOffset + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);

    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(now + startOffset);
    osc.stop(now + startOffset + duration);
  };

  // Corpo do sino (fundamental + harmônicos cintilantes com cauda mais longa)
  playTone(660, 0, 0.9, 0.20, "sine");       // fundamental com corpo
  playTone(990, 0.05, 0.75, 0.17, "sine");   // brilho médio
  playTone(1320, 0.10, 0.60, 0.14, "triangle"); // harmônico agudo
  playTone(1980, 0.18, 0.40, 0.11, "triangle"); // cintilar
  playTone(2640, 0.26, 0.32, 0.08, "triangle"); // cauda leve
};


