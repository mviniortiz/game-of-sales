import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
            onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
        },
        from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: null, error: null }),
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
            }),
        }),
    },
}));

// Mock framer-motion with all exports used by the app
vi.mock('framer-motion', () => {
    const createMotionComponent = (tag: string) => {
        return ({ children, ...props }: any) => {
            // Filter out framer-motion specific props to avoid React warnings
            const htmlProps: Record<string, any> = {};
            for (const [key, value] of Object.entries(props)) {
                if (!['initial', 'animate', 'exit', 'whileInView', 'whileHover', 'whileTap',
                    'variants', 'transition', 'viewport', 'layout', 'layoutId',
                    'onAnimationComplete', 'drag', 'dragConstraints', 'style'].includes(key)
                    || key === 'className' || key === 'data-testid' || key === 'id' || key === 'role'
                    || key.startsWith('aria-') || key.startsWith('on') && key !== 'onAnimationComplete') {
                    htmlProps[key] = value;
                }
            }
            const Tag = tag as any;
            return <Tag {...htmlProps}>{children}</Tag>;
        };
    };

    return {
        motion: new Proxy({}, {
            get: (_target, prop: string) => createMotionComponent(prop),
        }),
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

// Mock Sentry
vi.mock('@/lib/sentry', () => ({
    Sentry: { captureException: vi.fn() },
}));

// Mock AuthContext for pages that need it
vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
        user: null,
        session: null,
        loading: false,
        isAdmin: false,
        isSuperAdmin: false,
        companyId: null,
        profile: null,
        refreshProfile: vi.fn(),
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
    }),
    AuthProvider: ({ children }: any) => <>{children}</>,
}));

// Mock Vercel Analytics
vi.mock('@vercel/analytics/react', () => ({
    Analytics: () => null,
}));

// Mock video/image assets
vi.mock('/videos/sales-video.mp4', () => ({ default: '' }));

// Mock shadcn Sheet (used by LandingNav for mobile menu)
vi.mock('@/components/ui/sheet', () => ({
    Sheet: ({ children }: any) => <>{children}</>,
    SheetTrigger: ({ children }: any) => <>{children}</>,
    SheetContent: ({ children }: any) => <div>{children}</div>,
    SheetClose: ({ children }: any) => <>{children}</>,
}));

describe('Smoke Tests - Public Pages', () => {
    it('Auth page renders without crashing', async () => {
        const { default: Auth } = await import('@/pages/Auth');
        const { container } = render(
            <MemoryRouter>
                <Auth />
            </MemoryRouter>
        );
        expect(container.firstChild).toBeTruthy();
    });

    it('Register page renders without crashing', async () => {
        const { default: Register } = await import('@/pages/Register');
        const { container } = render(
            <MemoryRouter>
                <Register />
            </MemoryRouter>
        );
        expect(container.firstChild).toBeTruthy();
    });

    it('NotFound page renders', async () => {
        const { default: NotFound } = await import('@/pages/NotFound');
        const { container } = render(
            <MemoryRouter>
                <NotFound />
            </MemoryRouter>
        );
        expect(container.firstChild).toBeTruthy();
    });

    it('RecuperarSenha page renders without crashing', async () => {
        const { default: RecuperarSenha } = await import('@/pages/RecuperarSenha');
        const { container } = render(
            <MemoryRouter>
                <RecuperarSenha />
            </MemoryRouter>
        );
        expect(container.firstChild).toBeTruthy();
    });

    it('LandingPage renders without crashing', async () => {
        const { default: LandingPage } = await import('@/pages/LandingPage');
        const { container } = render(
            <MemoryRouter>
                <LandingPage />
            </MemoryRouter>
        );
        expect(container.firstChild).toBeTruthy();
    });
});

describe('Smoke Tests - Components', () => {
    it('ErrorBoundary renders children when no error', async () => {
        const { ErrorBoundary } = await import('@/components/ErrorBoundary');
        render(
            <ErrorBoundary>
                <div data-testid="child">OK</div>
            </ErrorBoundary>
        );
        expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('ErrorBoundary catches errors and shows fallback', async () => {
        const { ErrorBoundary } = await import('@/components/ErrorBoundary');
        const ThrowError = () => { throw new Error('Test crash'); };

        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>
        );

        expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
        expect(screen.getByText('Recarregar')).toBeInTheDocument();

        spy.mockRestore();
    });
});
