import { mkdir, readFile, writeFile, rename } from 'fs/promises';
import { join } from 'path';
import { config } from '../config.js';
import { createLogger } from './log.js';

const log = createLogger('state');

export async function loadState(name) {
  try {
    const raw = await readFile(join(config.stateDir, `${name}.json`), 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code !== 'ENOENT') log.warn(`load ${name} failed: ${err.message}`);
    return null;
  }
}

export async function saveState(name, data) {
  try {
    await mkdir(config.stateDir, { recursive: true });
    const file = join(config.stateDir, `${name}.json`);
    const tmp = `${file}.tmp`;
    await writeFile(tmp, JSON.stringify(data));
    await rename(tmp, file);
  } catch (err) {
    log.warn(`save ${name} failed: ${err.message}`);
  }
}
