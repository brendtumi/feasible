#!/usr/bin/env node

import updateNotifier from 'update-notifier';
import { Command, Option } from 'commander';
import { createRequire } from 'node:module';
import { logger, feasible, exit, debug } from '../lib/index.js';
debug('##################### DEV #####################');
const pkg = createRequire(import.meta.url)('../package.json');

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
  .option('-c, --config <FilePath>', 'Specify the path for the configuration file', 'feasible.{json,json5,yml,yaml}')
  .option(
    '-u, --url <FileUrl>',
    'Fetch the configuration file from a remote location (example: https://my-private-repo.git.com/raw/dope-repository/main/feasible.{json,json5,yml,yaml}?token=TOKEN)'
  )
  .option('-f, --force', 'Overwrite current setup if it exists and start from scratch', false)
  .option('-o, --overwrite <Variable>', 'Overwrite specific variables. This option can be used multiple times', (value, previous) => {
    const [k, v] = value.split('=');
    return previous.concat([{ key: k, value: v }]);
  }, [])
  .addOption(new Option('-a, --actions <Action>', 'Choose desired actions to execute').default('all').choices(['none', 'initial', 'pre', 'post', 'all']))
  .option('-n, --noClean', 'Prevent cleaning up old output files', false)
  .option(
    '-i, --noInteraction',
    'Execute in non-interactive mode. Lock file must exist; any non-present value will be passed as empty.',
    false
  )
  .option('-q, --quiet', 'Execute in silent mode', false)
  .option('-s, --separator <Separator>', 'Specify the default separator for variables and their values', '=')
  .action(async ({ quiet, ...args }) => {
    debug('Program is starting');
    try {
      logger.silent = quiet;
      await feasible(args);
      exit(0);
    } catch (err) {
      logger.error(err.message);
      logger.info(err.stack);
      exit(err.code || 1);
    }
  });

await program.parseAsync(process.argv);
