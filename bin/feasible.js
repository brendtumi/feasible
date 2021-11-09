#!/usr/bin/env node

const updateNotifier = require('update-notifier');
const { Command, Option } = require('commander');
const feasible = require('../lib');
const log = require('../lib/logs')();

const pkg = require('../package.json');

updateNotifier({ pkg }).notify();

const { name, version, description } = pkg;
const program = new Command();

program
  .version(`${name} ${version}`)
  .description(description)
  .usage('[options]')
  .showHelpAfterError()
  .showSuggestionAfterError();

program
  .option('-c, --config <FilePath>', 'configuration file', 'feasible.{json,json5,yml}')
  .option(
    '-u, --url <FileUrl>',
    'fetch configuration file remote (example: https://my-private-repo.git.com/raw/dope-repository/main/feasible.{json,json5,yml}?token=TOKEN)',
  )
  .option('-f, --force', 'overwrite current setup if it exists and start over', false)
  .option('-o, --overwrite <Variable>', 'overwrite variable (can be used multiple times)', ((value, previous) => {
    const [k, v] = value.split('=');
    return previous.concat([{ key: k, value: v }]);
  }), [])
  .addOption(new Option('-a, --actions <Action>', 'execute actions only').default('all').choices(['none', 'initial', 'pre', 'post', 'all']))
  .option('-n, --noClean', 'don\'t clean up old output files', false)
  .option(
    '-i, --noInteraction',
    'non-interactive execution. Lock file must be exits, any non-present value will be pass as empty.',
    false,
  )
  .option('-p, --parallel', 'enable parallel actions if possible', false)
  .option('-q, --quiet', 'silent mode', false)
  .option('-s, --separator <Separator>', 'default separator for variable and values', '=')
  .action(({ quiet, ...args }) => {
    log.silent = quiet;
    feasible(args)
      .then(() => {
        process.exit(0);
      })
      .catch((err) => {
        log.error(err.message);
        log.info(err.stack);
        process.exit(err.code || 1);
      });
  });

program.parse(process.argv);
