import fs from 'node:fs/promises';
import { verifyPack } from '../lib/core.mjs';
if (!process.argv[2]) { console.error('Usage: npm run verify -- path/to/clearproof-pack.json'); process.exit(2); }
try {
  const result = verifyPack(JSON.parse(await fs.readFile(process.argv[2], 'utf8')));
  console.log(JSON.stringify(result, null, 2)); if (!result.valid) process.exitCode = 1;
} catch { console.error('The export is not a readable ClearProof JSON pack.'); process.exitCode = 1; }
