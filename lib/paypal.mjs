import { AppError } from './core.mjs';

// This origin is deliberately fixed: the prototype cannot process live payments.
const API = 'https://api-m.sandbox.paypal.com';
export function paypalClient({ clientId, clientSecret, fetcher = fetch }) {
  let cached;
  async function token() {
    if (!clientId || !clientSecret) throw new AppError(503, 'SANDBOX_NOT_CONFIGURED', 'A PayPal Sandbox client ID and secret are required. No payment was created.');
    if (cached && cached.until > Date.now()) return cached.value;
    const r = await fetcher(API + '/v1/oauth2/token', { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials', signal: AbortSignal.timeout(20000) });
    const d = await r.json();
    if (!r.ok || !d.access_token) throw new AppError(502, 'PAYPAL_AUTH_FAILED', 'PayPal Sandbox authentication failed. Check the server credentials.');
    cached = { value: d.access_token, until: Date.now() + Math.max(10, (d.expires_in || 300) - 60) * 1000 }; return cached.value;
  }
  async function request(path, body, requestId) {
    const r = await fetcher(API + path, { method: 'POST', headers: { Authorization: 'Bearer ' + await token(), 'Content-Type': 'application/json', Prefer: 'return=representation', 'PayPal-Request-Id': requestId }, body: JSON.stringify(body), signal: AbortSignal.timeout(25000) });
    const d = await r.json();
    if (!r.ok) throw new AppError(502, 'PAYPAL_REQUEST_FAILED', 'PayPal Sandbox rejected the request' + (d.details?.[0]?.issue ? ': ' + d.details[0].issue : '.') );
    return d;
  }
  return { create: (payload, requestId) => request('/v2/checkout/orders', payload, requestId), capture: (id, requestId) => request('/v2/checkout/orders/' + encodeURIComponent(id) + '/capture', {}, requestId) };
}
