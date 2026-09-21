// ============================================================
// Small fetch helper for the subscription / travel pages
// Throws an Error (with .status and .code) when the API says no,
// so callers can just try/catch instead of checking res.ok each time.
// ============================================================

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = {};
  try { data = await res.json(); } catch { /* non-JSON error page */ }

  if (!res.ok || data.success === false) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = data.code;
    throw err;
  }
  return data;
}

export function rupees(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

export function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Only allow redirects to pages inside this app ("/foo"), never to another site
export function safeNext(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '';
}
