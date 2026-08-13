const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const required = ['index.js', 'index.d.ts', 'protocol/schema.proto'];

for (const relativePath of required) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    throw new Error(`Missing shared contract: ${relativePath}`);
  }
}

const runtime = require('../index.js');
for (const name of ['EntityTypes', 'EvolutionTypes', 'InputTypes']) {
  if (!runtime[name] || typeof runtime[name] !== 'object') {
    throw new Error(`Invalid shared enum export: ${name}`);
  }
}

console.log('Shared contracts are valid.');
