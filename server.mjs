import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID } from 'node:crypto';
import { AppError, createCase, importCase, publicCase, updateEvidence, approveMilestone, paymentQuote, orderPayload, verifyCapture, exportPack, revisionOf, event } from './lib/core.mjs';
import { paypalClient } from './lib/paypal.mjs';
import { analyze } from './lib/analysis.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.onnx': 'application/octet-stream', '.wasm': 'application/wasm' };
export function createServer(options = {}) {
  const origin = options.origin || process.env.PUBLIC_ORIGIN || process.env.RENDER_EXTERNAL_URL || 'http://127.0.0.1:4173';
  const sandbox = options.paypal || paypalClient({ clientId: process.env.PAYPAL_CLIENT_ID, clientSecret: process.env.PAYPAL_CLIENT_SECRET });
  const clientId = options.clientId || process.env.PAYPAL_CLIENT_ID || '';
  const configured = !!(options.paypal || (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET));
  const sessions = new Map();
  async function body(req) {
    let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 700000) throw new AppError(413, 'TOO_LARGE', 'The case is too large.'); }
    try { return raw ? JSON.parse(raw) : {}; } catch { throw new AppError(400, 'INVALID_JSON', 'Send valid JSON.'); }
  }
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
    try {
      const u = new URL(req.url, origin);
      if (u.pathname === '/api/health' && req.method === 'GET') return send(200, { service: 'clearproof', status: 'ready', environment: 'sandbox' });
      if (u.pathname.startsWith('/api/')) {
        const sessionId = (req.headers.cookie || '').match(/(?:^|;\s*)cp_session=([a-f0-9]{48})(?:;|$)/)?.[1];
        let sid = sessionId, s = sid && sessions.get(sid);
        if (!s) {
          if (sessions.size >= 1500) throw new AppError(503, 'CAPACITY', 'The demo is at capacity. Please retry later.');
          sid = randomBytes(24).toString('hex'); s = { csrf: randomBytes(24).toString('hex'), case: createCase(), touched: Date.now() }; sessions.set(sid, s);
          res.setHeader('Set-Cookie', 'cp_session=' + sid + '; Path=/; HttpOnly; SameSite=Lax' + (origin.startsWith('https:') ? '; Secure' : ''));
        }
        s.touched = Date.now();
        if (req.method === 'GET' && u.pathname === '/api/session') return send(200, { csrf: s.csrf, configured, clientId, environment: 'sandbox', case: publicCase(s.case) });
        if (req.method === 'GET' && u.pathname === '/api/export') return send(200, exportPack(s.case));
        if (req.method !== 'POST') throw new AppError(405, 'METHOD', 'Method not allowed.');
        if (req.headers['x-csrf-token'] !== s.csrf || (req.headers.origin && req.headers.origin !== origin)) throw new AppError(403, 'CSRF', 'Refresh this page before changing the case.');
        const input = await body(req), c = s.case;
        if (u.pathname === '/api/reset') { s.case = createCase(); return send(200, publicCase(s.case)); }
        if (u.pathname === '/api/analyze') {
          if (s.analyzing) throw new AppError(429, 'ANALYSIS_BUSY', 'An AI review is already running for this session.');
          s.analyzing = true;
          try { const revision = revisionOf(c); const result = await analyze(c); if (revisionOf(c) !== revision) throw new AppError(409, 'STALE_REVISION', 'Evidence changed during analysis. Run review again.'); return send(200, { ...result, revision }); }
          finally { s.analyzing = false; }
        }
        if (u.pathname === '/api/import') {
          if (Object.values(c.orders).some(o => o.status === 'CAPTURING')) throw new AppError(409, 'PAYMENT_IN_PROGRESS', 'Wait for the capture attempt to finish.');
          s.case = importCase(input); return send(200, publicCase(s.case));
        }
        if (u.pathname === '/api/evidence') { updateEvidence(c, input.id, input.text); return send(200, publicCase(c)); }
        if (u.pathname === '/api/accept') { approveMilestone(c, input); return send(200, publicCase(c)); }
        if (u.pathname === '/api/paypal/orders') {
          if (s.creatingOrder) throw new AppError(409, 'ORDER_IN_PROGRESS', 'A sandbox order is already being created for this session.');
          if (input.amount !== undefined || input.currency !== undefined) throw new AppError(400, 'CLIENT_AMOUNT_FORBIDDEN', 'Payment amounts are derived from the server case, never from browser input.');
          if (!configured) throw new AppError(503, 'SANDBOX_NOT_CONFIGURED', 'Connect PayPal Sandbox on the server to make a test payment.');
          const q = paymentQuote(c, input.milestoneIds);
          const existing = Object.values(c.orders).find(o => o.binding === q.binding && o.status === 'CREATED');
          if (existing) return send(200, existing);
          s.creatingOrder = true;
          let d;
          try { d = await sandbox.create(orderPayload(c, q, origin), randomUUID()); }
          finally { s.creatingOrder = false; }
          if (revisionOf(c) !== q.revision) throw new AppError(409, 'STALE_REVISION', 'The evidence changed while PayPal was creating the order. Review again.');
          const approvalUrl = d.links?.find(l => l.rel === 'payer-action' || l.rel === 'approve')?.href;
          if (!d.id || !approvalUrl || !new URL(approvalUrl).hostname.endsWith('.sandbox.paypal.com')) throw new AppError(502, 'INVALID_PAYPAL_RESPONSE', 'PayPal did not return a sandbox approval link.');
          const o = { ...q, id: d.id, approvalUrl, status: 'CREATED', requestId: randomUUID() }; c.orders[o.id] = o;
          event(c, 'SANDBOX_ORDER_CREATED', { orderId: o.id, binding: o.binding, value: o.value, currency: o.currency, milestoneIds: o.milestoneIds }); return send(200, o);
        }
        if (u.pathname === '/api/paypal/capture') {
          const o = Object.hasOwn(c.orders, input.orderId) && c.orders[input.orderId];
          if (!o) throw new AppError(404, 'ORDER_NOT_FOUND', 'This sandbox order does not belong to this session.');
          if (o.status === 'COMPLETED') return send(200, { ...o, case: publicCase(c) });
          if (o.status === 'CAPTURING') throw new AppError(409, 'CAPTURE_IN_PROGRESS', 'This capture is already in progress.');
          if (Object.values(c.orders).some(other => other.id !== o.id && other.status === 'CAPTURING' && other.milestoneIds.some(id => o.milestoneIds.includes(id)))) throw new AppError(409, 'CAPTURE_IN_PROGRESS', 'Payment for this milestone is already in progress.');
          const current = paymentQuote(c, o.milestoneIds);
          if (current.binding !== o.binding) throw new AppError(409, 'STALE_ORDER', 'The accepted evidence changed. This order cannot be captured. Create a fresh order after review.');
          o.status = 'CAPTURING';
          try {
            const result = verifyCapture(await sandbox.capture(o.id, o.requestId), o);
            Object.assign(o, result);
            event(c, 'SANDBOX_CAPTURE_COMPLETED', { orderId: o.id, captureId: o.captureId, binding: o.binding, value: o.value, currency: o.currency });
          } catch (e) { o.status = 'REVIEW_REQUIRED'; event(c, 'CAPTURE_NOT_CONFIRMED', { orderId: o.id, code: e.code || 'NETWORK_ERROR' }); throw e; }
          return send(200, { ...o, case: publicCase(c) });
        }
        throw new AppError(404, 'NOT_FOUND', 'API endpoint not found.');
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') throw new AppError(405, 'METHOD', 'Method not allowed.');
      const name = u.pathname === '/' ? '/index.html' : decodeURIComponent(u.pathname);
      const filename = path.resolve(ROOT, '.' + name);
      if (!filename.startsWith(ROOT + path.sep)) throw new AppError(403, 'FORBIDDEN', 'Path not allowed.');
      const data = await fs.readFile(filename).catch(() => { throw new AppError(404, 'NOT_FOUND', 'File not found.'); });
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filename)] || 'application/octet-stream', 'Content-Length': data.length }); res.end(req.method === 'HEAD' ? undefined : data);
    } catch (e) { if (!res.headersSent) send(e.status || 500, { error: e.code || 'INTERNAL_ERROR', message: e.status ? e.message : 'The request could not be completed. No payment is confirmed.' }); else res.end(); }
  });
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const port = Number(process.env.PORT || 4173), host = process.env.HOST || '127.0.0.1';
  createServer().listen(port, host, () => console.log('ClearProof running at http://' + host + ':' + port + ' (PayPal Sandbox only)'));
}
