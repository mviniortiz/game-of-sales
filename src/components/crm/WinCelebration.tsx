import { motion, AnimatePresence } from "framer-motion";
import { memo, useEffect, useState, useRef } from "react";
import { Check, TrendingUp } from "lucide-react";

interface WinCelebrationProps {
  show: boolean;
  dealTitle: string;
  dealValue: number;
  formatCurrency: (v: number) => string;
  onComplete?: () => void;
}

// ── Particle types ──────────────────────────────────────────────
interface Particle {
  id: number;
  angle: number; // radians
  distance: number; // px from origin
  size: number;
  delay: number;
  color: string;
  duration: number;
}

// Paleta focada emerald + gold (premium, não cassino)
const PARTICLE_COLORS = [
  "#00E37A", "#33FF9E", "#66FFB3", // emeralds
  "#fbbf24", "#f59e0b", "#fcd34d", // golds
];

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const generateBurst = (count: number): Particle[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3,
    distance: 140 + Math.random() * 180,
    size: 5 + Math.random() * 6,
    delay: Math.random() * 0.08,
    color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    duration: 0.7 + Math.random() * 0.5,
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
    }, 300);

    return () => { clearTimeout(timeout); cancelAnimationFrame(rafRef.current); };
  }, [target, duration, active]);

  return value;
}

// ── Haptic feedback ─────────────────────────────────────────────
function triggerHaptic() {
  try {
    if (navigator.vibrate) navigator.vibrate([40, 20, 60]);
  } catch { /* not available */ }
}

// ── Subtle success chime (3 notes, no reverb fest) ─────────────
function playChime() {
  try {
    const ctx = new AudioContext();
    const t = ctx.currentTime;

    // Three-note ascending chord: G5 → C6 → E6
    const notes = [
      { freq: 783.99, time: 0, duration: 0.35, gain: 0.14 },  // G5
      { freq: 1046.5, time: 0.08, duration: 0.38, gain: 0.13 }, // C6
      { freq: 1318.5, time: 0.16, duration: 0.5, gain: 0.12 },  // E6
    ];

    notes.forEach(({ freq, time, duration, gain }) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + time);
      g.gain.setValueAtTime(0, t + time);
      g.gain.linearRampToValueAtTime(gain, t + time + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + time + duration);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t + time);
      osc.stop(t + time + duration);
    });

    setTimeout(() => ctx.close(), 1200);
  } catch { /* silent */ }
}

// ── Main Component ──────────────────────────────────────────────
export const WinCelebration = memo(({
  show, dealTitle, dealValue, formatCurrency, onComplete,
}: WinCelebrationProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [phase, setPhase] = useState<"idle" | "burst" | "fadeout">("idle");
  const soundPlayed = useRef(false);

  const displayValue = useCountUp(dealValue, 900, phase === "burst");

  useEffect(() => {
    if (!show) {
      setPhase("idle");
      soundPlayed.current = false;
      return;
    }

    const reduced = prefersReducedMotion();

    setParticles(reduced ? [] : generateBurst(20));
    setPhase("burst");

    if (!soundPlayed.current) {
      playChime();
      triggerHaptic();
      soundPlayed.current = true;
    }

    // Mantém visível por ~2s
    const t1 = setTimeout(() => setPhase("fadeout"), 2000);

    // Remove do DOM
    const t2 = setTimeout(() => {
      setParticles([]);
      setPhase("idle");
      onComplete?.();
    }, 2500);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [show, onComplete]);

  if (phase === "idle") return null;

  return (
    <>
      {/* ── Background dim sutil ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "fadeout" ? 0 : 1 }}
        transition={{ duration: phase === "fadeout" ? 0.4 : 0.25 }}
        className="fixed inset-0 z-[99] pointer-events-none bg-black/30"
      />

      <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">

        {/* ── Burst central: 2 anéis de emerald ───────────────── */}
        <AnimatePresence>
          {phase === "burst" && (
            <>
              <motion.div
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{ scale: 6, opacity: 0 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-2 border-emerald-400/60"
              />
              <motion.div
                initial={{ scale: 0, opacity: 0.6 }}
                animate={{ scale: 4, opacity: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(0,227,122,0.35) 0%, transparent 70%)" }}
              />
            </>
          )}
        </AnimatePresence>

        {/* ── Particle burst (emerald + gold) ─────────────────── */}
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{
              opacity: 0,
              x: "50vw",
              y: "50vh",
              scale: 0,
            }}
            animate={{
              opacity: [0, 1, 1, 0],
              x: `calc(50vw + ${Math.cos(p.angle) * p.distance}px)`,
              y: `calc(50vh + ${Math.sin(p.angle) * p.distance + 120}px)`,
              scale: [0, 1, 0.7],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: "easeOut",
              times: [0, 0.15, 0.7, 1],
            }}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
            }}
          />
        ))}

        {/* ── Center success card (toast-like, clean) ─────────── */}
        <AnimatePresence>
          {(phase === "burst" || phase === "fadeout") && (
            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: 20 }}
              animate={
                phase === "fadeout"
                  ? { opacity: 0, scale: 0.9, y: -10 }
                  : { opacity: 1, scale: 1, y: 0 }
              }
              transition={
                phase === "fadeout"
                  ? { duration: 0.35, ease: "easeIn" }
                  : { duration: 0.45, ease: [0.34, 1.4, 0.64, 1] }
              }
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            >
              <div className="relative">
                {/* Glow estático atrás */}
                <div
                  className="absolute -inset-6 rounded-3xl blur-2xl opacity-40 pointer-events-none"
                  style={{ background: "radial-gradient(circle, rgba(0,227,122,0.6), transparent 70%)" }}
                />

                {/* Card principal */}
                <div className="relative px-9 py-7 rounded-2xl bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-emerald-500/30 shadow-2xl shadow-black/60 min-w-[320px]">
                  {/* Check icon com pulse sutil */}
                  <div className="flex justify-center mb-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 320, damping: 14 }}
                      className="relative"
                    >
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/40">
                        <Check className="w-7 h-7 text-white" strokeWidth={3} />
                      </div>
                    </motion.div>
                  </div>

                  {/* Label */}
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em] mb-1.5"
                  >
                    Negociação ganha
                  </motion.p>

                  {/* Deal name */}
                  <motion.h2
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="text-center text-base font-semibold text-white mb-3 max-w-[280px] truncate mx-auto tracking-tight"
                  >
                    {dealTitle}
                  </motion.h2>

                  {/* Divider suave */}
                  <div className="h-px mb-3 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

                  {/* Value count-up */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 280 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                    <span className="text-3xl font-bold text-emerald-400 tabular-nums tracking-tight">
                      {formatCurrency(displayValue)}
                    </span>
                  </motion.div>
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
