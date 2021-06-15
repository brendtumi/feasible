const chalk = require('chalk');
const {
  readConfigFile,
  fetchConfigFile,
  generateChecksum,
  promptUI,
  execHook,
  executeFiles,
  unlinkFile,
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
  if (!!force || lock.isFileUpdated) {
    lock.answers = await promptUI(configuration, lock);
  }
  const execute = force || lock.save();
  if (execute) {
    const preHooks = await execHook(
      'pre',
      configuration,
      { ...lock.answers, ...configuration.defaults },
      parallel,
      separator,
    );
    if (preHooks) {
      if (!noClean) {
        for (const files of lock.cleanupList) {
          await unlinkFile(files);
        }
      }
      const files = await executeFiles(configuration, lock, { separator });
      await lock.registerFiles(files);
    } else {
      lock.restore();
    }
    await execHook('post', configuration, { ...lock.answers, ...configuration.defaults }, parallel, separator);
  } else {
    console.log(
      chalk.yellow('No action required.\nIf you like to restart setup wizard use "-f" or "--force" argument.'),
    );
  }
}

module.exports = (options) => {
  return init(options).catch((err) => {
    console.error(chalk.redBright(err.message));
    process.exit(1);
  });
};
