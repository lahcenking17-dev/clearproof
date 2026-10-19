import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { MODEL } from '../lib/analysis.mjs';

const target = process.env.CLEARPROOF_MODEL_PATH || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.cache/models/minilm');
const files = ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'special_tokens_map.json', 'vocab.txt', 'onnx/model_quantized.onnx'];
const manifest = { source: MODEL.source, revision: MODEL.revision, license: MODEL.license, files: [] };
for (const file of files) {
  const dest = path.join(target, file);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const response = await fetch('https://huggingface.co/' + MODEL.source + '/resolve/' + MODEL.revision + '/' + file, { signal: AbortSignal.timeout(180000) });
  if (!response.ok) throw new Error('Model download failed: ' + file + ' HTTP ' + response.status);
  const data = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(dest, data);
  manifest.files.push({ file, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') });
  console.log('Downloaded ' + file + ' (' + data.length + ' bytes)');
}
await fs.writeFile(path.join(target, 'download-manifest.json'), JSON.stringify(manifest, null, 2));
console.log('Model pinned to ' + MODEL.revision + '. Ready for local inference.');
