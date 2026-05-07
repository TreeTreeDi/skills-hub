/**
 * Sanitize untrusted strings before terminal output.
 *
 * Strips ALL terminal escape sequences from a string, including:
 *   - CSI sequences  (ESC [ ... final_byte)    — cursor movement, screen clear, SGR colors
 *   - OSC sequences  (ESC ] ... BEL/ST)         — window title, hyperlinks
 *   - Simple escapes (ESC followed by one char)  — e.g. ESC 7 (save cursor)
 *   - C1 control codes (0x80–0x9F)
 *   - Raw control characters (BEL, BS, etc.)     — except \t and \n which are safe
 *
 * This defends against CWE-150 (terminal escape injection) where
 * untrusted data (e.g., skill name/description from SKILL.md frontmatter
 * or remote APIs) could clear the screen, move the cursor, change the
 * window title, or render attacker-controlled text that looks like
 * legitimate CLI output.
 */

// eslint-disable-next-line no-control-regex
const CSI_RE = /\x1b\[[\x30-\x3f]*[\x20-\x2f]*[\x40-\x7e]/g;

// eslint-disable-next-line no-control-regex
const OSC_RE = /\x1b\][\s\S]*?(?:\x07|\x1b\\)/g;

// eslint-disable-next-line no-control-regex
const DCS_PM_APC_RE = /\x1b[P^_][\s\S]*?(?:\x1b\\)/g;

// eslint-disable-next-line no-control-regex
const SIMPLE_ESC_RE = /\x1b[\x20-\x7e]/g;

// eslint-disable-next-line no-control-regex
const C1_RE = /[\x80-\x9f]/g;

// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\x00-\x06\x07\x08\x0b\x0c\x0d-\x1a\x1c-\x1f\x7f]/g;

/**
 * Strip all terminal escape sequences and dangerous control characters
 * from a string.
 *
 * Safe for use on untrusted input before printing to the terminal.
 */
export function stripTerminalEscapes(str: string): string {
  return str
    .replace(OSC_RE, "") // OSC first (longest match)
    .replace(DCS_PM_APC_RE, "") // DCS/PM/APC
    .replace(CSI_RE, "") // CSI sequences
    .replace(SIMPLE_ESC_RE, "") // Simple ESC+char
    .replace(C1_RE, "") // C1 control codes
    .replace(CONTROL_RE, ""); // Raw control chars (keep \t \n)
}

/**
 * Sanitize a skill metadata string (name, description, etc.) for safe terminal display.
 *
 * In addition to stripping escape sequences, this also trims whitespace and
 * collapses internal newlines into spaces (skill names/descriptions should
 * be single-line when displayed).
 */
export function sanitizeMetadata(str: string): string {
  return stripTerminalEscapes(str)
    .replace(/[\r\n]+/g, " ")
    .trim();
}
