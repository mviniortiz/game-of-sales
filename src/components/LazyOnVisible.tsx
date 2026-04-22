import { ReactNode, Suspense, useEffect, useRef, useState } from "react";

type Props = {
  children: ReactNode;
  rootMargin?: string;
  fallback?: ReactNode;
  minHeight?: string | number;
  id?: string;
};

/**
 * Só monta `children` quando o placeholder entra na viewport (ou está próximo).
 * Assim o React não dispara o import() dos React.lazy filhos no mount inicial,
 * mantendo vendor-motion / vendor-ui fora do critical path.
 */
export const LazyOnVisible = ({
  children,
  rootMargin = "400px",
  fallback = null,
  minHeight,
  id,
}: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const onHydrateAll = () => setVisible(true);
    window.addEventListener("vyzon:hydrate-all", onHydrateAll);
    return () => window.removeEventListener("vyzon:hydrate-all", onHydrateAll);
  }, [visible]);

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    // Delay observer start até depois do LCP pra não competir com critical path.
    // rIC ou fallback 300ms — depois disso, IntersectionObserver decide.
    let obs: IntersectionObserver | undefined;
    const startObserving = () => {
      obs = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            setVisible(true);
            obs?.disconnect();
          }
        },
        { rootMargin }
      );
      obs.observe(node);
    };
    const idle = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout?: number }) => number)
      | undefined;
    const handle = idle
      ? idle(startObserving, { timeout: 1500 })
      : window.setTimeout(startObserving, 300);
    return () => {
      if (idle && typeof handle === "number") {
        (window as any).cancelIdleCallback?.(handle);
      } else {
        window.clearTimeout(handle as number);
      }
      obs?.disconnect();
    };
  }, [visible, rootMargin]);

  return (
    <div ref={ref} id={id} style={minHeight ? { minHeight } : undefined}>
      {visible ? <Suspense fallback={fallback}>{children}</Suspense> : fallback}
    </div>
  );
};

export default LazyOnVisible;
