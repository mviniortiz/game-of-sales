import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Confetti, CelebrationOverlay } from '@/components/crm/Confetti';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, className, style, ...props }: React.ComponentProps<'div'>) => (
            <div className={className} style={style} data-testid="motion-div" {...props}>
                {children}
            </div>
        ),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Confetti', () => {
    it('should not render when show is false', () => {
        const { container } = render(<Confetti show={false} />);
        expect(container.querySelector('[data-testid="motion-div"]')).toBeNull();
    });

    it('should render confetti particles when show is true', async () => {
        render(<Confetti show={true} />);

        await waitFor(() => {
            const particles = screen.getAllByTestId('motion-div');
            // Should have multiple particles (confetti pieces + center burst)
            expect(particles.length).toBeGreaterThan(0);
        });
    });

    it('should call onComplete callback after animation', async () => {
        vi.useFakeTimers();
        const onComplete = vi.fn();

        render(<Confetti show={true} onComplete={onComplete} />);

        // Fast-forward past the animation duration (2500ms)
        vi.advanceTimersByTime(2600);

        expect(onComplete).toHaveBeenCalledTimes(1);

        vi.useRealTimers();
    });
});

describe('CelebrationOverlay', () => {
    it('should not render when show is false', () => {
        const { container } = render(<CelebrationOverlay show={false} />);
        expect(container.querySelector('[data-testid="motion-div"]')).toBeNull();
    });

    it('should render with default message when show is true', () => {
        render(<CelebrationOverlay show={true} />);
        expect(screen.getByText('🎉 Deal Ganho!')).toBeInTheDocument();
    });

    it('should render with custom message', () => {
        render(<CelebrationOverlay show={true} message="Parabéns!" />);
        expect(screen.getByText('Parabéns!')).toBeInTheDocument();
    });
});
