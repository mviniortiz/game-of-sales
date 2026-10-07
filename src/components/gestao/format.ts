export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/** 1º dia do mês corrente, à meia-noite local, em ISO. */
export const monthStartIso = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
};

/** Valor de metas_consolidadas.mes_referencia (DATE, 1º dia do mês). */
export const monthRef = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
};
