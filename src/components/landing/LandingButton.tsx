import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";

type Variant = "primary" | "secondary";
type Size = "sm" | "md" | "lg";

type CommonProps = {
    variant?: Variant;
    size?: Size;
    icon?: ReactNode;
    showArrow?: boolean;
    fullWidth?: boolean;
    children: ReactNode;
};

type AnchorProps = CommonProps & AnchorHTMLAttributes<HTMLAnchorElement> & {
    as?: "a";
    href: string;
};
type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & {
    as: "button";
};

type LandingButtonProps = AnchorProps | ButtonProps;

const SIZE_CLASS: Record<Size, string> = {
    sm: "h-9 px-4 text-[13px] gap-1.5",
    md: "h-10 px-5 text-sm gap-2",
    lg: "h-12 px-6 sm:px-7 text-sm sm:text-[15px] gap-2",
};

const ARROW_CLASS: Record<Size, string> = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-4 w-4",
};

const PRIMARY_STYLE: React.CSSProperties = {
    background: "#00E37A",
    color: "#0D1421",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 1px 2px rgba(0,227,122,0.15)",
    fontWeight: 600,
    letterSpacing: "-0.01em",
};

const SECONDARY_STYLE: React.CSSProperties = {
    background: "rgba(255,255,255,0.02)",
    color: "#EDEDED",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.10)",
    fontWeight: 500,
    letterSpacing: "-0.01em",
};

const baseClass =
    "lbtn group relative inline-flex items-center justify-center rounded-lg no-underline whitespace-nowrap transition-[filter,box-shadow,background] duration-[180ms] ease-out";

export const LandingButton = forwardRef<
    HTMLAnchorElement | HTMLButtonElement,
    LandingButtonProps
>((props, ref) => {
    const {
        variant = "primary",
        size = "md",
        icon,
        showArrow = false,
        fullWidth = false,
        children,
        className = "",
        ...rest
    } = props;

    const style = variant === "primary" ? PRIMARY_STYLE : SECONDARY_STYLE;
    const variantClass =
        variant === "primary" ? "lbtn-primary" : "lbtn-secondary";
    const width = fullWidth ? "w-full" : "w-full sm:w-auto";
    const allClasses = `${baseClass} ${variantClass} ${SIZE_CLASS[size]} ${width} ${className}`;

    const content = (
        <>
            {icon && <span className="relative inline-flex shrink-0">{icon}</span>}
            <span className="relative">{children}</span>
            {showArrow && (
                <ArrowRight
                    className={`${ARROW_CLASS[size]} relative shrink-0 transition-transform duration-[180ms] ease-out group-hover:translate-x-1`}
                    strokeWidth={2}
                />
            )}
        </>
    );

    if ((props as ButtonProps).as === "button") {
        const { as: _as, ...btnRest } = rest as ButtonProps;
        void _as;
        return (
            <button
                ref={ref as React.Ref<HTMLButtonElement>}
                className={allClasses}
                style={style}
                {...btnRest}
            >
                {content}
            </button>
        );
    }

    const { as: _as, ...anchorRest } = rest as AnchorProps;
    void _as;
    return (
        <a
            ref={ref as React.Ref<HTMLAnchorElement>}
            className={allClasses}
            style={style}
            {...anchorRest}
        >
            {content}
        </a>
    );
});

LandingButton.displayName = "LandingButton";
