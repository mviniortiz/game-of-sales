import { useRef, useCallback, useEffect, useState } from "react";

export interface SwipeState {
  /** Current horizontal offset in px (0 when idle) */
  offsetX: number;
  /** Whether swipe is actively happening */
  isSwiping: boolean;
  /** Direction the user is swiping toward (null when idle or below threshold) */
  direction: "left" | "right" | null;
  /** Whether the swipe has passed the commit threshold */
  pastThreshold: boolean;
}

interface UseSwipeToMoveOptions {
  /** Called when swipe completes past threshold. "left" = prev stage, "right" = next stage */
  onSwipeComplete: (direction: "left" | "right") => void;
  /** Whether this hook is enabled (false on desktop) */
  enabled: boolean;
  /** Minimum horizontal px to trigger a stage move (default 80) */
  threshold?: number;
  /** Element ref to attach listeners to */
  elementRef: React.RefObject<HTMLElement | null>;
}

const THRESHOLD_DEFAULT = 80;
const VERTICAL_LOCK_ANGLE = 30; // degrees

export function useSwipeToMove({
  onSwipeComplete,
  enabled,
  threshold = THRESHOLD_DEFAULT,
  elementRef,
}: UseSwipeToMoveOptions): SwipeState {
  const [state, setState] = useState<SwipeState>({
    offsetX: 0,
    isSwiping: false,
    direction: null,
    pastThreshold: false,
  });

  const startX = useRef(0);
  const startY = useRef(0);
  const tracking = useRef(false);
  const locked = useRef<"horizontal" | "vertical" | null>(null);
  const lastDx = useRef(0);

  // Keep callback refs fresh without re-attaching listeners
  const enabledRef = useRef(enabled);
  const thresholdRef = useRef(threshold);
  const onCompleteRef = useRef(onSwipeComplete);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { thresholdRef.current = threshold; }, [threshold]);
  useEffect(() => { onCompleteRef.current = onSwipeComplete; }, [onSwipeComplete]);

  const reset = useCallback(() => {
    tracking.current = false;
    locked.current = null;
    lastDx.current = 0;
    setState({ offsetX: 0, isSwiping: false, direction: null, pastThreshold: false });
  }, []);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || !enabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (!enabledRef.current) return;
      const touch = e.touches[0];
      startX.current = touch.clientX;
      startY.current = touch.clientY;
      tracking.current = true;
      locked.current = null;
      lastDx.current = 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startX.current;
      const dy = touch.clientY - startY.current;

      // Determine lock direction on first significant movement
      if (locked.current === null) {
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        if (absDx < 5 && absDy < 5) return;

        const angle = Math.atan2(absDy, absDx) * (180 / Math.PI);
        if (angle > VERTICAL_LOCK_ANGLE) {
          locked.current = "vertical";
          tracking.current = false;
          return;
        }
        locked.current = "horizontal";
      }

      if (locked.current !== "horizontal") return;

      // Prevent vertical scrolling while swiping horizontally
      e.preventDefault();

      lastDx.current = dx;
      const pastThreshold = Math.abs(dx) >= thresholdRef.current;
      const direction: "left" | "right" | null = dx < -10 ? "left" : dx > 10 ? "right" : null;

      setState({
        offsetX: dx,
        isSwiping: true,
        direction,
        pastThreshold,
      });
    };

    const onTouchEnd = () => {
      if (!tracking.current || locked.current !== "horizontal") {
        reset();
        return;
      }

      const dx = lastDx.current;
      const past = Math.abs(dx) >= thresholdRef.current;

      if (past) {
        const dir: "left" | "right" = dx < 0 ? "left" : "right";
        onCompleteRef.current(dir);
      }

      reset();
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", reset, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", reset);
    };
  }, [enabled, elementRef, reset]);

  return state;
}
