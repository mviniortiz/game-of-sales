import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimit, RATE_LIMITS } from '@/lib/rateLimiter';

describe('rateLimiter', () => {
    beforeEach(() => {
        resetRateLimit('test');
    });

    it('allows requests under the limit', () => {
        const result = checkRateLimit('test', 3, 60_000);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(2);
    });

    it('blocks requests over the limit', () => {
        checkRateLimit('test', 2, 60_000);
        checkRateLimit('test', 2, 60_000);
        const result = checkRateLimit('test', 2, 60_000);
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
        expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it('resets bucket correctly', () => {
        checkRateLimit('test', 1, 60_000);
        const blocked = checkRateLimit('test', 1, 60_000);
        expect(blocked.allowed).toBe(false);

        resetRateLimit('test');
        const afterReset = checkRateLimit('test', 1, 60_000);
        expect(afterReset.allowed).toBe(true);
    });

    it('RATE_LIMITS presets work', () => {
        const result = RATE_LIMITS.auth('login');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4); // 5 max - 1 used
    });
});
