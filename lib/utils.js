import { readFile, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { createHash } from 'node:crypto';

import yaml from 'js-yaml';
import JSON5 from 'json5';

import { logger } from './logger.js';

export async function read (path) {
  return readFile(path, { encoding: 'utf-8' });
}
export async function readJson (path) {
  return JSON.parse(await read(path));
}
export async function readYaml (path) {
  return yaml.load(await read(path));
}
export async function readJson5 (path) {
  return JSON5.parse(await read(path));
}
export async function readAsObject (path) {
  switch (extname(path)) {
    case '.json':
      return readJson(path);
    case '.json5':
      return readJson5(path);
    case '.yaml':
    case '.yml':
      return readYaml(path);
    default:
      return read(path);
  }
}
export const pkg = await readJson('./package.json');
function checksum (obj, algorithm, encoding) {
  return createHash(algorithm || 'md5')
    .update(JSON.stringify(obj), 'utf-8')
    .digest(encoding || 'hex');
}
export async function write (object, path) {
  const content = yaml.dump({
    ...object,
    checksum: {
      file: path,
      hash: checksum(object),
      version: pkg.version
    }
  }, {});
  return writeFile(path, content, { encoding: 'utf-8' });
}
export function exit (code) {
  if (code > 0) {
    logger.error(`Exiting with error code: ${code}`);
    process.exit(code);
  } else {
    logger.info('Done...');
    process.exit(code || 0);
  }
}
