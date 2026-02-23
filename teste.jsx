import React, { useEffect, useRef } from 'react';
import { motion, useInView, useAnimation } from 'framer-motion';
import { Target, Zap, Trophy, TrendingUp, Users, Target as Crosshair, Award, ChevronRight, BarChart3, Star } from 'lucide-react';

// --- CSS Injector for Fonts & Custom Keyframes ---
const injectStyles = () => {
  if (typeof window === 'undefined') return;
  const style = document.createElement('style');
  style.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@400;600;800&display=swap');
    
    body {
      background-color: #0A0F1E;
      color: #CBD5E1;
      font-family: 'Inter', sans-serif;
      overflow-x: hidden;
    }
    
    h1, h2, h3, h4, h5, h6, .font-heading {
      font-family: 'Space Grotesk', sans-serif;
      letter-spacing: -0.02em;
    }

    .bg-grid-pattern {
      background-image: radial-gradient(rgba(6, 182, 212, 0.15) 1px, transparent 1px);
      background-size: 24px 24px;
    }

    /* SVG Animations */
    @keyframes barGrow {
      from { height: 0; y: 350; }
      to { height: var(--target-h); y: var(--target-y); }
    }
    
    @keyframes crownHover {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
    
    @keyframes scanline {
      0% { transform: translateY(-50px); }
      100% { transform: translateY(450px); }
    }
    
    @keyframes floatParticle {
      0% { transform: translateY(400px) scale(var(--s)); opacity: 0; }
      10% { opacity: 0.6; }
      90% { opacity: 0.6; }
      100% { transform: translateY(-50px) scale(var(--s)); opacity: 0; }
    }

    @keyframes countFade {
      0% { opacity: 0; transform: translateY(10px); }
      100% { opacity: 1; transform: translateY(0); }
    }

    @keyframes dashDraw {
      to { stroke-dashoffset: 0; }
    }

    @keyframes marquee {
      0% { transform: translateX(0%); }
      100% { transform: translateX(-50%); }
    }

    .bar-anim { animation: barGrow 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .crown-anim { animation: crownHover 2s ease-in-out infinite; transform-origin: center; }
    .scan-anim { animation: scanline 4s linear infinite; }
    .particle-anim { animation: floatParticle linear infinite; }
    .count-anim { animation: countFade 0.5s ease-out forwards; opacity: 0; }
    .dash-anim { stroke-dasharray: 10 10; stroke-dashoffset: 1000; animation: dashDraw 20s linear infinite; }
    .marquee-anim { animation: marquee 30s linear infinite; display: flex; width: max-content; }
  `;
  document.head.appendChild(style);
};

// --- Reusable Animated Counter Component ---
const AnimatedCounter = ({ value, suffix = "", prefix = "" }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!isInView || !ref.current) return;
    let startTimestamp = null;
    const duration = 2000; // 2 seconds

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3); // Cubic ease out
      const currentVal = Math.floor(easeOut * value);

      if (ref.current) {
        ref.current.innerText = `${prefix}${currentVal}${suffix}`;
      }

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        if (ref.current) ref.current.innerText = `${prefix}${value}${suffix}`;
      }
    };

    window.requestAnimationFrame(step);
  }, [isInView, value, prefix, suffix]);

  return <span ref={ref} className="font-heading font-bold text-5xl md:text-6xl text-[#06B6D4] drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]">0{suffix}</span>;
};

// --- Components ---

const HeroSVG = () => {
  const bars = [
    { name: 'Mateus', h: 140, y: 210, delay: '0.1s', score: '3.2k' },
    { name: 'Sofia', h: 180, y: 170, delay: '0.2s', score: '4.5k' },
    { name: 'Ana', h: 260, y: 90, delay: '0.4s', score: '8.9k', isWinner: true },
    { name: 'Lucas', h: 210, y: 140, delay: '0.3s', score: '6.1k' },
    { name: 'Joao', h: 100, y: 250, delay: '0.0s', score: '2.1k' },
  ];

  const particles = Array.from({ length: 8 }).map((_, i) => ({
    x: Math.random() * 460 + 20,
    s: Math.random() * 0.5 + 0.5,
    dur: Math.random() * 3 + 4,
    del: Math.random() * 2
  }));

  return (
    <div className="relative w-full max-w-[500px] aspect-[5/4] drop-shadow-[0_0_30px_rgba(6,182,212,0.15)] mx-auto">
      <svg viewBox="0 0 500 400" className="w-full h-full rounded-2xl bg-[#0D1526] border border-[#111827] overflow-hidden">
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="1" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="winnerGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="1" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.3" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="scanline" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0" />
            <stop offset="50%" stopColor="#06B6D4" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid Background */}
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#111827" strokeWidth="1" />
        </pattern>
        <rect width="500" height="400" fill="url(#grid)" />

        {/* Particles */}
        {particles.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy="0"
            r="3"
            fill="#06B6D4"
            className="particle-anim"
            style={{ '--s': p.s, animationDuration: `${p.dur}s`, animationDelay: `${p.del}s` }}
          />
        ))}

        {/* Scanline */}
        <rect width="500" height="60" fill="url(#scanline)" className="scan-anim" />

        {/* Leaderboard Lines */}
        <line x1="40" y1="350" x2="460" y2="350" stroke="#111827" strokeWidth="2" />

        {/* Bars */}
        {bars.map((bar, i) => {
          const xPos = 65 + (i * 80);
          return (
            <g key={i}>
              {/* Ghost Bar background */}
              <rect x={xPos} y="60" width="40" height="290" fill="#111827" fillOpacity="0.3" rx="4" />

              {/* Animated Bar */}
              <rect
                x={xPos}
                y="350"
                width="40"
                height="0"
                rx="4"
                fill={bar.isWinner ? "url(#winnerGrad)" : "url(#barGrad)"}
                filter={bar.isWinner ? "url(#glow)" : ""}
                className="bar-anim"
                style={{
                  '--target-h': `${bar.h}px`,
                  '--target-y': `${bar.y}px`,
                  animationDelay: bar.delay
                }}
              />

              {/* Score Label */}
              <text
                x={xPos + 20}
                y={bar.y - 15}
                fill="#FFFFFF"
                fontSize="14"
                fontWeight="bold"
                fontFamily="'Space Grotesk', sans-serif"
                textAnchor="middle"
                className="count-anim"
                style={{ animationDelay: `calc(${bar.delay} + 1.2s)` }}
              >
                {bar.score}
              </text>

              {/* Name Label */}
              <text
                x={xPos + 20}
                y="375"
                fill="#64748B"
                fontSize="12"
                fontFamily="'Inter', sans-serif"
                textAnchor="middle"
              >
                {bar.name}
              </text>

              {/* Crown for winner */}
              {bar.isWinner && (
                <g transform={`translate(${xPos + 5}, ${bar.y - 50})`} className="crown-anim count-anim" style={{ animationDelay: `calc(${bar.delay} + 1.5s)` }}>
                  <path
                    d="M3 12L7 2L15 12L23 2L27 12V18H3V12Z"
                    fill="#F59E0B"
                    filter="drop-shadow(0px 4px 6px rgba(245, 158, 11, 0.4))"
                  />
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default function GameSalesLanding() {
  useEffect(() => {
    injectStyles();
  }, []);

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  return (
    <div className="bg-[#0A0F1E] text-[#CBD5E1] min-h-screen selection:bg-[#06B6D4] selection:text-white">
      {/* Navbar (Simplified) */}
      <nav className="fixed top-0 w-full z-50 bg-[#0A0F1E]/80 backdrop-blur-md border-b border-[#111827]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-heading font-bold text-2xl tracking-tight">
            <Trophy className="text-[#06B6D4] w-7 h-7" />
            GameSales
          </div>
          <div className="hidden md:flex gap-8 text-sm font-medium">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
          </div>
          <button className="bg-[#F59E0B] hover:bg-[#D97706] text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] transform hover:-translate-y-0.5">
            Play Free
          </button>
        </div>
      </nav>

      {/* 1. Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden min-h-[90vh] flex items-center">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-grid-pattern opacity-40 z-0" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-[#06B6D4] rounded-full blur-[150px] opacity-10 pointer-events-none z-0" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="flex flex-col items-start text-left"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#06B6D4]/30 bg-[#06B6D4]/5 text-[#06B6D4] text-xs font-semibold tracking-wide uppercase mb-6">
              <Zap className="w-4 h-4" />
              The Future of Sales Performance
            </motion.div>
            <motion.h1 variants={fadeUp} className="font-heading text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] mb-6">
              Close Deals.<br />
              Beat the Board.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#06B6D4] to-[#4DD0E1]">Win.</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-lg md:text-xl text-[#64748B] mb-10 max-w-lg leading-relaxed">
              Game Sales turns your CRM into a competitive arena — with leaderboards, missions, XP, and real-time rankings that make your team <strong className="text-white font-medium">want</strong> to sell more.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <button className="flex items-center justify-center gap-2 bg-[#F59E0B] hover:bg-[#D97706] text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transform hover:-translate-y-1">
                Start Playing Free <ChevronRight className="w-5 h-5" />
              </button>
              <button className="flex items-center justify-center gap-2 bg-transparent hover:bg-[#111827] border border-[#111827] hover:border-[#06B6D4]/30 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all">
                Watch Demo
              </button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full flex justify-center lg:justify-end"
          >
            <HeroSVG />
          </motion.div>
        </div>
      </section>

      {/* 2. Social Proof Ticker */}
      <div className="border-y border-[#111827] bg-[#0A0F1E]/50 py-6 overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0A0F1E] to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0A0F1E] to-transparent z-10" />

        <p className="text-center text-xs font-bold uppercase tracking-widest text-[#64748B] mb-6">Trusted by high-performance sales teams</p>

        <div className="flex w-full overflow-hidden">
          <div className="marquee-anim gap-16 pr-16 items-center opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {['Acme Corp', 'GlobalTech', 'Nexus Systems', 'Stark Industries', 'Wayne Enterprises', 'Hooli', 'Initech', 'Soylent'].map((logo, i) => (
              <span key={i} className="text-xl font-heading font-bold text-white whitespace-nowrap">
                {logo}
              </span>
            ))}
            {/* Duplicate for seamless looping */}
            {['Acme Corp', 'GlobalTech', 'Nexus Systems', 'Stark Industries', 'Wayne Enterprises', 'Hooli', 'Initech', 'Soylent'].map((logo, i) => (
              <span key={`dup-${i}`} className="text-xl font-heading font-bold text-white whitespace-nowrap">
                {logo}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Impact Metrics */}
      <section className="py-24 px-6 relative max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {[
            { v: 47, s: "%", p: "+", label: "Close Rate", desc: "Average increase in deals closed within the first 60 days." },
            { v: 2, s: "×", p: "", label: "Pipeline Velocity", desc: "Faster deal cycles driven by gamified urgency." },
            { v: 98, s: "%", p: "", label: "Team Adoption", desc: "Sales reps actually enjoy updating their CRM." }
          ].map((stat, i) => (
            <motion.div key={i} variants={fadeUp} className="bg-[#0D1526] p-10 rounded-2xl border border-[#111827] hover:border-[#06B6D4]/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] group">
              <div className="mb-4">
                <AnimatedCounter value={stat.v} suffix={stat.s} prefix={stat.p} />
              </div>
              <h3 className="text-white font-heading font-bold text-xl mb-2 group-hover:text-[#06B6D4] transition-colors">{stat.label}</h3>
              <p className="text-[#64748B] text-sm leading-relaxed">{stat.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* 4. How It Works */}
      <section id="how-it-works" className="py-24 px-6 bg-[#0D1526] relative border-y border-[#111827] overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#06B6D4] rounded-full blur-[200px] opacity-[0.03] pointer-events-none" />

        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-white mb-6">How the Game is Played</h2>
            <p className="text-lg text-[#64748B] max-w-2xl mx-auto">Three simple steps to transform your boring pipeline into a high-stakes revenue engine.</p>
          </div>

          <div className="relative">
            {/* Desktop Connecting Line */}
            <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 z-0">
              <svg width="100%" height="2" preserveAspectRatio="none">
                <line x1="0" y1="1" x2="100%" y2="1" stroke="#06B6D4" strokeWidth="2" strokeOpacity="0.3" className="dash-anim" />
              </svg>
            </div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10"
            >
              {[
                { icon: <Crosshair className="w-8 h-8 text-[#06B6D4]" />, title: "Set Your Mission", desc: "Define quotas, call targets, and revenue goals as in-game quests for your team." },
                { icon: <BarChart3 className="w-8 h-8 text-[#06B6D4]" />, title: "Compete Real-Time", desc: "Watch the live leaderboard shift as reps log activities and close deals." },
                { icon: <Award className="w-8 h-8 text-[#06B6D4]" />, title: "Earn Rewards", desc: "Unlock badges, level up profiles, and trigger real-world incentives for top performers." }
              ].map((step, i) => (
                <motion.div key={i} variants={fadeUp} className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-2xl bg-[#0A0F1E] border border-[#111827] flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(6,182,212,0.1)] relative group">
                    <div className="absolute inset-0 bg-[#06B6D4] opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300" />
                    {step.icon}
                  </div>
                  <div className="bg-[#06B6D4]/10 text-[#06B6D4] font-bold text-sm px-3 py-1 rounded-full mb-4">Step 0{i + 1}</div>
                  <h3 className="font-heading text-2xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-[#64748B]">{step.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* 5. Product Bento Grid */}
      <section id="features" className="py-32 px-6 max-w-7xl mx-auto">
        <div className="mb-16">
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-white mb-4">Everything you need to win.</h2>
          <p className="text-lg text-[#64748B]">A complete toolkit designed for revenue dominance.</p>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Card 1: Large */}
          <motion.div variants={fadeUp} className="md:col-span-2 bg-[#0D1526] rounded-3xl p-8 md:p-10 border border-[#111827] border-l-4 border-l-[#06B6D4] hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(6,182,212,0.15)] transition-all duration-300 flex flex-col justify-between overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#06B6D4]/10 to-transparent rounded-full blur-3xl" />
            <div className="relative z-10 w-full mb-8">
              <h3 className="font-heading text-3xl font-bold text-white mb-3">Live Leaderboards</h3>
              <p className="text-[#64748B] max-w-md">Cast the leaderboard to your office TVs or Slack. Create massive visibility and harness natural sales competitiveness.</p>
            </div>
            {/* Abstract UI element */}
            <div className="relative w-full h-40 bg-[#0A0F1E] rounded-xl border border-[#111827] p-4 flex flex-col gap-3 justify-end group-hover:border-[#06B6D4]/30 transition-colors">
              <div className="w-full h-6 bg-[#111827] rounded-md overflow-hidden flex">
                <div className="w-[85%] h-full bg-[#06B6D4] relative"><div className="absolute inset-0 bg-white/20 w-1/2 animate-[marquee_2s_linear_infinite]" /></div>
              </div>
              <div className="w-full h-6 bg-[#111827] rounded-md overflow-hidden flex">
                <div className="w-[65%] h-full bg-[#06B6D4]/70" />
              </div>
              <div className="w-full h-6 bg-[#111827] rounded-md overflow-hidden flex">
                <div className="w-[45%] h-full bg-[#06B6D4]/40" />
              </div>
            </div>
          </motion.div>

          {/* Card 2: Small */}
          <motion.div variants={fadeUp} className="md:col-span-1 bg-[#0D1526] rounded-3xl p-8 border border-[#111827] border-l-2 border-l-[#F59E0B] hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(245,158,11,0.1)] transition-all duration-300 flex flex-col justify-between group">
            <div className="mb-8">
              <Trophy className="w-10 h-10 text-[#F59E0B] mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="font-heading text-2xl font-bold text-white mb-3">Quest-Based Goals</h3>
              <p className="text-[#64748B]">Break daunting annual quotas into bite-sized weekly sprints and daily missions.</p>
            </div>
          </motion.div>

          {/* Card 3: Small */}
          <motion.div variants={fadeUp} className="md:col-span-1 bg-[#0D1526] rounded-3xl p-8 border border-[#111827] border-l-2 border-l-[#06B6D4] hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(6,182,212,0.1)] transition-all duration-300 group">
            <Star className="w-10 h-10 text-[#06B6D4] mb-6 group-hover:rotate-180 transition-transform duration-700" />
            <h3 className="font-heading text-2xl font-bold text-white mb-3">XP & Leveling</h3>
            <p className="text-[#64748B]">Every logged call, sent email, and booked meeting earns XP. Reps level up and unlock perks.</p>
          </motion.div>

          {/* Card 4: Small */}
          <motion.div variants={fadeUp} className="md:col-span-1 bg-[#0D1526] rounded-3xl p-8 border border-[#111827] border-l-2 border-l-[#06B6D4] hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(6,182,212,0.1)] transition-all duration-300 group">
            <Users className="w-10 h-10 text-[#06B6D4] mb-6 group-hover:scale-110 transition-transform" />
            <h3 className="font-heading text-2xl font-bold text-white mb-3">Team Challenges</h3>
            <p className="text-[#64748B]">Pit regional teams against each other. "East Coast vs West Coast" style battles.</p>
          </motion.div>

          {/* Card 5: Small */}
          <motion.div variants={fadeUp} className="md:col-span-1 bg-[#0D1526] rounded-3xl p-8 border border-[#111827] border-l-2 border-l-[#06B6D4] hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(6,182,212,0.1)] transition-all duration-300 group">
            <TrendingUp className="w-10 h-10 text-[#06B6D4] mb-6 group-hover:translate-x-2 transition-transform" />
            <h3 className="font-heading text-2xl font-bold text-white mb-3">Advanced Analytics</h3>
            <p className="text-[#64748B]">Spot performance bottlenecks before they happen with game-tape style reporting.</p>
          </motion.div>

        </motion.div>
      </section>

      {/* 6. Testimonials */}
      <section id="testimonials" className="py-24 px-6 bg-[#0A0F1E] border-t border-[#111827]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading text-4xl font-bold text-white mb-4">Players Love the Game</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { text: "Since adding Game Sales, CRM updates aren't a chore anymore. My reps are literally fighting for the #1 spot every Friday afternoon. Our close rate jumped 30%.", name: "Sarah Jenkins", role: "VP of Sales", company: "CloudScale" },
              { text: "The leaderboard cast to our office TV changed the entire culture. When the crown icon pops up for a closed deal, the whole floor goes wild.", name: "David Chen", role: "Sales Director", company: "FinTech Pro" },
              { text: "As an SDR, grinding calls can be tough. But earning XP and unlocking the 'Cold Call King' badge actually makes the daily grind fun and rewarding.", name: "Marcus Webb", role: "Senior SDR", company: "GrowthOps" }
            ].map((quote, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="bg-[#0D1526] p-8 rounded-2xl border border-[#111827] relative"
              >
                <div className="absolute top-6 right-8 text-[#06B6D4]/20 font-heading text-6xl">"</div>
                <p className="text-[#CBD5E1] relative z-10 mb-8 leading-relaxed">"{quote.text}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#111827] border border-[#06B6D4]/30 flex items-center justify-center font-heading font-bold text-white">
                    {quote.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-white font-bold">{quote.name}</h4>
                    <p className="text-[#64748B] text-sm">{quote.role}, {quote.company}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Final CTA */}
      <section className="py-24 px-6 mb-12">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-[#0D1526] rounded-[2.5rem] p-12 md:p-20 text-center border border-[#111827] relative overflow-hidden shadow-2xl"
          >
            {/* Radial Glow Burst */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-radial-gradient from-[#06B6D4]/20 to-transparent rounded-full blur-[100px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)' }} />

            <div className="relative z-10">
              <h2 className="font-heading text-4xl md:text-6xl font-extrabold text-white mb-6">Ready to Level Up?</h2>
              <p className="text-xl text-[#64748B] mb-10 max-w-2xl mx-auto">
                Join high-performing teams that compete, collaborate, and close more deals — every single day.
              </p>

              <div className="flex flex-col sm:flex-row gap-5 justify-center">
                <button className="flex items-center justify-center gap-2 bg-[#F59E0B] hover:bg-[#D97706] text-white px-10 py-5 rounded-xl font-bold text-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_40px_rgba(245,158,11,0.6)] transform hover:-translate-y-1">
                  Get Started Free
                </button>
                <button className="flex items-center justify-center gap-2 bg-[#111827] hover:bg-[#1E293B] border border-[#1E293B] hover:border-[#06B6D4]/50 text-white px-10 py-5 rounded-xl font-bold text-xl transition-all">
                  Book a Demo
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer (Minimal) */}
      <footer className="border-t border-[#111827] py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-white font-heading font-bold text-xl">
            <Trophy className="text-[#06B6D4] w-5 h-5" />
            GameSales
          </div>
          <p className="text-[#64748B] text-sm">© {new Date().getFullYear()} GameSales Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}