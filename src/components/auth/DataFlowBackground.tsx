import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

const DataFlowBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Branding colors: Cyan/Teal and Deep Blue
    const colors = [
      'rgba(6, 182, 212, 0.8)',    // Cyan
      'rgba(8, 145, 178, 0.7)',    // Teal
      'rgba(30, 58, 138, 0.6)',    // Deep Blue
      'rgba(15, 23, 42, 0.5)',     // Very Dark Blue
    ];

    // Initialize particles
    const particleCount = 80;
    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    // Animation loop
    const animate = () => {
      if (!ctx || !canvas) return;

      // Create mesh gradient background
      ctx.fillStyle = '#0f172a'; // Dark base
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add multiple radial gradients for mesh effect
      const time = Date.now() * 0.0003;
      
      // First gradient (Cyan)
      const gradient1 = ctx.createRadialGradient(
        canvas.width * (0.3 + Math.sin(time) * 0.1),
        canvas.height * (0.4 + Math.cos(time * 0.8) * 0.1),
        0,
        canvas.width * 0.3,
        canvas.height * 0.4,
        canvas.width * 0.6
      );
      gradient1.addColorStop(0, 'rgba(6, 182, 212, 0.15)');
      gradient1.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = gradient1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Second gradient (Deep Blue)
      const gradient2 = ctx.createRadialGradient(
        canvas.width * (0.7 + Math.cos(time * 1.2) * 0.1),
        canvas.height * (0.6 + Math.sin(time * 0.6) * 0.1),
        0,
        canvas.width * 0.7,
        canvas.height * 0.6,
        canvas.width * 0.5
      );
      gradient2.addColorStop(0, 'rgba(30, 58, 138, 0.2)');
      gradient2.addColorStop(1, 'rgba(30, 58, 138, 0)');
      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Third gradient (Teal)
      const gradient3 = ctx.createRadialGradient(
        canvas.width * (0.5 + Math.sin(time * 0.7) * 0.15),
        canvas.height * (0.3 + Math.cos(time) * 0.15),
        0,
        canvas.width * 0.5,
        canvas.height * 0.3,
        canvas.width * 0.4
      );
      gradient3.addColorStop(0, 'rgba(8, 145, 178, 0.12)');
      gradient3.addColorStop(1, 'rgba(8, 145, 178, 0)');
      ctx.fillStyle = gradient3;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw and update particles
      particlesRef.current.forEach((particle, index) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Pulse opacity
        particle.opacity = 0.3 + Math.sin(time + index * 0.1) * 0.3;

        // Draw particle with glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = particle.color;
        ctx.fillStyle = particle.color.replace(/[\d.]+\)$/, `${particle.opacity})`);
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw connections to nearby particles
        particlesRef.current.forEach((otherParticle, otherIndex) => {
          if (otherIndex <= index) return;

          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            ctx.strokeStyle = `rgba(6, 182, 212, ${0.15 * (1 - distance / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.stroke();
          }
        });
      });

      ctx.shadowBlur = 0;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ mixBlendMode: 'normal' }}
    />
  );
};

export default DataFlowBackground;
