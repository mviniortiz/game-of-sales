import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn (classname utility)', () => {
    it('should merge class names correctly', () => {
        expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
        expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
        expect(cn('foo', true && 'bar', 'baz')).toBe('foo bar baz');
    });

    it('should merge Tailwind classes correctly', () => {
        // Later classes should override earlier ones for conflicting Tailwind utilities
        expect(cn('p-4', 'p-2')).toBe('p-2');
        expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('should handle undefined and null values', () => {
        expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
    });

    it('should handle object notation', () => {
        expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
    });

    it('should handle array notation', () => {
        expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
    });
});
