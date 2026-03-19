export function setClientCookie(
  name: string,
  value: string,
  options: { maxAgeSeconds?: number; path?: string } = {}
) {
  if (typeof document === 'undefined') return;
  const maxAge = options.maxAgeSeconds ?? 60 * 30;
  const path = options.path ?? '/';
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
    value
  )}; Max-Age=${maxAge}; Path=${path}; SameSite=Lax`;
}

export function deleteClientCookie(name: string, path = '/') {
  if (typeof document === 'undefined') return;
  document.cookie = `${encodeURIComponent(
    name
  )}=; Max-Age=0; Path=${path}; SameSite=Lax`;
}

