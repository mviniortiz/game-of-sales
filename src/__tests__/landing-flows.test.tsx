import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
            onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
        },
        from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        functions: {
            invoke: vi.fn().mockResolvedValue({ data: { ok: true }, error: null }),
        },
    },
}));

vi.mock('framer-motion', () => {
    const motionComponent = (tag: string) => ({ children, ...props }: any) => {
        const safe: Record<string, any> = {};
        for (const [k, v] of Object.entries(props)) {
            if (['initial', 'animate', 'exit', 'whileInView', 'whileHover', 'whileTap',
                'variants', 'transition', 'viewport', 'layout', 'layoutId',
                'onAnimationComplete', 'drag', 'dragConstraints'].includes(k)) continue;
            safe[k] = v;
        }
        const Tag = tag as any;
        return <Tag {...safe}>{children}</Tag>;
    };
    return {
        motion: new Proxy({}, { get: (_t, p: string) => motionComponent(p) }),
        AnimatePresence: ({ children }: any) => <>{children}</>,
        useInView: () => true,
        useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
        useScroll: () => ({ scrollYProgress: { get: () => 0, onChange: vi.fn() } }),
        useTransform: () => ({ get: () => 0 }),
        useMotionValue: () => ({ get: () => 0, set: vi.fn(), onChange: vi.fn() }),
        useSpring: () => ({ get: () => 0, set: vi.fn(), onChange: vi.fn(), on: vi.fn().mockReturnValue(vi.fn()) }),
        useReducedMotion: () => false,
    };
});

vi.mock('@/lib/sentry', () => ({
    Sentry: { captureException: vi.fn() },
    captureException: vi.fn(),
    initSentry: vi.fn(),
}));

vi.mock('@/lib/analytics', () => ({
    trackEvent: vi.fn(),
    FUNNEL_EVENTS: {
        LANDING_VIEW: 'landing_view',
        LANDING_CTA_CLICK: 'landing_cta_click',
        DEMO_FORM_VIEW: 'demo_form_view',
        DEMO_FORM_SUBMIT: 'demo_form_submit',
        DEMO_SCHEDULED: 'demo_scheduled',
    },
}));

describe('Landing critical flows', () => {
    // PricingSection/LigacoesSection eram da landing antiga (Landing.tsx), que
    // saiu da árvore de rotas no cutover pra LandingV2 (App.tsx só roteia
    // LandingV2 em "/" e "/landing" — ver LP.6). Nenhum outro arquivo do app
    // importa esses dois componentes; testes removidos (2026-07-14).

    it('NavigatingOverlay mostra o plano capitalizado', async () => {
        const { NavigatingOverlay } = await import('@/components/landing/sections/NavigatingOverlay');
        render(<NavigatingOverlay plan="plus" />);
        expect(screen.getByText(/preparando seu plano plus/i)).toBeInTheDocument();
    });

    it('LandingFooter chama callbacks nos botões', async () => {
        const { LandingFooter } = await import('@/components/landing/sections/LandingFooter');
        const onNavClick = vi.fn();
        const onLogin = vi.fn();
        const onRegister = vi.fn();
        render(
            <LandingFooter
                onNavClick={onNavClick}
                onLoginClick={onLogin}
                onRegisterClick={onRegister}
            />
        );
        fireEvent.click(screen.getByRole('button', { name: /funcionalidades/i }));
        fireEvent.click(screen.getByRole('button', { name: /login/i }));
        fireEvent.click(screen.getByRole('button', { name: /criar conta/i }));
        expect(onNavClick).toHaveBeenCalledWith('features');
        expect(onLogin).toHaveBeenCalled();
        expect(onRegister).toHaveBeenCalled();
    });
});
