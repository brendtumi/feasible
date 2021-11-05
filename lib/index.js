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

  // TODO: 1. Download config file from remote if `--url` option is used
  // TODO: 2. Prompt questions
  // TODO: 3. Resolve default variables
  // TODO: 4. Pre hooks executed
  // TODO: 5. Clone remote repository (if `repository` defined in config file)
  // TODO: 6. Clean up earlier produced files
  // TODO: 7. Render and save files
  // TODO: 8. Post hooks executed
}

module.exports = feasible;
