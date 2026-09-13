/**
 * In-memory Access Token Manager
 *
 * Prevents storing sensitive short-lived JWT access tokens in localStorage,
 * mitigating Cross-Site Scripting (XSS) token exfiltration risks.
 */
let inMemoryAccessToken = null;

export const setAccessToken = (token) => {
  inMemoryAccessToken = token || null;
};

export const getAccessToken = () => {
  return inMemoryAccessToken;
};

export const clearAccessToken = () => {
  inMemoryAccessToken = null;
};

export default {
  setAccessToken,
  getAccessToken,
  clearAccessToken,
};
