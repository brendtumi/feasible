const chalk = require('chalk');
const boxen = require('boxen');

class Log {
  silent = false;

  constructor(logger) {
    this.logger = logger;
  }

  success(message) {
    if (!this.silent) {
      this.logger.log(chalk.greenBright(message));
    }
  }

  info(message) {
    if (!this.silent) {
      this.logger.info(chalk.grey(message));
    }
  }

  error(message) {
    this.logger.error(chalk.redBright(message));
  }

  warn(message) {
    if (!this.silent) {
      this.logger.warn(chalk.yellow(message));
    }
  }

  boxed(title, message, opts = { padding: 1, borderColor: 'blue', borderStyle: 'round' }) {
    if (!this.silent) {
      this.logger.log(boxen(`${chalk.magenta(title)}\n\n${message}`, opts));
    }
  }
}

let logger;
module.exports = (output) => {
  if (!logger) {
    logger = new Log(output || console);
  }
  return logger;
};
