// Janela do placar de orçamentos, em dias. Fica no endereço (?dias=) para o
// placar e a faixa da conta grátis contarem a mesma coisa. ?dias=90 vem do
// Raio-X e do relatório: a mesma janela que a Lume leu.
export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];
export const DEFAULT_PERIOD: Period = 30;

export const periodFromParam = (v: string | null): Period => {
  const n = Number(v);
  return (PERIODS as readonly number[]).includes(n) ? (n as Period) : DEFAULT_PERIOD;
};
