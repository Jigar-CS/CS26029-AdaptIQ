const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// In browser, use a relative path through Next.js rewrite proxy (eliminates CORS preflight latency).
// In server-side context (SSR/SSG), fall back to the absolute URL.
function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Browser: use Next.js rewrite proxy — same-origin means no OPTIONS preflight
    return '/api/v1';
  }
  return BASE_URL;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

export async function fetchApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('clias_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const isAiOrLongRunning =
    endpoint.includes('/ai') ||
    endpoint.includes('/generate') ||
    endpoint.includes('/coding') ||
    endpoint.includes('/submit') ||
    endpoint.includes('/rag') ||
    endpoint.includes('/extract') ||
    endpoint.includes('/documents') ||
    endpoint.includes('/counsellor-assignments') ||
    endpoint.includes('/assignments') ||
    endpoint.includes('/upload');
  const timeoutMs = (options as any)?.timeout || (isAiOrLongRunning ? 120000 : 35000);

  let targetBase = getBaseUrl();
  if (isAiOrLongRunning) {
    if (typeof window === 'undefined') {
      targetBase = BASE_URL;
    } else {
      const isCurrentLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isBaseLocal = BASE_URL.includes('localhost') || BASE_URL.includes('127.0.0.1');
      if (isCurrentLocal && isBaseLocal && window.location.protocol === 'http:') {
        targetBase = BASE_URL;
      } else {
        targetBase = '/api/v1';
      }
    }
  }
  const url = `${targetBase}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      let message = 'An error occurred during request.';
      if (typeof data?.message === 'string' && data.message.trim().length > 0) {
        message = data.message;
      } else if (Array.isArray(data?.message) && data.message.length > 0) {
        message = data.message.join('; ');
      } else if (Array.isArray(data?.errors) && data.errors.length > 0) {
        message = data.errors.join(', ');
      } else if (typeof data?.error === 'string' && data.error.trim().length > 0) {
        message = data.error;
      } else if (res.status === 413) {
        message = 'The uploaded document exceeds the allowable request size (limit: 25 MB).';
      } else if (res.status === 403) {
        message = 'Access restricted: You do not have permission to perform this action.';
      } else if (res.status === 404) {
        message = `Requested resource was not found (${res.status}).`;
      } else if (res.status === 502 || res.status === 504) {
        message = 'The server is temporarily unavailable or timed out. Please try again.';
      } else if (res.status >= 500) {
        message = `Server encountered an internal error (${res.status}). Please check server logs.`;
      }
      throw new ApiError(res.status, message, data);
    }

    return data as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new ApiError(408, 'Request timed out. Please check your network connection.');
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(500, err.message || 'Failed to communicate with CLIAS server.');
  }
}

export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    fetchApi<T>(endpoint, { method: 'GET', ...options }),
  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    fetchApi<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined, ...options }),
  put: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    fetchApi<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined, ...options }),
  patch: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    fetchApi<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined, ...options }),
  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    fetchApi<T>(endpoint, { method: 'DELETE', ...options }),
};

