import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

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
    it('PricingSection renderiza 3 planos e toggle mensal/anual', async () => {
        const { PricingSection } = await import('@/components/landing/sections/PricingSection');
        render(
            <MemoryRouter>
                <PricingSection onPlanSelect={vi.fn()} onScheduleDemo={vi.fn()} />
            </MemoryRouter>
        );
        expect(screen.getByText('STARTER')).toBeInTheDocument();
        expect(screen.getByText('PLUS')).toBeInTheDocument();
        expect(screen.getByText('PRO')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /mensal/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /anual/i })).toBeInTheDocument();
    });

    it('PricingSection dispara onPlanSelect com nome lowercase', async () => {
        const { PricingSection } = await import('@/components/landing/sections/PricingSection');
        const onPlanSelect = vi.fn();
        render(
            <MemoryRouter>
                <PricingSection onPlanSelect={onPlanSelect} onScheduleDemo={vi.fn()} />
            </MemoryRouter>
        );
        const ctas = screen.getAllByRole('button', { name: /começar teste de 14 dias/i });
        fireEvent.click(ctas[0]);
        expect(onPlanSelect).toHaveBeenCalledWith(expect.stringMatching(/starter|plus|pro/));
    });

    it('LigacoesSection dispara onSeePlansClick no CTA', async () => {
        const { LigacoesSection } = await import('@/components/landing/sections/LigacoesSection');
        const onClick = vi.fn();
        render(<LigacoesSection onSeePlansClick={onClick} />);
        fireEvent.click(screen.getByRole('button', { name: /ver planos com ligações/i }));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

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

    it('ForInfoprodutores renderiza hero + painel interativo', async () => {
        const { default: ForInfoprodutores } = await import('@/pages/personas/ForInfoprodutores');
        const { container } = render(
            <MemoryRouter>
                <ForInfoprodutores />
            </MemoryRouter>
        );
        expect(container.firstChild).toBeTruthy();
    });
});
