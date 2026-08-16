export const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL || ''
).replace(/\/$/, '');

export function isRadioAiApiEnabled(): boolean {
  const val = String(import.meta.env.VITE_USE_RADIO_AI_API || '').toLowerCase();
  if (val === 'false') return false;
  return true;
}

export function getStoredAuthToken(): string | null {
  return localStorage.getItem('radio_ai_admin_token');
}

export async function requestJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getStoredAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const errorJson = await response.json();
      message = errorJson.detail || errorJson.message || message;
    } catch {
      // Non-JSON response
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function uploadFile<T>(
  endpoint: string,
  file: File,
  fieldName = 'file'
): Promise<T> {
  const formData = new FormData();
  formData.append(fieldName, file);

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const headers: HeadersInit = {};
  const token = getStoredAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const errorJson = await response.json();
      message = errorJson.detail || errorJson.message || message;
    } catch {
      // Non-JSON response
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
