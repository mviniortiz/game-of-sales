import { useId, type KeyboardEvent, type ReactNode } from "react";

// AUTH.1 — campo do fluxo de auth (login/cadastro/recuperação).
// Um contrato só nas 4 telas: label, input dark, erro inline com shake,
// aria-describedby pro leitor de tela e slot à direita (toggle de senha).
// Micro-interação: shake 240ms re-dispara a cada erro novo (key muda),
// borda vermelha via .vz-input--error (index.css).
export const AuthField = ({
    label,
    type = "text",
    value,
    onChange,
    onBlur,
    onKeyDown,
    onKeyUp,
    placeholder,
    autoComplete,
    autoFocus,
    error,
    errorKey = 0,
    rightSlot,
    maxLength,
}: {
    label: string;
    type?: string;
    value: string;
    onChange: (v: string) => void;
    onBlur?: () => void;
    onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
    onKeyUp?: (e: KeyboardEvent<HTMLInputElement>) => void;
    placeholder?: string;
    autoComplete?: string;
    autoFocus?: boolean;
    error?: string | null;
    errorKey?: number;
    rightSlot?: ReactNode;
    maxLength?: number;
}) => {
    const id = useId();
    const errorId = `${id}-erro`;

    return (
        <div className="flex flex-col gap-2">
            <label htmlFor={id} className="text-[12.5px]" style={{ color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
                {label}
            </label>
            <div className={error ? "vz-shake" : undefined} key={error ? `e${errorKey}` : "ok"}>
                <div className="relative">
                    <input
                        id={id}
                        type={type}
                        className={`vz-input ${rightSlot ? "pr-12" : ""} ${error ? "vz-input--error" : ""}`}
                        placeholder={placeholder}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onBlur={onBlur}
                        onKeyDown={onKeyDown}
                        onKeyUp={onKeyUp}
                        autoComplete={autoComplete}
                        autoFocus={autoFocus}
                        maxLength={maxLength}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? errorId : undefined}
                    />
                    {rightSlot && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</div>
                    )}
                </div>
            </div>
            {error && (
                <p id={errorId} role="alert" className="text-[12.5px]" style={{ color: "#FB7185", lineHeight: 1.4 }}>
                    {error}
                </p>
            )}
        </div>
    );
};
