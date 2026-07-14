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

    it('scrollToLazyAnchor nunca fica abaixo de zero na posição', async () => {
        // window.scrollY precisa começar DIFERENTE de zero: se já fosse 0 (o
        // default do beforeEach), o alvo calculado (clampado em 0) bateria com
        // a posição atual e o hook pularia a chamada por já "estar no lugar"
        // (branch de diff < 6 em scrollToLazyAnchor) — não exercitaria o clamp.
        Object.defineProperty(window, 'scrollY', { value: 200, writable: true });
        const el = document.createElement('div');
        el.id = 'top';
        // top bem negativo (anchor acima do viewport) força o alvo bruto
        // (top + scrollY - offset) pra negativo, que deve ser clampado em 0.
        el.getBoundingClientRect = () => ({ top: -300 } as DOMRect);
        document.body.appendChild(el);

        scrollToLazyAnchor('top');
        // O primeiro tick roda dentro de requestAnimationFrame (scrollToLazyAnchor
        // agenda com rAF antes de chamar window.scrollTo); precisa esperar o
        // próximo frame antes de checar a chamada.
        await new Promise((resolve) => requestAnimationFrame(resolve));
        expect(scrollSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });
});
