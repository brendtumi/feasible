// Language: javascript
import { exec } from 'child_process';
import { expect } from 'chai';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);
const sourceLockFile = './test/test-02-feasible.yml.lock';
const destLockFile = './test/feasible.lock';
const configFile = './test/config.json';

describe('feasible CLI - test-02 configuration with lock and config file creation', () => {
  before(async () => {
    // Copy the snapshot lock file before tests
    try {
      await fs.copyFile(sourceLockFile, destLockFile);
    } catch (err) {
      console.error('Failed to copy lock file before tests:', err);
      throw err;
    }
  });

  after(async () => {
    // Remove destLockFile if it exists.
    try {
      await fs.unlink(destLockFile);
    } catch (err) {
      // Ignore if file does not exist.
    }
    // Remove config.json if it exists.
    try {
      await fs.unlink(configFile);
    } catch (err) {
      // Ignore if file does not exist.
    }
  });

  it('should create test/feasible.lock and config.json with expected values', async function () {
    const { stdout, stderr } = await execAsync(
      'node ../bin/cli.js --config test-02-feasible.yml --noInteraction',
      { cwd: './test' }
    );
    expect(stderr).to.be.empty;
    expect(stdout).to.include('Setting up environment...');
    expect(stdout).to.include('Setup complete!');

    // Read and validate the contents of the lock file.
    const lockContent = await fs.readFile(destLockFile, 'utf8');
    expect(lockContent).to.include('APP_NAME: test-app');
    expect(lockContent).to.include('NODE_ENV: development');
    expect(lockContent).to.include("PORT: '3000'");
    expect(lockContent).to.match(/TIMESTAMP:\s+'?\d+'?/);
    expect(lockContent).to.include('- .env');
    expect(lockContent).to.include('- config.json');

    // Read and validate config.json file.
    const configData = await fs.readFile(configFile, 'utf8');
    let config;
    try {
      config = JSON.parse(configData);
    } catch (err) {
      throw new Error('config.json is not valid JSON');
    }
    expect(config.APP_NAME).to.equal('test-app');
    expect(config.NODE_ENV).to.equal('development');
    expect(config.PORT).to.equal('3000');
  });
});
