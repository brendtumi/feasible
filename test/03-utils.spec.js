import { expect } from 'chai';
import fs from 'fs/promises';
import { parseConfigFile, resolveVariables, executeFiles } from '../lib/utils.js';
import { Lock } from '../lib/index.js';

describe('utils functions', () => {
  it('parseConfigFile reads YAML configuration', async () => {
    const { configuration } = await parseConfigFile('./test/test-02-feasible.yml');
    expect(configuration).to.have.property('variables');
    expect(configuration.variables).to.have.property('APP_NAME');
  });

  it('resolveVariables handles bash output', async () => {
    const vars = { EXISTING: 'hello' };
    const defaults = { TEST: { type: 'bash', command: 'echo 42', output: 'text' } };
    const resolved = await resolveVariables(vars, defaults, { separator: '=' });
    expect(resolved.TEST).to.equal('42');
    expect(resolved.EXISTING).to.equal('hello');
  });

  it('executeFiles creates files based on configuration', async () => {
    const { configuration } = await parseConfigFile('./test/test-02-feasible.yml');
    const envPath = './test/tmp/output.env';
    const jsonPath = './test/tmp/output.json';
    configuration.files[envPath] = configuration.files['.env'];
    configuration.files[jsonPath] = configuration.files['config.json'];
    delete configuration.files['.env'];
    delete configuration.files['config.json'];

    const tmpLock = new Lock('./test/tmp.lock', 2, 'cfg.yml', 'hash');
    const variables = {
      APP_NAME: 'testapp',
      NODE_ENV: 'development',
      PORT: '1234',
      TIMESTAMP: '1'
    };
    const paths = await executeFiles(configuration, variables, tmpLock, { separator: '=' });
    expect(paths).to.include(envPath);
    expect(paths).to.include(jsonPath);

    const envContent = await fs.readFile(envPath, 'utf8');
    expect(envContent).to.include('APP_NAME=testapp');
    const jsonContent = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
    expect(jsonContent.APP_NAME).to.equal('testapp');

    await fs.unlink(envPath);
    await fs.unlink(jsonPath);
  });
});
