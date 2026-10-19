import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.mjs';
import { once } from 'node:events';

test('API enforces CSRF, sessions, accepted subset and server-derived amount', async t => {
  let payload, creates = 0, captures = 0;
  const paypal = { create: async p => { payload = p; creates++; return { id: 'SANDBOX1', links: [{ rel: 'payer-action', href: 'https://www.sandbox.paypal.com/checkoutnow?token=SANDBOX1' }] }; }, capture: async id => { captures++; return { id, status: 'COMPLETED', purchase_units: [{ custom_id: payload.purchase_units[0].custom_id, payments: { captures: [{ id: 'CAPTURE1', status: 'COMPLETED', amount: payload.purchase_units[0].amount }] } }] }; } };
  const server = createServer({ paypal }); server.listen(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => server.close());
  const base = 'http://127.0.0.1:' + server.address().port;
  const r = await fetch(base + '/api/session'); const cookie = r.headers.get('set-cookie').split(';')[0], session = await r.json();
  const post = (route, data, token = session.csrf) => fetch(base + route, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-CSRF-Token': token }, body: JSON.stringify(data) });
  assert.equal((await post('/api/accept', {}, 'wrong')).status, 403);
  assert.equal((await post('/api/paypal/orders', { milestoneIds: ['M1'] })).status, 409);
  assert.equal((await post('/api/accept', { milestoneId: 'M1', revision: session.case.revision, evidenceIds: ['E1'], reviewer: 'Client', note: 'Inspected and accepted.' })).status, 200);
  assert.equal((await post('/api/paypal/orders', { milestoneIds: ['M1'], amount: '0.01' })).status, 400);
  const order = await (await post('/api/paypal/orders', { milestoneIds: ['M1'] })).json(); assert.equal(order.value, '150.00');
  await post('/api/paypal/orders', { milestoneIds: ['M1'] }); assert.equal(creates, 1);
  const other = await fetch(base + '/api/session'); const otherCookie = other.headers.get('set-cookie').split(';')[0], otherData = await other.json();
  const foreign = await fetch(base + '/api/paypal/capture', { method: 'POST', headers: { Cookie: otherCookie, 'X-CSRF-Token': otherData.csrf }, body: JSON.stringify({ orderId: order.id }) }); assert.equal(foreign.status, 404);
  assert.equal((await post('/api/paypal/capture', { orderId: order.id })).status, 200);
  assert.equal((await post('/api/paypal/capture', { orderId: order.id })).status, 200); assert.equal(captures, 1);
});
test('editing a source blocks an old order before capture reaches PayPal', async t => {
  let captures = 0;
  const server = createServer({ paypal: { create: async () => ({ id: 'OLD', links: [{ rel: 'approve', href: 'https://www.sandbox.paypal.com/checkoutnow?token=OLD' }] }), capture: async () => { captures++; } } });
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => server.close());
  const base = 'http://127.0.0.1:' + server.address().port;
  const r = await fetch(base + '/api/session'); const cookie = r.headers.get('set-cookie').split(';')[0], s = await r.json();
  const post = (route, d) => fetch(base + route, { method: 'POST', headers: { Cookie: cookie, 'X-CSRF-Token': s.csrf }, body: JSON.stringify(d) });
  await post('/api/accept', { milestoneId: 'M1', revision: s.case.revision, evidenceIds: ['E1'], reviewer: 'Client', note: 'I accept.' }); await post('/api/paypal/orders', { milestoneIds: ['M1'] });
  await post('/api/evidence', { id: 'E1', text: 'New version: the responsive landing page now includes a different layout.' });
  assert.equal((await post('/api/paypal/capture', { orderId: 'OLD' })).status, 409); assert.equal(captures, 0);
});
