import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  baseX: number;
  baseY: number;
}

export const MouseEffect = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();
  const mouseRef = useRef({ x: -1000, y: -1000 });

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
      'rgba(6, 182, 212, 0.8)',
      'rgba(8, 145, 178, 0.7)',
      'rgba(30, 58, 138, 0.6)',
      'rgba(15, 23, 42, 0.5)',
    ];

    // Initialize particles
    const particleCount = 80;
    particlesRef.current = Array.from({ length: particleCount }, () => {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      return {
        x,
        y,
        baseX: x,
        baseY: y,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    });

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Animation loop
    const animate = () => {
      if (!ctx || !canvas) return;

      // Create mesh gradient background
      ctx.fillStyle = '#0f172a';
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

      // Draw and update particles with mouse interaction
      const mouse = mouseRef.current;
      const attractionRadius = 150;
      const attractionStrength = 0.05;
      const returnStrength = 0.02;

      particlesRef.current.forEach((particle, index) => {
        // Calculate distance to mouse
        const dx = mouse.x - particle.x;
        const dy = mouse.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Apply mouse attraction if within radius
        if (distance < attractionRadius && distance > 0) {
          const force = (attractionRadius - distance) / attractionRadius;
          particle.vx += (dx / distance) * force * attractionStrength;
          particle.vy += (dy / distance) * force * attractionStrength;
        }

        // Gently return to base position
        const dxBase = particle.baseX - particle.x;
        const dyBase = particle.baseY - particle.y;
        particle.vx += dxBase * returnStrength;
        particle.vy += dyBase * returnStrength;

        // Apply damping
        particle.vx *= 0.95;
        particle.vy *= 0.95;

        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around edges and update base position
        if (particle.x < -50) {
          particle.x = canvas.width + 50;
          particle.baseX = particle.x;
        }
        if (particle.x > canvas.width + 50) {
          particle.x = -50;
          particle.baseX = particle.x;
        }
        if (particle.y < -50) {
          particle.y = canvas.height + 50;
          particle.baseY = particle.y;
        }
        if (particle.y > canvas.height + 50) {
          particle.y = -50;
          particle.baseY = particle.y;
        }

        // Pulse opacity
        particle.opacity = 0.3 + Math.sin(time + index * 0.1) * 0.3;

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color.replace(/[\d.]+\)$/g, `${particle.opacity})`);
        ctx.fill();

        // Draw connections between nearby particles
        particlesRef.current.slice(index + 1).forEach(otherParticle => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.strokeStyle = `rgba(6, 182, 212, ${0.1 * (1 - distance / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ touchAction: 'none' }}
    />
  );
};
