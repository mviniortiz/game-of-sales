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
