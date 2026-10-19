import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from '../server.mjs';

test('two simultaneous order requests cannot create duplicate payable orders', async t => {
  let release, creates = 0;
  const pending = new Promise(resolve => { release = resolve; });
  const server = createServer({ paypal: { create: async () => { creates++; await pending; return { id: 'ONE', links: [{ rel: 'approve', href: 'https://www.sandbox.paypal.com/checkoutnow?token=ONE' }] }; } } });
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => server.close());
  const base = 'http://127.0.0.1:' + server.address().port;
  const r = await fetch(base + '/api/session'); const cookie = r.headers.get('set-cookie').split(';')[0], s = await r.json();
  const post = (route, data) => fetch(base + route, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json', 'X-CSRF-Token': s.csrf }, body: JSON.stringify(data) });
  await post('/api/accept', { milestoneId: 'M1', revision: s.case.revision, reviewer: 'Client', note: 'Accepted after review.', evidenceIds: ['E1'] });
  const first = post('/api/paypal/orders', { milestoneIds: ['M1'] });
  while (!creates) await new Promise(r => setTimeout(r, 5));
  const second = await post('/api/paypal/orders', { milestoneIds: ['M1'] });
  assert.equal(second.status, 409); release(); assert.equal((await first).status, 200); assert.equal(creates, 1);
});
