import { motion } from "framer-motion";

interface OnboardingSceneProps {
  currentStep?: number;
  className?: string;
}

const SCENE = { w: 900, h: 520 };

export const OnboardingScene = ({ currentStep = 1, className }: OnboardingSceneProps) => {
  const step = Math.min(Math.max(currentStep, 1), 3);

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${SCENE.w} ${SCENE.h}`}
        className="w-full h-full"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
      >
        <Defs />

        <rect width={SCENE.w} height={SCENE.h} fill="url(#os-iso-grid)" />

        <TileHighlights step={step} />

        <DashedPath step={step} />

        <NumberGlyph x={120} y={420} digit="1" active={step >= 1} delay={0} />
        <NumberGlyph x={460} y={380} digit="2" active={step >= 2} delay={0.25} />
        <NumberGlyph x={780} y={230} digit="3" active={step >= 3} delay={0.5} />

        <LightBulbs x={790} y={110} />
        <MiniServer x={200} y={180} />
        <Shield x={690} y={350} unlocked={step >= 2} />

        {step >= 2 && <SyncCloud x={600} y={130} />}

        {step >= 3 && <LabDome x={780} y={140} />}

        <Character x={420} y={290} />

        <BrowserWindow x={470} y={170} step={step} />
      </svg>
    </div>
  );
};

function Defs() {
  return (
    <defs>
      <pattern
        id="os-iso-grid"
        x="0"
        y="0"
        width="40"
        height="23.094"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M 0 11.547 L 20 0 L 40 11.547 L 20 23.094 Z"
          stroke="hsl(var(--foreground))"
          strokeOpacity="0.06"
          strokeWidth="1"
          fill="none"
        />
      </pattern>

      <linearGradient id="os-number-face" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="hsl(160 40% 60%)" stopOpacity="0.2" />
        <stop offset="100%" stopColor="hsl(160 60% 35%)" stopOpacity="0.5" />
      </linearGradient>

      <linearGradient id="os-number-active" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="hsl(160 84% 62%)" />
        <stop offset="100%" stopColor="hsl(160 84% 32%)" />
      </linearGradient>

      <linearGradient id="os-browser" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="hsl(230 45% 14%)" />
        <stop offset="100%" stopColor="hsl(230 55% 8%)" />
      </linearGradient>

      <linearGradient id="os-browser-glow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="hsl(160 84% 50%)" stopOpacity="0.5" />
        <stop offset="100%" stopColor="hsl(160 84% 50%)" stopOpacity="0" />
      </linearGradient>

      <radialGradient id="os-orb" cx="35%" cy="35%" r="60%">
        <stop offset="0%" stopColor="hsl(258 95% 80%)" />
        <stop offset="100%" stopColor="hsl(258 80% 50%)" />
      </radialGradient>

      <radialGradient id="os-orb-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="hsl(258 90% 66%)" stopOpacity="0.35" />
        <stop offset="100%" stopColor="hsl(258 90% 66%)" stopOpacity="0" />
      </radialGradient>

      <linearGradient id="os-cloud" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.35" />
        <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.15" />
      </linearGradient>

      <linearGradient id="os-shield" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="hsl(var(--card))" />
        <stop offset="100%" stopColor="hsl(220 18% 7%)" />
      </linearGradient>
    </defs>
  );
}

function TileHighlights({ step }: { step: number }) {
  const tiles = [
    { x: 120, y: 440, on: step >= 1 },
    { x: 460, y: 400, on: step >= 2 },
    { x: 780, y: 250, on: step >= 3 },
  ];
  return (
    <>
      {tiles.map((t, i) => (
        <polygon
          key={i}
          points={`${t.x},${t.y - 14} ${t.x + 30},${t.y} ${t.x},${t.y + 14} ${t.x - 30},${t.y}`}
          fill={t.on ? "hsl(160 84% 45%)" : "hsl(var(--foreground))"}
          opacity={t.on ? 0.09 : 0.03}
        />
      ))}
    </>
  );
}

function DashedPath({ step }: { step: number }) {
  const D =
    "M 120 420 C 200 420 260 450 320 430 S 400 360 460 380 S 600 360 660 320 S 740 260 780 230";

  return (
    <>
      <path
        d={D}
        stroke="hsl(160 84% 45%)"
        strokeOpacity="0.2"
        strokeWidth="1.5"
        strokeDasharray="5 7"
        strokeLinecap="round"
      />
      <motion.path
        d={D}
        stroke="hsl(160 84% 55%)"
        strokeWidth="2"
        strokeDasharray="6 8"
        strokeLinecap="round"
        initial={{ strokeDashoffset: 0, pathLength: 0 }}
        animate={{
          strokeDashoffset: -28,
          pathLength: step / 3,
        }}
        transition={{
          strokeDashoffset: { duration: 1.8, repeat: Infinity, ease: "linear" },
          pathLength: { duration: 0.8, ease: "easeOut" },
        }}
        style={{ filter: "drop-shadow(0 0 4px rgba(16,185,129,0.35))" }}
      />
    </>
  );
}

function NumberGlyph({
  x,
  y,
  digit,
  active,
  delay,
}: {
  x: number;
  y: number;
  digit: "1" | "2" | "3";
  active: boolean;
  delay: number;
}) {
  const w = 36;
  const h = 18;
  const d = 14;

  return (
    <motion.g
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 3.2 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    >
      <ellipse
        cx={x}
        cy={y + h + d + 4}
        rx={w * 0.8}
        ry={h * 0.35}
        fill="hsl(var(--foreground))"
        opacity="0.1"
      />

      <polygon
        points={`${x + w},${y} ${x + w},${y + d} ${x},${y + h + d} ${x},${y + h}`}
        fill="hsl(220 16% 11%)"
        stroke="hsl(160 60% 35%)"
        strokeOpacity={active ? 0.55 : 0.15}
        strokeWidth="1"
      />
      <polygon
        points={`${x - w},${y} ${x - w},${y + d} ${x},${y + h + d} ${x},${y + h}`}
        fill="hsl(220 16% 9%)"
        stroke="hsl(160 60% 35%)"
        strokeOpacity={active ? 0.55 : 0.15}
        strokeWidth="1"
      />
      <polygon
        points={`${x},${y - h} ${x + w},${y} ${x},${y + h} ${x - w},${y}`}
        fill={active ? "url(#os-number-active)" : "url(#os-number-face)"}
        stroke={active ? "hsl(160 84% 60%)" : "hsl(160 40% 40%)"}
        strokeOpacity={active ? 0.9 : 0.25}
        strokeWidth="1"
      />

      <text
        x={x}
        y={y - 30}
        textAnchor="middle"
        fontSize="60"
        fontWeight="900"
        fill={active ? "hsl(160 84% 70%)" : "hsl(var(--foreground))"}
        fillOpacity={active ? 1 : 0.18}
        style={{
          fontFamily: "var(--font-heading), sans-serif",
          filter: active ? "drop-shadow(0 0 14px rgba(16,185,129,0.45))" : "none",
          letterSpacing: "-0.05em",
        }}
      >
        {digit}
      </text>
    </motion.g>
  );
}

function Character({ x, y }: { x: number; y: number }) {
  const shirtColor = "#f5a742";
  const shirtShade = "#c4822c";
  const pantsColor = "#1f2e4a";
  const skinColor = "#f4cba3";
  const hairColor = "#2a1f1a";

  return (
    <motion.g
      animate={{ y: [0, -2, 0] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
    >
      <ellipse cx={x} cy={y + 70} rx="22" ry="5" fill="hsl(var(--foreground))" opacity="0.18" />

      <ellipse cx={x} cy={y + 62} rx="22" ry="7" fill="hsl(180 60% 35%)" opacity="0.6" />
      <ellipse cx={x} cy={y + 58} rx="22" ry="7" fill="hsl(180 80% 55%)" opacity="0.9" />
      <rect x={x - 22} y={y + 55} width="44" height="8" fill="hsl(180 70% 45%)" opacity="0.6" />

      <path
        d={`M ${x - 6} ${y + 58} L ${x - 6} ${y + 40} Q ${x - 6} ${y + 38} ${x - 4} ${y + 38} L ${x + 4} ${y + 38} Q ${x + 6} ${y + 38} ${x + 6} ${y + 40} L ${x + 6} ${y + 58} Z`}
        fill="#0f0f0f"
      />
      <ellipse cx={x - 4} cy={y + 60} rx="5" ry="2.5" fill="#0f0f0f" />
      <ellipse cx={x + 5} cy={y + 60} rx="5" ry="2.5" fill="#0f0f0f" />

      <path
        d={`M ${x - 7} ${y + 20} L ${x + 7} ${y + 20} L ${x + 9} ${y + 42} L ${x - 9} ${y + 42} Z`}
        fill={pantsColor}
      />
      <line x1={x} y1={y + 21} x2={x} y2={y + 41} stroke="#0f1828" strokeWidth="0.5" />

      <path
        d={`M ${x - 12} ${y - 5} L ${x + 12} ${y - 5} L ${x + 14} ${y + 22} L ${x - 14} ${y + 22} Z`}
        fill={shirtColor}
      />
      <path
        d={`M ${x + 12} ${y - 5} L ${x + 14} ${y + 22} L ${x + 8} ${y + 22} L ${x + 7} ${y - 3} Z`}
        fill={shirtShade}
        opacity="0.5"
      />

      <path
        d={`M ${x + 12} ${y - 3} Q ${x + 22} ${y + 2} ${x + 32} ${y + 10}`}
        stroke={shirtColor}
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M ${x + 30} ${y + 9} Q ${x + 34} ${y + 11} ${x + 36} ${y + 12}`}
        stroke={skinColor}
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />

      <path
        d={`M ${x - 12} ${y - 3} Q ${x - 14} ${y + 4} ${x - 13} ${y + 14}`}
        stroke={shirtColor}
        strokeWidth="5.5"
        strokeLinecap="round"
        fill="none"
      />

      <circle cx={x} cy={y - 12} r="10" fill={skinColor} />
      <path
        d={`M ${x - 10} ${y - 14} Q ${x - 10} ${y - 24} ${x} ${y - 23} Q ${x + 10} ${y - 22} ${x + 10} ${y - 13} L ${x + 10} ${y - 10} Q ${x + 7} ${y - 13} ${x + 2} ${y - 13} Q ${x - 3} ${y - 13} ${x - 10} ${y - 10} Z`}
        fill={hairColor}
      />
      <circle cx={x - 4} cy={y - 11} r="1.5" fill="#0f0f0f" />
      <circle cx={x + 4} cy={y - 11} r="1.5" fill="#0f0f0f" />
      <line x1={x - 1} y1={y - 11} x2={x + 1} y2={y - 11} stroke="#0f0f0f" strokeWidth="0.6" />
    </motion.g>
  );
}

function BrowserWindow({ x, y, step }: { x: number; y: number; step: number }) {
  const w = 240;
  const h = 150;

  return (
    <motion.g
      animate={{ y: [0, -2, 0] }}
      transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
    >
      <rect
        x={x - 10}
        y={y + h + 8}
        width={w + 20}
        height="10"
        fill="url(#os-browser-glow)"
        opacity="0.4"
      />

      <rect x={x} y={y} width={w} height={h} fill="url(#os-browser)" rx="4" />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="none"
        stroke="hsl(230 40% 25%)"
        strokeOpacity="0.6"
        strokeWidth="1"
        rx="4"
      />

      <rect x={x} y={y} width={w} height="18" fill="hsl(230 45% 11%)" rx="4" />
      <circle cx={x + 10} cy={y + 9} r="3" fill="#ff5f57" />
      <circle cx={x + 22} cy={y + 9} r="3" fill="#febc2e" />
      <circle cx={x + 34} cy={y + 9} r="3" fill="#28c840" />

      <BrowserContent x={x} y={y + 28} w={w} step={step} />
    </motion.g>
  );
}

function BrowserContent({
  x,
  y,
  w,
  step,
}: {
  x: number;
  y: number;
  w: number;
  step: number;
}) {
  if (step === 1) {
    return (
      <g>
        <rect x={x + 20} y={y + 10} width={w - 40} height="10" rx="3" fill="hsl(230 30% 35%)" opacity="0.5" />
        <rect x={x + 20} y={y + 28} width={(w - 40) * 0.7} height="8" rx="3" fill="hsl(230 30% 30%)" opacity="0.4" />
        <motion.rect
          x={x + 20}
          y={y + 54}
          width={w - 40}
          height="26"
          rx="4"
          fill="hsl(160 84% 40%)"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <rect x={x + 20} y={y + 90} width={(w - 40) * 0.5} height="8" rx="3" fill="hsl(230 30% 25%)" opacity="0.4" />
      </g>
    );
  }
  if (step === 2) {
    return (
      <g>
        <rect
          x={x + 20}
          y={y + 6}
          width={w - 40}
          height="38"
          rx="19"
          fill="none"
          stroke="hsl(200 90% 70%)"
          strokeOpacity="0.5"
          strokeWidth="1"
        />
        {[0, 1, 2, 3].map((i) => (
          <motion.circle
            key={i}
            cx={x + w / 2 - 18 + i * 12}
            cy={y + 25}
            r="3"
            fill="hsl(200 90% 80%)"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
        <rect x={x + 20} y={y + 60} width={w - 40} height="6" rx="3" fill="hsl(230 30% 30%)" opacity="0.5" />
        <rect x={x + 20} y={y + 74} width={(w - 40) * 0.75} height="6" rx="3" fill="hsl(230 30% 30%)" opacity="0.4" />
        <rect x={x + 20} y={y + 92} width={w - 40} height="20" rx="4" fill="hsl(200 90% 50%)" opacity="0.85" />
      </g>
    );
  }
  return (
    <g>
      <rect x={x + 16} y={y + 6} width="6" height="60" fill="hsl(230 30% 30%)" opacity="0.35" />
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={x + 16}
          y={y + 66 - (i + 1) * 14}
          width="6"
          height={(i + 1) * 14}
          fill="hsl(200 90% 55%)"
          opacity={0.3 + i * 0.15}
        />
      ))}
      <motion.polyline
        points={`${x + 34},${y + 50} ${x + 60},${y + 30} ${x + 90},${y + 42} ${x + 120},${y + 18} ${x + 160},${y + 32} ${x + 200},${y + 12}`}
        stroke="hsl(200 90% 70%)"
        strokeWidth="1.5"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.8, ease: "easeOut" }}
      />
      {[
        { cx: 60, cy: 30 },
        { cx: 90, cy: 42 },
        { cx: 120, cy: 18 },
        { cx: 160, cy: 32 },
        { cx: 200, cy: 12 },
      ].map((p, i) => (
        <circle key={i} cx={x + p.cx} cy={y + p.cy} r="2.2" fill="hsl(200 90% 75%)" />
      ))}
      <path
        d={`M ${x + 34} ${y + 90} Q ${x + 70} ${y + 80} ${x + 110} ${y + 95} T ${x + 210} ${y + 88} L ${x + 210} ${y + 110} L ${x + 34} ${y + 110} Z`}
        fill="hsl(200 90% 50%)"
        opacity="0.4"
      />
    </g>
  );
}

function Shield({ x, y, unlocked }: { x: number; y: number; unlocked: boolean }) {
  return (
    <motion.g
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
    >
      <ellipse cx={x} cy={y + 45} rx="24" ry="5" fill="hsl(var(--foreground))" opacity="0.1" />
      <path
        d={`M ${x} ${y - 28} L ${x + 22} ${y - 18} L ${x + 22} ${y + 10} Q ${x + 22} ${y + 28} ${x} ${y + 38} Q ${x - 22} ${y + 28} ${x - 22} ${y + 10} L ${x - 22} ${y - 18} Z`}
        fill="url(#os-shield)"
        stroke="hsl(160 60% 40%)"
        strokeOpacity={unlocked ? 0.7 : 0.3}
        strokeWidth="1.2"
      />
      {unlocked ? (
        <g>
          <rect x={x - 6} y={y + 2} width="12" height="10" rx="2" fill="hsl(160 84% 55%)" />
          <path
            d={`M ${x - 4} ${y + 2} L ${x - 4} ${y - 4} Q ${x - 4} ${y - 10} ${x + 2} ${y - 10}`}
            stroke="hsl(160 84% 55%)"
            strokeWidth="2"
            fill="none"
          />
        </g>
      ) : (
        <g>
          <rect x={x - 6} y={y + 2} width="12" height="10" rx="2" fill="hsl(220 15% 45%)" />
          <path
            d={`M ${x - 4} ${y + 2} L ${x - 4} ${y - 4} Q ${x - 4} ${y - 10} ${x + 4} ${y - 10} Q ${x + 4} ${y - 4} ${x + 4} ${y + 2}`}
            stroke="hsl(220 15% 45%)"
            strokeWidth="2"
            fill="none"
          />
        </g>
      )}
    </motion.g>
  );
}

function SyncCloud({ x, y }: { x: number; y: number }) {
  return (
    <motion.g
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
    >
      <path
        d={`M ${x - 22} ${y + 5} Q ${x - 30} ${y + 5} ${x - 30} ${y - 3} Q ${x - 30} ${y - 12} ${x - 20} ${y - 12} Q ${x - 16} ${y - 22} ${x - 4} ${y - 22} Q ${x + 8} ${y - 22} ${x + 14} ${y - 14} Q ${x + 24} ${y - 14} ${x + 24} ${y - 4} Q ${x + 24} ${y + 5} ${x + 16} ${y + 5} Z`}
        fill="url(#os-cloud)"
        stroke="hsl(var(--muted-foreground))"
        strokeOpacity="0.4"
        strokeWidth="0.8"
      />
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: `${x}px ${y - 8}px` }}
      >
        <path
          d={`M ${x - 6} ${y - 10} A 6 6 0 1 1 ${x + 6} ${y - 10}`}
          stroke="hsl(160 84% 55%)"
          strokeWidth="1.5"
          fill="none"
        />
        <polygon points={`${x + 5},${y - 14} ${x + 9},${y - 10} ${x + 4},${y - 8}`} fill="hsl(160 84% 55%)" />
      </motion.g>
    </motion.g>
  );
}

function LabDome({ x, y }: { x: number; y: number }) {
  return (
    <motion.g
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
    >
      <ellipse cx={x} cy={y + 50} rx="28" ry="5" fill="hsl(var(--foreground))" opacity="0.12" />
      <rect x={x - 26} y={y + 26} width="52" height="24" rx="3" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1" />
      <path
        d={`M ${x - 22} ${y + 26} Q ${x - 22} ${y - 10} ${x} ${y - 12} Q ${x + 22} ${y - 10} ${x + 22} ${y + 26} Z`}
        fill="hsl(258 40% 40%)"
        fillOpacity="0.12"
        stroke="hsl(258 60% 60%)"
        strokeOpacity="0.35"
        strokeWidth="1"
      />
      <circle cx={x} cy={y + 26} r="40" fill="url(#os-orb-glow)" />
      <circle cx={x} cy={y + 10} r="8" fill="url(#os-orb)" />
      <circle cx={x - 2} cy={y + 8} r="2.5" fill="white" opacity="0.4" />
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: `${x}px ${y + 10}px` }}
      >
        <ellipse
          cx={x}
          cy={y + 10}
          rx="16"
          ry="6"
          stroke="hsl(258 90% 70%)"
          strokeOpacity="0.4"
          strokeWidth="0.8"
          fill="none"
        />
      </motion.g>
    </motion.g>
  );
}

function LightBulbs({ x, y }: { x: number; y: number }) {
  const bulbs = [
    { dx: -20, color: "hsl(258 90% 70%)", delay: 0 },
    { dx: 0, color: "hsl(340 90% 65%)", delay: 0.3 },
    { dx: 20, color: "hsl(190 90% 60%)", delay: 0.6 },
  ];
  return (
    <g>
      {bulbs.map((b, i) => (
        <motion.g
          key={i}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: b.delay }}
        >
          <ellipse cx={x + b.dx} cy={y + 18} rx="7" ry="2" fill="hsl(var(--muted-foreground))" opacity="0.3" />
          <rect x={x + b.dx - 3} y={y + 10} width="6" height="6" fill="hsl(var(--muted-foreground))" opacity="0.5" />
          <circle cx={x + b.dx} cy={y + 2} r="7" fill={b.color} opacity="0.85" />
          <circle cx={x + b.dx} cy={y + 2} r="11" fill={b.color} opacity="0.18" />
        </motion.g>
      ))}
    </g>
  );
}

function MiniServer({ x, y }: { x: number; y: number }) {
  return (
    <motion.g
      animate={{ y: [0, -2, 0] }}
      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
    >
      <ellipse cx={x} cy={y + 30} rx="18" ry="4" fill="hsl(var(--foreground))" opacity="0.1" />
      <polygon
        points={`${x + 18},${y} ${x + 18},${y + 22} ${x},${y + 30} ${x},${y + 8}`}
        fill="hsl(220 18% 10%)"
        stroke="hsl(var(--border))"
        strokeWidth="0.8"
      />
      <polygon
        points={`${x - 18},${y} ${x - 18},${y + 22} ${x},${y + 30} ${x},${y + 8}`}
        fill="hsl(220 18% 8%)"
        stroke="hsl(var(--border))"
        strokeWidth="0.8"
      />
      <polygon
        points={`${x},${y - 8} ${x + 18},${y} ${x},${y + 8} ${x - 18},${y}`}
        fill="hsl(220 14% 18%)"
        stroke="hsl(var(--border))"
        strokeWidth="0.8"
      />
      {[0, 1, 2].map((i) => (
        <motion.rect
          key={i}
          x={x - 10}
          y={y + 6 + i * 6}
          width="20"
          height="2"
          fill="hsl(160 84% 45%)"
          animate={{ opacity: [0.3, 0.9, 0.3] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.25 }}
        />
      ))}
    </motion.g>
  );
}
