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
const log = require('./logs')();

async function init({
  config = 'feasible.{json,json5,yml}',
  url,
  force = false,
  noInteraction = false,
  parallel = false,
  separator = '=',
  noClean = false,
  actions = 'all',
}) {
  const { configuration, file } = await (url ? fetchConfigFile(url) : readConfigFile(config));
  const checksum = generateChecksum(configuration);
  const lock = new Lock('feasible.lock', file, checksum);
  const executePre = ['pre', 'all'].includes(actions);
  const executePost = ['post', 'all'].includes(actions);
  let variables;
  if (!noInteraction && (!!force || lock.isFileUpdated)) {
    const answers = await promptUI(configuration, lock);
    variables = await resolveDefaultVariable(answers, configuration.defaults, { separator });
    lock.answers = variables;
  } else {
    variables = lock.loadedAnswers;
    const missingDefaults = Object.fromEntries(Object.entries(configuration.defaults).filter(([key]) => !(key in variables)));
    if(Object.keys(missingDefaults).length > 0){
      variables = await resolveDefaultVariable(lock.loadedAnswers, missingDefaults, { separator });
    }
  }
  if (configuration.repository) {
    await cloneRepository(configuration, variables);
  }
  const execute = noInteraction || force || lock.save();
  if (execute) {
    let preHooks;
    if (executePre) {
      preHooks = await execHook('pre', configuration, variables, parallel, separator);
    }
    if ((preHooks === undefined && !executePre) || preHooks) {
      if (!noClean) {
        for (const files of lock.cleanupList) {
          await unlinkFile(files);
        }
      }
      const files = await executeFiles(configuration, variables, lock, { separator });
      await lock.registerFiles(files);
    } else {
      lock.restore();
    }
    if (executePost) {
      await execHook('post', configuration, variables, parallel, separator);
    }
  } else {
    log.warn('No action required.\nIf you like to restart setup wizard use "-f" or "--force" argument.');
  }
}

module.exports = (options) => {
  return init(options);
};
