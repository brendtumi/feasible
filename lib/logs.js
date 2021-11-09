const chalk = require('chalk');

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
      this.logger.info(message);
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

  aligned(title, message, filler = '.', method = 'success') {
    if (!this.silent) {
      this[method](`${title}${filler.repeat(80 - title.length - message.length)}${message}`);
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
