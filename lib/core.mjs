import { createHash, randomUUID } from 'node:crypto';
import { seedCase } from './seed.mjs';

export class AppError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
export const canonical = value => {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
};
export const digest = value => createHash('sha256').update(typeof value === 'string' ? value : canonical(value)).digest('hex');
export const money = cents => (cents / 100).toFixed(2);
export function cleanText(v, name, max = 12000) {
  if (typeof v !== 'string' || !v.trim() || v.length > max) throw new AppError(400, 'INVALID_INPUT', name + ' is required and must be at most ' + max + ' characters.');
  return v.trim();
}
export function snapshot(c) {
  return { schema: 'clearproof.snapshot.v1', caseId: c.id, title: c.title, currency: c.currency, scope: c.scope, milestones: c.milestones, evidence: c.evidence };
}
export const revisionOf = c => digest(snapshot(c));
export function event(c, type, detail) {
  const e = { index: c.events.length, at: new Date().toISOString(), type, detail, previousHash: c.events.at(-1)?.hash || '0'.repeat(64) };
  e.hash = digest(e); c.events.push(e); return e;
}
export function createCase() {
  const c = { ...seedCase(), id: randomUUID(), approvals: {}, orders: {}, events: [] };
  event(c, 'CASE_CREATED', { fixture: true, revision: revisionOf(c) }); return c;
}
export function validateImport(input) {
  if (!input || typeof input !== 'object') throw new AppError(400, 'INVALID_INPUT', 'A case object is required.');
  const title = cleanText(input.title, 'Title', 160), scope = cleanText(input.scope, 'Scope', 12000);
  if (!Array.isArray(input.milestones) || !input.milestones.length || input.milestones.length > 12) throw new AppError(400, 'INVALID_INPUT', 'Use between 1 and 12 milestones.');
  const milestones = input.milestones.map((m, i) => {
    if (!Number.isSafeInteger(m.cents) || m.cents < 1 || m.cents > 1000000) throw new AppError(400, 'INVALID_AMOUNT', 'Milestone amounts must be whole cents between 1 and 1,000,000.');
    return { id: 'M' + (i + 1), title: cleanText(m.title, 'Milestone title', 160), criterion: cleanText(m.criterion, 'Acceptance criterion', 1200), cents: m.cents };
  });
  if (!Array.isArray(input.evidence) || input.evidence.length > 40) throw new AppError(400, 'INVALID_INPUT', 'Use at most 40 evidence records.');
  const evidence = input.evidence.map((e, i) => ({ id: 'E' + (i + 1), title: cleanText(e.title, 'Evidence title', 160), kind: cleanText(e.kind || 'Document', 'Kind', 80), author: cleanText(e.author || 'Contributor', 'Author', 100), text: cleanText(e.text, 'Evidence text', 12000), recordedAt: new Date().toISOString() }));
  return { title, scope, currency: 'USD', client: cleanText(input.client || 'Client', 'Client', 100), freelancer: cleanText(input.freelancer || 'Freelancer', 'Freelancer', 100), fixture: false, milestones, evidence };
}
export function importCase(input) {
  const c = { ...validateImport(input), id: randomUUID(), approvals: {}, orders: {}, events: [] };
  event(c, 'CASE_IMPORTED', { revision: revisionOf(c) }); return c;
}
export function updateEvidence(c, id, text) {
  if (Object.values(c.orders).some(o => o.status === 'CAPTURING')) throw new AppError(409, 'PAYMENT_IN_PROGRESS', 'Wait for the payment attempt to finish before editing evidence.');
  const e = c.evidence.find(x => x.id === id);
  if (!e) throw new AppError(404, 'NOT_FOUND', 'Evidence record not found.');
  const oldHash = digest(e.text); e.text = cleanText(text, 'Evidence text'); e.recordedAt = new Date().toISOString();
  c.approvals = {}; event(c, 'EVIDENCE_UPDATED', { evidenceId: id, oldHash, newHash: digest(e.text), revision: revisionOf(c), approvalsInvalidated: true });
}
export function approveMilestone(c, input) {
  if (Object.values(c.orders).some(o => o.status === 'CAPTURING')) throw new AppError(409, 'PAYMENT_IN_PROGRESS', 'Wait for the payment attempt to finish before changing acceptance.');
  const m = c.milestones.find(m => m.id === input.milestoneId);
  if (!m) throw new AppError(404, 'NOT_FOUND', 'Milestone not found.');
  if (input.revision !== revisionOf(c)) throw new AppError(409, 'STALE_REVISION', 'The evidence changed. Review the current version before accepting.');
  const evidenceIds = [...new Set(input.evidenceIds || [])];
  if (!evidenceIds.length || evidenceIds.length > 40 || evidenceIds.some(id => !c.evidence.some(e => e.id === id))) throw new AppError(400, 'INVALID_EVIDENCE', 'Select existing source records for this acceptance.');
  const a = { milestoneId: m.id, reviewer: cleanText(input.reviewer, 'Reviewer name', 100), note: cleanText(input.note, 'Review note', 1200), evidenceIds, revision: revisionOf(c), at: new Date().toISOString(), kind: 'self-attested named review; identity not verified' };
  c.approvals[m.id] = a; event(c, 'MILESTONE_ACCEPTED', a); return a;
}
export function paymentQuote(c, ids) {
  if (!Array.isArray(ids) || !ids.length || ids.length > 12 || new Set(ids).size !== ids.length) throw new AppError(400, 'INVALID_SELECTION', 'Select unique, accepted milestones.');
  const revision = revisionOf(c);
  const selected = ids.map(id => {
    const m = c.milestones.find(m => m.id === id), a = c.approvals[id];
    if (!m || !a || a.revision !== revision) throw new AppError(409, 'REVIEW_REQUIRED', 'Every selected milestone needs a current human acceptance. AI matching cannot authorize payment.');
    if (Object.values(c.orders).some(o => o.status === 'COMPLETED' && o.milestoneIds.includes(id))) throw new AppError(409, 'ALREADY_PAID', 'A selected milestone has already been paid in this session.');
    return m;
  });
  const cents = selected.reduce((n, m) => n + m.cents, 0);
  return { revision, milestoneIds: ids.slice().sort(), cents, value: money(cents), currency: c.currency, binding: digest({ caseId: c.id, revision, milestoneIds: ids.slice().sort(), approvals: ids.slice().sort().map(id => c.approvals[id]), cents, currency: c.currency }) };
}
export function orderPayload(c, quote, origin) {
  return { intent: 'CAPTURE', purchase_units: [{ reference_id: c.id, custom_id: 'cp:' + quote.binding, invoice_id: 'CP-' + randomUUID(), description: 'ClearProof reviewed milestones: ' + quote.milestoneIds.join(', '), amount: { currency_code: quote.currency, value: quote.value } }], payment_source: { paypal: { experience_context: { shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW', return_url: origin + '/?paypal=return', cancel_url: origin + '/?paypal=cancel' } } } };
}
export function verifyCapture(result, order) {
  if (result.id !== order.id || result.status !== 'COMPLETED') throw new AppError(502, 'CAPTURE_NOT_COMPLETED', 'PayPal did not return a completed capture for this order.');
  const units = result.purchase_units || [];
  if (units.length !== 1 || units[0].custom_id !== 'cp:' + order.binding) throw new AppError(502, 'BINDING_MISMATCH', 'The captured order does not match the reviewed evidence binding.');
  const captures = units.flatMap(u => u.payments?.captures || []);
  if (captures.length !== 1 || captures[0].status !== 'COMPLETED' || captures[0].amount?.currency_code !== order.currency || captures[0].amount?.value !== order.value) throw new AppError(502, 'AMOUNT_MISMATCH', 'The captured amount or currency did not match the approved quote.');
  return { captureId: captures[0].id, amount: captures[0].amount, status: 'COMPLETED' };
}
export function publicCase(c) {
  return { ...snapshot(c), client: c.client, freelancer: c.freelancer, fixture: c.fixture, revision: revisionOf(c), approvals: c.approvals, orders: Object.values(c.orders).map(({ id, status, value, currency, milestoneIds, binding, captureId }) => ({ id, status, value, currency, milestoneIds, binding, captureId })), events: c.events };
}
export function exportPack(c) {
  const body = { format: 'clearproof.pack.v1', exportedAt: new Date().toISOString(), limitations: ['Synthetic demo records are not real delivery evidence.', 'Hashes detect changes relative to this export; they do not prove truth, authorship or a trusted timestamp.', 'Named acceptance is self-attested, not verified identity or a legal signature.', 'AI similarity suggests records to review; it is not a delivery verdict, fraud probability or legal advice.', 'Sandbox transactions move no real funds.'], case: publicCase(c) };
  return { ...body, integrity: { algorithm: 'SHA-256', canonicalization: 'recursive lexicographic object keys; array order preserved; JSON primitives', bodySha256: digest(body) } };
}
export function verifyPack(pack) {
  const { integrity, ...body } = pack;
  if (!integrity || digest(body) !== integrity.bodySha256) return { valid: false, reason: 'Body digest mismatch' };
  let previousHash = '0'.repeat(64);
  for (const [i, entry] of (pack.case?.events || []).entries()) {
    const { hash, ...eventBody } = entry;
    if (entry.index !== i || entry.previousHash !== previousHash || digest(eventBody) !== hash) return { valid: false, reason: 'Event chain mismatch at index ' + i };
    previousHash = hash;
  }
  const c = pack.case;
  if (revisionOf({ ...c, id: c.caseId }) !== c.revision) return { valid: false, reason: 'Case revision mismatch' };
  return { valid: true, reason: 'Bytes and event sequence match this export. This does not authenticate their real-world origin.' };
}
