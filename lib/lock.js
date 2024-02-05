import { isAccessible, logger, readAsObject, write } from './index.js';

export class Lock {
  lockFilePath;
  hasPrevious = false;
  previous = {
    checksum: { file: null, hash: null, version: null },
    variables: {},
    files: {}
  };

  current = {
    checksum: { file: '', hash: '', version: '' },
    variables: {},
    files: []
  };

  constructor (lockFile, lockFileVersion, configurationFilePath, configurationHash) {
    this.lockFilePath = lockFile;
    this.current.checksum.file = configurationFilePath;
    this.current.checksum.hash = configurationHash;
    this.current.checksum.version = lockFileVersion;
  }

  async readLockFile () {
    try {
      await isAccessible(this.lockFilePath);
      try {
        this.previous = await readAsObject(this.lockFilePath);
        this.hasPrevious = true;
      } catch {
        logger.warn('No lock file found or accessible');
      }
    } catch (e) {
      logger.info(`${this.lockFilePath} is not found but will be created.`);
    }
  }

  /**
   * Is lock file need to be updated?
   * @returns {boolean}
   */
  isFileNeedUpdate () {
    return !this.hasPrevious ||
      !this.previous.checksum.version ||
      this.current.checksum.version !== this.previous.checksum.version ||
      this.previous.checksum.hash !== this.current.checksum.hash ||
      this.previous.checksum.file !== this.current.checksum.file;
  }

  getVariableValue (name, initial, options) {
    let variable;
    if (name in this.current.variables) {
      variable = this.current.variables[name];
    } else if (name in this.previous.variables) {
      variable = this.previous.variables[name];
    } else {
      variable = initial;
    }
    if (options && options.includes(variable)) {
      return options.indexOf(variable);
    }
    return variable;
  }

  getAllPreviousVariables () {
    return this.previous.variables;
  }

  setVariables (list) {
    this.current.variables = list;
  }

  cleanupList () {
    return this.previous.files;
  }

  setFileList (files) {
    this.current.files = files;
  }

  async export (checksum, variables, files, version, lockFilePath) {
    await write({
      checksum,
      variables,
      files
    }, lockFilePath || this.lockFilePath,
    version);
  }

  async save () {
    await this.export(this.current.checksum, this.current.variables, this.current.files, this.current.checksum.version);
    logger.success('Lock file updated!');
  }

  async backup () {
    await this.export(
      this.current.checksum,
      this.current.variables,
      this.current.files,
      this.current.checksum.version,
      `${this.lockFilePath}.backup`
    );
    logger.info('Lock file backup saved.');
  }

  async restore () {
    await this.backup();
    await this.export(this.previous.checksum, this.previous.variables, this.previous.files, this.previous.checksum.version);
    logger.success('Lock file restored!');
  }
}
