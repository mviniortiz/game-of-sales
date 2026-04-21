import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { EvaFloatingButton } from "./EvaFloatingButton";
import { EvaSidechat } from "./EvaSidechat";
import { EvaHeroAtom } from "./EvaHeroAtom";

const STORAGE_KEY = "eva:dock-open";

/**
 * Eva Dock — botão flutuante + sidechat lateral + atom compartilhado (layoutId).
 * O atom migra do botão pro header do sidechat automaticamente via FLIP animation
 * do framer-motion. Atalho: Ctrl/Cmd + K.
 */
export const EvaDock = () => {
  const location = useLocation();
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });

  const hideOnRoute = location.pathname.startsWith("/agente");

  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && e.key.toLowerCase() === "k") {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        const isTyping = tag === "input" || tag === "textarea" || target?.isContentEditable;
        if (isTyping) return;
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  if (hideOnRoute) return null;

  return (
    <>
      <EvaFloatingButton open={open} onClick={toggle} />
      <EvaHeroAtom open={open} />
      <EvaSidechat open={open} onOpenChange={setOpen} />
    </>
  );
};
