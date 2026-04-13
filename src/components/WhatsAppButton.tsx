import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "5548991696887";
const DEFAULT_MESSAGE = "Olá! Preciso de ajuda com o Vyzon.";

function WhatsAppIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function WhatsAppButton({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [pulsing, setPulsing] = useState(true);

  // Auto-show popup after 5s on first visit, then stop pulse
  useEffect(() => {
    const alreadySeen = sessionStorage.getItem("wpp-seen");
    if (alreadySeen) {
      setPulsing(false);
      return;
    }
    const timer = setTimeout(() => {
      setOpen(true);
      setPulsing(false);
      sessionStorage.setItem("wpp-seen", "1");
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleOpen = () => {
    setOpen(true);
    setPulsing(false);
    setDismissed(false);
  };

  const handleDismiss = () => {
    setOpen(false);
    setDismissed(true);
  };

  const handleChat = () => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const isDark = variant === "dark";

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat popup */}
      <AnimatePresence>
        {open && !dismissed && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="w-[300px] rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: isDark ? "#0c0e14" : "#ffffff",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
              boxShadow: isDark
                ? "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)"
                : "0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
            }}
          >
            {/* Header */}
            <div
              className="relative px-5 py-4 flex items-center gap-3"
              style={{ background: "#25D366" }}
            >
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <WhatsAppIcon size={22} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">Vyzon Suporte</p>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                  <span className="text-[11px] text-white/80">Online agora</span>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 rounded-lg hover:bg-white/15 transition-colors text-white/70 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4">
              {/* Message bubble */}
              <div className="flex gap-2.5 mb-4">
                <div className="h-7 w-7 rounded-full bg-[#25D366]/15 flex items-center justify-center shrink-0 mt-0.5">
                  <WhatsAppIcon size={14} />
                </div>
                <div
                  className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%]"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                  }}
                >
                  <p
                    className="text-[13px] leading-relaxed"
                    style={{ color: isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.7)" }}
                  >
                    Oi! Tem alguma dúvida ou precisa de ajuda? Fala com a gente pelo WhatsApp.
                  </p>
                  <p
                    className="text-[10px] mt-1.5 text-right"
                    style={{ color: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)" }}
                  >
                    agora
                  </p>
                </div>
              </div>

              {/* CTA button */}
              <button
                onClick={handleChat}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-white text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: "#25D366",
                  boxShadow: "0 4px 16px rgba(37,211,102,0.25)",
                }}
              >
                <MessageCircle className="h-4 w-4" />
                Iniciar conversa
              </button>
            </div>

            {/* Footer */}
            <div
              className="px-5 py-2.5 text-center"
              style={{
                borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
              }}
            >
              <p
                className="text-[10px]"
                style={{ color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.3)" }}
              >
                Resposta em até 5 minutos
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        onClick={open && !dismissed ? handleDismiss : handleOpen}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="relative h-14 w-14 rounded-full flex items-center justify-center text-white"
        style={{
          background: "#25D366",
          boxShadow: "0 4px 24px rgba(37,211,102,0.35)",
        }}
        aria-label="Suporte via WhatsApp"
      >
        <AnimatePresence mode="wait">
          {open && !dismissed ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div
              key="wpp"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <WhatsAppIcon size={26} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulse ring */}
        {pulsing && (
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: "#25D366", opacity: 0.3 }}
          />
        )}
      </motion.button>
    </div>
  );
}
