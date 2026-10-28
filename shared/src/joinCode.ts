export const JOIN_CODE_MIN_LENGTH = 3;
export const JOIN_CODE_MAX_LENGTH = 30;

// Letters/digits, optionally separated by single hyphens (e.g. NICK, SPRINT-42).
const JOIN_CODE_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

// Codes that could be mistaken for official estim8 pages or accounts.
const RESERVED_JOIN_CODES = new Set(['ADMIN', 'ADMINISTRATOR', 'ESTIM8', 'SUPPORT', 'HELP', 'API', 'ROOT', 'NULL', 'UNDEFINED']);

/** Join codes are case-insensitive; the canonical form is upper case. */
export function normalizeJoinCode(input: string): string {
  return input.trim().toUpperCase();
}

/** Returns a human-readable problem with the code, or null when it is acceptable. */
export function validateJoinCode(input: string): string | null {
  const code = normalizeJoinCode(input);
  if (code.length < JOIN_CODE_MIN_LENGTH || code.length > JOIN_CODE_MAX_LENGTH) {
    return `Join code must be ${JOIN_CODE_MIN_LENGTH}-${JOIN_CODE_MAX_LENGTH} characters.`;
  }
  if (!JOIN_CODE_PATTERN.test(code)) {
    return 'Join code may only contain letters, numbers and single hyphens (not at the start or end).';
  }
  if (RESERVED_JOIN_CODES.has(code)) {
    return 'That join code is reserved. Please choose another.';
  }
  return null;
}
