export function escapeHtml(raw) {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeHref(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return '#';
  if (/^(https?:\/\/|\/|#|[a-zA-Z0-9._-]+\.html(#.*)?$)/.test(value) && !/^javascript:/i.test(value)) {
    return escapeHtml(value);
  }
  return '#';
}
