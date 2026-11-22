let memoryToken: string | null = null;

export function setMemoryToken(token: string | null) {
  memoryToken = token;
}

export function getMemoryToken(): string | null {
  return memoryToken;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (memoryToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${memoryToken}`);
  }

  const res = await fetch(`/api${path}`, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) {
      throw new ApiError(data?.error || 'Request failed.', res.status);
    }
    return data as T;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(text || 'Request failed.', res.status);
  }
  return (await res.text()) as unknown as T;
}

export async function downloadProtectedFile(path: string, filename: string) {
  const headers = new Headers();
  if (memoryToken) {
    headers.set('Authorization', `Bearer ${memoryToken}`);
  }
  const res = await fetch(`/api${path}`, { headers });
  if (!res.ok) {
    throw new ApiError('Export failed.', res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function fetchPrivateMediaBlobUrl(fileId: string): Promise<string> {
  const headers = new Headers();
  if (memoryToken) {
    headers.set('Authorization', `Bearer ${memoryToken}`);
  }
  const res = await fetch(`/api/files/${encodeURIComponent(fileId)}`, { headers });
  if (!res.ok) {
    throw new ApiError('Unable to load private file.', res.status);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
