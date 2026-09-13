/**
 * Post-login redirect safety.
 *
 * The `redirect` search param on `/login` is attacker-controllable, so it must
 * never be trusted verbatim: an open redirect could send a freshly-authenticated
 * user to an external phishing page (`https://evil.example`) or a
 * protocol-relative host (`//evil.example`). We only ever honour a redirect that
 * is an INTERNAL, absolute portal path, and additionally restrict it to the
 * known portal path prefixes so it cannot bounce back to auth screens.
 */

/** Path prefixes a post-login redirect is allowed to target. */
const ALLOWED_REDIRECT_PREFIXES = ["/admin", "/buyer", "/vendor"] as const;

/**
 * Return `target` if it is a safe internal portal path, otherwise `fallback`.
 *
 * A value is safe only when it:
 *  - is a non-empty string,
 *  - starts with a single `/` (absolute, same-origin),
 *  - is NOT protocol-relative (`//host`) or a backslash variant (`/\\host`),
 *  - contains no scheme (`http:`, `javascript:`, …) or whitespace, and
 *  - begins with one of the allowed portal prefixes.
 */
export function safeRedirect(target: string | undefined | null, fallback: string): string {
  if (typeof target !== "string" || target.length === 0) return fallback;
  // Must be root-relative.
  if (target[0] !== "/") return fallback;
  // Reject protocol-relative ("//host") and any backslash-smuggled form
  // (browsers may normalise "\" to "/", so "/\\host" or "/a\\b" is unsafe).
  if (target[1] === "/" || target.includes("\\")) return fallback;
  // Reject whitespace (incl. smuggled newlines/tabs) and anything with a scheme.
  if (/\s/.test(target)) return fallback;
  if (target.includes(":")) return fallback;
  // Restrict to known portal path prefixes.
  const path = target.split(/[?#]/)[0] ?? "";
  const ok = ALLOWED_REDIRECT_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
  return ok ? target : fallback;
}
