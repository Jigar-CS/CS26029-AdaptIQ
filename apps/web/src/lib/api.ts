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

  const url = `${getBaseUrl()}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const isAiOrLongRunning =
    endpoint.includes('/ai') ||
    endpoint.includes('/generate') ||
    endpoint.includes('/coding') ||
    endpoint.includes('/submit') ||
    endpoint.includes('/rag') ||
    endpoint.includes('/extract') ||
    endpoint.includes('/documents');
  const timeoutMs = (options as any)?.timeout || (isAiOrLongRunning ? 90000 : 25000);

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
      const message =
        data?.message ||
        (Array.isArray(data?.errors) ? data.errors.join(', ') : 'An error occurred during request.');
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

