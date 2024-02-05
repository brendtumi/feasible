import {
  debug,
  execHook,
  executeFiles,
  exit,
  Lock,
  lockFile,
  lockFileVersion,
  logger,
  parseConfigFile,
  promptUI,
  resolveVariables,
  unlinkFile
} from './index.js';

export async function feasible (args) {
  const {
    actions = 'all',
    config = 'feasible.{json,json5,yml,yaml}',
    force = false,
    noClean = false,
    noInteraction = false,
    overwrite = [],
    separator = '=',
    url
  } = args;
  const { checksum, configuration, file } = await parseConfigFile(config, url);
  debug('Config file parsed');
  const lock = new Lock(lockFile, lockFileVersion, file, checksum);
  await lock.readLockFile();
  debug('Lock file read');

  const executeHooks = {
    initialVariables: ['initial-variables', 'all'].includes(actions) && !lock.hasPrevious,
    preVariables: ['pre-variables', 'all'].includes(actions),
    postVariables: ['post-variables', 'all'].includes(actions),

    initialDefaults: ['initial-defaults', 'all'].includes(actions) && !lock.hasPrevious,
    preDefaults: ['pre-defaults', 'all'].includes(actions),
    postDefaults: ['post-defaults', 'all'].includes(actions),

    initialExecution: ['initial', 'initial-execution', 'all'].includes(actions) && !lock.hasPrevious,
    preExecution: ['pre', 'pre-execution', 'all'].includes(actions),
    postExecution: ['post', 'post-execution', 'all'].includes(actions)
  };
  debug(executeHooks);
  const noUi = noInteraction && lock.hasPrevious;
  if (noInteraction && !lock.hasPrevious) {
    logger.warn('There is no previous lock file, non-interaction mode disabled!');
  }

  if (executeHooks.initialVariables) {
    await execHook('initial-variables', configuration, {}, separator);
  }
  if (executeHooks.preVariables) {
    await execHook('pre-variables', configuration, {}, separator);
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
    await execHook('post-variables', configuration, answers, separator);
  }
  if (executeHooks.initialDefaults) {
    await execHook('initial-defaults', configuration, answers, separator);
  }
  if (executeHooks.preDefaults) {
    await execHook('pre-defaults', configuration, answers, separator);
  }

  const missingDefaults = Object.fromEntries(
    Object.entries(configuration.defaults).filter(([key]) => !(key in answers))
  );
  let variables = answers;
  if (Object.keys(missingDefaults).length > 0) {
    variables = await resolveVariables(answers, missingDefaults, { separator });
  }
  lock.setVariables(variables);

  if (executeHooks.postDefaults) {
    await execHook('post-defaults', configuration, variables, separator);
  }

  const isFileExportRequired = lock.isFileNeedUpdate() || !!force || Object.keys(missingDefaults).length > 0;
  debug(`isFileExportRequired: ${isFileExportRequired}`);

  if (noUi || isFileExportRequired) {
    if (isFileExportRequired) {
      try {
        await lock.save();
      } catch (e) {
        logger.error(`Got error while writing lock file: ${e.message}`);
        exit(e.code);
      }
    }

    try {
      if (executeHooks.initialExecution) {
        await execHook(['initial', 'initial-execution'], configuration, variables, separator);
      }
      if (executeHooks.preExecution) {
        await execHook(['pre', 'pre-execution'], configuration, variables, separator);
      }
    } catch (e) {
      await lock.restore();
      exit(e.code);
    }

    if (!noClean && lock.hasPrevious) {
      debug('Clean up list');
      debug(lock.cleanupList());
      for (const file of lock.cleanupList()) {
        await unlinkFile(file);
      }
    }

    const files = await executeFiles(configuration, variables, lock, { separator });
    lock.setFileList(files);

    try {
      await lock.save();
    } catch (e) {
      logger.error(`Got error while writing lock file: ${e.message}`);
      exit(e.code);
    }

    try {
      if (executeHooks.postExecution) {
        await execHook(['post', 'post-execution'], configuration, variables, separator);
      }
      await unlinkFile(`${lockFile}.backup`);
    } catch (e) {
      // exit(e);
    }
  } else {
    logger.warn('No action required.\nIf you like to force re-run, use "-f" or "--force" argument.');
    await unlinkFile(`${lockFile}.backup`);
  }
}
