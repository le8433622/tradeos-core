const INTERNAL_URL_BASE = "https://tradeos.internal";
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const ENCODED_PATH_SEPARATOR = /%(?:2f|5c)/i;

/**
 * Accepts only same-origin absolute-path references.
 *
 * Backslashes and encoded path separators are rejected because URL parsers may
 * normalize them into authority separators in special-scheme URLs.
 */
export function getSafeInternalPath(
  raw: unknown,
  fallback = "/",
): string {
  if (
    typeof raw !== "string" ||
    raw.length === 0 ||
    raw.length > 2048 ||
    raw !== raw.trim() ||
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.includes("\\") ||
    CONTROL_CHARACTERS.test(raw) ||
    ENCODED_PATH_SEPARATOR.test(raw)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(raw, INTERNAL_URL_BASE);
    if (
      parsed.origin !== INTERNAL_URL_BASE ||
      parsed.username.length > 0 ||
      parsed.password.length > 0
    ) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function isWorkspaceChooserPath(path: string): boolean {
  try {
    const pathname = new URL(path, INTERNAL_URL_BASE).pathname;
    return (
      pathname === "/choose-workspace" ||
      pathname.startsWith("/choose-workspace/")
    );
  } catch {
    return false;
  }
}
