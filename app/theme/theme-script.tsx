/**
 * Blocking inline script injected into <head> so the correct theme class is on
 * <html> BEFORE first paint — this is what prevents the light/dark flash.
 *
 * Default is DARK: we apply `.dark` unless localStorage explicitly says "light".
 * Keep this dependency-free and tiny; it runs before React hydrates.
 */
export const THEME_STORAGE_KEY = "temlet-theme";

const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var isDark=t?t==="dark":true;document.documentElement.classList.toggle("dark",isDark);}catch(e){document.documentElement.classList.add("dark");}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
