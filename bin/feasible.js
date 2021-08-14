#!/usr/bin/env node

const updateNotifier = require('update-notifier');
const { Command } = require('commander');
const feasible = require('../lib');
const log = require('../lib/logs')();

const pkg = require('../package.json');

updateNotifier({ pkg }).notify();

const { name, version } = pkg;
const program = new Command();

program.version(`${name} ${version}`).usage('<command> [options]');

program
  //.command('init', {isDefault: true})
  .description('Start setup process')
  .option('-c, --config <FilePath>', 'Configuration file', 'feasible.{json,json5,yml}')
  .option(
    '-u, --url <FileUrl>',
    'Configuration file url. Example: https://my-private-repo.git.com/raw/dope-repository/main/feasible.{json,json5,yml}?token=TOKEN',
  )
  .option('-f, --force', 'Overwrite current setup if it exists and start over', false)
  .option(
    '-i, --noInteraction',
    'Non-interactive execution. Lock file must be exits, any non-present value will be pass as empty',
    false,
  )
  .option('-p, --parallel', 'Enable parallel actions if possible', false)
  .option('-s, --separator <Separator>', 'Default separator for variable and values', '=')
  .option('-n, --noClean', "Don't clean up old output files", false)
  .option('-q, --quiet', "Silent mode", false)
  .action(({ config, url, force, noInteraction, parallel, noClean, quiet }) => {
    log.silent = quiet;
    feasible({ config, url, force, noInteraction, parallel, noClean }).catch((err) => {
      log.error(err.message);
      log.info(err.stack);
      process.exit(1);
    });
  });

program.parse(process.argv);
