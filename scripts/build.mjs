import fs from 'node:fs/promises';
await fs.mkdir('public/vendor', { recursive: true });
await fs.copyFile('node_modules/ag-grid-community/dist/ag-grid-community.min.js', 'public/vendor/ag-grid-community.min.js');
console.log('Prepared AG Grid Community browser bundle.');
