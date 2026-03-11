import { motion, AnimatePresence } from "framer-motion";
import { memo, useEffect, useState, useRef } from "react";
import { Trophy, DollarSign, Star, TrendingUp, Zap } from "lucide-react";

interface WinCelebrationProps {
  show: boolean;
  dealTitle: string;
  dealValue: number;
  formatCurrency: (v: number) => string;
  onComplete?: () => void;
}

// ── Particle types ──────────────────────────────────────────────
interface FallingParticle {
  id: number;
  x: number;
  size: number;
  delay: number;
  duration: number;
  rotation: number;
  type: "coin" | "star" | "bill";
  wobble: number;
}

interface FireworkParticle {
  id: number;
  angle: number; // radians
  distance: number; // px from center
  size: number;
  delay: number;
  color: string;
  duration: number;
}

const FIREWORK_COLORS = [
  "#fbbf24", "#f59e0b", "#10b981", "#34d399",
  "#fcd34d", "#a3e635", "#38bdf8", "#fb923c",
];

const generateFalling = (count: number): FallingParticle[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: 12 + Math.random() * 18,
    delay: Math.random() * 0.8,
    duration: 2.0 + Math.random() * 1.4,
    rotation: Math.random() * 720 - 360,
    type: (["coin", "coin", "star", "bill", "coin"] as const)[Math.floor(Math.random() * 5)],
    wobble: (Math.random() - 0.5) * 80,
  }));

const generateFireworks = (count: number): FireworkParticle[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4,
    distance: 120 + Math.random() * 200,
    size: 4 + Math.random() * 8,
    delay: Math.random() * 0.15,
    color: FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)],
    duration: 0.6 + Math.random() * 0.4,
  }));

// ── Animated counter ────────────────────────────────────────────
function useCountUp(target: number, duration: number, active: boolean) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active || target <= 0) { setValue(0); return; }

    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    const timeout = setTimeout(() => {
      rafRef.current = requestAnimationFrame(tick);
    }, 400);

    return () => { clearTimeout(timeout); cancelAnimationFrame(rafRef.current); };
  }, [target, duration, active]);

  return value;
}

// ── Haptic feedback ─────────────────────────────────────────────
function triggerHaptic() {
  try {
    if (navigator.vibrate) navigator.vibrate([50, 30, 80, 30, 120]);
  } catch { /* not available */ }
}

// ── Screen shake via CSS ────────────────────────────────────────
function triggerScreenShake() {
  const el = document.documentElement;
  el.style.transition = "none";
  const keyframes = [
    { transform: "translate(0, 0)" },
    { transform: "translate(-4px, 2px)" },
    { transform: "translate(4px, -2px)" },
    { transform: "translate(-3px, -3px)" },
    { transform: "translate(3px, 3px)" },
    { transform: "translate(-2px, 1px)" },
    { transform: "translate(2px, -1px)" },
    { transform: "translate(0, 0)" },
  ];
  el.animate(keyframes, { duration: 350, easing: "ease-out" });
}

// ── Ka-Ching sound with reverb ──────────────────────────────────
function playKaChing() {
  try {
    const ctx = new AudioContext();

    // Create reverb convolver
    const convolver = ctx.createConvolver();
    const reverbLength = ctx.sampleRate * 0.6;
    const impulse = ctx.createBuffer(2, reverbLength, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < reverbLength; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / reverbLength, 2.5);
      }
    }
    convolver.buffer = impulse;

    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.15;
    convolver.connect(reverbGain).connect(ctx.destination);

    const connectWithReverb = (node: AudioNode) => {
      node.connect(ctx.destination);
      node.connect(convolver);
    };

    const t = ctx.currentTime;

    // 1) Metallic impact
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(2800, t);
    osc1.frequency.exponentialRampToValueAtTime(1400, t + 0.06);
    g1.gain.setValueAtTime(0.35, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc1.connect(g1);
    connectWithReverb(g1);
    osc1.start(t);
    osc1.stop(t + 0.12);

    // 2) Cash register bell
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(4200, t + 0.04);
    osc2.frequency.exponentialRampToValueAtTime(2400, t + 0.18);
    g2.gain.setValueAtTime(0.22, t + 0.04);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc2.connect(g2);
    connectWithReverb(g2);
    osc2.start(t + 0.04);
    osc2.stop(t + 0.25);

    // 3) Shimmer sweep
    const osc3 = ctx.createOscillator();
    const g3 = ctx.createGain();
    osc3.type = "triangle";
    osc3.frequency.setValueAtTime(900, t + 0.08);
    osc3.frequency.exponentialRampToValueAtTime(5000, t + 0.2);
    osc3.frequency.exponentialRampToValueAtTime(2500, t + 0.4);
    g3.gain.setValueAtTime(0.12, t + 0.08);
    g3.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc3.connect(g3);
    connectWithReverb(g3);
    osc3.start(t + 0.08);
    osc3.stop(t + 0.45);

    // 4) Success chord C-E-G-C with slight detuning for richness
    const chordNotes = [
      { freq: 523.25, time: 0.12, detune: 2 },  // C5
      { freq: 659.25, time: 0.17, detune: -3 },  // E5
      { freq: 783.99, time: 0.22, detune: 1 },   // G5
      { freq: 1046.5, time: 0.28, detune: -2 },  // C6
    ];
    chordNotes.forEach(({ freq, time, detune }) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + time);
      osc.detune.setValueAtTime(detune, t + time);
      g.gain.setValueAtTime(0.1, t + time);
      g.gain.exponentialRampToValueAtTime(0.001, t + time + 0.6);
      osc.connect(g);
      connectWithReverb(g);
      osc.start(t + time);
      osc.stop(t + time + 0.6);
    });

    // 5) Coin jingle (second hit, delayed)
    const osc5 = ctx.createOscillator();
    const g5 = ctx.createGain();
    osc5.type = "sine";
    osc5.frequency.setValueAtTime(3200, t + 0.35);
    osc5.frequency.exponentialRampToValueAtTime(1800, t + 0.45);
    g5.gain.setValueAtTime(0.15, t + 0.35);
    g5.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc5.connect(g5);
    connectWithReverb(g5);
    osc5.start(t + 0.35);
    osc5.stop(t + 0.5);

    setTimeout(() => ctx.close(), 2000);
  } catch { /* silent */ }
}

// ── Visuals ─────────────────────────────────────────────────────
const ParticleVisual = ({ type, size }: { type: FallingParticle["type"]; size: number }) => {
  if (type === "star") {
    return <Star className="text-yellow-400 fill-yellow-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" style={{ width: size, height: size }} />;
  }
  if (type === "bill") {
    return (
      <div
        className="rounded-sm bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-md shadow-green-500/30"
        style={{ width: size * 1.4, height: size * 0.7 }}
      >
        <DollarSign className="text-green-900" style={{ width: size * 0.5, height: size * 0.5 }} />
      </div>
    );
  }
  return (
    <div
      className="rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 shadow-lg shadow-amber-500/40 flex items-center justify-center border border-yellow-300/60"
      style={{ width: size, height: size }}
    >
      <DollarSign className="text-amber-700" style={{ width: size * 0.55, height: size * 0.55 }} />
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────
export const WinCelebration = memo(({
  show, dealTitle, dealValue, formatCurrency, onComplete,
}: WinCelebrationProps) => {
  const [falling, setFalling] = useState<FallingParticle[]>([]);
  const [fireworks, setFireworks] = useState<FireworkParticle[]>([]);
  const [fireworks2, setFireworks2] = useState<FireworkParticle[]>([]);
  const [phase, setPhase] = useState<"idle" | "impact" | "card" | "fadeout">("idle");
  const soundPlayed = useRef(false);

  const displayValue = useCountUp(dealValue, 1200, phase === "card");

  useEffect(() => {
    if (!show) {
      setPhase("idle");
      soundPlayed.current = false;
      return;
    }

    // Phase 1: Impact
    setFalling(generateFalling(45));
    setFireworks(generateFireworks(28));
    setPhase("impact");

    if (!soundPlayed.current) {
      playKaChing();
      triggerHaptic();
      triggerScreenShake();
      soundPlayed.current = true;
    }

    // Phase 2: Card appears
    const t1 = setTimeout(() => setPhase("card"), 350);

    // Second firework wave
    const t1b = setTimeout(() => setFireworks2(generateFireworks(20)), 800);

    // Phase 3: Fade out
    const t2 = setTimeout(() => setPhase("fadeout"), 3500);

    // Phase 4: Done
    const t3 = setTimeout(() => {
      setFalling([]);
      setFireworks([]);
      setFireworks2([]);
      setPhase("idle");
      onComplete?.();
    }, 4200);

    return () => { clearTimeout(t1); clearTimeout(t1b); clearTimeout(t2); clearTimeout(t3); };
  }, [show, onComplete]);

  if (phase === "idle") return null;

  return (
    <>
      {/* ── Background dim ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "fadeout" ? 0 : 1 }}
        transition={{ duration: phase === "fadeout" ? 0.5 : 0.3 }}
        className="fixed inset-0 z-[99] pointer-events-none bg-black/40 backdrop-blur-[2px]"
      />

      <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">

        {/* ── Gold burst flash (bigger, double) ──────────────── */}
        <AnimatePresence>
          {(phase === "impact" || phase === "card") && (
            <>
              <motion.div
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 5, opacity: 0 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(251,191,36,0.6) 0%, rgba(251,191,36,0.2) 35%, transparent 65%)" }}
              />
              <motion.div
                initial={{ scale: 0, opacity: 0.7 }}
                animate={{ scale: 3.5, opacity: 0 }}
                transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(251,191,36,0.3) 30%, transparent 60%)" }}
              />
            </>
          )}
        </AnimatePresence>

        {/* ── Fireworks: center explosion outward ─────────────── */}
        {fireworks.map((p) => (
          <motion.div
            key={`fw1-${p.id}`}
            initial={{
              opacity: 1,
              x: "50vw",
              y: "50vh",
              scale: 0,
            }}
            animate={{
              opacity: [1, 1, 0],
              x: `calc(50vw + ${Math.cos(p.angle) * p.distance}px)`,
              y: `calc(50vh + ${Math.sin(p.angle) * p.distance}px)`,
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: "easeOut",
            }}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            }}
          />
        ))}

        {/* Second wave fireworks */}
        {fireworks2.map((p) => (
          <motion.div
            key={`fw2-${p.id}`}
            initial={{
              opacity: 1,
              x: "50vw",
              y: "50vh",
              scale: 0,
            }}
            animate={{
              opacity: [1, 1, 0],
              x: `calc(50vw + ${Math.cos(p.angle) * p.distance * 0.8}px)`,
              y: `calc(50vh + ${Math.sin(p.angle) * p.distance * 0.8}px)`,
              scale: [0, 1.2, 0],
            }}
            transition={{
              duration: p.duration * 0.9,
              delay: p.delay,
              ease: "easeOut",
            }}
            className="absolute rounded-full"
            style={{
              width: p.size * 0.8,
              height: p.size * 0.8,
              backgroundColor: p.color,
              boxShadow: `0 0 ${p.size}px ${p.color}`,
            }}
          />
        ))}

        {/* ── Falling particles: coins, bills, stars ──────────── */}
        {falling.map((p) => (
          <motion.div
            key={`fall-${p.id}`}
            initial={{
              opacity: 0,
              x: `${p.x}vw`,
              y: "-30px",
              rotate: 0,
              scale: 0,
            }}
            animate={{
              opacity: [0, 1, 1, 0.6, 0],
              y: "108vh",
              x: `calc(${p.x}vw + ${p.wobble}px)`,
              rotate: p.rotation,
              scale: [0, 1.3, 1, 0.9],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay + 0.15, // start slightly after fireworks
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="absolute"
          >
            <ParticleVisual type={p.type} size={p.size} />
          </motion.div>
        ))}

        {/* ── Radial ring pulses ──────────────────────────────── */}
        <AnimatePresence>
          {(phase === "impact" || phase === "card") && (
            <>
              {[0, 0.1, 0.25].map((delay, i) => (
                <motion.div
                  key={`ring-${i}`}
                  initial={{ scale: 0, opacity: 0.7 - i * 0.15, borderWidth: 3 - i }}
                  animate={{ scale: 7 - i, opacity: 0, borderWidth: 1 }}
                  transition={{ duration: 1.3 + i * 0.2, ease: "easeOut", delay }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full"
                  style={{ borderStyle: "solid", borderColor: i === 2 ? "rgba(16,185,129,0.4)" : "rgba(251,191,36,0.5)" }}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* ── "BOOM" impact text ──────────────────────────────── */}
        <AnimatePresence>
          {phase === "impact" && (
            <motion.div
              initial={{ opacity: 0, scale: 3, rotate: -5 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [3, 1, 1.1, 0.5], rotate: [-5, 0, 2, 0] }}
              transition={{ duration: 0.7, times: [0, 0.2, 0.6, 1] }}
              className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <span className="text-6xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 drop-shadow-[0_0_20px_rgba(251,191,36,0.8)] select-none">
                VENDEU!
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Center card ─────────────────────────────────────── */}
        <AnimatePresence>
          {(phase === "card" || phase === "fadeout") && (
            <motion.div
              initial={{ opacity: 0, scale: 0.2, y: 50 }}
              animate={
                phase === "fadeout"
                  ? { opacity: 0, scale: 0.7, y: -40 }
                  : { opacity: 1, scale: 1, y: 0 }
              }
              transition={
                phase === "fadeout"
                  ? { duration: 0.5, ease: "easeIn" }
                  : { duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }
              }
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            >
              <div className="relative">
                {/* Animated glow behind card */}
                <motion.div
                  animate={{
                    background: [
                      "linear-gradient(135deg, #fbbf24, #10b981, #fbbf24)",
                      "linear-gradient(225deg, #10b981, #fbbf24, #10b981)",
                      "linear-gradient(315deg, #fbbf24, #10b981, #fbbf24)",
                    ],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-5 rounded-3xl blur-xl opacity-50"
                />

                {/* Main card */}
                <div className="relative px-10 sm:px-14 py-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-yellow-500/30 shadow-2xl shadow-yellow-500/25">
                  {/* Trophy icon with pulse */}
                  <div className="flex justify-center mb-4">
                    <motion.div
                      initial={{ rotate: -20, scale: 0 }}
                      animate={{ rotate: [0, -5, 5, 0], scale: 1 }}
                      transition={{
                        rotate: { delay: 0.5, duration: 0.4, ease: "easeInOut" },
                        scale: { delay: 0.15, type: "spring", stiffness: 400, damping: 12 },
                      }}
                      className="relative"
                    >
                      <div className="p-4 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-amber-500/50">
                        <Trophy className="h-8 w-8 text-amber-900" />
                      </div>
                      {/* Sparkle ring around trophy */}
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        className="absolute -inset-2"
                      >
                        {[0, 60, 120, 180, 240, 300].map((deg) => (
                          <motion.div
                            key={deg}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: deg / 360 }}
                            className="absolute w-1.5 h-1.5 rounded-full bg-yellow-300"
                            style={{
                              top: "50%",
                              left: "50%",
                              transform: `rotate(${deg}deg) translateY(-22px) translate(-50%, -50%)`,
                            }}
                          />
                        ))}
                      </motion.div>
                    </motion.div>
                  </div>

                  {/* Label */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center justify-center gap-1.5 mb-1"
                  >
                    <Zap className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-[10px] font-black text-yellow-400/90 uppercase tracking-[0.2em]">
                      Negociação Fechada
                    </span>
                    <Zap className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                  </motion.div>

                  {/* Deal name */}
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="text-center text-xl sm:text-2xl font-bold text-white mb-4 max-w-[300px] truncate"
                  >
                    {dealTitle}
                  </motion.h2>

                  {/* Divider with sparkle */}
                  <div className="relative h-px mb-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />
                    <motion.div
                      animate={{ left: ["0%", "100%"] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="absolute top-1/2 -translate-y-1/2 w-8 h-[3px] rounded-full bg-gradient-to-r from-transparent via-yellow-300 to-transparent"
                    />
                  </div>

                  {/* Value with count-up and glow */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 250 }}
                    className="flex items-center justify-center gap-2.5 relative"
                  >
                    <TrendingUp className="h-6 w-6 text-emerald-400" />
                    <span className="text-3xl sm:text-4xl font-black text-emerald-400 tabular-nums tracking-tight drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                      {formatCurrency(displayValue)}
                    </span>
                  </motion.div>

                  {/* Sparkle dots row */}
                  <div className="flex justify-center gap-2 mt-4">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 0.7] }}
                        transition={{ delay: 0.5 + i * 0.08, duration: 0.35 }}
                        className="w-1.5 h-1.5 rounded-full bg-yellow-400"
                        style={{ boxShadow: "0 0 6px rgba(251,191,36,0.6)" }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
});

WinCelebration.displayName = "WinCelebration";
