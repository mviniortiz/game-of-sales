// CPF/CNPJ formatting and validation

export function formatDocument(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);

  // CNPJ: 14 digits → XX.XXX.XXX/XXXX-XX
  if (digits.length > 11) {
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  // CPF: 11 digits → XXX.XXX.XXX-XX
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false; // all same digit

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== Number(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  return remainder === Number(digits[10]);
}

export function validateCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(digits[i]) * weights1[i];
  let remainder = sum % 11;
  if (remainder < 2) { if (Number(digits[12]) !== 0) return false; }
  else { if (Number(digits[12]) !== 11 - remainder) return false; }

  sum = 0;
  for (let i = 0; i < 13; i++) sum += Number(digits[i]) * weights2[i];
  remainder = sum % 11;
  if (remainder < 2) return Number(digits[13]) === 0;
  return Number(digits[13]) === 11 - remainder;
}

export function validateDocument(value: string): { valid: boolean; type: "CPF" | "CNPJ" | null; error?: string } {
  const digits = value.replace(/\D/g, "");

  if (digits.length <= 11) {
    if (digits.length < 11) return { valid: false, type: null, error: "CPF deve ter 11 dígitos." };
    if (!validateCPF(digits)) return { valid: false, type: "CPF", error: "CPF inválido." };
    return { valid: true, type: "CPF" };
  }

  if (digits.length < 14) return { valid: false, type: null, error: "CNPJ deve ter 14 dígitos." };
  if (!validateCNPJ(digits)) return { valid: false, type: "CNPJ", error: "CNPJ inválido." };
  return { valid: true, type: "CNPJ" };
}
