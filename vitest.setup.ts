import '@testing-library/jest-dom/vitest';

// Polyfill ResizeObserver for jsdom (used by Radix UI)
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

// Polyfill IntersectionObserver — landing/animated components usam pra lazy-reveal
class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
    root = null;
    rootMargin = '';
    thresholds = [];
}
(global as unknown as { IntersectionObserver: typeof MockIntersectionObserver }).IntersectionObserver = MockIntersectionObserver;

// Polyfill window.matchMedia — jsdom não implementa; usado por checks de
// prefers-reduced-motion (ex.: LandingV2) e outros hooks de media query.
// Sem isso o efeito lança sincronamente e o teste trava até o timeout.
if (typeof window !== 'undefined' && !window.matchMedia) {
    window.matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    } as unknown as MediaQueryList);
}
