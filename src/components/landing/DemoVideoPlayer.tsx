import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import demoVideo from "/videos/sales-video.mp4";

const fadeInUp = {
    initial: { y: 20 },
    whileInView: { y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5 },
};

const PILLS = ["CRM Visual", "Gamificação", "Ligações", "Integrações"];

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = String(Math.floor(seconds % 60)).padStart(2, "0");
    return `${m}:${s}`;
};

export const DemoVideoPlayer = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const progressFillRef = useRef<HTMLDivElement>(null);
    const progressThumbRef = useRef<HTMLDivElement>(null);
    const currentTimeRef = useRef<HTMLSpanElement>(null);
    const durationRef = useRef<HTMLSpanElement>(null);

    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [showControls, setShowControls] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const el = videoContainerRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: "200px" }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !isVisible) return;

        const writeProgress = () => {
            const duration = video.duration || 0;
            const currentTime = video.currentTime || 0;
            const progress = duration ? (currentTime / duration) * 100 : 0;
            if (progressFillRef.current) progressFillRef.current.style.width = `${progress}%`;
            if (progressThumbRef.current) progressThumbRef.current.style.left = `calc(${progress}% - 6px)`;
            if (currentTimeRef.current) currentTimeRef.current.textContent = formatTime(currentTime);
        };

        const writeDuration = () => {
            if (durationRef.current) durationRef.current.textContent = formatTime(video.duration || 0);
        };

        video.addEventListener("timeupdate", writeProgress);
        video.addEventListener("loadedmetadata", writeDuration);
        return () => {
            video.removeEventListener("timeupdate", writeProgress);
            video.removeEventListener("loadedmetadata", writeDuration);
        };
    }, [isVisible]);

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;
        if (isVideoPlaying) video.pause();
        else video.play();
    };

    const toggleFullscreen = () => {
        const el = videoContainerRef.current;
        if (!el) return;
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            el.requestFullscreen?.() ?? (el as any).webkitRequestFullscreen?.();
        }
    };

    const seekFromClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const video = videoRef.current;
        const bar = progressBarRef.current;
        if (!video || !bar || !video.duration) return;
        const rect = bar.getBoundingClientRect();
        video.currentTime = ((e.clientX - rect.left) / rect.width) * video.duration;
    };

    return (
        <section id="demo" className="py-28 px-4 sm:px-6 lg:px-8" style={{ background: "#06080a" }}>
            <div className="max-w-4xl mx-auto">
                <motion.div {...fadeInUp} className="text-center mb-12">
                    <span
                        className="inline-block text-xs text-emerald-400 rounded-full px-4 py-1.5 mb-5"
                        style={{ letterSpacing: "0.08em", fontWeight: 600, background: "rgba(0,227,122,0.1)", border: "1px solid rgba(0,227,122,0.2)" }}
                    >
                        VEJA EM AÇÃO
                    </span>

                    <h2
                        className="font-heading mb-4"
                        style={{ fontWeight: "var(--fw-bold)", fontSize: "clamp(1.75rem, 4.5vw, 2.75rem)", lineHeight: 1.1, letterSpacing: "-0.04em", color: "rgba(255,255,255,0.95)" }}
                    >
                        Veja o Vyzon em <span className="text-emerald-400">ação</span>
                    </h2>

                    <p className="max-w-lg mx-auto" style={{ fontSize: "1.0625rem", color: "rgba(255,255,255,0.4)" }}>
                        Interface simples, resultados extraordinários.
                    </p>
                </motion.div>

                <motion.div {...fadeInUp} transition={{ delay: 0.15 }} className="relative">
                    <div
                        ref={videoContainerRef}
                        className="relative rounded-2xl overflow-hidden group"
                        style={{ boxShadow: "var(--shadow-md)" }}
                        onMouseEnter={() => setShowControls(true)}
                        onMouseLeave={() => setShowControls(false)}
                    >
                        <div className="relative bg-slate-900 rounded-2xl overflow-hidden">
                            {isVisible && (
                                <video
                                    ref={videoRef}
                                    src={demoVideo}
                                    loop
                                    muted={isMuted}
                                    playsInline
                                    autoPlay
                                    preload="metadata"
                                    className="w-full h-auto"
                                    onPlay={() => setIsVideoPlaying(true)}
                                    onPause={() => setIsVideoPlaying(false)}
                                    onEnded={() => setIsVideoPlaying(false)}
                                />
                            )}

                            <div className="absolute inset-0 cursor-pointer" onClick={togglePlay}>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: showControls || !isVideoPlaying ? 1 : 0, scale: 1 }}
                                    className="absolute inset-0 flex items-center justify-center"
                                >
                                    {!isVideoPlaying && (
                                        <motion.div
                                            whileHover={{ scale: 1.08 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="w-20 h-20 rounded-full flex items-center justify-center"
                                            style={{ background: "linear-gradient(135deg, #00E37A, #00B289)", boxShadow: "0 0 60px rgba(0,227,122,0.4), 0 8px 32px rgba(0,0,0,0.4)" }}
                                        >
                                            <Play className="h-8 w-8 text-white ml-1" fill="currentColor" />
                                        </motion.div>
                                    )}
                                </motion.div>
                            </div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: showControls || !isVideoPlaying ? 1 : 0, y: 0 }}
                                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-16 pb-4 px-5"
                            >
                                <div
                                    ref={progressBarRef}
                                    className="relative h-1 bg-white/15 rounded-full mb-4 cursor-pointer group/progress hover:h-1.5 transition-all"
                                    onClick={seekFromClick}
                                >
                                    <div
                                        ref={progressFillRef}
                                        className="absolute top-0 left-0 h-full rounded-full"
                                        style={{ width: "0%", background: "linear-gradient(90deg, #00E37A, #33FF9E)" }}
                                    />
                                    <div
                                        ref={progressThumbRef}
                                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity"
                                        style={{ left: "calc(0% - 6px)" }}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                                            aria-label={isVideoPlaying ? "Pausar vídeo" : "Reproduzir vídeo"}
                                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                                        >
                                            {isVideoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" fill="currentColor" />}
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setIsMuted((m) => !m); }}
                                            aria-label={isMuted ? "Ativar áudio" : "Silenciar áudio"}
                                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                                        >
                                            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                                        </button>
                                        <span className="text-white/50 text-xs font-mono ml-1">
                                            <span ref={currentTimeRef}>0:00</span>
                                            <span className="text-white/25"> / </span>
                                            <span ref={durationRef}>0:00</span>
                                        </span>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                                        aria-label="Tela cheia"
                                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                                    >
                                        <Maximize className="h-4 w-4" />
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                        {PILLS.map((t) => (
                            <span
                                key={t}
                                className="text-xs px-3 py-1.5 rounded-full"
                                style={{ fontWeight: 500, color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.1)" }}
                            >
                                {t}
                            </span>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
};
