import { motion } from "framer-motion";

interface EvaAvatarProps {
  size?: number;
  className?: string;
  thinking?: boolean;
}

export const EvaAvatar = ({ size = 32, className = "", thinking = false }: EvaAvatarProps) => {
  const id = `eva-${size}`;
  const scale = size / 40;

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`${id}-orb`} x1="14" y1="10" x2="26" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Glow when thinking */}
        {thinking && <circle cx="20" cy="20" r="19" fill={`url(#${id}-glow)`} />}

        {/* Orbital ring — horizontal */}
        <ellipse
          cx="20" cy="20" rx="16" ry="6"
          stroke="#8b5cf6"
          strokeOpacity={thinking ? "0.5" : "0.25"}
          strokeWidth="1"
          fill="none"
        />

        {/* Orbital ring — diagonal */}
        <ellipse
          cx="20" cy="20" rx="6" ry="16"
          stroke="#8b5cf6"
          strokeOpacity={thinking ? "0.35" : "0.15"}
          strokeWidth="0.8"
          fill="none"
          transform="rotate(-30 20 20)"
        />

        {/* Central orb */}
        <circle cx="20" cy="20" r="5.5" fill={`url(#${id}-orb)`} />
        <circle cx="18" cy="18" r="2" fill="white" opacity="0.25" />

        {/* Static electron dots — only when NOT thinking */}
        {!thinking && (
          <>
            <circle cx="35" cy="17" r={2.5 * scale > 1.5 ? 2.5 : 1.5} fill="#a78bfa" opacity="0.7" />
            <circle cx="11" cy="7" r={1.8 * scale > 1 ? 1.8 : 1} fill="#a78bfa" opacity="0.4" />
          </>
        )}
      </svg>

      {/* Animated electrons — only when thinking */}
      {thinking && (
        <>
          <motion.div
            className="absolute"
            style={{
              width: 6 * scale,
              height: 6 * scale,
              top: "50%",
              left: "50%",
            }}
            animate={{
              x: [16 * scale, 0, -16 * scale, 0, 16 * scale].map(v => v - 3 * scale),
              y: [0, -6 * scale, 0, 6 * scale, 0].map(v => v - 3 * scale),
            }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
          >
            <div
              className="w-full h-full rounded-full"
              style={{
                background: "radial-gradient(circle, #a78bfa 0%, #7c3aed 60%, transparent 100%)",
                boxShadow: "0 0 8px 2px rgba(139, 92, 246, 0.5)",
              }}
            />
          </motion.div>

          <motion.div
            className="absolute"
            style={{
              width: 4 * scale,
              height: 4 * scale,
              top: "50%",
              left: "50%",
            }}
            animate={{
              // Cardinais da elipse (rx=6, ry=16) após rotação de -30°
              x: [5.2 * scale, -8 * scale, -5.2 * scale, 8 * scale, 5.2 * scale].map(v => v - 2 * scale),
              y: [-3 * scale, -13.86 * scale, 3 * scale, 13.86 * scale, -3 * scale].map(v => v - 2 * scale),
            }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
          >
            <div
              className="w-full h-full rounded-full"
              style={{
                background: "radial-gradient(circle, #c4b5fd 0%, #8b5cf6 60%, transparent 100%)",
                boxShadow: "0 0 6px 1px rgba(139, 92, 246, 0.4)",
              }}
            />
          </motion.div>
        </>
      )}
    </div>
  );
};

// ─── Sidebar icon (static, uses currentColor) ─────────────────────

export const EvaIcon = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <ellipse cx="12" cy="12" rx="10" ry="4" stroke="currentColor" strokeWidth="1.3" fill="none" opacity="0.4" />
    <ellipse cx="12" cy="12" rx="4" ry="10" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.25" transform="rotate(-30 12 12)" />
    <circle cx="12" cy="12" r="3.5" fill="currentColor" opacity="0.85" />
    <circle cx="21" cy="10" r="1.3" fill="currentColor" opacity="0.7" />
    <circle cx="5" cy="17" r="1" fill="currentColor" opacity="0.45" />
  </svg>
);
