import { expect } from 'chai';
import fs from 'fs/promises';
import { Lock, readAsObject } from '../lib/index.js';

describe('Lock class', () => {
  const lockPath = './test/tmp.lock';

  afterEach(async () => {
    for (const file of [lockPath, lockPath + '.backup']) {
      try { await fs.unlink(file); } catch {}
    }
  });

  it('saves, backs up and restores lock file', async () => {
    const lock = new Lock(lockPath, 2, 'config.yml', 'hash1');
    lock.setVariables({ A: 1 });
    lock.setFileList(['file']);
    await lock.save();
    await lock.readLockFile();
    expect(lock.isFileNeedUpdate()).to.equal(false);

    lock.current.checksum.hash = 'hash2';
    expect(lock.isFileNeedUpdate()).to.equal(true);

    await lock.backup();
    lock.current.variables.B = 2;
    await lock.restore();
    const restored = await readAsObject(lockPath);
    expect(restored.variables).to.deep.equal({ A: 1 });
  });

  it('returns variable values with precedence', () => {
    const lock = new Lock(lockPath, 2, 'config.yml', 'hash');
    lock.previous.variables = { A: 'prev' };
    lock.current.variables = { A: 'curr' };
    expect(lock.getVariableValue('A', 'init')).to.equal('curr');
    lock.current.variables = {};
    expect(lock.getVariableValue('A', 'init')).to.equal('prev');
    lock.previous.variables = {};
    expect(lock.getVariableValue('A', 'init')).to.equal('init');
    expect(lock.getVariableValue('A', 'one', ['one', 'two'])).to.equal(0);
  });
});
