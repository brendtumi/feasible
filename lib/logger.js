import chalk from 'chalk';

export class Log {
  silent = false;

  constructor (logger, silent) {
    this.logger = logger;
    this.silent = silent;
  }

  success (message) {
    if (!this.silent) {
      this.logger.log(chalk.greenBright(message));
    }
  }

  info (message) {
    if (!this.silent) {
      this.logger.info(message);
    }
  }

  error (message) {
    this.logger.error(chalk.redBright(message));
  }

  warn (message) {
    if (!this.silent) {
      this.logger.warn(chalk.yellow(message));
    }
  }

  aligned (title, message, filler = '.', method = 'success') {
    if (!this.silent) {
      this[method](`${title}${filler.repeat(80 - title.length - message.length)}${message}`);
    }
  }
}

export const logger = new Log(console, false);
