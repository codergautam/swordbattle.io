const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const types = require('../index.js');
const { schemaPath } = require('../protocol');

test('browser aliases and server enum names share values', () => {
  assert.equal(types.EntityTypes, types.Entity);
  assert.equal(types.EvolutionTypes, types.Evolution);
  assert.equal(types.InputTypes, types.Input);
});

test('the canonical protocol schema is shipped by the package', () => {
  assert.equal(fs.existsSync(schemaPath), true);
  assert.match(fs.readFileSync(schemaPath, 'utf8'), /message ServerMessage/);
});
