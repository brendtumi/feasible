const {
  parseConfigFile,
  promptUI,
  resolveDefaultVariable,
  execHook,
  cloneRepository,
  unlinkFile,
  executeFiles,
} = require('./utils');
const { lockFile, lockFileVersion } = require('./constants');
const Lock = require('./lock');
const log = require('./logs')();

function exit(e) {
  log.info('Exiting...');
  process.exit(e.code || 1);
}

async function feasible(args) {
  const {
    actions = 'all',
    config = 'feasible.{json,json5,yml}',
    force = false,
    noClean = false,
    noInteraction = false,
    overwrite = [],
    parallel = false,
    separator = '=',
    url,
  } = args;
  const { checksum, configuration, file } = await parseConfigFile(config, url);
  const lock = new Lock(lockFile, lockFileVersion, file, checksum);
  const executeHooks = {
    initialVariables: ['initial-variables', 'all'].includes(actions) && !lock.hasPrevious,
    preVariables: ['pre-variables', 'all'].includes(actions),
    postVariables: ['post-variables', 'all'].includes(actions),

    initialDefaults: ['initial-', 'all'].includes(actions) && !lock.hasPrevious,
    preDefaults: ['pre-defaults', 'all'].includes(actions),
    postDefaults: ['post-defaults', 'all'].includes(actions),

    initialExecution: ['initial', 'initial-execution', 'all'].includes(actions) && !lock.hasPrevious,
    preExecution: ['pre', 'pre-execution', 'all'].includes(actions),
    postExecution: ['post', 'post-execution', 'all'].includes(actions),
  };
  const noUi = noInteraction && lock.hasPrevious;
  if (noInteraction && !lock.hasPrevious) {
    log.warn('There is no previous lock file, non-interaction mode disabled!');
  }

  if (executeHooks.initialVariables) {
    await execHook('initial-variables', configuration, {}, parallel, separator);
  }
  if (executeHooks.preVariables) {
    await execHook('pre-variables', configuration, {}, parallel, separator);
  }

  let answers;
  if (!noUi && (!!force || lock.isFileNeedUpdate())) {
    answers = await promptUI(configuration, lock);
  } else {
    answers = lock.getAllPreviousVariables();
  }

  if (overwrite && overwrite.length) {
    for (const { key, value } of overwrite) {
      answers[key] = value;
    }
  }

  if (executeHooks.postVariables) {
    await execHook('post-variables', configuration, answers, parallel, separator);
  }
  if (executeHooks.initialDefaults) {
    await execHook('initial-defaults', configuration, answers, parallel, separator);
  }
  if (executeHooks.preDefaults) {
    await execHook('pre-defaults', configuration, answers, parallel, separator);
  }

  const missingDefaults = Object.fromEntries(
    Object.entries(configuration.defaults).filter(([key]) => !(key in answers)),
  );
  let variables = answers;
  if (Object.keys(missingDefaults).length > 0) {
    variables = await resolveDefaultVariable(answers, missingDefaults, { separator });
  }
  lock.setVariables(variables);

  if (executeHooks.postDefaults) {
    await execHook('post-defaults', configuration, variables, parallel, separator);
  }

  const isFileExportRequired = lock.isFileNeedUpdate() || !!force || Object.keys(missingDefaults).length > 0;

  if (noUi || isFileExportRequired) {
    if (isFileExportRequired) {
      try {
        lock.save();
      } catch (e) {
        log.error(`Got error while writing lock file: ${e.message}`);
        exit(e);
      }
    }

    try {
      if (executeHooks.initialExecution) {
        await execHook(['initial', 'initial-execution'], configuration, variables, parallel, separator);
      }
      if (executeHooks.preExecution) {
        await execHook(['pre', 'pre-execution'], configuration, variables, parallel, separator);
      }
    } catch (e) {
      lock.restore();
      exit(e);
    }

    try {
      if (configuration.repository && !lock.hasPrevious) {
        await cloneRepository(configuration, variables);
      }
    } catch (e) {
      log.error(
        `Got error while cloning ${configuration.repository.url} to ${configuration.repository.target}: ${e.message}`,
      );
      lock.restore();
      exit(e);
    }

    if (!noClean && lock.hasPrevious) {
      for (const file of lock.cleanupList()) {
        await unlinkFile(file);
      }
    }

    const files = await executeFiles(configuration, variables, lock, { separator });
    await lock.setFileList(files);

    try {
      lock.save();
    } catch (e) {
      log.error(`Got error while writing lock file: ${e.message}`);
      exit(e);
    }

    try {
      if (executeHooks.postExecution) {
        await execHook(['post', 'post-execution'], configuration, variables, parallel, separator);
      }
      await unlinkFile(`${lockFile}.backup`);
    } catch (e) {
      // exit(e);
    }
  } else {
    log.warn('No action required.\nIf you like to force re-run, use "-f" or "--force" argument.');
    await unlinkFile(`${lockFile}.backup`);
  }
}

module.exports = feasible;
