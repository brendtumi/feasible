#!/usr/bin/env node

const updateNotifier = require('update-notifier');
const { Command } = require('commander');

const pkg = require('../package.json');

updateNotifier({ pkg }).notify();

const { name, version } = pkg;
const program = new Command();

program.version(`${name} ${version}`).usage('<command> [options]');

program
  //.command('init', {isDefault: true})
  .description('Start setup process')
  .option('-c, --config <FilePath>', 'Configuration file', 'feasible.{json,json5,yml}')
  .option('-f, --force', 'Overwrite current setup if it exists and start over', false)
  .option('-p, --parallel', 'Enable parallel actions if possible', false)
  .option('-s, --separator <Separator>', 'Default separator for variable and values', '=')
  .option('-n, --no-clean', "Don't clean up old output files")
  .action(({ config, force, parallel, noClean }) => {
    require('../lib')({ config, force, parallel, noClean });
  });

program.parse(process.argv);
