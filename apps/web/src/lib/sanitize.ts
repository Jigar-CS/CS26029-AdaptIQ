/**
 * Client-side input sanitization helpers.
 *
 * React's JSX already HTML-escapes interpolated values, so these helpers
 * focus on:
 *  1. Length enforcement before API submission (prevents oversized payloads)
 *  2. Stripping null bytes and HTML tags from free-text fields
 *  3. URL validation for link fields
 *  4. Prompt-injection mitigation for free-text sent to AI endpoints
 *
 * Server-side validation is the primary defense; these helpers add a
 * complementary layer so invalid data is caught quickly on the client.
 */

export const LIMITS = {
  name: 120,
  phone: 20,
  bio: 800,
  officeLocation: 160,
  specialization: 400,
  skill: 60,
  maxSkills: 30,
  url: 500,
  comment: 1000,
  topicName: 120,
  aiPrompt: 500,
  password: 128,
};

/** Strip HTML tags and null bytes from a string */
export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')   // remove HTML tags
    .replace(/\0/g, '')         // remove null bytes
    .replace(/\s{4,}/g, '   '); // collapse excessive whitespace
}

/** Trim + strip HTML + enforce max length */
export function sanitizeText(value: string, maxLen?: number): string {
  const clean = stripHtml(value.trim());
  return maxLen ? clean.slice(0, maxLen) : clean;
}

/** Validate a URL — must be http or https */
export function validateUrl(value: string): boolean {
  if (!value.trim()) return true; // empty is OK (optional field)
  try {
    const u = new URL(value.trim());
    return ['http:', 'https:'].includes(u.protocol);
  } catch {
    return false;
  }
}

/** Phone number — digits, spaces, dashes, plus, parentheses only */
export function sanitizePhone(value: string): string {
  return value.replace(/[^0-9\s\-+().]/g, '').slice(0, LIMITS.phone);
}

/**
 * Sanitize free-text that will be forwarded to an AI endpoint.
 * Strips HTML, enforces length, and removes the most common prompt-injection
 * phrases. This is a best-effort client-side defence; the server mirrors it.
 */
export function sanitizeAiInput(value: string, maxLen = LIMITS.topicName): string {
  return sanitizeText(value, maxLen)
    .replace(/\bignore\s+(all\s+)?previous\s+(instructions?|prompts?)\b/gi, '')
    .replace(/\bjailbreak\b/gi, '')
    .replace(/\bsystem\s*:\s*/gi, '')
    .replace(/\buser\s*:\s*/gi, '')
    .replace(/\bassistant\s*:\s*/gi, '');
}

/** Return a validation error string or null if valid */
export function validateProfileField(
  field: 'name' | 'phone' | 'bio' | 'officeLocation' | 'specialization' | 'url' | 'skill',
  value: string,
): string | null {
  const limits: Record<string, number> = {
    name: LIMITS.name,
    phone: LIMITS.phone,
    bio: LIMITS.bio,
    officeLocation: LIMITS.officeLocation,
    specialization: LIMITS.specialization,
    url: LIMITS.url,
    skill: LIMITS.skill,
  };
  const max = limits[field] ?? 255;
  if (value.length > max) return `This field must be ${max} characters or fewer.`;
  if (field === 'phone' && value && !/^[0-9\s\-+().]*$/.test(value)) {
    return 'Phone number may only contain digits, spaces, dashes, + or parentheses.';
  }
  if (field === 'url' && value && !validateUrl(value)) {
    return 'Must be a valid URL starting with http:// or https://';
  }
  return null;
}
