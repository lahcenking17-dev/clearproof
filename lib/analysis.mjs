import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppError } from './core.mjs';

export const MODEL = { name: 'all-MiniLM-L6-v2', source: 'Xenova/all-MiniLM-L6-v2', revision: '751bff37182d3f1213fa05d7196b954e230abad9', license: 'Apache-2.0', type: 'quantized sentence-transformer; semantic retrieval, not a generative legal model' };
const DEFAULT_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.cache/models/minilm');
const stops = new Set('a an the to of for with and or in on at by from is are was be been being have has had it its this that these those their our your as i we you they my not no still yet do does please will review reviewed deliver delivered complete completed delivery covering client milestone files file checks check'.split(' '));
export const sentences = text => (text.match(/[^.!?]+[.!?]*/g) || [text]).map(x => x.trim()).filter(Boolean);
const terms = s => new Set(s.toLowerCase().match(/[a-z]+/g)?.filter(w => !stops.has(w)) || []);
const incomplete = /\b(?:not\s+(?:been\s+)?(?:delivered|complete|completed|ready|shared|reviewed)|still pending|not yet|unresolved|do not mark|has not|have not|hasn't|haven't|cannot confirm|missing)\b/i;
const gapNegatedOrConditional = s => /^\s*(if|when|unless)\b/i.test(s) || /\b(?:no|without)\s+(?:missing|unresolved)\b|\bnot missing\b/i.test(s);
const overlap = (a, b) => [...terms(a)].filter(w => terms(b).has(w)).length;
let pipelinePromise;
async function extractor() {
  if (!pipelinePromise) pipelinePromise = (async () => {
    const { pipeline, env } = await import('@huggingface/transformers');
    env.allowRemoteModels = false;
    return pipeline('feature-extraction', process.env.CLEARPROOF_MODEL_PATH || DEFAULT_PATH, { dtype: 'q8', device: 'cpu', local_files_only: true });
  })().catch(e => { pipelinePromise = null; throw e; });
  return pipelinePromise;
}
export function rankSources(c, vectors, fragments) {
  return c.milestones.map((m, mi) => {
    const candidates = fragments.map((f, i) => {
      const a = vectors[mi], b = vectors[c.milestones.length + i];
      const cosine = a.reduce((v, x, j) => v + x * b[j], 0);
      const sharedTerms = overlap(m.criterion, f.quote);
      return { ...f, similarity: Math.round(cosine * 1000) / 1000, sharedTerms, explicitGap: (sharedTerms >= 2 || (sharedTerms >= 1 && cosine >= 0.5)) && incomplete.test(f.quote) && !gapNegatedOrConditional(f.quote) };
    }).filter(x => x.similarity >= 0.25 || x.sharedTerms >= 2).sort((a, b) => b.similarity - a.similarity);
    const gaps = candidates.filter(x => x.explicitGap);
    const support = candidates.filter(x => !x.explicitGap && !incomplete.test(x.quote) && (x.similarity >= 0.43 || x.sharedTerms >= 3));
    return { milestoneId: m.id, status: gaps.length ? 'needs-clarification' : support.length ? 'suggested-support' : 'evidence-gap', label: gaps.length ? 'Explicit incomplete statement found' : support.length ? 'Relevant support to review' : 'No strong support found', supporting: support.slice(0, 3), gaps: gaps.slice(0, 3), related: candidates.slice(0, 4) };
  });
}
export async function analyze(c) {
  const fragments = c.evidence.flatMap(e => sentences(e.text).map((quote, index) => ({ evidenceId: e.id, title: e.title, sentence: index + 1, quote })));
  if (!fragments.length) return { model: MODEL, engine: 'no-evidence', milestones: c.milestones.map(m => ({ milestoneId: m.id, status: 'evidence-gap', label: 'Add a source record first', supporting: [], gaps: [], related: [] })) };
  const strings = [...c.milestones.map(m => m.criterion), ...fragments.map(f => f.quote)];
  if (strings.length > 180) throw new AppError(400, 'TOO_MANY_SENTENCES', 'Use at most 180 milestone criteria and evidence sentences per AI review.');
  try {
    const model = await extractor();
    const output = await model(strings, { pooling: 'mean', normalize: true });
    return { model: MODEL, engine: 'local-onnx-inference', at: new Date().toISOString(), milestones: rankSources(c, output.tolist(), fragments), limitations: 'English semantic retrieval with explicit-gap rules. Similarity is not a probability or a finding of completion. Source text can be false; a human must inspect and accept it.' };
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(503, 'MODEL_UNAVAILABLE', 'The local AI model is not available yet. Run npm run model:download on the server, then retry. No AI verdict has been generated.');
  }
}
