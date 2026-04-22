import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { smoothScrollToId, scrollToLazyAnchor } from '@/hooks/useLandingAnchor';

describe('useLandingAnchor helpers', () => {
    let scrollSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        document.body.innerHTML = '';
        scrollSpy = vi.fn();
        window.scrollTo = scrollSpy as unknown as typeof window.scrollTo;
        Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('smoothScrollToId retorna false quando o anchor não existe', () => {
        expect(smoothScrollToId('missing')).toBe(false);
        expect(scrollSpy).not.toHaveBeenCalled();
    });

    it('smoothScrollToId rola com offset quando o anchor existe', () => {
        const el = document.createElement('div');
        el.id = 'features';
        el.getBoundingClientRect = () => ({ top: 400 } as DOMRect);
        document.body.appendChild(el);

        expect(smoothScrollToId('features')).toBe(true);
        expect(scrollSpy).toHaveBeenCalledWith({
            top: 400 - 72,
            behavior: 'smooth',
        });
    });

    it('scrollToLazyAnchor dispatcha vyzon:hydrate-all quando o nó não existe', () => {
        const listener = vi.fn();
        window.addEventListener('vyzon:hydrate-all', listener);
        scrollToLazyAnchor('does-not-exist');
        expect(listener).toHaveBeenCalled();
        window.removeEventListener('vyzon:hydrate-all', listener);
    });

    it('scrollToLazyAnchor nunca fica abaixo de zero na posição', () => {
        const el = document.createElement('div');
        el.id = 'top';
        el.getBoundingClientRect = () => ({ top: 10 } as DOMRect);
        document.body.appendChild(el);

        scrollToLazyAnchor('top');
        expect(scrollSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });
});
