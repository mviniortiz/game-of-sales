import logoLight from "@/assets/logo-light.svg";
import logoDark from "@/assets/logo-dark.png";

interface ThemeLogoProps {
  className?: string;
  alt?: string;
}

/**
 * Logo that automatically switches between light and dark variants.
 * Uses CSS to show/hide based on the .dark class on <html>.
 */
export const ThemeLogo = ({ className = "h-10 w-auto", alt = "Vyzon" }: ThemeLogoProps) => (
  <>
    <img src={logoLight} alt={alt} className={`${className} block dark:hidden`} />
    <img src={logoDark} alt={alt} className={`${className} hidden dark:block`} />
  </>
);
