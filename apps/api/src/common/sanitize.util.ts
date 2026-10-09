/**
 * Backend input sanitization utilities.
 *
 * All user-supplied string values should be passed through these helpers
 * before they are stored in the database or forwarded to external services
 * (AI, email, etc.).
 *
 * Why we need these even though we use Prisma ORM and parameterized queries:
 *  - Stored XSS: malicious HTML/script stored in DB, rendered later without escaping.
 *  - Prompt injection: crafted text sent to LLMs that overrides the system prompt.
 *  - Length DoS: extremely long strings that bloat the DB / exceed column limits.
 */

/** Maximum lengths for common fields */
export const MAX_LENGTHS = {
  name: 120,
  email: 254,
  phone: 20,
  bio: 800,
  officeLocation: 160,
  specialization: 400,
  skill: 60,
  skills: 30, // max number of skills
  url: 500,
  comment: 1000,
  topicName: 120,
  aiPrompt: 500,
  password: 128,
  employeeCode: 40,
  division: 40,
  department: 120,
};

/**
 * Strips leading/trailing whitespace and removes HTML tags / dangerous characters.
 * Safe for storing plain text in the database and rendering in React (which
 * already HTML-escapes JSX interpolations, but defense-in-depth helps).
 */
export function sanitizeText(value: unknown, maxLength?: number): string {
  if (value === null || value === undefined) return '';
  const str = String(value)
    .trim()
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove null bytes
    .replace(/\0/g, '')
    // Collapse excessive whitespace
    .replace(/\s{4,}/g, '   ');

  return maxLength ? str.slice(0, maxLength) : str;
}

/**
 * Sanitize and validate a URL.
 * Returns the sanitized URL string if valid, or null if invalid/dangerous.
 */
export function sanitizeUrl(value: unknown): string | null {
  if (!value) return null;
  const raw = sanitizeText(value, MAX_LENGTHS.url);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    // Only allow http / https protocols — block javascript:, data:, ftp:, etc.
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize a phone number — only digits, spaces, dashes, plus, parentheses.
 */
export function sanitizePhone(value: unknown): string {
  if (!value) return '';
  return sanitizeText(value, MAX_LENGTHS.phone).replace(/[^0-9\s\-+().]/g, '');
}

/**
 * Sanitize an array of skill tag strings.
 * Trims, removes duplicates, enforces per-skill and total limits.
 */
export function sanitizeSkills(rawSkills: unknown): string[] {
  if (!Array.isArray(rawSkills)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const s of rawSkills) {
    const clean = sanitizeText(s, MAX_LENGTHS.skill);
    if (clean && !seen.has(clean.toLowerCase()) && result.length < MAX_LENGTHS.skills) {
      seen.add(clean.toLowerCase());
      result.push(clean);
    }
  }
  return result;
}

/**
 * Validate that a string is a safe enum member.
 * Returns the value if it matches, or undefined if not.
 */
export function sanitizeEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  if (typeof value !== 'string') return undefined;
  return (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

/**
 * Sanitize free-text that will be forwarded to an AI model (prompt injection mitigation).
 * - Strips HTML, trims whitespace, removes null bytes.
 * - Enforces a maximum length suitable for the use-case.
 * - Removes patterns commonly used in prompt injection attacks.
 */
export function sanitizeAiInput(value: unknown, maxLength = 500): string {
  if (!value) return '';
  return sanitizeText(value, maxLength)
    // Remove common prompt-injection tokens
    .replace(/\bignore\s+(all\s+)?previous\s+(instructions?|prompts?)\b/gi, '')
    .replace(/\bjailbreak\b/gi, '')
    .replace(/\bsystem\s*:\s*/gi, '')
    .replace(/\buser\s*:\s*/gi, '')
    .replace(/\bassistant\s*:\s*/gi, '');
}

/**
 * Sanitize a comment / dispute text.
 * Slightly more permissive than sanitizeText (allows punctuation),
 * but still strips HTML and enforces length.
 */
export function sanitizeComment(value: unknown, maxLength = MAX_LENGTHS.comment): string {
  return sanitizeText(value, maxLength);
}
