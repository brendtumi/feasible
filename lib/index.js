const chalk = require('chalk');
const {
  readConfigFile,
  fetchConfigFile,
  generateChecksum,
  resolveDefaultVariable,
  promptUI,
  execHook,
  executeFiles,
  unlinkFile,
  cloneRepository,
} = require('./utils');
const Lock = require('./lock');

async function init({
                      config = 'feasible.{json,json5,yml}',
                      url,
                      force = false,
                      parallel = false,
                      separator = '=',
                      noClean = false,
                    }) {
  const { configuration, file } = await (url ? fetchConfigFile(url) : readConfigFile(config));
  const checksum = generateChecksum(configuration);
  const lock = new Lock('feasible.lock', file, checksum);
  let variables;
  if (!!force || lock.isFileUpdated) {
    const answers = await promptUI(configuration, lock);
    variables = await resolveDefaultVariable(answers, configuration.defaults, { separator });
    lock.answers = variables;
  }
  else {
    variables = lock.answers;
  }
  if (configuration.repository) {
    await cloneRepository(configuration, variables);
  }
  const execute = force || lock.save();
  if (execute) {
    const preHooks = await execHook(
      'pre',
      configuration,
      variables,
      parallel,
      separator,
    );
    if (preHooks) {
      if (!noClean) {
        for (const files of lock.cleanupList) {
          await unlinkFile(files);
        }
      }
      const files = await executeFiles(configuration, variables, lock, { separator });
      await lock.registerFiles(files);
    }
    else {
      lock.restore();
    }
    await execHook('post', configuration, variables, parallel, separator);
  }
  else {
    console.log(
      chalk.yellow('No action required.\nIf you like to restart setup wizard use "-f" or "--force" argument.'),
    );
  }
}

module.exports = (options) => {
  return init(options).catch((err) => {
    console.error(chalk.redBright(err.message));
    console.info(chalk.grey(err.stack));
    process.exit(1);
  });
};
