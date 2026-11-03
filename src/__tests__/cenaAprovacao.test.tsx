import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CenaAprovacao from '@/components/auth/CenaAprovacao';
import { horaRelogio } from '@/components/auth/horaDoDia';

// A cena do login abre no resultado (é também o poster do movimento reduzido):
// o aviso real, o 1 do dono, a confirmação e a resposta do Carlos (no jsdom
// o palco não tem largura e cai na versão compacta, a do banner).
describe('CenaAprovacao', () => {
    it('abre no resultado, com o 1 do dono antes do envio', () => {
        const quando = new Date(2026, 10, 3, 14, 30);
        render(<CenaAprovacao quando={quando} />);
        expect(screen.getByText(/Lume \[A2\] rascunho pronto/)).toBeInTheDocument();
        expect(screen.getByText(/Responda 1 para enviar, 2 para descartar/)).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText(/Sai em 20 segundos para Carlos/)).toBeInTheDocument();
        expect(screen.getByText('Oi! Vi sim, me manda a simulação.')).toBeInTheDocument();
    });

    it('escreve a hora como o WhatsApp', () => {
        expect(horaRelogio(new Date(2026, 10, 3, 9, 5))).toBe('9:05');
        expect(horaRelogio(new Date(2026, 10, 3, 14, 30))).toBe('14:30');
    });
});
